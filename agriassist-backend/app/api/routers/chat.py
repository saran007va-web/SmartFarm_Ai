"""
Chat API router — general chat, sessions, history, export.
"""
import uuid
import csv
import io
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ChatSession, ChatMessage, AnalyticsEvent
from app.services.llm_service import chat_with_llm

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])


# ── Schemas ───────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    history: list[dict] | None = None
    language: str | None = "en"
    device_id: str | None = None


class CreateSessionRequest(BaseModel):
    name: str = "Unnamed Session"


class RenameSessionRequest(BaseModel):
    name: str


# ── Helpers ───────────────────────────────────────────────────────────────

def _get_or_create_session(session_id: str | None, db: Session) -> ChatSession:
    if session_id:
        sess = db.query(ChatSession).filter_by(session_id=session_id).first()
        if sess:
            return sess
    # Create new session
    new_id = session_id or str(uuid.uuid4())[:16]
    sess = ChatSession(session_id=new_id, name="Auto Session")
    db.add(sess)
    db.flush()
    return sess


def _log_event(db: Session, event_type: str, detail: str = None):
    db.add(AnalyticsEvent(event_type=event_type, detail=detail))


# ── Routes ────────────────────────────────────────────────────────────────

@router.post("")
async def send_chat(req: ChatRequest, db: Session = Depends(get_db)):
    """Main chat endpoint — calls Groq LLM and saves messages to DB."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        reply = await chat_with_llm(
            message=req.message,
            history=req.history,
            language=req.language or "en",
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Persist session + messages
    sess = _get_or_create_session(req.session_id, db)
    db.add(ChatMessage(session_id=sess.session_id, role="user", content=req.message))
    db.add(ChatMessage(session_id=sess.session_id, role="assistant", content=reply))
    _log_event(db, "chat")
    db.commit()

    return {"reply": reply, "session_id": sess.session_id}


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    return {
        "sessions": [
            {"session_id": s.session_id, "name": s.name, "created_at": s.created_at}
            for s in sessions
        ]
    }


@router.post("/sessions")
def create_session(req: CreateSessionRequest, db: Session = Depends(get_db)):
    sess = ChatSession(session_id=str(uuid.uuid4())[:16], name=req.name)
    db.add(sess)
    db.commit()
    return {"session": {"session_id": sess.session_id, "name": sess.name}}


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(ChatSession).filter_by(session_id=session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found.")
    db.delete(sess)
    db.commit()
    return {"deleted": True}


@router.patch("/sessions/{session_id}")
def rename_session(session_id: str, req: RenameSessionRequest, db: Session = Depends(get_db)):
    sess = db.query(ChatSession).filter_by(session_id=session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found.")
    sess.name = req.name
    db.commit()
    return {"session": {"session_id": sess.session_id, "name": sess.name}}


@router.get("/history/{session_id}")
def get_history(session_id: str, db: Session = Depends(get_db)):
    msgs = (
        db.query(ChatMessage)
        .filter_by(session_id=session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    return {
        "messages": [{"role": m.role, "content": m.content} for m in msgs]
    }


@router.get("/export/{session_id}")
def export_chat(session_id: str, format: str = "json", db: Session = Depends(get_db)):
    """Export chat as JSON, CSV, or PDF."""
    msgs = (
        db.query(ChatMessage)
        .filter_by(session_id=session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    if not msgs:
        raise HTTPException(status_code=404, detail="No messages found for this session.")

    if format == "json":
        import json
        data = json.dumps([{"role": m.role, "content": m.content} for m in msgs], indent=2)
        return Response(content=data, media_type="application/json")

    elif format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["role", "content", "timestamp"])
        for m in msgs:
            writer.writerow([m.role, m.content, m.created_at.isoformat()])
        return Response(content=output.getvalue(), media_type="text/csv")

    elif format == "pdf":
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        import textwrap

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=letter)
        w, h = letter
        y = h - 50
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, f"Chat Export — Session {session_id}")
        y -= 30

        for m in msgs:
            role_label = "You:" if m.role == "user" else "AI:"
            c.setFont("Helvetica-Bold", 10)
            c.drawString(50, y, role_label)
            y -= 15
            c.setFont("Helvetica", 9)
            for line in textwrap.wrap(m.content, width=90):
                if y < 60:
                    c.showPage()
                    y = h - 50
                c.drawString(60, y, line)
                y -= 13
            y -= 8

        c.save()
        buf.seek(0)
        return Response(content=buf.read(), media_type="application/pdf")

    raise HTTPException(status_code=400, detail="format must be json, csv, or pdf.")


@router.get("/context/{session_id}")
def get_chat_context(session_id: str, device_id: str | None = None, db: Session = Depends(get_db)):
    """Return recent context for a session (for adaptive learning)."""
    msgs = (
        db.query(ChatMessage)
        .filter_by(session_id=session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
        .all()
    )
    return {"context": [{"role": m.role, "content": m.content} for m in reversed(msgs)]}
