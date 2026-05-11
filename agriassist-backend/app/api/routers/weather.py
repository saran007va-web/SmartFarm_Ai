"""
Weather API using OpenWeatherMap.
Returns current weather and forecast for agricultural purposes.
"""
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(prefix="/api/weather", tags=["Weather"])

# Indian cities with their coordinates
CITIES = {
    "delhi": {"name": "Delhi", "lat": 28.6139, "lon": 77.2090},
    "mumbai": {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
    "chennai": {"name": "Chennai", "lat": 13.0827, "lon": 80.2707},
    "kolkata": {"name": "Kolkata", "lat": 22.5726, "lon": 88.3639},
    "bangalore": {"name": "Bangalore", "lat": 12.9716, "lon": 77.5946},
    "hyderabad": {"name": "Hyderabad", "lat": 17.3850, "lon": 78.4867},
    "pune": {"name": "Pune", "lat": 18.5204, "lon": 73.8567},
    "ahmedabad": {"name": "Ahmedabad", "lat": 23.0225, "lon": 72.5714},
    "jaipur": {"name": "Jaipur", "lat": 26.9124, "lon": 75.7873},
    "lucknow": {"name": "Lucknow", "lat": 26.8467, "lon": 80.9462},
    "kanpur": {"name": "Kanpur", "lat": 26.4499, "lon": 80.3319},
    "nagpur": {"name": "Nagpur", "lat": 21.1458, "lon": 79.0882},
    "indore": {"name": "Indore", "lat": 22.7196, "lon": 75.8577},
    "coimbatore": {"name": "Coimbatore", "lat": 11.0168, "lon": 76.9558},
    "kochi": {"name": "Kochi", "lat": 9.9312, "lon": 76.2673},
    "patna": {"name": "Patna", "lat": 25.5941, "lon": 85.1376},
    "bhopal": {"name": "Bhopal", "lat": 23.2599, "lon": 77.4126},
    "visakhapatnam": {"name": "Visakhapatnam", "lat": 17.6868, "lon": 83.2185},
    "vadodara": {"name": "Vadodara", "lat": 22.3072, "lon": 73.1812},
    "farm": {"name": "My Farm", "lat": None, "lon": None},  # Will use user's location
}


class WeatherResponse(BaseModel):
    location: str
    temperature: float
    temperature_unit: str
    humidity: int
    humidity_unit: str
    wind_speed: float
    wind_unit: str
    weather_code: int
    weather_description: str
    precipitation: float
    precipitation_unit: str
    forecast: list


class ForecastDay(BaseModel):
    date: str
    temp_max: float
    temp_min: float
    precipitation_probability: int
    weather_code: int


async def _get_weather_from_provider(lat: float, lon: float, location_name: str) -> dict:
    """Fetch weather data from OpenWeatherMap API."""
    if not settings.WEATHER_API_KEY:
        raise HTTPException(status_code=500, detail="WEATHER_API_KEY is not configured")

    current_url = "https://api.openweathermap.org/data/2.5/weather"
    forecast_url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": settings.WEATHER_API_KEY,
        "units": "metric",
    }

    async with httpx.AsyncClient() as client:
        current_response = await client.get(current_url, params=params, timeout=10.0)
        if current_response.status_code == 401:
            raise HTTPException(status_code=500, detail="Invalid WEATHER_API_KEY")
        if current_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Weather service unavailable")

        forecast_response = await client.get(forecast_url, params=params, timeout=10.0)
        if forecast_response.status_code == 401:
            raise HTTPException(status_code=500, detail="Invalid WEATHER_API_KEY")
        if forecast_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Weather forecast unavailable")

        current_data = current_response.json()
        forecast_data = forecast_response.json()

    current_weather = current_data.get("weather", [{}])[0]
    weather_code = int(current_weather.get("id", 0))
    weather_desc = current_weather.get("description", "Unknown").title()

    # Build daily forecast from 3-hour buckets.
    by_date = {}
    for item in forecast_data.get("list", []):
        date = item.get("dt_txt", "").split(" ")[0]
        if not date:
            continue

        entry = by_date.setdefault(date, {
            "temp_max": float("-inf"),
            "temp_min": float("inf"),
            "precipitation_probability": 0,
            "weather_code": 0,
        })

        main = item.get("main", {})
        temp_max = main.get("temp_max")
        temp_min = main.get("temp_min")
        if temp_max is not None:
            entry["temp_max"] = max(entry["temp_max"], float(temp_max))
        if temp_min is not None:
            entry["temp_min"] = min(entry["temp_min"], float(temp_min))

        pop = int(round(float(item.get("pop", 0)) * 100))
        entry["precipitation_probability"] = max(entry["precipitation_probability"], pop)

        weather_list = item.get("weather", [])
        if weather_list and not entry["weather_code"]:
            entry["weather_code"] = int(weather_list[0].get("id", 0))

    forecast = []
    for date in sorted(by_date.keys())[:7]:
        day = by_date[date]
        forecast.append({
            "date": date,
            "temp_max": round(day["temp_max"], 1) if day["temp_max"] != float("-inf") else 0,
            "temp_min": round(day["temp_min"], 1) if day["temp_min"] != float("inf") else 0,
            "precipitation_probability": day["precipitation_probability"],
            "weather_code": day["weather_code"],
        })

    return {
        "location": location_name,
        "temperature": round(float(current_data.get("main", {}).get("temp", 0)), 1),
        "temperature_unit": "°C",
        "humidity": int(current_data.get("main", {}).get("humidity", 0)),
        "humidity_unit": "%",
        "wind_speed": round(float(current_data.get("wind", {}).get("speed", 0)) * 3.6, 1),
        "wind_unit": "km/h",
        "weather_code": weather_code,
        "weather_description": weather_desc,
        "precipitation": round(float((current_data.get("rain", {}) or {}).get("1h", 0)), 1),
        "precipitation_unit": "mm",
        "forecast": forecast,
    }


