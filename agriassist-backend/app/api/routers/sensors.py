"""
Sensor data API — receive readings from IoT devices or manual entry.
"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.db.models import SensorReading

router = APIRouter(prefix="/api/sensors", tags=["Sensors"])


class SensorDataRequest(BaseModel):
    sensor_type: str
    value: float
    unit: Optional[str] = None
    device_id: Optional[str] = None


@router.post("/data")
def receive_sensor_data(req: SensorDataRequest, db: Session = Depends(get_db)):
    """Accept a single sensor reading (from IoT device or manual entry)."""
    reading = SensorReading(
        sensor_type=req.sensor_type,
        value=req.value,
        unit=req.unit,
        device_id=req.device_id,
    )
    db.add(reading)
    db.commit()
    return {"status": "ok", "id": reading.id}


@router.get("/readings")
def get_sensor_readings(
    sensor_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(SensorReading).order_by(SensorReading.created_at.desc())
    if sensor_type:
        q = q.filter_by(sensor_type=sensor_type)
    readings = q.limit(limit).all()
    # Do NOT expose `device_id` or other private identifiers in API responses.
    # Normalize timestamp key to `timestamp` which the frontend expects.
    return {
        "readings": [
            {
                "id": r.id,
                "sensor_type": r.sensor_type,
                "value": r.value,
                "unit": r.unit,
                "timestamp": r.created_at,
            }
            for r in readings
        ]
    }


@router.get("/webhook-url")
def get_webhook_url(request: Request):
    """Return a path-only webhook endpoint to avoid exposing host/network details.

    Devices can POST to this path relative to their network context. If a
    full URL is required, construct it on the device side using the device's
    accessible host information rather than relying on the server to reveal
    internal hostnames or addresses.
    """
    return {"webhook_url": "/api/sensors/data"}
