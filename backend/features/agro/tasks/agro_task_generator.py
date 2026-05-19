from datetime import datetime, timedelta
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from ..agro_models import AgroTask, AgroFarmZone, AgroCrop, AgroWeatherReading


TASK_TEMPLATES = {
    "irrigation": {
        "title": "Irrigate fields",
        "description": "Water the fields based on soil moisture readings and ET0 calculation.",
        "priority": "high",
        "weather_dependent": True,
        "optimal_conditions": {"rain_threshold_mm": 5, "time": "06:00"},
    },
    "fertilizer": {
        "title": "Apply fertilizer",
        "description": "Apply scheduled fertilizer dose. Avoid application before rain.",
        "priority": "medium",
        "weather_dependent": True,
        "optimal_conditions": {"rain_threshold_mm": 2, "wind_kmh_max": 15},
    },
    "spray_pesticide": {
        "title": "Spray pesticide / fungicide",
        "description": "Apply crop protection spray. Best done in calm, dry conditions.",
        "priority": "high",
        "weather_dependent": True,
        "optimal_conditions": {"rain_threshold_mm": 0, "wind_kmh_max": 10, "time": "07:00-10:00"},
    },
    "soil_check": {
        "title": "Check soil moisture and health",
        "description": "Manual soil inspection. Record pH, moisture, and condition.",
        "priority": "low",
        "weather_dependent": False,
        "optimal_conditions": {},
    },
    "weed_control": {
        "title": "Weed control",
        "description": "Remove or spray weeds before they compete with the crop.",
        "priority": "medium",
        "weather_dependent": False,
        "optimal_conditions": {},
    },
}


def agro_generate_task_calendar(
    db: Session,
    farmer_id: UUID,
    zone_id: UUID,
    days_ahead: int = 14,
) -> List[AgroTask]:
    zone = db.query(AgroFarmZone).filter(AgroFarmZone.id == zone_id).first()
    if not zone:
        return []
    latest_reading = db.query(AgroWeatherReading).filter(
        AgroWeatherReading.zone_id == zone_id
    ).order_by(AgroWeatherReading.reading_time.desc()).first()
    soil_moisture = latest_reading.soil_moisture_pct if latest_reading and latest_reading.soil_moisture_pct else 30.0
    tasks = []
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    if soil_moisture < 25:
        template = TASK_TEMPLATES["irrigation"]
        task = AgroTask(
            farmer_id=farmer_id,
            zone_id=zone_id,
            task_type="irrigation",
            title=template["title"],
            description=f"{template['description']} Soil moisture currently {soil_moisture:.0f}%.",
            due_date=today + timedelta(days=1),
            priority="high",
            weather_dependent=True,
            best_weather_window={"time": "06:00", "reason": "Low evaporation before sunrise"},
            yield_impact_pct=8.0,
        )
        tasks.append(task)
    for i in [3, 10]:
        template = TASK_TEMPLATES["soil_check"]
        task = AgroTask(
            farmer_id=farmer_id,
            zone_id=zone_id,
            task_type="soil_check",
            title=template["title"],
            description=template["description"],
            due_date=today + timedelta(days=i),
            priority="low",
            weather_dependent=False,
            best_weather_window={},
            yield_impact_pct=2.0,
        )
        tasks.append(task)
    for task in tasks:
        existing = db.query(AgroTask).filter(
            AgroTask.zone_id == zone_id,
            AgroTask.task_type == task.task_type,
            AgroTask.due_date == task.due_date,
            AgroTask.completed_at == None,
        ).first()
        if not existing:
            db.add(task)
    db.commit()
    return tasks