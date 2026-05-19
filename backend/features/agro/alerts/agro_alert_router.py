from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from ..agro_database import get_agro_db
from ..agro_models import AgroAlert
from ..agro_schemas import AgroAlertResponse

router = APIRouter()


@router.get("/active/{farmer_id}", response_model=list[AgroAlertResponse])
def get_active_alerts(farmer_id: UUID, db: Session = Depends(get_agro_db)):
    alerts = db.query(AgroAlert).filter(
        AgroAlert.farmer_id == farmer_id,
        AgroAlert.is_active == True,
    ).order_by(AgroAlert.created_at.desc()).limit(50).all()
    return alerts


@router.patch("/{alert_id}/ack")
def acknowledge_alert(alert_id: UUID, db: Session = Depends(get_agro_db)):
    alert = db.query(AgroAlert).filter(AgroAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    return {"status": "acknowledged", "alert_id": str(alert_id)}