"""
Settings API — app config info, reset FAISS index, clear chat history.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ChatMessage, ChatSession, Document, RagChunk
from app.rag.pipeline import reset_index
from app.core.config import settings

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("")
def get_settings():
    """Return current application configuration (non-sensitive)."""
    return {
        "llm_model": settings.GROQ_MODEL,
        "chunk_size": settings.CHUNK_SIZE,
        "top_k_chunks": settings.TOP_K_CHUNKS,
        "environment": settings.ENVIRONMENT,
    }


@router.post("/reset-index")
def reset_rag_index(db: Session = Depends(get_db)):
    """Wipe the FAISS vector index and all document records."""
    reset_index()
    db.query(RagChunk).delete()
    db.query(Document).delete()
    db.commit()
    return {"message": "RAG index has been reset. All documents removed."}


@router.post("/clear-history")
def clear_chat_history(db: Session = Depends(get_db)):
    """Delete all chat messages and sessions."""
    db.query(ChatMessage).delete()
    db.query(ChatSession).delete()
    db.commit()
    return {"message": "All chat history has been cleared."}
