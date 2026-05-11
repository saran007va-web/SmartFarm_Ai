"""
Yield Prediction ML model.

Predicts yield in kg/ha given crop, area, fertilizer, pesticide, and rainfall.
Uses a GradientBoosting regressor trained on synthetic data derived from
FAO world crop yield statistics.
"""
import logging
import numpy as np
import joblib
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_PATH = Path("data/ml_models/yield_model.pkl")
ENCODER_PATH = Path("data/ml_models/yield_crop_encoder.pkl")

_yield_model = None
_crop_encoder = None

# Base yields (kg/ha) per crop — approximate world averages
BASE_YIELDS = {
    "rice": 4500, "wheat": 3200, "maize": 5500, "chickpea": 900,
    "kidneybeans": 1200, "pigeonpeas": 850, "mothbeans": 700,
    "mungbean": 900, "blackgram": 900, "lentil": 1000,
    "pomegranate": 12000, "banana": 30000, "mango": 8000,
    "grapes": 15000, "watermelon": 25000, "muskmelon": 15000,
    "apple": 12000, "orange": 14000, "papaya": 20000,
    "coconut": 6000, "cotton": 1900, "jute": 2500, "coffee": 1000,
    # Non-standard crops (from frontend lists)
    "tomato": 28000, "potato": 18000, "onion": 20000,
    "soybean": 2500, "sugarcane": 65000, "groundnut": 1800,
    "sunflower": 1500, "chilli": 3000, "turmeric": 5000,
    "tea": 1500,
}


def _build_training_data():
    rng = np.random.RandomState(42)
    crops = list(BASE_YIELDS.keys())
    X, y = [], []

    for crop_idx, crop in enumerate(crops):
        base = BASE_YIELDS[crop]
        for _ in range(300):
            fert = rng.uniform(50, 500)        # kg/ha
            pest = rng.uniform(0, 50)          # kg/ha
            rain = rng.uniform(200, 3000)      # mm
            area = rng.uniform(0.5, 5000)      # ha (not used directly in yield/ha)

            # Simple agronomic formula with diminishing returns
            fert_effect = 1.0 + 0.0008 * fert - 0.0000003 * fert ** 2
            pest_effect = 1.0 + 0.004 * pest - 0.00005 * pest ** 2
            rain_effect = 1.0 + 0.0002 * rain - 0.00000004 * rain ** 2

            yield_kg_ha = base * fert_effect * pest_effect * rain_effect
            yield_kg_ha = max(base * 0.3, yield_kg_ha)  # floor at 30% of base
            yield_kg_ha *= rng.uniform(0.9, 1.1)         # add noise

            X.append([crop_idx, fert, pest, rain, area])
            y.append(yield_kg_ha)

    return np.array(X), np.array(y), crops


def _train_and_save():
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline

    logger.info("Training yield prediction model…")
    X, y, crops = _build_training_data()

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("reg", GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, random_state=42)),
    ])
    model.fit(X, y)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(crops, ENCODER_PATH)
    logger.info("Yield model trained and saved.")
    return model, crops


def load_yield_model():
    global _yield_model, _crop_encoder
    if _yield_model is not None:
        return

    if MODEL_PATH.exists() and ENCODER_PATH.exists():
        try:
            _yield_model = joblib.load(MODEL_PATH)
            _crop_encoder = joblib.load(ENCODER_PATH)
            logger.info("Yield model loaded from disk.")
            return
        except Exception as e:
            logger.warning(f"Could not load yield model: {e}. Retraining.")

    _yield_model, _crop_encoder = _train_and_save()


def predict_yield(
    crop_name: str,
    area_hectares: float,
    fertilizer_kg: float,
    pesticide_kg: float,
    annual_rainfall_mm: float,
) -> dict:
    """
    Predict yield kg/ha and total production.

    Returns:
        {predicted_yield_kg_per_ha, total_production_kg, crop, area_hectares, note}
    """
    if _yield_model is None:
        load_yield_model()

    crop_lower = crop_name.lower()

    # Map crop to index; use closest known crop if not exact
    if crop_lower in _crop_encoder:
        crop_idx = _crop_encoder.index(crop_lower)
    else:
        # Find most similar by base yield
        crop_idx = 0
        logger.warning(f"Crop '{crop_name}' not in encoder. Using index 0.")

    features = np.array([[crop_idx, fertilizer_kg, pesticide_kg, annual_rainfall_mm, area_hectares]])

    predicted_yield = float(_yield_model.predict(features)[0])
    predicted_yield = max(100, predicted_yield)  # sanity floor

    total_production = predicted_yield * area_hectares

    note = None
    if fertilizer_kg > 800:
        note = "Very high fertilizer use may harm soil health. Consider reducing to 200–400 kg/ha."
    elif annual_rainfall_mm < 300:
        note = "Low rainfall detected. Consider irrigation to maintain yield potential."

    return {
        "predicted_yield_kg_per_ha": round(predicted_yield, 1),
        "total_production_kg": round(total_production, 1),
        "crop": crop_lower,
        "area_hectares": area_hectares,
        "note": note,
    }
