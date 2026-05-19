import os
import pickle
import json
import numpy as np
from datetime import datetime
from typing import Dict, Any, Tuple
from pathlib import Path

MODEL_DIR = Path(os.getenv("AGRO_MODEL_DIR", "./models/agro"))
YIELD_MODEL_PATH = MODEL_DIR / "yield" / "model_v1.pkl"
YIELD_CONFIG_PATH = MODEL_DIR / "yield" / "config.json"


def agro_load_yield_model():
    if YIELD_MODEL_PATH.exists():
        with open(YIELD_MODEL_PATH, "rb") as f:
            return pickle.load(f)
    return None


def agro_assemble_yield_features(soil_type: str, soil_ph: float, area_ha: float,
                                  avg_temp_c: float, avg_rainfall_mm: float,
                                  avg_humidity_pct: float, crop_duration_days: float,
                                  crop_water_req_mm: float) -> np.ndarray:
    soil_encoding = {"loamy": 3, "clay": 2, "sandy": 1, "silt": 2.5, "black": 3.5}
    soil_val = soil_encoding.get(soil_type or "loamy", 2.5)
    ph_optimal = 1 - abs((soil_ph or 6.5) - 6.5) / 3.5
    rain_vs_req = min((avg_rainfall_mm or 50) / max(crop_water_req_mm or 300, 1), 1.5)
    temp_optimal = 1 - abs((avg_temp_c or 25) - 25) / 20
    features = np.array([[
        soil_val,
        soil_ph or 6.5,
        ph_optimal,
        avg_temp_c or 25,
        temp_optimal,
        avg_rainfall_mm or 50,
        rain_vs_req,
        avg_humidity_pct or 65,
        crop_duration_days or 90,
        crop_water_req_mm or 300,
        area_ha or 1.0,
    ]])
    return features


def agro_predict_yield(features: np.ndarray) -> Tuple[float, float, Dict[str, Any]]:
    model = agro_load_yield_model()
    if model is None:
        base_yield = 2500.0
        temp_factor = features[0][3]
        rain_factor = features[0][6]
        predicted = base_yield * (0.4 + temp_factor * 0.3 + rain_factor * 0.3)
        confidence = 60.0
    else:
        predicted = float(model.predict(features)[0])
        confidence = 82.0
    risk_factors = {}
    if features[0][6] < 0.5:
        risk_factors["water_stress"] = "Rainfall below 50% of crop requirement"
    if features[0][3] > 38:
        risk_factors["heat_stress"] = "Average temperature above optimal range"
    if features[0][1] < 5.5 or features[0][1] > 7.5:
        risk_factors["ph_imbalance"] = "Soil pH outside optimal 5.5-7.5 range"
    return round(predicted, 1), round(confidence, 1), risk_factors