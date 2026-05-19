from datetime import datetime, timedelta
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..agro_models import (
    AgroWeatherReading, AgroYieldPrediction, AgroAlert,
    AgroTask, AgroIrrigationSchedule, AgroFarmZone
)


def agro_get_dashboard_data(db: Session, farmer_id: UUID) -> Dict[str, Any]:
    zones = db.query(AgroFarmZone).filter(AgroFarmZone.farmer_id == farmer_id).all()
    zone_ids = [z.id for z in zones]
    now = datetime.utcnow()
    since_30d = now - timedelta(days=30)
    since_7d = now - timedelta(days=7)
    active_alerts = db.query(AgroAlert).filter(
        AgroAlert.farmer_id == farmer_id,
        AgroAlert.is_active == True,
    ).count()
    pending_tasks = db.query(AgroTask).filter(
        AgroTask.farmer_id == farmer_id,
        AgroTask.completed_at == None,
        AgroTask.due_date >= now,
    ).count()
    weather_trend = []
    if zone_ids:
        readings = db.query(AgroWeatherReading).filter(
            AgroWeatherReading.zone_id.in_(zone_ids),
            AgroWeatherReading.reading_time >= since_30d,
        ).order_by(AgroWeatherReading.reading_time).all()
        daily: Dict[str, list] = {}
        for r in readings:
            day = r.reading_time.strftime("%Y-%m-%d")
            if day not in daily:
                daily[day] = []
            daily[day].append(r.temp_c or 0)
        weather_trend = [{"date": d, "avg_temp_c": round(sum(t) / len(t), 1)} for d, t in daily.items()]
    yield_predictions = []
    if zone_ids:
        preds = db.query(AgroYieldPrediction).filter(
            AgroYieldPrediction.zone_id.in_(zone_ids)
        ).order_by(AgroYieldPrediction.created_at.desc()).limit(10).all()
        yield_predictions = [
            {
                "zone_id": str(p.zone_id),
                "predicted_kg_per_ha": p.predicted_kg_per_ha,
                "confidence_pct": p.confidence_pct,
                "created_at": p.created_at.isoformat(),
            }
            for p in preds
        ]
    return {
        "farmer_id": str(farmer_id),
        "zones_count": len(zones),
        "active_alerts": active_alerts,
        "pending_tasks": pending_tasks,
        "weather_trend_30d": weather_trend,
        "yield_predictions": yield_predictions,
        "generated_at": now.isoformat(),
    }