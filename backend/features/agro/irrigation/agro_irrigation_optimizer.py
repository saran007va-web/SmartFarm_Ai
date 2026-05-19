from datetime import datetime, timedelta
from typing import List, Dict, Any


def agro_calculate_irrigation_need(
    soil_moisture_pct: float,
    et0_mm_per_day: float,
    rainfall_forecast_mm: float,
    crop_water_req_factor: float = 1.0,
    field_capacity_pct: float = 40.0,
    wilting_point_pct: float = 15.0,
) -> Dict[str, Any]:
    available_water = soil_moisture_pct - wilting_point_pct
    capacity_deficit = field_capacity_pct - soil_moisture_pct
    daily_demand = et0_mm_per_day * crop_water_req_factor
    net_demand = max(0, daily_demand - rainfall_forecast_mm)
    should_irrigate = soil_moisture_pct < (wilting_point_pct + (field_capacity_pct - wilting_point_pct) * 0.4)
    volume_needed_mm = capacity_deficit if should_irrigate else 0
    return {
        "should_irrigate": should_irrigate,
        "volume_needed_mm": round(volume_needed_mm, 1),
        "net_daily_demand_mm": round(net_demand, 1),
        "soil_moisture_status": (
            "critical" if soil_moisture_pct < wilting_point_pct + 5
            else "low" if should_irrigate
            else "adequate"
        ),
    }


def agro_generate_irrigation_schedule(
    zone_id: str,
    soil_moisture_pct: float,
    forecast_days: List[Dict[str, Any]],
    area_hectares: float,
    crop_water_req_factor: float = 1.0,
) -> List[Dict[str, Any]]:
    schedules = []
    current_moisture = soil_moisture_pct
    LITRES_PER_MM_PER_HA = 10000
    for day_forecast in forecast_days:
        et0 = 4.5
        rain = day_forecast.get("rainfall_mm", 0)
        need = agro_calculate_irrigation_need(
            soil_moisture_pct=current_moisture,
            et0_mm_per_day=et0,
            rainfall_forecast_mm=rain,
            crop_water_req_factor=crop_water_req_factor,
        )
        if need["should_irrigate"]:
            volume_litres = need["volume_needed_mm"] * area_hectares * LITRES_PER_MM_PER_HA / 100
            schedules.append({
                "date": day_forecast["date"],
                "recommended_time": "06:00",
                "duration_minutes": round(volume_litres / 500),
                "water_volume_litres": round(volume_litres),
                "volume_mm": need["volume_needed_mm"],
                "reason": f"Soil moisture {current_moisture:.0f}% — irrigation required",
                "soil_moisture_before": current_moisture,
                "et0_mm": et0,
            })
            current_moisture = min(40, current_moisture + need["volume_needed_mm"] * 0.3)
        current_moisture = max(0, current_moisture - et0 + rain * 0.3)
    return schedules