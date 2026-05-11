"""
Translation API — wraps Groq LLM for text translation.
Also provides language detection and supported languages list.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.llm_service import get_groq_client
from app.core.config import settings

router = APIRouter(prefix="/api", tags=["Translation"])

SUPPORTED_LANGUAGES = {
    "en": "English", "hi": "Hindi", "ta": "Tamil",
    "te": "Telugu", "mr": "Marathi", "bn": "Bengali",
    "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam",
    "pa": "Punjabi", "ur": "Urdu",
}


class TranslateRequest(BaseModel):
    text: str
    source_language: Optional[str] = "auto"
    target_language: str = "en"


class DetectRequest(BaseModel):
    text: str


@router.post("/translate")
async def translate_text(req: TranslateRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    target_name = SUPPORTED_LANGUAGES.get(req.target_language, req.target_language)

    client = get_groq_client()
    prompt = f"Translate the following text to {target_name}. Return ONLY the translated text, nothing else:\n\n{req.text}"

    try:
        resp = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a translator. Return only the translated text."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=512,
            temperature=0.1,
        )
        translated = resp.choices[0].message.content.strip()
        return {"translated_text": translated, "target_language": req.target_language}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Translation service unavailable: {e}")


@router.post("/detect-language")
async def detect_language(req: DetectRequest):
    if not req.text.strip():
        return {"language": "en", "confidence": 1.0}

    client = get_groq_client()
    try:
        resp = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": "Detect the language of the text. Return ONLY the ISO 639-1 code (e.g. en, hi, ta)."},
                {"role": "user", "content": req.text[:200]},
            ],
            max_tokens=8,
            temperature=0.0,
        )
        lang = resp.choices[0].message.content.strip().lower()[:5]
        return {"language": lang, "confidence": 0.95}
    except Exception:
        return {"language": "en", "confidence": 0.5}


@router.get("/languages")
def get_languages():
    return {
        "languages": [
            {"code": code, "name": name}
            for code, name in SUPPORTED_LANGUAGES.items()
        ]
    }
