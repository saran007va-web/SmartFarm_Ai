"""
Crop Recommendation ML model.

Uses scikit-learn RandomForest trained on the standard Crop Recommendation dataset
(22 crops, 7 features: N, P, K, temperature, humidity, pH, rainfall).

Model is trained once on startup if no persisted model exists.
"""
import os
import logging
import numpy as np
import joblib
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_PATH = Path("data/ml_models/crop_model.pkl")
LABEL_PATH = Path("data/ml_models/crop_labels.pkl")

_crop_model = None
_crop_labels: list[str] | None = None


# ── Synthetic training data (representative means from the public dataset) ──
CROP_PROFILES = {
    "rice":        dict(N=80,  P=40,  K=40,  T=23, H=82, pH=6.5, R=200),
    "wheat":       dict(N=103, P=40,  K=36,  T=17, H=65, pH=6.5, R=65),
    "maize":       dict(N=77,  P=48,  K=20,  T=22, H=65, pH=6.3, R=65),
    "chickpea":    dict(N=40,  P=68,  K=79,  T=18, H=16, pH=7.3, R=80),
    "kidneybeans": dict(N=20,  P=67,  K=20,  T=20, H=22, pH=5.7, R=65),
    "pigeonpeas":  dict(N=20,  P=67,  K=20,  T=27, H=48, pH=5.7, R=150),
    "mothbeans":   dict(N=21,  P=48,  K=20,  T=28, H=53, pH=6.9, R=50),
    "mungbean":    dict(N=21,  P=47,  K=20,  T=28, H=85, pH=6.7, R=48),
    "blackgram":   dict(N=40,  P=67,  K=19,  T=29, H=66, pH=7.1, R=67),
    "lentil":      dict(N=19,  P=68,  K=19,  T=24, H=64, pH=6.9, R=45),
    "pomegranate": dict(N=18,  P=18,  K=40,  T=22, H=90, pH=6.0, R=110),
    "banana":      dict(N=100, P=82,  K=50,  T=27, H=80, pH=6.0, R=104),
    "mango":       dict(N=20,  P=27,  K=30,  T=31, H=50, pH=5.8, R=95),
    "grapes":      dict(N=23,  P=132, K=200, T=24, H=81, pH=6.1, R=68),
    "watermelon":  dict(N=100, P=10,  K=50,  T=25, H=85, pH=6.5, R=50),
    "muskmelon":   dict(N=100, P=17,  K=50,  T=28, H=92, pH=6.5, R=25),
    "apple":       dict(N=21,  P=134, K=199, T=22, H=92, pH=5.9, R=113),
    "orange":      dict(N=19,  P=16,  K=10,  T=23, H=92, pH=7.0, R=110),
    "papaya":      dict(N=49,  P=59,  K=50,  T=34, H=92, pH=6.8, R=143),
    "coconut":     dict(N=22,  P=16,  K=30,  T=27, H=94, pH=5.9, R=150),
    "cotton":      dict(N=117, P=46,  K=20,  T=24, H=80, pH=6.9, R=80),
    "jute":        dict(N=78,  P=46,  K=40,  T=25, H=80, pH=6.7, R=175),
    "coffee":      dict(N=101, P=28,  K=29,  T=25, H=58, pH=6.8, R=150),
}


def _build_training_data():
    """Generate synthetic training samples around each crop's mean profile."""
    rng = np.random.RandomState(42)
    X, y = [], []
    samples_per_crop = 200

    crops = list(CROP_PROFILES.keys())
    for label_idx, crop in enumerate(crops):
        p = CROP_PROFILES[crop]
        for _ in range(samples_per_crop):
            # Add Gaussian noise so the model learns distributions, not just means
            X.append([
                max(0, p["N"] + rng.normal(0, p["N"] * 0.15)),
                max(0, p["P"] + rng.normal(0, max(p["P"] * 0.15, 5))),
                max(0, p["K"] + rng.normal(0, max(p["K"] * 0.15, 5))),
                p["T"] + rng.normal(0, 2),
                min(100, max(0, p["H"] + rng.normal(0, 5))),
                min(14, max(0, p["pH"] + rng.normal(0, 0.3))),
                max(0, p["R"] + rng.normal(0, p["R"] * 0.15)),
            ])
            y.append(label_idx)

    return np.array(X, dtype="float32"), np.array(y), crops


def _train_and_save():
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline

    logger.info("Training crop recommendation model…")
    X, y, labels = _build_training_data()

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)),
    ])
    model.fit(X, y)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(labels, LABEL_PATH)
    logger.info("Crop model trained and saved.")
    return model, labels


def load_crop_model():
    global _crop_model, _crop_labels
    if _crop_model is not None:
        return

    if MODEL_PATH.exists() and LABEL_PATH.exists():
        try:
            _crop_model = joblib.load(MODEL_PATH)
            _crop_labels = joblib.load(LABEL_PATH)
            logger.info("Crop model loaded from disk.")
            return
        except Exception as e:
            logger.warning(f"Could not load crop model: {e}. Retraining.")

    _crop_model, _crop_labels = _train_and_save()


def predict_crop(
    nitrogen: float,
    phosphorus: float,
    potassium: float,
    temperature: float,
    humidity: float,
    ph: float,
    rainfall: float,
) -> dict:
    """
    Predict recommended crop.

    Returns:
        {recommended_crop, confidence, alternatives: [{crop, confidence}], reason}
    """
    if _crop_model is None:
        load_crop_model()

    features = np.array([[nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall]], dtype="float32")

    clf = _crop_model.named_steps["clf"]
    scaled = _crop_model.named_steps["scaler"].transform(features)
    proba = clf.predict_proba(scaled)[0]

    # Top-5 sorted by probability
    top_indices = np.argsort(proba)[::-1][:5]
    top_crops = [
        {"crop": _crop_labels[i], "confidence": round(float(proba[i]) * 100, 1)}
        for i in top_indices
        if proba[i] > 0.01
    ]

    best = top_crops[0]
    reason = _build_reason(best["crop"], nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall)

    return {
        "recommended_crop": best["crop"],
        "confidence": best["confidence"],
        "alternatives": top_crops,
        "reason": reason,
    }


def _build_reason(crop: str, N, P, K, T, H, pH, R) -> str:
    profile = CROP_PROFILES.get(crop, {})
    notes = []
    if profile:
        if abs(T - profile["T"]) < 3:
            notes.append(f"temperature ({T}°C) is optimal")
        if abs(pH - profile["pH"]) < 0.5:
            notes.append(f"soil pH ({pH}) is well-suited")
        if R >= profile["R"] * 0.8:
            notes.append("rainfall is adequate")
    base = f"{crop.capitalize()} is recommended based on your soil nutrients (N:{N}, P:{P}, K:{K})"
    if notes:
        base += f". Conditions are favourable: {', '.join(notes)}."
    return base


def get_crops_list() -> list[str]:
    return list(CROP_PROFILES.keys())
