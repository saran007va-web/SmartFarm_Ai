"""
Economics / profit margin calculator.
Pure computation — no LLM or ML needed.
"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/economics", tags=["Economics"])


class MarginRequest(BaseModel):
    crop: str
    area_ha: float
    fertilizer_cost: float
    pesticide_cost: float
    labor_cost: float
    expected_yield_kg: float
    price_per_kg: float


@router.post("/margin")
def calculate_margin(req: MarginRequest):
    """Calculate profit, revenue, costs, and ROI for a crop cycle."""
    total_cost = req.fertilizer_cost + req.pesticide_cost + req.labor_cost
    revenue = req.expected_yield_kg * req.price_per_kg
    profit = revenue - total_cost
    roi = (profit / total_cost * 100) if total_cost > 0 else 0
    cost_per_ha = total_cost / req.area_ha if req.area_ha > 0 else total_cost
    revenue_per_ha = revenue / req.area_ha if req.area_ha > 0 else revenue
    profit_per_ha = profit / req.area_ha if req.area_ha > 0 else profit

    # Return keys expected by the frontend (`Economics.jsx`) to avoid mapping issues
    return {
        "crop": req.crop,
        "total_cost": round(total_cost, 2),
        "total_revenue": round(revenue, 2),
        "profit_margin": round(profit, 2),
        "profit_margin_pct": round(roi, 2),
        "cost_per_ha": round(cost_per_ha, 2),
        "revenue_per_ha": round(revenue_per_ha, 2),
        "profit_per_ha": round(profit_per_ha, 2),
        "breakeven_yield_kg": round(total_cost / req.price_per_kg, 1) if req.price_per_kg > 0 else None,
        "breakdown": {
            "fertilizer_cost": req.fertilizer_cost,
            "pesticide_cost": req.pesticide_cost,
            "labor_cost": req.labor_cost,
        },
    }
