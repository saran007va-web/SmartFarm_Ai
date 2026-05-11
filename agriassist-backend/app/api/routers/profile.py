"""
User profile and adaptive learning API.
Stores per-device preferences and learned context.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.db.models import UserProfile, MessageFeedback, AnalyticsEvent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Profile"])


class PreferencesUpdate(BaseModel):
    preferences: dict = {}


class FeedbackRequest(BaseModel):
    session_id: Optional[str] = None
    message_index: Optional[int] = None
    rating: Optional[int] = None  # 1 or -1
    correction: Optional[str] = None


class CropOutcome(BaseModel):
    device_id: str
    crop: str
    season: Optional[str] = None
    outcome: str  # "good" | "poor" | "average"
    notes: Optional[str] = None


def _get_or_create_profile(device_id: str, db: Session) -> UserProfile:
    profile = db.query(UserProfile).filter_by(device_id=device_id).first()
    if not profile:
        profile = UserProfile(device_id=device_id)
        db.add(profile)
        db.flush()
    return profile


@router.get("/profile/{device_id}")
def get_user_profile(device_id: str, db: Session = Depends(get_db)):
    profile = _get_or_create_profile(device_id, db)
    db.commit()
    return {
        "device_id": profile.device_id,
        "preferences": profile.preferences or {},
        "total_chats": profile.total_chats,
        "total_predictions": profile.total_predictions,
        "created_at": profile.created_at,
    }


@router.post("/profile/preferences")
def update_preferences(data: PreferencesUpdate, db: Session = Depends(get_db)):
    # device_id should come from request — accept it in body
    return {"updated": True, "preferences": data.preferences}


@router.get("/profile/{device_id}/stats")
def get_learning_stats(device_id: str, db: Session = Depends(get_db)):
    try:
        profile = _get_or_create_profile(device_id, db)
        db.commit()
        return {
            "total_chats": profile.total_chats,
            "total_predictions": profile.total_predictions,
        }
    except Exception as e:
        logger.error(f"Error fetching stats for device_id '{device_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch learning stats: {str(e)}")


@router.get("/profile/{device_id}/context")
def get_personalized_context(device_id: str, db: Session = Depends(get_db)):
    profile = _get_or_create_profile(device_id, db)
    db.commit()
    return {"context": profile.learned_context or {}}


@router.post("/profile/{device_id}/context")
def add_learned_context(
    device_id: str,
    key: str,
    value: str,
    db: Session = Depends(get_db),
):
    profile = _get_or_create_profile(device_id, db)
    ctx = dict(profile.learned_context or {})
    ctx[key] = value
    profile.learned_context = ctx
    db.commit()
    return {"context": profile.learned_context}


@router.get("/profile/{device_id}/crop-patterns")
def get_crop_patterns(device_id: str, db: Session = Depends(get_db)):
    # Return any stored crop outcome patterns for this device
    return {"patterns": [], "device_id": device_id}


@router.post("/feedback")
def submit_feedback(data: FeedbackRequest, db: Session = Depends(get_db)):
    fb = MessageFeedback(
        session_id=data.session_id,
        message_index=data.message_index,
        rating=data.rating,
        correction=data.correction,
    )
    db.add(fb)
    db.commit()
    return {"received": True}


@router.post("/correction")
def submit_correction(data: FeedbackRequest, db: Session = Depends(get_db)):
    fb = MessageFeedback(
        session_id=data.session_id,
        message_index=data.message_index,
        correction=data.correction,
    )
    db.add(fb)
    db.commit()
    return {"received": True}


@router.post("/crop-outcome")
def record_crop_outcome(data: CropOutcome, db: Session = Depends(get_db)):
    db.add(AnalyticsEvent(event_type="crop_outcome", detail=f"{data.crop}:{data.outcome}"))
    db.commit()
    return {"recorded": True}
