"""
Farming calendar — returns seasonal planting/harvesting schedule.
"""
from fastapi import APIRouter
from typing import Optional

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])

# Static seasonal calendar data (India-focused, adjust for your region)
CALENDAR_DATA = [
    {"month": "January", "season": "Rabi", "activities": ["Wheat harvesting begins", "Mustard in full bloom", "Irrigate wheat"], "crops": ["wheat", "mustard", "peas"]},
    {"month": "February", "season": "Rabi", "activities": ["Wheat grain filling", "Apply second fertilizer dose", "Pest monitoring"], "crops": ["wheat", "chickpea", "lentil"]},
    {"month": "March", "season": "Rabi Harvest", "activities": ["Harvest chickpea & lentil", "Prepare fields for Kharif", "Soil testing"], "crops": ["chickpea", "lentil", "barley"]},
    {"month": "April", "season": "Zaid", "activities": ["Summer crop sowing", "Watermelon & muskmelon planting", "Irrigate regularly"], "crops": ["watermelon", "muskmelon", "maize"]},
    {"month": "May", "season": "Zaid", "activities": ["Pre-monsoon soil prep", "Apply organic manure", "Nursery preparation for rice"], "crops": ["rice seedlings", "vegetables"]},
    {"month": "June", "season": "Kharif Sowing", "activities": ["Monsoon sowing begins", "Transplant rice", "Sow cotton & soybean"], "crops": ["rice", "cotton", "soybean", "maize"]},
    {"month": "July", "season": "Kharif", "activities": ["Weed management", "Top-dressing fertilizer", "Pest & disease monitoring"], "crops": ["rice", "maize", "cotton"]},
    {"month": "August", "season": "Kharif", "activities": ["Rice flowering stage", "Cotton boll formation", "Apply micronutrients"], "crops": ["rice", "cotton", "groundnut"]},
    {"month": "September", "season": "Kharif", "activities": ["Early rice varieties harvest", "Soybean pod filling", "Prepare for Rabi"], "crops": ["rice", "soybean"]},
    {"month": "October", "season": "Kharif Harvest", "activities": ["Main rice harvest", "Cotton picking", "Rabi seed procurement"], "crops": ["rice", "maize", "cotton"]},
    {"month": "November", "season": "Rabi Sowing", "activities": ["Sow wheat & mustard", "Chickpea & lentil sowing", "Apply basal fertilizer"], "crops": ["wheat", "mustard", "chickpea"]},
    {"month": "December", "season": "Rabi", "activities": ["Irrigate wheat (1st irrigation)", "Vegetable planting", "Cold protection measures"], "crops": ["wheat", "peas", "potato"]},
]

CROP_CALENDAR = [
    {"crop": "rice", "sow": "June–July", "harvest": "October–November", "duration_days": 120},
    {"crop": "wheat", "sow": "November", "harvest": "March–April", "duration_days": 150},
    {"crop": "maize", "sow": "June–July", "harvest": "September–October", "duration_days": 90},
    {"crop": "cotton", "sow": "May–June", "harvest": "October–December", "duration_days": 180},
    {"crop": "soybean", "sow": "June–July", "harvest": "October", "duration_days": 100},
    {"crop": "potato", "sow": "October–November", "harvest": "January–February", "duration_days": 90},
    {"crop": "tomato", "sow": "October (rabi) / June (kharif)", "harvest": "Year-round", "duration_days": 75},
]


@router.get("")
def get_calendar(location: Optional[str] = None):
    """Return the full 12-month farming calendar."""
    return {"calendar": CALENDAR_DATA, "location": location or "India"}


@router.get("/crops/list")
def get_calendar_crops():
    return {"crops": CROP_CALENDAR}
