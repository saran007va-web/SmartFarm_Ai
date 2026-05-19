from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timedelta
from ..agro_database import get_agro_db
from ..agro_models import AgroFarmZone, AgroWeatherReading
from ..agro_schemas import AgroRiskScoreResponse
from .agro_risk_scorer import agro_score_zone_risk

router = APIRouter()


@router.get("/score/{zone_id}", response_model=AgroRiskScoreResponse)
def get_risk_score(zone_id: UUID, db: Session = Depends(get_agro_db)):
    zone = db.query(AgroFarmZone).filter(AgroFarmZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Farm zone not found")
    since = datetime.utcnow() - timedelta(days=7)
    readings = db.query(AgroWeatherReading).filter(
        AgroWeatherReading.zone_id == zone_id,
        AgroWeatherReading.reading_time >= since
    ).all()
    weather_data: dict = {
        "elevation_m": zone.elevation_m or 50,
        "rainfall_7d_mm": sum(r.rainfall_mm or 0 for r in readings),
        "rainfall_24h_mm": sum(r.rainfall_mm or 0 for r in readings[-8:]),
        "rainfall_72h_mm": sum(r.rainfall_mm or 0 for r in readings[-24:]),
    }
    if readings:
        latest = readings[-1]
        weather_data.update({
            "temp_c": latest.temp_c or 25,
            "humidity_pct": latest.humidity_pct or 60,
            "soil_moisture_pct": latest.soil_moisture_pct or 35,
        })
    scores = agro_score_zone_risk(weather_data)
    return AgroRiskScoreResponse(zone_id=zone_id, **scores)