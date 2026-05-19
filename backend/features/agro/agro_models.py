import uuid
from datetime import datetime
from typing import Optional, Dict, List
from sqlalchemy import Column, String, Float, DateTime, Boolean, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from geoalchemy2 import Geometry
import enum

AgroBase = declarative_base()


class AgroAlertSeverity(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class AgroAlertType(str, enum.Enum):
    flood = "flood"
    drought = "drought"
    frost = "frost"
    heatwave = "heatwave"
    cyclone = "cyclone"
    pest = "pest"
    disease = "disease"
    irrigation_due = "irrigation_due"
    spray_window = "spray_window"
    harvest_window = "harvest_window"
    yield_update = "yield_update"


class AgroFarmer(AgroBase):
    __tablename__ = "agro_farmers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), unique=True, nullable=False)
    region = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    language_pref = Column(String(10), default="en")
    alert_channels = Column(JSONB, default={"sms": True, "whatsapp": True, "push": True})
    device_tokens = Column(JSONB, default=[])
    quiet_hours_start = Column(String(5), default="22:00")
    quiet_hours_end = Column(String(5), default="06:00")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class AgroFarmZone(AgroBase):
    __tablename__ = "agro_farm_zones"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id = Column(UUID(as_uuid=True), ForeignKey("agro_farmers.id"), nullable=False)
    name = Column(String(100), nullable=False)
    boundary = Column(Geometry("POLYGON", srid=4326))
    area_hectares = Column(Float)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    soil_type = Column(String(50))
    soil_ph = Column(Float)
    elevation_m = Column(Float)
    irrigation_type = Column(String(30))
    current_crop_id = Column(UUID(as_uuid=True), ForeignKey("agro_crops.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class AgroCrop(AgroBase):
    __tablename__ = "agro_crops"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    variety = Column(String(100))
    duration_days = Column(Float)
    water_req_mm = Column(Float)
    temp_min_c = Column(Float)
    temp_max_c = Column(Float)
    humidity_min_pct = Column(Float)
    humidity_max_pct = Column(Float)
    disease_susceptibility = Column(JSONB, default={})
    growth_stages = Column(JSONB, default=[])
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class AgroWeatherReading(AgroBase):
    __tablename__ = "agro_weather_readings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("agro_farm_zones.id"), nullable=False)
    reading_time = Column(DateTime(timezone=True), nullable=False, index=True)
    source = Column(String(30), default="openweather")
    temp_c = Column(Float)
    humidity_pct = Column(Float)
    rainfall_mm = Column(Float, default=0.0)
    wind_kmh = Column(Float)
    wind_direction_deg = Column(Float)
    uv_index = Column(Float)
    soil_moisture_pct = Column(Float)
    soil_temp_c = Column(Float)
    pressure_hpa = Column(Float)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class AgroYieldPrediction(AgroBase):
    __tablename__ = "agro_yield_predictions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("agro_farm_zones.id"), nullable=False)
    crop_id = Column(UUID(as_uuid=True), ForeignKey("agro_crops.id"), nullable=False)
    sowing_date = Column(DateTime(timezone=True))
    predicted_kg_per_ha = Column(Float)
    confidence_pct = Column(Float)
    risk_factors = Column(JSONB, default={})
    model_version = Column(String(20))
    features_snapshot = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class AgroAlert(AgroBase):
    __tablename__ = "agro_alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id = Column(UUID(as_uuid=True), ForeignKey("agro_farmers.id"), nullable=False)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("agro_farm_zones.id"), nullable=True)
    alert_type = Column(SAEnum(AgroAlertType), nullable=False)
    severity = Column(SAEnum(AgroAlertSeverity), nullable=False)
    message_en = Column(Text, nullable=False)
    message_translated = Column(Text)
    language_sent = Column(String(10))
    channels_sent = Column(JSONB, default=[])
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class AgroTask(AgroBase):
    __tablename__ = "agro_tasks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id = Column(UUID(as_uuid=True), ForeignKey("agro_farmers.id"), nullable=False)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("agro_farm_zones.id"), nullable=True)
    task_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    due_date = Column(DateTime(timezone=True), nullable=False)
    priority = Column(String(10), default="medium")
    weather_dependent = Column(Boolean, default=True)
    best_weather_window = Column(JSONB, default={})
    completed_at = Column(DateTime(timezone=True), nullable=True)
    yield_impact_pct = Column(Float, default=0.0)
    ai_generated = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class AgroIrrigationSchedule(AgroBase):
    __tablename__ = "agro_irrigation_schedules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("agro_farm_zones.id"), nullable=False)
    scheduled_start = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Float)
    water_volume_litres = Column(Float)
    et0_mm = Column(Float)
    soil_moisture_before_pct = Column(Float)
    soil_moisture_after_pct = Column(Float)
    source = Column(String(20), default="ai")
    executed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class AgroDiseaseScan(AgroBase):
    __tablename__ = "agro_disease_scans"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("agro_farm_zones.id"), nullable=False)
    crop_id = Column(UUID(as_uuid=True), ForeignKey("agro_crops.id"), nullable=True)
    image_url = Column(String(500))
    detected_diseases = Column(JSONB, default=[])
    confidence_scores = Column(JSONB, default={})
    weather_context = Column(JSONB, default={})
    treatment_recommended = Column(Text)
    scan_result_raw = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)