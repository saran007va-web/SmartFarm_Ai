"""
Prediction API router — crop recommendation and yield prediction.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import CropPrediction, YieldPrediction, AnalyticsEvent
from app.ml.crop_model import predict_crop, get_crops_list
from app.ml.yield_model import predict_yield

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/predict", tags=["Predictions"])


class CropRequest(BaseModel):
    nitrogen: float = Field(..., ge=0, le=200)
    phosphorus: float = Field(..., ge=0, le=200)
    potassium: float = Field(..., ge=0, le=200)
    temperature: float = Field(..., ge=-10, le=60)
    humidity: float = Field(..., ge=0, le=100)
    ph: float = Field(..., ge=0, le=14)
    rainfall: float = Field(..., ge=0, le=500)


class YieldRequest(BaseModel):
    crop_name: str
    area_hectares: float = Field(..., gt=0)
    fertilizer_kg: float = Field(..., ge=0)
    pesticide_kg: float = Field(..., ge=0)
    annual_rainfall_mm: float = Field(..., ge=0)


@router.post("/crop")
def crop_recommendation(req: CropRequest, db: Session = Depends(get_db)):
    """Predict the best crop for given soil and climate conditions."""
    try:
        result = predict_crop(
            nitrogen=req.nitrogen,
            phosphorus=req.phosphorus,
            potassium=req.potassium,
            temperature=req.temperature,
            humidity=req.humidity,
            ph=req.ph,
            rainfall=req.rainfall,
        )
    except Exception as e:
        logger.error(f"Crop prediction error: {e}")
        raise HTTPException(status_code=500, detail="Crop prediction failed. Please try again.")

    # Save to DB
    db.add(CropPrediction(
        nitrogen=req.nitrogen, phosphorus=req.phosphorus, potassium=req.potassium,
        temperature=req.temperature, humidity=req.humidity, ph=req.ph, rainfall=req.rainfall,
        recommended_crop=result["recommended_crop"],
        confidence=result["confidence"],
        alternatives=result["alternatives"],
    ))
    db.add(AnalyticsEvent(event_type="prediction", detail=f"crop:{result['recommended_crop']}"))
    db.commit()

    return result


@router.post("/yield")
def yield_prediction(req: YieldRequest, db: Session = Depends(get_db)):
    """Predict yield kg/ha and total production."""
    try:
        result = predict_yield(
            crop_name=req.crop_name,
            area_hectares=req.area_hectares,
            fertilizer_kg=req.fertilizer_kg,
            pesticide_kg=req.pesticide_kg,
            annual_rainfall_mm=req.annual_rainfall_mm,
        )
    except Exception as e:
        logger.error(f"Yield prediction error: {e}")
        raise HTTPException(status_code=500, detail="Yield prediction failed. Please try again.")

    db.add(YieldPrediction(
        crop_name=req.crop_name, area_hectares=req.area_hectares,
        fertilizer_kg=req.fertilizer_kg, pesticide_kg=req.pesticide_kg,
        annual_rainfall_mm=req.annual_rainfall_mm,
        predicted_yield_kg_per_ha=result["predicted_yield_kg_per_ha"],
        total_production_kg=result["total_production_kg"],
    ))
    db.add(AnalyticsEvent(event_type="prediction", detail=f"yield:{req.crop_name}"))
    db.commit()

    return result


@router.get("/crops/list")
def crops_list():
    """Return the list of supported crops."""
    return {"crops": get_crops_list()}
