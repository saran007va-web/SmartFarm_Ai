"""
Crop planning API router — manage crop plans and maintenance tasks.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.database import get_db
from app.db.models import CropPlan, MaintenanceTask, AnalyticsEvent

router = APIRouter(prefix="/api/planning", tags=["Crop Planning"])

DEFAULT_STAGES = {
    "rice": [
        {"name": "Land Preparation", "days": 15},
        {"name": "Sowing", "days": 5},
        {"name": "Transplanting", "days": 10},
        {"name": "Vegetative Growth", "days": 30},
        {"name": "Flowering", "days": 20},
        {"name": "Grain Filling", "days": 25},
        {"name": "Harvesting", "days": 15},
    ],
    "wheat": [
        {"name": "Land Prep", "days": 10},
        {"name": "Sowing", "days": 10},
        {"name": "Germination", "days": 15},
        {"name": "Tillering", "days": 25},
        {"name": "Stem Extension", "days": 20},
        {"name": "Flowering", "days": 15},
        {"name": "Grain Fill", "days": 15},
        {"name": "Harvesting", "days": 10},
    ],
}


def _utc_naive(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


# ── Schemas ───────────────────────────────────────────────────────────────

class MaintenanceTaskCreate(BaseModel):
    title: Optional[str] = None
    task_date: datetime
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    task_type: str  # watering, fertilizer, pesticide, weeding, pruning, harvesting, etc.
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    reminder_minutes: Optional[int] = None
    assigned_crop: Optional[str] = None
    growth_stage: Optional[str] = None
    plan_day_offset: Optional[int] = None
    is_auto_generated: Optional[bool] = None
    notes: Optional[str] = None


class MaintenanceTaskUpdate(BaseModel):
    title: Optional[str] = None
    task_date: Optional[datetime] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    reminder_minutes: Optional[int] = None
    assigned_crop: Optional[str] = None
    growth_stage: Optional[str] = None
    plan_day_offset: Optional[int] = None
    is_auto_generated: Optional[bool] = None
    completed: Optional[bool] = None
    notes: Optional[str] = None


class CropPlanCreate(BaseModel):
    crop_name: str
    start_date: datetime
    end_date: datetime
    duration_days: Optional[int] = None
    growth_stages: Optional[list] = None
    status: Optional[str] = None
    area_ha: Optional[float] = None
    expected_yield_kg_per_ha: Optional[float] = None
    notes: Optional[str] = None


class CropPlanUpdate(BaseModel):
    crop_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration_days: Optional[int] = None
    growth_stages: Optional[list] = None
    status: Optional[str] = None
    farm_id: Optional[int] = None
    area_ha: Optional[float] = None
    expected_yield_kg_per_ha: Optional[float] = None
    notes: Optional[str] = None


def _default_growth_stages(crop_name: str) -> list:
    return DEFAULT_STAGES.get(crop_name.lower(), [
        {"name": "Preparation", "days": 10},
        {"name": "Sowing", "days": 5},
        {"name": "Growth", "days": 30},
        {"name": "Maintenance", "days": 10},
        {"name": "Harvesting", "days": 5},
    ])


def _normalize_growth_stages(stages: Optional[list], crop_name: str) -> list:
    raw_stages = stages or _default_growth_stages(crop_name)
    normalized = []
    for stage in raw_stages:
        if isinstance(stage, dict):
            normalized.append({
                "name": str(stage.get("name", "Stage")).strip() or "Stage",
                "days": max(1, int(stage.get("days", 1))),
                "tasks": stage.get("tasks", []),
            })
    return normalized or _default_growth_stages(crop_name)


def _task_window(task_type: str) -> tuple[str, str]:
    windows = {
        "watering": ("06:00", "07:00"),
        "fertilizer": ("07:30", "08:30"),
        "pesticide": ("08:00", "09:00"),
        "weeding": ("09:00", "11:00"),
        "pruning": ("09:00", "11:00"),
        "harvesting": ("06:00", "10:00"),
    }
    return windows.get(task_type, ("08:00", "09:00"))


def _task_priority(task_type: str) -> str:
    if task_type in {"watering", "pesticide", "harvesting"}:
        return "high"
    if task_type in {"fertilizer", "weeding", "pruning"}:
        return "medium"
    return "low"


def _stage_for_offset(stages: list, day_offset: int) -> Optional[str]:
    cursor = 0
    for stage in stages:
        cursor += int(stage.get("days", 1))
        if day_offset < cursor:
            return stage.get("name")
    return stages[-1].get("name") if stages else None


def _task_title(task_type: str, description: Optional[str], stage_name: Optional[str]) -> str:
    if description:
        return description.split(" - ")[0].strip()
    if stage_name:
        return f"{stage_name} - {task_type.title()}"
    return task_type.replace("_", " ").title()


def _sync_auto_generated_tasks(plan: CropPlan, db: Session):
    """Move auto-generated tasks to the updated plan timeline."""
    if not plan.start_date or not plan.end_date:
        return

    stages = _normalize_growth_stages(plan.growth_stages, plan.crop_name)
    auto_tasks = db.query(MaintenanceTask).filter_by(crop_plan_id=plan.id, is_auto_generated=True).all()

    for task in auto_tasks:
        offset = task.plan_day_offset
        if offset is None:
            offset = max(0, (task.task_date.date() - plan.start_date.date()).days)

        new_date = plan.start_date + timedelta(days=offset)
        if new_date > plan.end_date:
            db.delete(task)
            continue

        task.task_date = new_date
        task.plan_day_offset = offset
        task.assigned_crop = plan.crop_name
        task.growth_stage = _stage_for_offset(stages, offset)
        if not task.title:
            task.title = _task_title(task.task_type, task.description, task.growth_stage)
        if not task.start_time or not task.end_time:
            task.start_time, task.end_time = _task_window(task.task_type)
        if not task.priority:
            task.priority = _task_priority(task.task_type)
        if not task.status:
            task.status = "planned"



# ── Crop Plans ─────────────────────────────────────────────────────────

@router.get("/crop-plans")
def list_crop_plans(
    farm_id: Optional[int] = None,
    crop_name: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """List crop plans with optional filters."""
    q = db.query(CropPlan)
    
    if farm_id:
        q = q.filter_by(farm_id=farm_id)
    if crop_name:
        q = q.filter(CropPlan.crop_name.ilike(f"%{crop_name}%"))
    if date_from:
        q = q.filter(CropPlan.start_date >= _utc_naive(date_from))
    if date_to:
        q = q.filter(CropPlan.end_date <= _utc_naive(date_to))
    
    plans = q.order_by(CropPlan.start_date.desc()).all()
    
    return {
        "plans": [_plan_to_dict(p, include_tasks=False) for p in plans]
    }


@router.post("/crop-plans")
def create_crop_plan(data: CropPlanCreate, farm_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Create a new crop plan."""
    start_date = _utc_naive(data.start_date)
    end_date = _utc_naive(data.end_date)

    if end_date <= start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date.")

    duration_days = data.duration_days or max(1, (end_date.date() - start_date.date()).days)
    growth_stages = _normalize_growth_stages(data.growth_stages, data.crop_name)
    
    plan = CropPlan(
        farm_id=farm_id,
        crop_name=data.crop_name,
        start_date=start_date,
        end_date=end_date,
        duration_days=duration_days,
        growth_stages=growth_stages,
        status=data.status or "active",
        area_ha=data.area_ha,
        expected_yield_kg_per_ha=data.expected_yield_kg_per_ha,
        notes=data.notes,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    db.add(AnalyticsEvent(event_type="crop_plan", detail=f"Created plan for {data.crop_name}"))
    db.commit()
    
    return _plan_to_dict(plan)


@router.get("/crop-plans/{plan_id}")
def get_crop_plan(plan_id: int, db: Session = Depends(get_db)):
    """Get a specific crop plan with all tasks."""
    plan = db.query(CropPlan).filter_by(id=plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Crop plan not found.")
    
    return _plan_to_dict(plan, include_tasks=True)


@router.put("/crop-plans/{plan_id}")
def update_crop_plan(plan_id: int, data: CropPlanUpdate, db: Session = Depends(get_db)):
    """Update a crop plan."""
    plan = db.query(CropPlan).filter_by(id=plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Crop plan not found.")

    original_start = plan.start_date
    original_end = plan.end_date
    
    payload = data.model_dump(exclude_unset=True)
    if "start_date" in payload:
        payload["start_date"] = _utc_naive(payload["start_date"])
    if "end_date" in payload:
        payload["end_date"] = _utc_naive(payload["end_date"])
    if "growth_stages" in payload:
        payload["growth_stages"] = _normalize_growth_stages(payload["growth_stages"], payload.get("crop_name") or plan.crop_name)

    if "duration_days" in payload and "end_date" not in payload and "start_date" in payload:
        payload["end_date"] = payload["start_date"] + timedelta(days=int(payload["duration_days"]))
    elif "duration_days" in payload and "start_date" not in payload and "end_date" in payload:
        payload["start_date"] = payload["end_date"] - timedelta(days=int(payload["duration_days"]))

    for key, val in payload.items():
        if key in {"start_date", "end_date"} and val is not None:
            val = _utc_naive(val)
        setattr(plan, key, val)
    
    db.commit()
    db.refresh(plan)

    if plan.start_date != original_start or plan.end_date != original_end:
        _sync_auto_generated_tasks(plan, db)
        db.commit()
        db.refresh(plan)
    
    return _plan_to_dict(plan)


@router.delete("/crop-plans/{plan_id}")
def delete_crop_plan(plan_id: int, db: Session = Depends(get_db)):
    """Delete a crop plan and all associated tasks."""
    plan = db.query(CropPlan).filter_by(id=plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Crop plan not found.")
    
    db.delete(plan)
    db.commit()
    
    return {"deleted": True, "id": plan_id}


# ── Maintenance Tasks ─────────────────────────────────────────────────

@router.post("/crop-plans/{plan_id}/tasks")
def create_maintenance_task(
    plan_id: int,
    data: MaintenanceTaskCreate,
    db: Session = Depends(get_db),
):
    """Create a maintenance task for a crop plan."""
    plan = db.query(CropPlan).filter_by(id=plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Crop plan not found.")
    
    task_date = _utc_naive(data.task_date)
    plan_start = _utc_naive(plan.start_date)
    plan_end = _utc_naive(plan.end_date)

    if task_date < plan_start or task_date > plan_end:
        raise HTTPException(
            status_code=400,
            detail="Task date must be within the crop plan period."
        )

    day_offset = data.plan_day_offset if data.plan_day_offset is not None else (task_date.date() - plan_start.date()).days
    start_time, end_time = data.start_time, data.end_time
    if not start_time or not end_time:
        start_time, end_time = _task_window(data.task_type)

    title = data.title or _task_title(data.task_type, data.description, data.growth_stage)
    priority = data.priority or _task_priority(data.task_type)
    status = data.status or ("completed" if task_date and task_date < datetime.utcnow() else "planned")
    
    task = MaintenanceTask(
        crop_plan_id=plan_id,
        title=title,
        task_date=task_date,
        start_time=start_time,
        end_time=end_time,
        task_type=data.task_type,
        description=data.description,
        quantity=data.quantity,
        unit=data.unit,
        priority=priority,
        status=status,
        reminder_minutes=data.reminder_minutes,
        assigned_crop=data.assigned_crop or plan.crop_name,
        growth_stage=data.growth_stage,
        plan_day_offset=day_offset,
        is_auto_generated=bool(data.is_auto_generated),
        notes=data.notes,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    
    return _task_to_dict(task)


@router.get("/crop-plans/{plan_id}/tasks")
def list_maintenance_tasks(plan_id: int, db: Session = Depends(get_db)):
    """List all maintenance tasks for a crop plan."""
    plan = db.query(CropPlan).filter_by(id=plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Crop plan not found.")
    
    tasks = db.query(MaintenanceTask).filter_by(crop_plan_id=plan_id).order_by(MaintenanceTask.task_date).all()
    
    return {
        "plan_id": plan_id,
        "tasks": [_task_to_dict(t) for t in tasks]
    }


@router.get("/tasks/by-date")
def get_tasks_by_date(
    date_from: datetime,
    date_to: datetime,
    db: Session = Depends(get_db),
):
    """Get all maintenance tasks within a date range."""
    tasks = db.query(MaintenanceTask).filter(
        and_(
            MaintenanceTask.task_date >= _utc_naive(date_from),
            MaintenanceTask.task_date <= _utc_naive(date_to),
        )
    ).order_by(MaintenanceTask.task_date).all()
    
    return {
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "tasks": [_task_to_dict(t) for t in tasks]
    }


@router.put("/tasks/{task_id}")
def update_maintenance_task(task_id: int, data: MaintenanceTaskUpdate, db: Session = Depends(get_db)):
    """Update a maintenance task."""
    task = db.query(MaintenanceTask).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    
    payload = data.model_dump(exclude_unset=True)
    if "task_date" in payload and payload["task_date"] is not None:
        payload["task_date"] = _utc_naive(payload["task_date"])

    for key, val in payload.items():
        if key == "task_date" and val is not None:
            val = _utc_naive(val)
        setattr(task, key, val)

    if task.task_date and task.crop_plan_id:
        plan = db.query(CropPlan).filter_by(id=task.crop_plan_id).first()
        if plan and task.is_auto_generated:
            task.plan_day_offset = (task.task_date.date() - plan.start_date.date()).days
            task.assigned_crop = plan.crop_name
    
    db.commit()
    db.refresh(task)
    
    return _task_to_dict(task)


@router.delete("/tasks/{task_id}")
def delete_maintenance_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a maintenance task."""
    task = db.query(MaintenanceTask).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    
    db.delete(task)
    db.commit()
    
    return {"deleted": True, "id": task_id}


@router.get("/tasks/today")
def get_todays_tasks(db: Session = Depends(get_db)):
    """Get all tasks for today."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    tasks = db.query(MaintenanceTask).filter(
        and_(
            MaintenanceTask.task_date >= today,
            MaintenanceTask.task_date < tomorrow,
        )
    ).order_by(MaintenanceTask.task_date).all()
    
    return {
        "date": today.isoformat(),
        "tasks": [_task_to_dict(t) for t in tasks]
    }


# ── Helper functions ──────────────────────────────────────────────────

def _plan_to_dict(plan: CropPlan, include_tasks: bool = False) -> dict:
    """Convert CropPlan to dictionary."""
    return {
        "id": plan.id,
        "farm_id": plan.farm_id,
        "crop_name": plan.crop_name,
        "start_date": plan.start_date.isoformat() if plan.start_date else None,
        "end_date": plan.end_date.isoformat() if plan.end_date else None,
        "duration_days": plan.duration_days,
        "growth_stages": plan.growth_stages or [],
        "status": plan.status or "active",
        "area_ha": plan.area_ha,
        "expected_yield_kg_per_ha": plan.expected_yield_kg_per_ha,
        "notes": plan.notes,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
        "tasks": [_task_to_dict(t) for t in plan.tasks] if include_tasks else None,
    }


def _task_to_dict(task: MaintenanceTask) -> dict:
    """Convert MaintenanceTask to dictionary."""
    return {
        "id": task.id,
        "crop_plan_id": task.crop_plan_id,
        "title": task.title,
        "task_date": task.task_date.isoformat() if task.task_date else None,
        "start_time": task.start_time,
        "end_time": task.end_time,
        "task_type": task.task_type,
        "description": task.description,
        "quantity": task.quantity,
        "unit": task.unit,
        "priority": task.priority or "medium",
        "status": task.status or ("completed" if task.completed else "planned"),
        "reminder_minutes": task.reminder_minutes,
        "assigned_crop": task.assigned_crop,
        "growth_stage": task.growth_stage,
        "plan_day_offset": task.plan_day_offset,
        "is_auto_generated": task.is_auto_generated,
        "completed": task.completed,
        "notes": task.notes,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
    }
