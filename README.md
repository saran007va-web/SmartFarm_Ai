# AgriAssist Backend

> AI-powered farming copilot backend — intelligent crop recommendations, document Q&A, yield prediction, and real-time agronomic advice.

AgriAssist is a production-ready FastAPI backend that brings machine learning and large language models to smallholder and commercial farms. It combines a Retrieval-Augmented Generation (RAG) pipeline for document-grounded answers, local ML models for crop and yield prediction, and direct LLM calls for conversational agronomic guidance — all in a single, deployable service.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

---

## Features

- **AI Chat** — Conversational agronomic assistant powered by Groq's `llama-3.1-8b-instant`, with persistent sessions and export (JSON/CSV/PDF)
- **Document Q&A (RAG)** — Upload PDF, DOCX, or TXT knowledge base documents; query them with FAISS-backed semantic retrieval and LLM synthesis
- **Crop Recommendation** — RandomForest model trained on soil N/P/K, pH, rainfall, and temperature data
- **Yield Prediction** — GradientBoosting model for numeric yield forecasting
- **Irrigation Advice** — Structured LLM-generated irrigation plans from sensor and weather inputs
- **Market Prices** — Live crop price feed endpoint
- **Profit Calculator** — Economics margin analysis endpoint
- **Farm Records** — Full CRUD for yield records and farm profiles
- **Sensor Ingestion** — Accept and query IoT soil/weather sensor readings
- **Multilingual** — On-demand text translation endpoint
- **Farming Calendar** — Crop cycle and activity calendar
- **Usage Analytics** — Dashboard stats, 7-day activity charts, and usage breakdowns

---

## Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI + Uvicorn |
| Database | PostgreSQL 15 + SQLAlchemy ORM |
| LLM | Groq API (`llama-3.1-8b-instant`) |
| RAG | FAISS + SentenceTransformers + LangChain text splitters |
| ML Models | scikit-learn (RandomForest, GradientBoosting) |
| Deployment | Docker + docker-compose |
| Python | 3.11+ |

---

## Architecture

The system routes requests to one of three processing paths depending on what the user needs:

```
Incoming Request
       │
       ├── General farming question (/api/chat)
       │         └──► Direct LLM Call (Groq)
       │                Fast, conversational, no document context needed
       │
       ├── Document question (/api/rag/query)
       │         └──► RAG Pipeline
       │                Upload → chunk → embed → FAISS retrieval → LLM synthesis
       │
       ├── Irrigation advice (/api/irrigation/advice)
       │         └──► Direct LLM Call (structured JSON response)
       │
       └── Crop / yield prediction (/api/predict/*)
                 └──► Local ML Model
                        No LLM, no API cost, sub-second inference
```

**When to use each path:**

- **Direct LLM** — Conversational questions with no need for grounded source material.
- **RAG** — Questions that require answers grounded in specific uploaded farm documents, research papers, or manuals.
- **Local ML** — Structured predictions from numeric inputs (soil nutrients, climate data). Fast, offline, zero inference cost.

### Component Map

```
agriassist-backend/
├── app/
│   ├── main.py                  # App entrypoint, router registration, startup hooks
│   ├── core/config.py           # Pydantic settings loaded from environment
│   ├── api/routers/             # One router file per feature domain
│   │   ├── chat.py              # Chat sessions, history, export
│   │   ├── rag.py               # Document upload and RAG query
│   │   ├── predict.py           # Crop + yield ML inference
│   │   ├── stats.py             # Dashboard analytics
│   │   ├── farm.py              # Farm profile CRUD
│   │   ├── market.py            # Market price feed
│   │   ├── irrigation.py        # Irrigation advice
│   │   ├── economics.py         # Profit margin calculator
│   │   ├── sensors.py           # Sensor ingestion and query
│   │   ├── calendar.py          # Farming calendar
│   │   ├── settings.py          # App settings
│   │   ├── profile.py           # User profile
│   │   └── translate.py         # Translation
│   ├── db/
│   │   ├── database.py          # Engine, session factory, Base
│   │   └── models.py            # All SQLAlchemy models
│   ├── services/llm_service.py  # Groq API wrapper
│   ├── ml/
│   │   ├── crop_model.py        # RandomForest crop recommendation
│   │   └── yield_model.py       # GradientBoosting yield prediction
│   └── rag/pipeline.py          # FAISS + SentenceTransformers RAG pipeline
├── data/
│   ├── faiss_index/             # Persisted FAISS vector index
│   └── ml_models/               # Trained .pkl model files (auto-generated on first run)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Quick Start

The fastest path to a running server is Docker. It handles PostgreSQL, the app server, and networking in a single command.

```bash
# 1. Clone the repository
git clone <repo-url>
cd agriassist-backend

