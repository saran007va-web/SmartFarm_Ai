from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import UUID
from ..agro_database import get_agro_db
from ..agro_models import AgroFarmZone, AgroCrop, AgroWeatherReading, AgroYieldPrediction
from ..agro_schemas import AgroYieldPredictRequest, AgroYieldPredictResponse
from .agro_yield_service import agro_assemble_yield_features, agro_predict_yield

router = APIRouter()


@router.post("/predict", response_model=AgroYieldPredictResponse)
def predict_yield(req: AgroYieldPredictRequest, db: Session = Depends(get_agro_db)):
    zone = db.query(AgroFarmZone).filter(AgroFarmZone.id == req.zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Farm zone not found")
    crop = db.query(AgroCrop).filter(AgroCrop.id == req.crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    since = datetime.utcnow() - timedelta(days=30)
    readings = db.query(AgroWeatherReading).filter(
        AgroWeatherReading.zone_id == req.zone_id,
        AgroWeatherReading.reading_time >= since
    ).all()
    avg_temp = sum(r.temp_c for r in readings if r.temp_c) / max(len(readings), 1)
    avg_rain = sum(r.rainfall_mm for r in readings if r.rainfall_mm) / max(len(readings), 1) * 30
    avg_humidity = sum(r.humidity_pct for r in readings if r.humidity_pct) / max(len(readings), 1)
    features = agro_assemble_yield_features(
        soil_type=zone.soil_type,
        soil_ph=zone.soil_ph,
        area_ha=zone.area_hectares,
        avg_temp_c=avg_temp or 25,
        avg_rainfall_mm=avg_rain or 50,
        avg_humidity_pct=avg_humidity or 65,
        crop_duration_days=crop.duration_days,
        crop_water_req_mm=crop.water_req_mm,
    )
    predicted_kg, confidence, risk_factors = agro_predict_yield(features)
    record = AgroYieldPrediction(
        zone_id=req.zone_id,
        crop_id=req.crop_id,
        sowing_date=req.sowing_date,
        predicted_kg_per_ha=predicted_kg,
        confidence_pct=confidence,
        risk_factors=risk_factors,
        model_version="v1_heuristic",
    )
    db.add(record)
    db.commit()
    return AgroYieldPredictResponse(
        zone_id=req.zone_id,
        crop_id=req.crop_id,
        predicted_kg_per_ha=predicted_kg,
        confidence_pct=confidence,
        risk_factors=risk_factors,
        model_version="v1_heuristic",
        generated_at=datetime.utcnow(),
    )