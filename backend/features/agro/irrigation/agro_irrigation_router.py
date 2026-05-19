from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import UUID
from ..agro_database import get_agro_db
from ..agro_models import AgroFarmZone, AgroWeatherReading
from ..agro_schemas import AgroIrrigationScheduleRequest, AgroIrrigationScheduleResponse
from .agro_irrigation_optimizer import agro_generate_irrigation_schedule
from ..weather.agro_weather_service import agro_fetch_forecast

router = APIRouter()


@router.post("/schedule", response_model=AgroIrrigationScheduleResponse)
async def get_irrigation_schedule(req: AgroIrrigationScheduleRequest, db: Session = Depends(get_agro_db)):
    zone = db.query(AgroFarmZone).filter(AgroFarmZone.id == req.zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Farm zone not found")
    latest = db.query(AgroWeatherReading).filter(
        AgroWeatherReading.zone_id == req.zone_id
    ).order_by(AgroWeatherReading.reading_time.desc()).first()
    soil_moisture = latest.soil_moisture_pct if latest and latest.soil_moisture_pct else 30.0
    forecast = await agro_fetch_forecast(zone.latitude, zone.longitude, req.days_ahead)
    schedules = agro_generate_irrigation_schedule(
        zone_id=str(req.zone_id),
        soil_moisture_pct=soil_moisture,
        forecast_days=forecast,
        area_hectares=zone.area_hectares or 1.0,
    )
    baseline_irrigations = req.days_ahead
    optimized_irrigations = len(schedules)
    savings_pct = round(max(0, (baseline_irrigations - optimized_irrigations) / max(baseline_irrigations, 1) * 100), 1)
    return AgroIrrigationScheduleResponse(
        zone_id=req.zone_id,
        schedules=schedules,
        water_savings_pct=savings_pct,
        generated_at=datetime.utcnow(),
    )