# 2. Configure environment
cp .env.example .env
# Open .env and set GROQ_API_KEY (see Configuration section)

# 3. Start all services
docker compose up --build
```

The API will be available at `http://localhost:8000`.  
Interactive docs (Swagger UI): `http://localhost:8000/docs`

Get a free Groq API key at [console.groq.com](https://console.groq.com).

---

## Installation

### Option A — Docker (Recommended)

**Prerequisites:** Docker Desktop 4.x+ or Docker Engine + Compose plugin.

```bash
git clone <repo-url>
cd agriassist-backend
cp .env.example .env
# Edit .env — set GROQ_API_KEY at minimum
docker compose up --build
```

The compose file starts two services:

- `db` — PostgreSQL 15, health-checked before the app starts
- `app` — FastAPI server on port 8000

To run in the background: `docker compose up -d --build`  
To stop: `docker compose down`

---

### Option B — Local (Without Docker)

**Prerequisites:** Python 3.11+, PostgreSQL 14+, `pip`.

```bash
# Clone
git clone <repo-url>
cd agriassist-backend

# Virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Dependencies
pip install -r requirements.txt

# Create database
createdb smartfarm_db

# Configure environment
cp .env.example .env
# Edit .env — set GROQ_API_KEY and update DATABASE_URL if needed

# Start server
uvicorn app.main:app --reload --port 8000
```

> **Note on FAISS (Apple Silicon):** If `faiss-cpu` fails to install on M1/M2 Macs:
> ```bash
> pip install faiss-cpu --no-binary faiss-cpu
> ```

---

## Configuration

All configuration is loaded from environment variables. Copy `.env.example` to `.env` and set values before starting the server.

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | — | Your Groq API key. Obtain at [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | No | `llama-3.1-8b-instant` | Groq model identifier |
| `DATABASE_URL` | No | `postgresql://smartfarm_user:strongpassword@localhost:5433/smartfarm_db` | Full PostgreSQL connection string |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173,...` | Comma-separated list of allowed CORS origins |
| `CHUNK_SIZE` | No | `500` | Character size for RAG document chunking |
| `TOP_K_CHUNKS` | No | `3` | Number of document chunks to retrieve per RAG query |

**Typical `.env` file:**

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
DATABASE_URL=postgresql://smartfarm_user:strongpassword@localhost:5433/smartfarm_db
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
CHUNK_SIZE=500
TOP_K_CHUNKS=3
```

**CORS:** If your frontend runs on a different origin (e.g. `http://localhost:5173`), add it to `ALLOWED_ORIGINS`. Multiple origins are comma-separated with no spaces.

---

## API Reference

Interactive documentation is auto-generated at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc` (ReDoc).

### Chat

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Send a message; returns AI response |
| GET | `/api/chat/sessions` | List all chat sessions |
| POST | `/api/chat/sessions` | Create a new chat session |
| GET | `/api/chat/history/{id}` | Get message history for a session |
| GET | `/api/chat/export/{id}` | Export session as JSON, CSV, or PDF |

**Example — send a message:**

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "abc123", "message": "What fertilizer should I use for rice?"}'
```

---

### RAG (Document Q&A)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/rag/upload` | Upload a PDF, DOCX, or TXT file to the knowledge base |
| POST | `/api/rag/query` | Query the knowledge base with a natural language question |
| GET | `/api/rag/stats` | View knowledge base statistics (document count, chunk count) |

**Example — upload a document:**

```bash
curl -X POST http://localhost:8000/api/rag/upload \
  -F "file=@soil_management_guide.pdf"
```

**Example — query the knowledge base:**

```bash
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the recommended pH for growing tomatoes?"}'
```

---

### ML Predictions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/predict/crop` | Recommend a crop from soil and climate inputs |
| POST | `/api/predict/yield` | Predict yield in tonnes per hectare |

**Example — crop recommendation:**

```bash
curl -X POST http://localhost:8000/api/predict/crop \
  -H "Content-Type: application/json" \
  -d '{
    "N": 90, "P": 42, "K": 43,
    "temperature": 20.8,
    "humidity": 82.0,
    "ph": 6.5,
    "rainfall": 202.9
  }'
```

---

### Other Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats` | Dashboard totals |
| GET | `/api/stats/history` | 7-day activity chart data |
| GET | `/api/stats/breakdown` | Usage breakdown for pie chart |
| GET | `/api/market/prices` | Current crop market prices |
| POST | `/api/irrigation/advice` | Get irrigation recommendation |
| POST | `/api/economics/margin` | Calculate profit margin |
| GET | `/api/records` | List yield records |
| POST | `/api/records` | Create a yield record |
| GET | `/api/farm/profile` | Get farm profile |
| POST | `/api/farm/profile` | Create or update farm profile |
| GET | `/api/calendar` | Farming calendar events |
| GET | `/api/sensors/readings` | Query recent sensor readings |
| POST | `/api/sensors/data` | Ingest a new sensor reading |
| POST | `/api/translate` | Translate text to a target language |
| GET | `/health` | Health check (returns `{"status": "ok"}`) |

---

## Testing

> **Note:** The project does not currently ship a test suite. The section below describes the recommended approach for adding and running tests.

**Recommended test setup with pytest:**

```bash
pip install pytest pytest-asyncio httpx

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=term-missing
```

**Writing a basic endpoint test:**

```python
# tests/test_health.py
from httpx import AsyncClient
from app.main import app
import pytest

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

**Manually verifying the ML models:**

```bash
# Start the server, then test crop prediction
curl -X POST http://localhost:8000/api/predict/crop \
  -H "Content-Type: application/json" \
  -d '{"N": 90, "P": 42, "K": 43, "temperature": 20.8, "humidity": 82.0, "ph": 6.5, "rainfall": 202.9}'
# Expected: a crop recommendation with confidence score
```

---

## Troubleshooting

**`GROQ_API_KEY is not set` on startup**  
You have not copied `.env.example` to `.env`, or the file is not in the project root. Run `cp .env.example .env` and add your key.

**`Database connection refused`**  
PostgreSQL is not running or the `DATABASE_URL` is wrong. With Docker, wait 10–15 seconds for the `db` service health check to pass before the app starts. With a local install, verify PostgreSQL is running: `pg_isready`.

**`ML model training slow on first start`**  
This is expected behaviour. On first boot, both ML models train from scratch and save to `data/ml_models/`. Subsequent starts load from disk in under a second.

**`faiss-cpu` install fails on Mac M1/M2**  
Use the no-binary flag:
```bash
pip install faiss-cpu --no-binary faiss-cpu
```

**CORS error from the frontend**  
Add your frontend's origin to `ALLOWED_ORIGINS` in `.env`. Make sure there are no trailing slashes and no spaces between comma-separated values.

**`ModuleNotFoundError` after pulling updates**  
Dependencies have likely changed. Re-install: `pip install -r requirements.txt`. With Docker, rebuild: `docker compose up --build`.

**FAISS index feels stale after re-uploading documents**  
The FAISS index in `data/faiss_index/` persists across restarts. To force a rebuild, delete the directory and restart the server — it will be recreated from scratch.

---

## Contributing

Contributions are welcome. Please follow these steps:

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Install dependencies** in a virtual environment:
   ```bash
   python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Follow the existing patterns.** Each feature domain lives in its own router under `app/api/routers/`. Business logic goes in `app/services/` or `app/ml/`. Keep database models in `app/db/models.py`.

4. **Write or update tests** for any new endpoints or changed behaviour.

5. **Lint and format** your code before submitting:
   ```bash
   pip install ruff black
   ruff check app/
   black app/
   ```

6. **Open a pull request** against `main` with a clear description of what the change does and why.

**Code style:**
- Python 3.11+, type hints throughout
- PEP 8 via `black` formatter
- Docstrings on all public functions and classes
- No hardcoded credentials — environment variables only

---

## License

This project does not currently specify a license. All rights are reserved by the project author unless a license file is added to the repository.

If you intend to use this project in production or distribute it, please add an appropriate open-source license (MIT, Apache 2.0, etc.) and update this section.

---

## Support

- **Bug reports and feature requests:** Open an issue in the repository's issue tracker.
- **API questions:** The auto-generated docs at `/docs` cover request/response schemas for every endpoint.
- **Groq API issues:** Refer to [console.groq.com](https://console.groq.com) for model availability, rate limits, and billing.

---

*Built with FastAPI · Groq · FAISS · scikit-learn*
