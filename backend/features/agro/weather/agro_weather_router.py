from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from ..agro_database import get_agro_db
from ..agro_models import AgroFarmZone, AgroWeatherReading
from ..agro_schemas import AgroWeatherCurrentResponse, AgroWeatherForecastResponse
from .agro_weather_service import agro_fetch_current_weather, agro_fetch_forecast

router = APIRouter()


@router.get("/current/{zone_id}", response_model=AgroWeatherCurrentResponse)
async def get_current_weather(zone_id: UUID, db: Session = Depends(get_agro_db)):
    zone = db.query(AgroFarmZone).filter(AgroFarmZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Farm zone not found")
    weather_data = await agro_fetch_current_weather(zone.latitude, zone.longitude)
    reading = AgroWeatherReading(zone_id=zone_id, **{k: v for k, v in weather_data.items() if k != "condition"})
    db.add(reading)
    db.commit()
    return AgroWeatherCurrentResponse(zone_id=zone_id, **weather_data)


@router.get("/forecast/{zone_id}", response_model=AgroWeatherForecastResponse)
async def get_weather_forecast(zone_id: UUID, days: int = 7, db: Session = Depends(get_agro_db)):
    zone = db.query(AgroFarmZone).filter(AgroFarmZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Farm zone not found")
    forecast = await agro_fetch_forecast(zone.latitude, zone.longitude, days)
    return AgroWeatherForecastResponse(zone_id=zone_id, forecast_days=forecast, generated_at=datetime.utcnow())