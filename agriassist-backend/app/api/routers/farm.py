"""
Farm profiles and yield records CRUD.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.db.models import FarmProfile, YieldRecord

router = APIRouter(prefix="/api", tags=["Farm"])


# ── Schemas ───────────────────────────────────────────────────────────────

class FarmProfileCreate(BaseModel):
    name: str
    location: Optional[str] = None
    area_ha: Optional[float] = None
    soil_type: Optional[str] = None
    primary_crop: Optional[str] = None
    notes: Optional[str] = None


class YieldRecordCreate(BaseModel):
    crop: str
    year: int
    yield_kg_per_ha: float
    area_ha: Optional[float] = None
    notes: Optional[str] = None
    farm_id: Optional[int] = None


# ── Farm Profiles ─────────────────────────────────────────────────────────

@router.get("/farm/profile")
def list_farm_profiles(db: Session = Depends(get_db)):
    profiles = db.query(FarmProfile).order_by(FarmProfile.created_at.desc()).all()
    return {"profiles": [_profile_to_dict(p) for p in profiles]}


@router.post("/farm/profile")
def create_farm_profile(data: FarmProfileCreate, db: Session = Depends(get_db)):
    profile = FarmProfile(**data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _profile_to_dict(profile)


@router.put("/farm/profile/{profile_id}")
def update_farm_profile(profile_id: int, data: FarmProfileCreate, db: Session = Depends(get_db)):
    profile = db.query(FarmProfile).filter_by(id=profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Farm profile not found.")
    for key, val in data.model_dump().items():
        setattr(profile, key, val)
    db.commit()
    return _profile_to_dict(profile)


@router.delete("/farm/profile/{profile_id}")
def delete_farm_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(FarmProfile).filter_by(id=profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Farm profile not found.")
    db.delete(profile)
    db.commit()
    return {"deleted": True}


def _profile_to_dict(p: FarmProfile) -> dict:
    return {
        "id": p.id, "name": p.name, "location": p.location,
        "area_ha": p.area_ha, "soil_type": p.soil_type,
        "primary_crop": p.primary_crop, "notes": p.notes,
        "created_at": p.created_at,
    }


# ── Yield Records ─────────────────────────────────────────────────────────

@router.get("/records")
def list_yield_records(farm_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(YieldRecord)
    if farm_id:
        q = q.filter_by(farm_id=farm_id)
    records = q.order_by(YieldRecord.year.desc()).all()
    return {"records": [_record_to_dict(r) for r in records]}


@router.post("/records")
def create_yield_record(data: YieldRecordCreate, db: Session = Depends(get_db)):
    record = YieldRecord(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return _record_to_dict(record)


@router.put("/records/{record_id}")
def update_yield_record(record_id: int, data: YieldRecordCreate, db: Session = Depends(get_db)):
    record = db.query(YieldRecord).filter_by(id=record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")
    for key, val in data.model_dump().items():
        setattr(record, key, val)
    db.commit()
    return _record_to_dict(record)


@router.delete("/records/{record_id}")
def delete_yield_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(YieldRecord).filter_by(id=record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")
    db.delete(record)
    db.commit()
    return {"deleted": True}


def _record_to_dict(r: YieldRecord) -> dict:
    return {
        "id": r.id, "crop": r.crop, "year": r.year,
        "yield_kg_per_ha": r.yield_kg_per_ha, "area_ha": r.area_ha,
        "notes": r.notes, "farm_id": r.farm_id, "created_at": r.created_at,
    }
