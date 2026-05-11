"""
RAG API router — document upload, query, and stats.
"""
import logging
import os
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Document, RagChunk, AnalyticsEvent
from app.rag.pipeline import extract_text, index_document, retrieve_chunks, get_rag_stats, reset_index
from app.services.llm_service import chat_with_llm

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rag", tags=["RAG"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx", ".doc", ".md"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Create uploads directory if it doesn't exist
UPLOADS_DIR = Path("/app/data/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


class QueryRequest(BaseModel):
    question: str


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a PDF, TXT, or DOCX file.
    Extracts text, chunks it, embeds chunks, and adds them to the FAISS index.
    Also saves the file for future reference.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max 10 MB.")

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        text = extract_text(content, file.filename)
    except Exception as e:
        logger.error(f"Text extraction failed: {e}")
        raise HTTPException(status_code=422, detail=f"Could not extract text: {e}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="No text content found in the file.")

    # Save file to disk
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = UPLOADS_DIR / safe_filename
    
    try:
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"File save failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file.")

    # Index in FAISS
    chunk_count, faiss_ids = index_document(text, source=file.filename)

    # Persist document metadata to DB with file path
    doc = Document(
        filename=file.filename, 
        file_type=ext, 
        file_path=str(file_path),
        file_size=len(content),
        chunk_count=chunk_count
    )
    db.add(doc)
    db.flush()

    for i, fid in enumerate(faiss_ids):
        db.add(RagChunk(document_id=doc.id, chunk_index=i, content="[indexed]", faiss_index_id=fid))

    db.add(AnalyticsEvent(event_type="upload", detail=file.filename))
    db.commit()

    return {
        "id": doc.id,
        "filename": file.filename,
        "file_size": len(content),
        "chunks_created": chunk_count,
        "chunks_indexed": chunk_count,
        "message": f"Successfully indexed {chunk_count} chunks from '{file.filename}'.",
    }


@router.post("/query")
async def query_documents(req: QueryRequest, db: Session = Depends(get_db)):
    """
    Answer a question using RAG:
    1. Retrieve top-K relevant chunks from FAISS
    2. Build context string
    3. Call LLM with context → grounded answer
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    chunks = retrieve_chunks(req.question)
    if not chunks:
        return {
            "answer": "No documents have been uploaded yet. Please upload farming guides or PDFs first.",
            "sources": [],
        }

    # Build context for LLM
    context_parts = [f"[Source: {c['source']}]\n{c['content']}" for c in chunks]
    context_str = "\n\n---\n\n".join(context_parts)

    system_extra = f"""You have access to the following document extracts to answer the user's question.
Only use information from these documents. If the answer is not in the documents, say so.

DOCUMENT CONTEXT:
{context_str}"""

    try:
        answer = await chat_with_llm(
            message=req.question,
            system_extra=system_extra,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    db.add(AnalyticsEvent(event_type="rag_query"))
    db.commit()

    return {
        "answer": answer,
        "sources": [{"source": c["source"], "distance": c["distance"]} for c in chunks],
    }


@router.get("/stats")
def rag_stats():
    """Return current knowledge base stats."""
    return get_rag_stats()


@router.get("/documents")
def list_documents(db: Session = Depends(get_db)):
    """List all uploaded documents with metadata."""
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    
    return {
        "documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "chunk_count": doc.chunk_count,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "has_file": bool(doc.file_path and os.path.exists(doc.file_path)),
            }
            for doc in docs
        ]
    }


@router.get("/documents/{doc_id}/download")
def download_document(doc_id: int, db: Session = Depends(get_db)):
    """Download the original uploaded file."""
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    if not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on server.")
    
    return FileResponse(
        path=doc.file_path,
        filename=doc.filename,
        media_type="application/octet-stream"
    )


@router.get("/documents/{doc_id}/content")
def get_document_content(doc_id: int, db: Session = Depends(get_db)):
    """Get the text content of a document for viewing."""
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    if not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on server.")
    
    try:
        # For text files, return the content directly
        if doc.file_type in {".txt", ".md"}:
            with open(doc.file_path, "r", encoding="utf-8") as f:
                content = f.read()
            return {
                "filename": doc.filename,
                "file_type": doc.file_type,
                "content": content,
                "viewable": True,
            }
        
        # For PDF and DOCX, extract text
        with open(doc.file_path, "rb") as f:
            file_content = f.read()
        
        text = extract_text(file_content, doc.filename)
        return {
            "filename": doc.filename,
            "file_type": doc.file_type,
            "content": text,
            "viewable": True,
        }
    except Exception as e:
        logger.error(f"Failed to extract content from {doc.filename}: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract file content.")


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    """Delete a document and its chunks."""
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    # Delete file from disk
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.warning(f"Could not delete file {doc.file_path}: {e}")
    
    # Delete from database (chunks will cascade delete)
    db.delete(doc)
    db.commit()
    
    return {"deleted": True, "id": doc_id}
