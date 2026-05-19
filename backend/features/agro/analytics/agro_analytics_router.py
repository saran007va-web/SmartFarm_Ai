from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from ..agro_database import get_agro_db
from .agro_analytics_service import agro_get_dashboard_data

router = APIRouter()


@router.get("/dashboard/{farmer_id}")
def get_dashboard(farmer_id: UUID, db: Session = Depends(get_agro_db)):
    return agro_get_dashboard_data(db, farmer_id)