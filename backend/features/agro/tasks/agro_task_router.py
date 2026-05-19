from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import UUID
from ..agro_database import get_agro_db
from ..agro_models import AgroTask, AgroFarmZone
from ..agro_schemas import AgroTaskResponse
from .agro_task_generator import agro_generate_task_calendar

router = APIRouter()


@router.get("/calendar/{farmer_id}", response_model=list[AgroTaskResponse])
def get_task_calendar(farmer_id: UUID, days: int = 14, db: Session = Depends(get_agro_db)):
    zones = db.query(AgroFarmZone).filter(AgroFarmZone.farmer_id == farmer_id).all()
    for zone in zones:
        agro_generate_task_calendar(db, farmer_id, zone.id, days)
    cutoff = datetime.utcnow() + timedelta(days=days)
    tasks = db.query(AgroTask).filter(
        AgroTask.farmer_id == farmer_id,
        AgroTask.completed_at == None,
        AgroTask.due_date <= cutoff,
    ).order_by(AgroTask.due_date).all()
    return tasks


@router.patch("/{task_id}/complete")
def complete_task(task_id: UUID, db: Session = Depends(get_agro_db)):
    task = db.query(AgroTask).filter(AgroTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.completed_at = datetime.utcnow()
    db.commit()
    return {"status": "completed", "task_id": str(task_id)}