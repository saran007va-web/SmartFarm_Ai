import os
from datetime import datetime
from typing import List, Dict, Any, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from ..agro_models import AgroFarmZone, AgroWeatherReading, AgroYieldPrediction

GROQ_API_KEY = os.getenv("AGRO_GROQ_API_KEY", "")


def agro_build_farm_context(db: Session, farmer_id: UUID) -> str:
    zones = db.query(AgroFarmZone).filter(AgroFarmZone.farmer_id == farmer_id).all()
    context_parts = [f"Farmer has {len(zones)} farm zone(s)."]
    for zone in zones[:3]:
        latest = db.query(AgroWeatherReading).filter(
            AgroWeatherReading.zone_id == zone.id
        ).order_by(AgroWeatherReading.reading_time.desc()).first()
        zone_info = f"Zone '{zone.name}': {zone.area_hectares or '?'} ha, soil: {zone.soil_type or 'unknown'}, pH: {zone.soil_ph or '?'}"
        if latest:
            zone_info += f", temp: {latest.temp_c}°C, humidity: {latest.humidity_pct}%, soil moisture: {latest.soil_moisture_pct}%"
        context_parts.append(zone_info)
    pred = db.query(AgroYieldPrediction).filter(
        AgroYieldPrediction.zone_id.in_([z.id for z in zones])
    ).order_by(AgroYieldPrediction.created_at.desc()).first()
    if pred:
        context_parts.append(f"Latest yield prediction: {pred.predicted_kg_per_ha} kg/ha (confidence: {pred.confidence_pct}%)")
    return " | ".join(context_parts)


async def agro_get_advisor_reply(
    db: Session,
    farmer_id: UUID,
    message: str,
    history: List[Dict[str, str]],
    language: str = "en",
) -> Tuple[str, List[str], List[str]]:
    farm_context = agro_build_farm_context(db, farmer_id)
    system_prompt = f"""You are AgroSense AI, an expert agricultural advisor for Indian farmers.
You help farmers make decisions about crops, weather, irrigation, pests, and climate risks.
Keep answers practical, specific, and under 150 words.
Always recommend immediate actions when there is risk.

Current farm context: {farm_context}
Today: {datetime.utcnow().strftime('%B %d, %Y')}"""

    if not GROQ_API_KEY:
        reply = agro_rule_based_advisor(message, farm_context)
        sources = ["AgroSense AI knowledge base"]
        follow_ups = ["What is the best crop for this season?", "When should I irrigate next?", "Is there any disease risk today?"]
        return reply, sources, follow_ups

    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=GROQ_API_KEY)
        messages = [{"role": "system", "content": system_prompt}]
        for h in history[-6:]:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})
        response = await client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=messages,
            max_tokens=300,
            temperature=0.3,
        )
        reply = response.choices[0].message.content
        sources = ["Groq Llama 3.1 70B", "Farm sensor data", "Weather forecast"]
        follow_ups = ["Tell me more about this", "What should I do tomorrow?", "Is there any risk I should know about?"]
        return reply, sources, follow_ups
    except Exception as e:
        reply = agro_rule_based_advisor(message, farm_context)
        return reply, ["AgroSense AI fallback"], ["What crops should I plant this season?"]


def agro_rule_based_advisor(message: str, context: str) -> str:
    message_lower = message.lower()
    if any(word in message_lower for word in ["irrigat", "water", "dry", "moisture"]):
        return "Based on current soil moisture levels, check if your soil is below 30% moisture. If so, irrigate early morning (5-7 AM) for best efficiency. Use drip irrigation to save water. Avoid irrigating during peak heat (11 AM - 3 PM)."
    if any(word in message_lower for word in ["pest", "disease", "insect", "fungus", "blight"]):
        return "For pest and disease control: inspect crops early morning, check leaf undersides for eggs or lesions, spray neem oil or recommended pesticide in calm wind below 10 km/h. Avoid spraying before rain. Rotate pesticide types to prevent resistance."
    if any(word in message_lower for word in ["crop", "plant", "sow", "seed"]):
        return "For crop selection this season, consider your soil type, available water, and local market prices. Kharif season (June-Sep): rice, cotton, maize, soybean. Rabi season (Oct-Mar): wheat, mustard, chickpea. Choose varieties certified for your state."
    if any(word in message_lower for word in ["weather", "rain", "forecast", "flood", "drought"]):
        return "Monitor weather daily. For heavy rain forecast: check drainage, delay fertilizer application, cover stored grain. For drought: increase irrigation frequency, apply mulch to reduce evaporation, consider short-duration drought-tolerant varieties."
    return f"I understand your question about '{message[:50]}'. Based on your farm data ({context[:100]}), I recommend consulting your local agricultural officer (KVK) for site-specific advice. You can also check the eNAM portal for market prices and PM-Kisan for scheme eligibility."