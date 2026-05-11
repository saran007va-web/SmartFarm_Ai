"""
SQLAlchemy ORM models for all database tables.
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Text, DateTime,
    Boolean, ForeignKey, JSON, Index
)
from sqlalchemy.orm import relationship
from app.db.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), default="Unnamed Session")
    device_id = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("chat_sessions.session_id", ondelete="CASCADE"), index=True)
    role = Column(String(16), nullable=False)   # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(512), nullable=False)
    file_type = Column(String(16))
    file_path = Column(String(1024), nullable=True)  # Path to stored file
    file_size = Column(Integer, default=0)  # File size in bytes
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    chunks = relationship("RagChunk", back_populates="document", cascade="all, delete-orphan")


class RagChunk(Base):
    __tablename__ = "rag_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    chunk_index = Column(Integer)
    content = Column(Text, nullable=False)
    faiss_index_id = Column(Integer)            # maps to FAISS vector position

    document = relationship("Document", back_populates="chunks")


class CropPrediction(Base):
    __tablename__ = "crop_predictions"

    id = Column(Integer, primary_key=True, index=True)
    nitrogen = Column(Float)
    phosphorus = Column(Float)
    potassium = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    ph = Column(Float)
    rainfall = Column(Float)
    recommended_crop = Column(String(64))
    confidence = Column(Float)
    alternatives = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class YieldPrediction(Base):
    __tablename__ = "yield_predictions"

    id = Column(Integer, primary_key=True, index=True)
    crop_name = Column(String(64))
    area_hectares = Column(Float)
    fertilizer_kg = Column(Float)
    pesticide_kg = Column(Float)
    annual_rainfall_mm = Column(Float)
    predicted_yield_kg_per_ha = Column(Float)
    total_production_kg = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64), index=True)  # chat | prediction | upload | irrigation | etc.
    detail = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_analytics_events_created_at", "created_at"),
    )


class FarmProfile(Base):
    __tablename__ = "farm_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    area_ha = Column(Float, nullable=True)
    soil_type = Column(String(64), nullable=True)
    primary_crop = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class YieldRecord(Base):
    __tablename__ = "yield_records"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farm_profiles.id", ondelete="SET NULL"), nullable=True)
    crop = Column(String(64), nullable=False)
    year = Column(Integer, nullable=False)
    yield_kg_per_ha = Column(Float, nullable=False)
    area_ha = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class IrrigationLog(Base):
    __tablename__ = "irrigation_logs"

    id = Column(Integer, primary_key=True, index=True)
    crop = Column(String(64))
    soil_moisture = Column(Float)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    advice = Column(Text)
    urgency = Column(String(16))
    water_amount_mm = Column(Float, nullable=True)
    next_irrigation = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    sensor_type = Column(String(64), index=True)
    value = Column(Float, nullable=False)
    unit = Column(String(16), nullable=True)
    device_id = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(128), unique=True, index=True, nullable=False)
    preferences = Column(JSON, default=dict)
    learned_context = Column(JSON, default=dict)
    total_chats = Column(Integer, default=0)
    total_predictions = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MessageFeedback(Base):
    __tablename__ = "message_feedback"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), nullable=True)
    message_index = Column(Integer, nullable=True)
    rating = Column(Integer, nullable=True)  # 1=up, -1=down
    correction = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CropPlan(Base):
    __tablename__ = "crop_plans"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farm_profiles.id", ondelete="SET NULL"), nullable=True)
    crop_name = Column(String(64), nullable=False, index=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    duration_days = Column(Integer, nullable=True)
    growth_stages = Column(JSON, default=list)
    status = Column(String(32), default="active")
    area_ha = Column(Float, nullable=True)
    expected_yield_kg_per_ha = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tasks = relationship("MaintenanceTask", back_populates="crop_plan", cascade="all, delete-orphan")


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(Integer, primary_key=True, index=True)
    crop_plan_id = Column(Integer, ForeignKey("crop_plans.id", ondelete="CASCADE"), index=True)
    title = Column(String(255), nullable=True)
    task_date = Column(DateTime, nullable=False, index=True)
    start_time = Column(String(16), nullable=True)
    end_time = Column(String(16), nullable=True)
    task_type = Column(String(32), nullable=False)  # watering, fertilizer, pesticide, weeding, pruning, harvesting, etc.
    description = Column(Text, nullable=True)
    quantity = Column(Float, nullable=True)  # for watering (mm), fertilizer (kg), pesticide (ml), etc.
    unit = Column(String(16), nullable=True)  # mm, kg, ml, hrs, etc.
    priority = Column(String(16), default="medium")
    status = Column(String(16), default="planned")
    reminder_minutes = Column(Integer, nullable=True)
    assigned_crop = Column(String(64), nullable=True)
    growth_stage = Column(String(64), nullable=True)
    plan_day_offset = Column(Integer, nullable=True)
    is_auto_generated = Column(Boolean, default=False)
    completed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    crop_plan = relationship("CropPlan", back_populates="tasks")
