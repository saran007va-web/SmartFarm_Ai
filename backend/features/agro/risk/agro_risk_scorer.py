from datetime import datetime
from typing import Dict, Any, List
from uuid import UUID


def agro_calculate_heat_risk(temp_c: float, humidity_pct: float, duration_days: int = 1) -> float:
    """Returns heat risk score 0-100"""
    if temp_c < 32:
        return 0.0
    base_risk = min((temp_c - 32) * 5, 60)
    humidity_factor = 1 + (humidity_pct / 100) * 0.5
    duration_factor = min(duration_days * 0.2, 0.4)
    score = base_risk * humidity_factor * (1 + duration_factor)
    return round(min(score, 100), 1)


def agro_calculate_drought_risk(rainfall_7d_mm: float, soil_moisture_pct: float, et0_daily_mm: float) -> float:
    """Returns drought risk score 0-100"""
    moisture_deficit = max(0, 40 - soil_moisture_pct)
    rain_deficit = max(0, (et0_daily_mm * 7) - rainfall_7d_mm)
    moisture_score = moisture_deficit * 1.5
    rain_score = min(rain_deficit * 3, 60)
    return round(min(moisture_score + rain_score, 100), 1)


def agro_calculate_flood_risk(rainfall_24h_mm: float, rainfall_72h_mm: float, elevation_m: float) -> float:
    """Returns flood risk score 0-100"""
    if rainfall_24h_mm < 20 and rainfall_72h_mm < 50:
        return 0.0
    rain_score = min((rainfall_24h_mm / 100) * 60 + (rainfall_72h_mm / 200) * 40, 80)
    elevation_factor = max(0, 1 - (elevation_m / 100) * 0.3)
    return round(min(rain_score * elevation_factor, 100), 1)


def agro_calculate_frost_risk(temp_c: float, humidity_pct: float) -> float:
    """Returns frost risk score 0-100"""
    if temp_c > 5:
        return 0.0
    base_risk = (5 - temp_c) * 15
    if humidity_pct > 80:
        base_risk *= 1.3
    return round(min(base_risk, 100), 1)


def agro_calculate_pest_risk(temp_c: float, humidity_pct: float, rainfall_mm: float) -> float:
    """Returns pest/disease outbreak risk 0-100"""
    if temp_c < 15 or temp_c > 38:
        temp_score = 20
    elif 20 <= temp_c <= 30:
        temp_score = 70
    else:
        temp_score = 40
    humidity_score = (humidity_pct / 100) * 80 if humidity_pct > 70 else (humidity_pct / 100) * 30
    rain_score = min(rainfall_mm * 0.5, 20)
    return round(min((temp_score + humidity_score + rain_score) / 3, 100), 1)


def agro_score_zone_risk(weather_data: Dict[str, Any]) -> Dict[str, Any]:
    heat = agro_calculate_heat_risk(
        weather_data.get("temp_c", 25),
        weather_data.get("humidity_pct", 60),
        weather_data.get("heat_duration_days", 1),
    )
    drought = agro_calculate_drought_risk(
        weather_data.get("rainfall_7d_mm", 10),
        weather_data.get("soil_moisture_pct", 35),
        weather_data.get("et0_daily_mm", 4),
    )
    flood = agro_calculate_flood_risk(
        weather_data.get("rainfall_24h_mm", 0),
        weather_data.get("rainfall_72h_mm", 0),
        weather_data.get("elevation_m", 50),
    )
    frost = agro_calculate_frost_risk(
        weather_data.get("temp_c", 25),
        weather_data.get("humidity_pct", 60),
    )
    pest = agro_calculate_pest_risk(
        weather_data.get("temp_c", 25),
        weather_data.get("humidity_pct", 60),
        weather_data.get("rainfall_mm", 0),
    )
    overall = round((heat * 0.25 + drought * 0.25 + flood * 0.2 + frost * 0.1 + pest * 0.2), 1)
    threats = []
    if heat > 60:
        threats.append("Heat stress")
    if drought > 60:
        threats.append("Drought")
    if flood > 60:
        threats.append("Flood risk")
    if frost > 60:
        threats.append("Frost")
    if pest > 60:
        threats.append("Pest/disease outbreak")
    risk_level = "critical" if overall > 75 else "high" if overall > 50 else "medium" if overall > 25 else "low"
    return {
        "heat_risk": heat,
        "drought_risk": drought,
        "flood_risk": flood,
        "frost_risk": frost,
        "pest_risk": pest,
        "overall_risk": overall,
        "risk_level": risk_level,
        "main_threats": threats,
        "scored_at": datetime.utcnow(),
    }