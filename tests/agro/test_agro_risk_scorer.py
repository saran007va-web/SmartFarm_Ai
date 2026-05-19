import pytest
from backend.features.agro.risk.agro_risk_scorer import (
    agro_calculate_heat_risk,
    agro_calculate_drought_risk,
    agro_calculate_flood_risk,
    agro_calculate_frost_risk,
    agro_score_zone_risk,
)


def test_heat_risk_low():
    assert agro_calculate_heat_risk(25, 50) == 0.0


def test_heat_risk_high():
    score = agro_calculate_heat_risk(42, 80)
    assert score > 50


def test_drought_risk_none():
    score = agro_calculate_drought_risk(rainfall_7d_mm=50, soil_moisture_pct=40, et0_daily_mm=3)
    assert score < 20


def test_drought_risk_critical():
    score = agro_calculate_drought_risk(rainfall_7d_mm=0, soil_moisture_pct=10, et0_daily_mm=6)
    assert score > 60


def test_flood_risk_none():
    assert agro_calculate_flood_risk(0, 5, 100) == 0.0


def test_flood_risk_high():
    score = agro_calculate_flood_risk(80, 150, 10)
    assert score > 50


def test_frost_risk_warm():
    assert agro_calculate_frost_risk(20, 60) == 0.0


def test_frost_risk_cold():
    score = agro_calculate_frost_risk(-2, 85)
    assert score > 60


def test_full_zone_score_structure():
    result = agro_score_zone_risk({
        "temp_c": 38, "humidity_pct": 80, "rainfall_7d_mm": 5,
        "rainfall_24h_mm": 0, "rainfall_72h_mm": 5,
        "soil_moisture_pct": 18, "et0_daily_mm": 5, "elevation_m": 20,
        "rainfall_mm": 2,
    })
    assert "heat_risk" in result
    assert "drought_risk" in result
    assert "overall_risk" in result
    assert "risk_level" in result
    assert result["risk_level"] in ["low", "medium", "high", "critical"]