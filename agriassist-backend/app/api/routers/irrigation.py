"""
Irrigation advisor — LLM-powered advice + log persistence.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.db.models import IrrigationLog, AnalyticsEvent
from app.services.llm_service import generate_irrigation_advice

router = APIRouter(prefix="/api/irrigation", tags=["Irrigation"])


class IrrigationRequest(BaseModel):
    crop: str
    soil_moisture: float
    temperature: Optional[float] = None
    humidity: Optional[float] = None


@router.post("/advice")
async def get_irrigation_advice(req: IrrigationRequest, db: Session = Depends(get_db)):
    """Get LLM-generated irrigation advice and save it to the log."""
    result = await generate_irrigation_advice(
        crop=req.crop,
        soil_moisture=req.soil_moisture,
        temperature=req.temperature,
        humidity=req.humidity,
    )

    log = IrrigationLog(
        crop=req.crop,
        soil_moisture=req.soil_moisture,
        temperature=req.temperature,
        humidity=req.humidity,
        advice=result.get("advice", ""),
        urgency=result.get("urgency", "medium"),
        water_amount_mm=result.get("water_amount_mm"),
        next_irrigation=result.get("next_irrigation"),
    )
    db.add(log)
    db.add(AnalyticsEvent(event_type="irrigation", detail=req.crop))
    db.commit()

    # Normalize response keys expected by the frontend
    return {
        "recommendation": result.get("advice") or result.get("recommendation") or "",
        "action": result.get("reason") or result.get("action") or result.get("recommended_action") or "",
        "urgency": result.get("urgency", "medium"),
        "water_amount_mm": result.get("water_amount_mm"),
        "next_irrigation": result.get("next_irrigation"),
        "soil_moisture": req.soil_moisture,
        "crop": req.crop,
    }


@router.get("/logs")
def get_irrigation_logs(limit: int = 20, db: Session = Depends(get_db)):
    logs = (
        db.query(IrrigationLog)
        .order_by(IrrigationLog.created_at.desc())
        .limit(limit)
        .all()
    )
    # Return logs with keys frontend expects (`moisture_level`, `recommended_action`)
    return {
        "logs": [
            {
                "id": l.id,
                "crop": l.crop,
                "moisture_level": l.soil_moisture,
                "recommended_action": l.advice,
                "urgency": l.urgency,
                "water_amount_mm": l.water_amount_mm,
                "next_irrigation": l.next_irrigation,
                "created_at": l.created_at,
            }
            for l in logs
        ]
    }
