"""
RAG Pipeline — Document ingestion, embedding, FAISS storage, and retrieval.

Architecture decision:
  - Embeddings: sentence-transformers (all-MiniLM-L6-v2) — fast, small, runs locally
  - Vector store: FAISS (persisted to disk) — no extra service needed
  - Chunking: LangChain RecursiveCharacterTextSplitter
  - Text extraction: pypdf (PDF), python-docx (DOCX), plain text for TXT

Flow:
  upload → extract text → chunk → embed → add to FAISS → save index
  query  → embed question → search FAISS → retrieve top-K chunks → LLM answers
"""
import os
import json
import logging
import pickle
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────────────────────────
DATA_DIR = Path("data/faiss_index")
DATA_DIR.mkdir(parents=True, exist_ok=True)

FAISS_INDEX_PATH = DATA_DIR / "index.faiss"
CHUNKS_META_PATH = DATA_DIR / "chunks_meta.pkl"   # list of {content, source}

# ── Embedding model (loaded once at first use) ───────────────────────────
_embedding_model: SentenceTransformer | None = None
_faiss_index: faiss.IndexFlatL2 | None = None
_chunks_meta: list[dict] = []          # parallel to FAISS vectors


def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        logger.info("Loading sentence-transformer model (all-MiniLM-L6-v2)…")
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Embedding model loaded.")
    return _embedding_model


def _get_embedding_dim() -> int:
    return 384  # all-MiniLM-L6-v2 output size


def load_faiss_index():
    """Load FAISS index and chunk metadata from disk (or create fresh ones)."""
    global _faiss_index, _chunks_meta

    if FAISS_INDEX_PATH.exists() and CHUNKS_META_PATH.exists():
        try:
            _faiss_index = faiss.read_index(str(FAISS_INDEX_PATH))
            with open(CHUNKS_META_PATH, "rb") as f:
                _chunks_meta = pickle.load(f)
            logger.info(f"FAISS index loaded: {_faiss_index.ntotal} vectors, {len(_chunks_meta)} chunks.")
            return
        except Exception as e:
            logger.warning(f"Could not load FAISS index, rebuilding: {e}")

    # Fresh index
    _faiss_index = faiss.IndexFlatL2(_get_embedding_dim())
    _chunks_meta = []
    logger.info("Created new FAISS index.")


def _save_index():
    faiss.write_index(_faiss_index, str(FAISS_INDEX_PATH))
    with open(CHUNKS_META_PATH, "wb") as f:
        pickle.dump(_chunks_meta, f)


# ── Text extraction ───────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    from pypdf import PdfReader
    import io
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages)


def extract_text_from_docx(file_bytes: bytes) -> str:
    from docx import Document
    import io
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs)


def extract_text_from_txt(file_bytes: bytes) -> str:
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1", errors="replace")


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in (".docx", ".doc"):
        return extract_text_from_docx(file_bytes)
    else:
        return extract_text_from_txt(file_bytes)


# ── Chunking ──────────────────────────────────────────────────────────────

def chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    # Filter very short chunks (less than 30 chars)
    return [c.strip() for c in chunks if len(c.strip()) >= 30]


# ── Indexing ──────────────────────────────────────────────────────────────

def index_document(text: str, source: str) -> tuple[int, list[int]]:
    """
    Chunk, embed, and add a document to the FAISS index.

    Returns:
        (num_chunks, list_of_faiss_ids)
    """
    global _faiss_index, _chunks_meta

    if _faiss_index is None:
        load_faiss_index()

    model = get_embedding_model()
    chunks = chunk_text(text)
    if not chunks:
        return 0, []

    embeddings = model.encode(chunks, show_progress_bar=False)
    embeddings = np.array(embeddings, dtype="float32")

    start_id = len(_chunks_meta)
    _faiss_index.add(embeddings)

    faiss_ids = list(range(start_id, start_id + len(chunks)))
    for i, chunk in enumerate(chunks):
        _chunks_meta.append({
            "content": chunk,
            "source": source,
            "faiss_id": start_id + i,
        })

    _save_index()
    logger.info(f"Indexed {len(chunks)} chunks from '{source}'.")
    return len(chunks), faiss_ids


# ── Retrieval ─────────────────────────────────────────────────────────────

def retrieve_chunks(question: str, top_k: int | None = None) -> list[dict]:
    """
    Embed the question, search FAISS, return top-K chunk dicts.

    Each dict: {content, source, distance}
    """
    global _faiss_index, _chunks_meta

    if _faiss_index is None:
        load_faiss_index()

    if _faiss_index.ntotal == 0:
        return []

    k = min(top_k or settings.TOP_K_CHUNKS, _faiss_index.ntotal)
    model = get_embedding_model()
    q_emb = model.encode([question], show_progress_bar=False)
    q_emb = np.array(q_emb, dtype="float32")

    distances, indices = _faiss_index.search(q_emb, k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < 0 or idx >= len(_chunks_meta):
            continue
        meta = _chunks_meta[idx]
        results.append({
            "content": meta["content"],
            "source": meta["source"],
            "distance": float(dist),
        })

    return results


# ── Stats ─────────────────────────────────────────────────────────────────

def get_rag_stats() -> dict:
    global _faiss_index, _chunks_meta

    if _faiss_index is None:
        load_faiss_index()

    sources = list({m["source"] for m in _chunks_meta})
    return {
        "total_chunks": len(_chunks_meta),
        "total_documents": len(sources),
        "sources": sources,
        "index_size": _faiss_index.ntotal if _faiss_index else 0,
    }


def reset_index():
    """Wipe the FAISS index and all chunk metadata."""
    global _faiss_index, _chunks_meta

    _faiss_index = faiss.IndexFlatL2(_get_embedding_dim())
    _chunks_meta = []

    if FAISS_INDEX_PATH.exists():
        FAISS_INDEX_PATH.unlink()
    if CHUNKS_META_PATH.exists():
        CHUNKS_META_PATH.unlink()

    logger.info("FAISS index reset.")
