from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..agro_database import get_agro_db
from ..agro_schemas import AgroAdvisorChatRequest, AgroAdvisorChatResponse
from .agro_advisor_service import agro_get_advisor_reply

router = APIRouter()


@router.post("/chat", response_model=AgroAdvisorChatResponse)
async def advisor_chat(req: AgroAdvisorChatRequest, db: Session = Depends(get_agro_db)):
    reply, sources, follow_ups = await agro_get_advisor_reply(
        db=db,
        farmer_id=req.farmer_id,
        message=req.message,
        history=req.history,
        language=req.language,
    )
    return AgroAdvisorChatResponse(
        reply=reply,
        reply_translated=None,
        sources=sources,
        follow_up_questions=follow_ups,
    )