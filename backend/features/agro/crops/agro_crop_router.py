from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID
from ..agro_database import get_agro_db
from ..agro_schemas import AgroCropRecommendResponse
from .agro_crop_engine import agro_recommend_crops

router = APIRouter()


@router.get("/recommend/{zone_id}", response_model=AgroCropRecommendResponse)
def recommend_crops(zone_id: UUID, db: Session = Depends(get_agro_db)):
    recommendations = agro_recommend_crops(db, zone_id)
    if not recommendations:
        raise HTTPException(status_code=404, detail="Zone not found or no crops available")
    from datetime import datetime
    month = datetime.utcnow().month
    season = "kharif" if 4 <= month <= 9 else "rabi"
    return AgroCropRecommendResponse(
        zone_id=zone_id,
        season=season,
        recommendations=recommendations,
        generated_at=datetime.utcnow(),
    )