"""
LLM service using Groq API.

Decision: Use direct LLM calls (not RAG) for:
  - General farming Q&A (chat endpoint)
  - Irrigation advice
  - Market context summaries

Use RAG for:
  - /rag/query — answers grounded in uploaded documents
"""
import logging
from groq import AsyncGroq
from app.core.config import settings

logger = logging.getLogger(__name__)

# Singleton client — created once at import time
_client: AsyncGroq | None = None


def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _client


SYSTEM_PROMPT = """You are SmartFarm AI, an expert agricultural assistant.
You help farmers with:
- Crop selection and rotation strategies
- Soil health, nutrients (NPK), and pH management
- Pest identification and integrated pest management (IPM)
- Irrigation scheduling and water conservation
- Yield optimization and fertilizer recommendations
- Weather-related farming decisions
- Post-harvest handling and storage

Always give practical, actionable advice. Use simple language.
Be concise — aim for 2-4 paragraphs unless a detailed list is needed.
If the question is not about farming/agriculture, politely redirect."""


async def chat_with_llm(
    message: str,
    history: list[dict] | None = None,
    language: str = "en",
    system_extra: str = "",
) -> str:
    """
    Send a message to Groq and return the reply string.

    Args:
        message: The user's message.
        history: List of {"role": ..., "content": ...} dicts (recent turns).
        language: ISO language code hint for response language.
        system_extra: Extra context appended to system prompt (e.g. RAG chunks).
    """
    client = get_groq_client()

    system = SYSTEM_PROMPT
    if language and language != "en":
        system += f"\n\nRespond in the same language as the user's message ({language})."
    if system_extra:
        system += f"\n\n{system_extra}"

    # Build messages list: system + history (last 8) + current message
    messages: list[dict] = [{"role": "system", "content": system}]
    if history:
        # Keep last 8 turns to stay within context limits
        for turn in history[-8:]:
            if turn.get("role") in ("user", "assistant") and turn.get("content"):
                messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({"role": "user", "content": message})

    try:
        response = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        raise RuntimeError(f"LLM service error: {e}") from e


async def generate_irrigation_advice(
    crop: str,
    soil_moisture: float,
    temperature: float | None,
    humidity: float | None,
) -> dict:
    """Generate structured irrigation advice using LLM."""
    context = f"""
Crop: {crop}
Soil Moisture: {soil_moisture}%
Temperature: {temperature or 'unknown'}°C
Humidity: {humidity or 'unknown'}%
"""
    prompt = f"""Based on these farm conditions, provide irrigation advice:
{context}

Respond in JSON with these exact keys:
- advice (string): 2-3 sentence recommendation
- urgency (string): one of "low", "medium", "high"
- water_amount_mm (number or null): recommended water amount in mm
- next_irrigation (string): when to irrigate next (e.g., "Tomorrow morning", "In 3 days")
- reason (string): brief explanation

Return ONLY valid JSON, no markdown fences."""

    client = get_groq_client()
    try:
        response = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are an irrigation expert. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=512,
            temperature=0.3,
        )
        import json
        text = response.choices[0].message.content.strip()
        # Strip any accidental markdown
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        logger.error(f"Irrigation LLM error: {e}")
        # Fallback response
        return {
            "advice": f"For {crop} with {soil_moisture}% soil moisture, monitor conditions carefully.",
            "urgency": "medium" if soil_moisture < 40 else "low",
            "water_amount_mm": None,
            "next_irrigation": "Check in 1-2 days",
            "reason": "Unable to fetch detailed analysis at this time.",
        }