@router.get("/current")
async def get_current_weather(location: str = "coimbatore"):
    """Get current weather for a location."""
    city_key = location.lower()

    if city_key not in CITIES:
        # Try to parse as lat,lon
        try:
            lat, lon = map(float, location.split(","))
            return await _get_weather_from_provider(lat, lon, f"Lat: {lat}, Lon: {lon}")
        except:
            raise HTTPException(status_code=400, detail="Invalid location")

    city = CITIES[city_key]
    if city["lat"] is None:
        raise HTTPException(status_code=400, detail="Farm location not set. Please set your farm location first.")

    return await _get_weather_from_provider(city["lat"], city["lon"], city["name"])


@router.get("/forecast")
async def get_weather_forecast(location: str = "coimbatore", days: int = 7):
    """Get weather forecast for a location."""
    city_key = location.lower()

    if city_key not in CITIES:
        try:
            lat, lon = map(float, location.split(","))
            weather = await _get_weather_from_provider(lat, lon, f"Lat: {lat}, Lon: {lon}")
            return {"forecast": weather.get("forecast", [])[:days]}
        except:
            raise HTTPException(status_code=400, detail="Invalid location")

    city = CITIES[city_key]
    if city["lat"] is None:
        raise HTTPException(status_code=400, detail="Farm location not set")

    weather = await _get_weather_from_provider(city["lat"], city["lon"], city["name"])
    return {"forecast": weather.get("forecast", [])[:days]}


@router.get("/locations")
async def get_available_locations():
    """Get list of available locations."""
    return {"locations": [{"key": k, "name": v["name"]} for k, v in CITIES.items() if v["lat"] is not None]}


@router.post("/farm-location")
async def set_farm_location(lat: float, lon: float, name: str = "My Farm"):
    """Set user's farm location for weather."""
    # In a real app, you'd store this in the database
    return await _get_weather_from_provider(lat, lon, name)