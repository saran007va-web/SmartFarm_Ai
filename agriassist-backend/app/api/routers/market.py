"""
Market prices API.
Returns simulated/static market price data (wholesale, retail, farm gate).
In production, you would fetch from an external mandi/commodity price API.
"""
import random
from datetime import datetime, timedelta
from fastapi import APIRouter

router = APIRouter(prefix="/api/market", tags=["Market"])

# Seeded random so values are stable across requests in one session
_rng = random.Random(2024)

BASE_PRICES = {
    "rice":    {"Wholesale": 22, "Retail": 35, "Farm Gate": 18},
    "wheat":   {"Wholesale": 21, "Retail": 32, "Farm Gate": 17},
    "maize":   {"Wholesale": 18, "Retail": 28, "Farm Gate": 14},
    "tomato":  {"Wholesale": 15, "Retail": 30, "Farm Gate": 10},
    "potato":  {"Wholesale": 14, "Retail": 25, "Farm Gate": 10},
    "onion":   {"Wholesale": 20, "Retail": 35, "Farm Gate": 15},
    "soybean": {"Wholesale": 45, "Retail": 65, "Farm Gate": 38},
    "cotton":  {"Wholesale": 60, "Retail": 80, "Farm Gate": 50},
    "sugarcane":{"Wholesale":3.5,"Retail": 6,  "Farm Gate": 3},
    "banana":  {"Wholesale": 18, "Retail": 40, "Farm Gate": 12},
    "mango":   {"Wholesale": 35, "Retail": 70, "Farm Gate": 25},
    "coffee":  {"Wholesale":180, "Retail":280, "Farm Gate":150},
    "groundnut":{"Wholesale":55,"Retail": 90, "Farm Gate":45},
    "sunflower":{"Wholesale":55,"Retail": 80, "Farm Gate":45},
    "chilli":  {"Wholesale": 80,"Retail":140, "Farm Gate":60},
    "turmeric":{"Wholesale":130,"Retail":200, "Farm Gate":100},
    "tea":     {"Wholesale":200,"Retail":300, "Farm Gate":160},
    "jute":    {"Wholesale": 50,"Retail": 70, "Farm Gate":40},
}

TRENDS = ["+2.3%", "-1.1%", "+0.8%", "+3.5%", "-0.5%", "+1.2%"]

# Markets in India
MARKETS = ["Azadpur", "Vashi", "Koyambedu", "Bowenpally", "Erragadda", "Gulbarga", "Dahod", "Raipur"]


def _build_prices():
    """Build price list with slight random variation so the UI feels live."""
    import time
    # Use time-based seed for "live" feel
    r = random.Random(int(time.time() // 3600))  # New prices every hour
    today = datetime.now()
    rows = []
    for crop, prices in BASE_PRICES.items():
        for market_type, base in prices.items():
            variation = r.uniform(0.90, 1.10)
            trend_val = r.uniform(-3, 3)
            trend_str = f"{'+' if trend_val > 0 else ''}{trend_val:.1f}%"
            rows.append({
                "crop": crop,
                "market_type": market_type,
                "market": r.choice(MARKETS),
                "price_per_kg": round(base * variation, 2),
                "trend": trend_str,
                "unit": "₹/kg",
                "date": (today - timedelta(days=r.randint(0, 3))).strftime("%Y-%m-%d"),
                "last_updated": f"{r.randint(0, 23)}:{r.randint(0, 59):02d}",
            })
    return rows


def _get_fresh_prices():
    """Get fresh prices with current timestamp."""
    return _build_prices()


# Initialize with build
_PRICE_CACHE = _build_prices()


def _refresh_prices():
    """Refresh prices cache."""
    global _PRICE_CACHE
    _PRICE_CACHE = _build_prices()


@router.get("/prices")
def get_market_prices():
    # Return fresh prices each time for "live" feel
    _refresh_prices()
    return {"prices": _PRICE_CACHE, "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}


@router.get("/prices/{crop}")
def get_prices_by_crop(crop: str):
    _refresh_prices()
    filtered = [p for p in _PRICE_CACHE if p["crop"].lower() == crop.lower()]
    if not filtered:
        return {"prices": []}
    return {"prices": filtered}
