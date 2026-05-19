import os
import httpx
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID


WEATHER_API_KEY = os.getenv("AGRO_WEATHER_API_KEY", "")
WEATHER_API_URL = os.getenv("AGRO_WEATHER_API_URL", "https://api.openweathermap.org/data/2.5")


async def agro_fetch_current_weather(latitude: float, longitude: float) -> Dict[str, Any]:
    url = f"{WEATHER_API_URL}/weather"
    params = {"lat": latitude, "lon": longitude, "appid": WEATHER_API_KEY, "units": "metric"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    return {
        "temp_c": data["main"]["temp"],
        "humidity_pct": data["main"]["humidity"],
        "rainfall_mm": data.get("rain", {}).get("1h", 0.0),
        "wind_kmh": round(data["wind"]["speed"] * 3.6, 1),
        "wind_direction_deg": data["wind"].get("deg", 0),
        "pressure_hpa": data["main"]["pressure"],
        "uv_index": None,
        "condition": data["weather"][0]["description"],
        "source": "openweather",
        "reading_time": datetime.utcnow(),
    }


async def agro_fetch_forecast(latitude: float, longitude: float, days: int = 7) -> List[Dict[str, Any]]:
    url = f"{WEATHER_API_URL}/forecast"
    params = {"lat": latitude, "lon": longitude, "appid": WEATHER_API_KEY, "units": "metric", "cnt": days * 8}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    daily: Dict[str, Dict] = {}
    for item in data["list"]:
        date_str = item["dt_txt"][:10]
        if date_str not in daily:
            daily[date_str] = {"temps": [], "rainfall": 0, "humidity": [], "wind": [], "conditions": []}
        daily[date_str]["temps"].append(item["main"]["temp"])
        daily[date_str]["rainfall"] += item.get("rain", {}).get("3h", 0)
        daily[date_str]["humidity"].append(item["main"]["humidity"])
        daily[date_str]["wind"].append(item["wind"]["speed"] * 3.6)
        daily[date_str]["conditions"].append(item["weather"][0]["description"])
    result = []
    for date_str, d in list(daily.items())[:days]:
        avg_temp = sum(d["temps"]) / len(d["temps"])
        risk = "low"
        if d["rainfall"] > 50:
            risk = "high"
        elif d["rainfall"] > 20 or max(d["temps"]) > 40:
            risk = "medium"
        result.append({
            "date": date_str,
            "temp_max_c": round(max(d["temps"]), 1),
            "temp_min_c": round(min(d["temps"]), 1),
            "rainfall_mm": round(d["rainfall"], 1),
            "humidity_pct": round(sum(d["humidity"]) / len(d["humidity"]), 1),
            "wind_kmh": round(sum(d["wind"]) / len(d["wind"]), 1),
            "condition": d["conditions"][0],
            "risk_level": risk,
        })
    return result


def agro_calculate_et0(temp_c: float, humidity_pct: float, wind_kmh: float, solar_radiation: float = 15.0) -> float:
    """Simplified FAO-56 Penman-Monteith ET0 calculation (mm/day)"""
    wind_ms = wind_kmh / 3.6
    es = 0.6108 * (2.718281828 ** ((17.27 * temp_c) / (temp_c + 237.3)))
    ea = es * (humidity_pct / 100)
    vpd = es - ea
    et0 = (0.408 * solar_radiation + 0.665 * 0.001 * vpd * 900 / (temp_c + 273) * wind_ms) / (
        1 + 0.34 * wind_ms
    )
    return round(max(et0, 0), 2)