from fastapi import APIRouter
router = APIRouter()

@router.get("/health")
def disease_health():
    return {"module": "agro_disease", "status": "ready", "note": "Upload disease detection model to models/agro/disease/model_v1.h5 to activate full CNN inference"}