"""
Stats API router — dashboard totals, history, and breakdown.
"""
from datetime import datetime, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db.models import ChatMessage, Document, CropPrediction, YieldPrediction, AnalyticsEvent, YieldRecord, FarmProfile

router = APIRouter(prefix="/api/stats", tags=["Stats"])


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    """Total counts for the dashboard stat cards."""
    total_chats = db.query(func.count(ChatMessage.id)).scalar() or 0
    total_uploads = db.query(func.count(Document.id)).scalar() or 0
    crop_preds = db.query(func.count(CropPrediction.id)).scalar() or 0
    yield_preds = db.query(func.count(YieldPrediction.id)).scalar() or 0

    return {
        "total_chats": total_chats,
        "total_uploads": total_uploads,
        "total_predictions": crop_preds + yield_preds,
    }


@router.get("/history")
def get_history(db: Session = Depends(get_db)):
    """
    Activity over the last 7 days, grouped by day.
    Returns a list of {label, chats, predictions, uploads}.
    """
    now = datetime.utcnow()
    days = [(now - timedelta(days=i)).date() for i in range(6, -1, -1)]

    # Fetch events in the last 7 days
    cutoff = now - timedelta(days=7)
    events = (
        db.query(AnalyticsEvent)
        .filter(AnalyticsEvent.created_at >= cutoff)
        .all()
    )

    # Aggregate by day and type
    counts: dict[str, dict[str, int]] = defaultdict(lambda: {"chat": 0, "prediction": 0, "upload": 0})
    for ev in events:
        day_str = ev.created_at.strftime("%a")
        if ev.event_type == "chat":
            counts[ev.created_at.date().isoformat()]["chat"] += 1
        elif ev.event_type == "prediction":
            counts[ev.created_at.date().isoformat()]["prediction"] += 1
        elif ev.event_type == "upload":
            counts[ev.created_at.date().isoformat()]["upload"] += 1

    result = []
    for day in days:
        iso = day.isoformat()
        label = day.strftime("%a")  # Mon, Tue, …
        c = counts.get(iso, {})
        result.append({
            "label": label,
            "chats": c.get("chat", 0),
            "predictions": c.get("prediction", 0),
            "uploads": c.get("upload", 0),
        })

    return result


@router.get("/breakdown")
def get_breakdown(db: Session = Depends(get_db)):
    """All-time usage breakdown by event type — for the pie chart."""
    rows = (
        db.query(AnalyticsEvent.event_type, func.count(AnalyticsEvent.id))
        .group_by(AnalyticsEvent.event_type)
        .all()
    )

    label_map = {
        "chat": "Chats",
        "prediction": "Predictions",
        "upload": "Uploads",
        "rag_query": "Doc Queries",
        "irrigation": "Irrigation",
    }

    return [
        {"name": label_map.get(row[0], row[0].capitalize()), "value": row[1]}
        for row in rows
        if row[1] > 0
    ]


@router.get("/weekly-yields")
def get_weekly_yields(db: Session = Depends(get_db)):
    """
    Get current week and previous week yield data grouped by crop with farm details.
    Returns comprehensive yield analytics including current/previous week comparison.
    """
    now = datetime.utcnow()
    
    # Get current week (last 7 days) and previous week
    current_week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    previous_week_start = current_week_start - timedelta(days=7)
    
    # Fetch yield records
    current_yields = db.query(YieldRecord).filter(
        YieldRecord.created_at >= current_week_start,
        YieldRecord.created_at < current_week_start + timedelta(days=7)
    ).all()
    
    previous_yields = db.query(YieldRecord).filter(
        YieldRecord.created_at >= previous_week_start,
        YieldRecord.created_at < previous_week_start + timedelta(days=7)
    ).all()
    
    # Get all farm profiles for reference
    farms = db.query(FarmProfile).all()
    farm_map = {f.id: f for f in farms}
    
    # Aggregate current week data by crop
    current_by_crop = defaultdict(lambda: {"yields": [], "total": 0, "count": 0, "farms": []})
    for record in current_yields:
        crop = record.crop
        current_by_crop[crop]["yields"].append(record.yield_kg_per_ha)
        current_by_crop[crop]["total"] += record.yield_kg_per_ha
        current_by_crop[crop]["count"] += 1
        
        if record.farm_id and record.farm_id in farm_map:
            farm = farm_map[record.farm_id]
            if farm.name not in current_by_crop[crop]["farms"]:
                current_by_crop[crop]["farms"].append(farm.name)
    
    # Aggregate previous week data by crop
    previous_by_crop = defaultdict(lambda: {"yields": [], "total": 0, "count": 0})
    for record in previous_yields:
        crop = record.crop
        previous_by_crop[crop]["yields"].append(record.yield_kg_per_ha)
        previous_by_crop[crop]["total"] += record.yield_kg_per_ha
        previous_by_crop[crop]["count"] += 1
    
    # Build response
    crops_data = []
    for crop in sorted(current_by_crop.keys()):
        current = current_by_crop[crop]
        previous = previous_by_crop.get(crop, {"total": 0, "count": 0, "yields": []})
        
        current_avg = current["total"] / current["count"] if current["count"] > 0 else 0
        previous_avg = previous["total"] / previous["count"] if previous["count"] > 0 else 0
        
        # Calculate percentage change
        change_percent = 0
        if previous_avg > 0:
            change_percent = ((current_avg - previous_avg) / previous_avg) * 100
        
        crops_data.append({
            "crop": crop,
            "current_week": {
                "average": round(current_avg, 2),
                "count": current["count"],
                "min": round(min(current["yields"]), 2) if current["yields"] else 0,
                "max": round(max(current["yields"]), 2) if current["yields"] else 0,
                "total": round(current["total"], 2),
            },
            "previous_week": {
                "average": round(previous_avg, 2),
                "count": previous["count"],
            },
            "change_percent": round(change_percent, 2),
            "farms": current["farms"],
        })
    
    return {
        "current_week": current_week_start.isoformat(),
        "previous_week": previous_week_start.isoformat(),
        "crops": crops_data,
        "total_records_current": len(current_yields),
        "total_records_previous": len(previous_yields),
    }
