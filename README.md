# AgriTech Workspace

Smart AI farming platform workspace with a React frontend and an Express/Prisma backend. The project is organized as a two-app workspace so the UI, API, and deployment assets can evolve together without losing clear boundaries.

## What’s In The Repo

- `frontend/` - Vite + React application for the farmer dashboard and product UI
- `backend/` - Express + Prisma API with auth, farms, planning, analytics, weather, chat, and realtime features
- `scripts/dev.mjs` - Starts the frontend and backend together from the workspace root
- `tests/` - Backend test coverage for agronomic logic and service behavior

## Root Scripts

- `npm run dev` - Start frontend and backend together
- `npm run dev:backend` - Start the backend stack with Docker Compose
- `npm run dev:frontend` - Start the Vite frontend only
- `npm run build` - Build the frontend
- `npm run build:backend` - Type-check and build the backend
- `npm run build:all` - Build backend and frontend
- `npm run lint:backend` - Lint backend sources
- `npm run lint:frontend` - Lint frontend sources

## Quick Start

1. Install dependencies in both apps.
2. Copy `backend/.env.example` to `backend/.env` and fill in the API keys and database values.
3. Copy `frontend/.env.example` to `frontend/.env` if you need to override the API base URL.
4. Run `npm run dev` from the repository root.

The frontend will start with Vite, and the backend will be available on its configured API port. If you prefer Docker for the backend, use the backend compose files in `backend/`.

## Local Setup

### Frontend

The frontend is a production-oriented React app with routing, dashboard pages, and shared UI primitives. Run it with:

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

### Backend

The backend uses Express, Prisma, Socket.IO, and a set of feature modules for farming workflows. Run it with:

```bash
npm --prefix backend install
npm --prefix backend run dev
```

For a Docker-based backend workflow, use the compose files under `backend/`.

## Environment Files

- `backend/.env.example` contains the backend runtime variables, including authentication, database, cache, storage, and provider keys.
- `frontend/.env.example` contains the frontend API base URL and OAuth client settings.

## Project Structure

```text
agriTech/
├── backend/
├── frontend/
├── migrations/
├── scripts/
├── tests/
└── README.md
```

## Notes

- The workspace is set up for a split frontend/backend workflow rather than a single monolith.
- The root dev script is intentionally small and delegates to the two app folders so each side can be developed independently or together.
- Frontend API calls should target the backend port defined in `frontend/.env.example`.
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
cd backend
# Start Docker services first
docker-compose up -d db redis

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Start development server
npm run dev