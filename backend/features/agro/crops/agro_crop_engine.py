from datetime import datetime
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from ..agro_models import AgroCrop, AgroFarmZone, AgroWeatherReading
from ..agro_schemas import AgroCropRecommendation


CROP_SOWING_WINDOWS = {
    "rice":     {"kharif": "Jun-Jul", "rabi": None},
    "wheat":    {"kharif": None, "rabi": "Nov-Dec"},
    "cotton":   {"kharif": "Apr-May", "rabi": None},
    "maize":    {"kharif": "Jun-Jul", "rabi": "Oct-Nov"},
    "soybean":  {"kharif": "Jun-Jul", "rabi": None},
    "tomato":   {"kharif": "Jun-Jul", "rabi": "Oct-Nov"},
    "onion":    {"kharif": "Jun-Jul", "rabi": "Oct-Nov"},
}


def agro_score_crop_suitability(
    crop: AgroCrop,
    avg_temp_c: float,
    rainfall_mm: float,
    soil_type: str,
    soil_ph: float,
) -> float:
    score = 100.0
    if crop.temp_min_c and avg_temp_c < crop.temp_min_c:
        score -= (crop.temp_min_c - avg_temp_c) * 8
    if crop.temp_max_c and avg_temp_c > crop.temp_max_c:
        score -= (avg_temp_c - crop.temp_max_c) * 8
    if crop.water_req_mm:
        water_ratio = rainfall_mm / crop.water_req_mm
        if water_ratio < 0.5:
            score -= 30
        elif water_ratio > 2.0:
            score -= 15
    if soil_ph:
        if soil_ph < 5.5 or soil_ph > 8.0:
            score -= 20
        elif soil_ph < 6.0 or soil_ph > 7.5:
            score -= 10
    return round(max(0, min(score, 100)), 1)


def agro_recommend_crops(
    db: Session,
    zone_id: UUID,
    top_n: int = 5,
) -> List[AgroCropRecommendation]:
    zone = db.query(AgroFarmZone).filter(AgroFarmZone.id == zone_id).first()
    if not zone:
        return []
    readings = db.query(AgroWeatherReading).filter(
        AgroWeatherReading.zone_id == zone_id
    ).order_by(AgroWeatherReading.reading_time.desc()).limit(90).all()
    avg_temp = sum(r.temp_c for r in readings if r.temp_c) / max(len(readings), 1) if readings else 27
    avg_rain = sum(r.rainfall_mm for r in readings if r.rainfall_mm) / max(len(readings), 1) * 90 if readings else 300
    crops = db.query(AgroCrop).all()
    scored = []
    for crop in crops:
        score = agro_score_crop_suitability(
            crop=crop,
            avg_temp_c=avg_temp,
            rainfall_mm=avg_rain,
            soil_type=zone.soil_type or "loamy",
            soil_ph=zone.soil_ph or 6.5,
        )
        month = datetime.utcnow().month
        season = "kharif" if 4 <= month <= 9 else "rabi"
        sowing_window_map = CROP_SOWING_WINDOWS.get(crop.name.lower(), {})
        sowing_window = sowing_window_map.get(season, "Check local calendar")
        reasons = []
        if score > 70:
            reasons.append(f"Temperature {avg_temp:.0f}°C within optimal range")
        if avg_rain > (crop.water_req_mm or 300) * 0.7:
            reasons.append("Rainfall meets crop water requirement")
        warnings = []
        if score < 50:
            warnings.append("Climate conditions sub-optimal — consider irrigation or shade")
        scored.append(AgroCropRecommendation(
            crop_id=crop.id,
            crop_name=crop.name,
            suitability_score=score,
            expected_yield_kg_per_ha=score * 40,
            water_requirement_mm=crop.water_req_mm or 400,
            best_sowing_window=sowing_window or "Consult local advisor",
            climate_match_reasons=reasons,
            risk_warnings=warnings,
        ))
    scored.sort(key=lambda x: x.suitability_score, reverse=True)
    return scored[:top_n]