from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class AgroFarmerCreate(BaseModel):
    name: str
    phone: str
    region: str
    state: str
    language_pref: str = "en"
    alert_channels: Dict[str, bool] = {"sms": True, "whatsapp": True, "push": True}


class AgroFarmerResponse(AgroFarmerCreate):
    id: UUID
    created_at: datetime
    class Config:
        from_attributes = True


class AgroFarmZoneCreate(BaseModel):
    farmer_id: UUID
    name: str
    latitude: float
    longitude: float
    area_hectares: Optional[float] = None
    soil_type: Optional[str] = None
    soil_ph: Optional[float] = None
    elevation_m: Optional[float] = None
    irrigation_type: Optional[str] = None


class AgroFarmZoneResponse(AgroFarmZoneCreate):
    id: UUID
    created_at: datetime
    class Config:
        from_attributes = True


class AgroWeatherCurrentResponse(BaseModel):
    zone_id: UUID
    reading_time: datetime
    temp_c: Optional[float]
    humidity_pct: Optional[float]
    rainfall_mm: Optional[float]
    wind_kmh: Optional[float]
    uv_index: Optional[float]
    soil_moisture_pct: Optional[float]
    pressure_hpa: Optional[float]
    source: str


class AgroForecastDay(BaseModel):
    date: str
    temp_max_c: float
    temp_min_c: float
    rainfall_mm: float
    humidity_pct: float
    wind_kmh: float
    condition: str
    risk_level: str


class AgroWeatherForecastResponse(BaseModel):
    zone_id: UUID
    forecast_days: List[AgroForecastDay]
    generated_at: datetime


class AgroYieldPredictRequest(BaseModel):
    zone_id: UUID
    crop_id: UUID
    sowing_date: datetime


class AgroYieldPredictResponse(BaseModel):
    zone_id: UUID
    crop_id: UUID
    predicted_kg_per_ha: float
    confidence_pct: float
    risk_factors: Dict[str, Any]
    model_version: str
    generated_at: datetime


class AgroRiskScoreResponse(BaseModel):
    zone_id: UUID
    heat_risk: float = Field(ge=0, le=100)
    drought_risk: float = Field(ge=0, le=100)
    flood_risk: float = Field(ge=0, le=100)
    frost_risk: float = Field(ge=0, le=100)
    pest_risk: float = Field(ge=0, le=100)
    overall_risk: float = Field(ge=0, le=100)
    risk_level: str
    main_threats: List[str]
    scored_at: datetime


class AgroAlertResponse(BaseModel):
    id: UUID
    farmer_id: UUID
    zone_id: Optional[UUID]
    alert_type: str
    severity: str
    message_en: str
    message_translated: Optional[str]
    channels_sent: List[str]
    acknowledged_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


class AgroAlertAckRequest(BaseModel):
    alert_id: UUID


class AgroIrrigationScheduleRequest(BaseModel):
    zone_id: UUID
    days_ahead: int = 7


class AgroIrrigationScheduleResponse(BaseModel):
    zone_id: UUID
    schedules: List[Dict[str, Any]]
    water_savings_pct: float
    generated_at: datetime


class AgroTaskResponse(BaseModel):
    id: UUID
    task_type: str
    title: str
    description: Optional[str]
    due_date: datetime
    priority: str
    weather_dependent: bool
    best_weather_window: Dict[str, Any]
    completed_at: Optional[datetime]
    class Config:
        from_attributes = True


class AgroCropRecommendation(BaseModel):
    crop_id: UUID
    crop_name: str
    suitability_score: float
    expected_yield_kg_per_ha: float
    water_requirement_mm: float
    best_sowing_window: str
    climate_match_reasons: List[str]
    risk_warnings: List[str]


class AgroCropRecommendResponse(BaseModel):
    zone_id: UUID
    season: str
    recommendations: List[AgroCropRecommendation]
    generated_at: datetime


class AgroAdvisorChatRequest(BaseModel):
    farmer_id: UUID
    message: str
    history: List[Dict[str, str]] = []
    language: str = "en"


class AgroAdvisorChatResponse(BaseModel):
    reply: str
    reply_translated: Optional[str]
    sources: List[str]
    follow_up_questions: List[str]


class AgroDiseaseScanResponse(BaseModel):
    scan_id: UUID
    zone_id: UUID
    detected_diseases: List[str]
    confidence_scores: Dict[str, float]
    severity: str
    treatment_recommended: str
    spray_window: Optional[str]
    weather_context: Dict[str, Any]
    created_at: datetime