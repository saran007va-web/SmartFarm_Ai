# AgriAssist / SmartFarm AI

AgriAssist is a full-stack agriculture decision-support platform that combines AI chat, document Q&A, weather intelligence, crop planning, market insights, irrigation guidance, farm records, and sensor data into one application.

The project is built as a monorepo with a FastAPI backend and a React + Vite frontend. It is designed to run locally with Docker or with native Python and Node.js tooling.

## Project Overview

AgriAssist exists to help farmers and agricultural teams make faster, better-informed decisions from a single interface. It supports both conversational assistance and structured operational workflows:

- Ask general farming questions through AI chat.
- Upload documents and ask grounded questions through RAG.
- View live weather for farming locations.
- Generate crop recommendations and yield estimates.
- Track prices, irrigation advice, calendar tasks, farm records, and sensor readings.

The backend provides the core APIs and data services, while the frontend delivers the user experience.

## Features

### AI and Knowledge

- Conversational chat with Groq-powered LLM responses.
- Document Q&A using retrieval-augmented generation.
- Document upload, listing, content retrieval, download, and deletion.
- Chat session history, naming, export, and context helpers.

### Farm Decision Support

- Crop recommendation from farm input data.
- Yield prediction using a local ML model.
- Irrigation advice based on farm and weather data.
- Profit margin calculation for farming economics.

### Weather and Market Data

- Live weather for Indian cities and custom coordinates.
- Default weather location starts from Coimbatore, Tamil Nadu.
- Forecast data for planning daily farm operations.
- Market price lookup for crops.

### Farm Operations

- Farming calendar and crop planning.
- Maintenance task creation and scheduling.
- Farm profile management.
- Yield records and operational history.
- Sensor ingestion, readings, and webhook access.
- Translation and multilingual support.
- Settings, stats, analytics, and dashboard views.

## Architecture

### Repository Layout

```text
agriTech/
├── agriassist-backend/   # FastAPI backend, Docker stack, models, RAG, ML
├── frontend/             # React + Vite frontend
├── scripts/              # Workspace automation scripts
└── package.json          # Root helper scripts
```

### Backend Structure

The backend lives in [app](app) and is organized by responsibility:

- [app/main.py](app/main.py) creates the FastAPI application, runs startup tasks, and registers routers.
- [app/core/config.py](app/core/config.py) loads settings from environment variables and `.env`.
- [app/db/database.py](app/db/database.py) configures SQLAlchemy, sessions, and table creation.
- [app/db/models.py](app/db/models.py) defines the database schema.
- [app/services/llm_service.py](app/services/llm_service.py) wraps the Groq client.
- [app/rag/pipeline.py](app/rag/pipeline.py) loads and queries the FAISS knowledge base.
- [app/ml](app/ml) contains crop and yield prediction models.
- [app/api/routers](app/api/routers) contains feature-specific API endpoints.

### Frontend Structure

The frontend lives in [../frontend/src](../frontend/src) and includes:

- route definitions in [../frontend/src/App.jsx](../frontend/src/App.jsx)
- shared API calls in [../frontend/src/services/api.js](../frontend/src/services/api.js)
- feature pages under [../frontend/src/pages](../frontend/src/pages)
- global state and context providers under [../frontend/src/contexts](../frontend/src/contexts)

## Installation

### Prerequisites

- Node.js 18 or newer
- Python 3.11 or newer
- Docker and Docker Compose
- PostgreSQL if you run the backend outside Docker

### Clone the repository

```bash
git clone <repository-url>
cd agriTech
```

### Configure environment variables

Copy the backend example environment file and edit it with your own credentials:

```bash
cd agriassist-backend
copy .env.example .env
```

Set the following values:

```env
GROQ_API_KEY=your_groq_api_key_here
WEATHER_API_KEY=your_weather_api_key_here
DATABASE_URL=postgresql://smartfarm_user:strongpassword@localhost:5433/smartfarm_db
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

Important notes:

- Do not commit secrets to version control.
- `WEATHER_API_KEY` is required for live weather lookups.
- Docker maps the backend to port `8002` and PostgreSQL to port `5433`.

### Run with Docker

From the repository root, start both services with:

```bash
npm run dev
```

This workspace command starts the backend compose stack and the frontend Vite server together.

To run only the backend stack:

```bash
npm run dev:backend
```

To run only the frontend:

```bash
npm run dev:frontend
```

### Run the backend locally without Docker

```bash
cd agriassist-backend
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Run the frontend locally without Docker

```bash
cd frontend
npm install
npm run dev
```

The frontend is usually available at `http://localhost:5173`.

## Usage

### Launch the application

After the backend and frontend are running, open the browser to the frontend URL and use the sidebar to navigate between:

- Dashboard
- Chat
- Recommend
- Weather
- Market
- Calendar
- Irrigation
- Economics
- Records
- Sensors
- Settings
- Analytics

### Example weather requests

Current weather for the default location:

```bash
curl "http://localhost:8002/api/weather/current"
```

Current weather for Coimbatore explicitly:

```bash
curl "http://localhost:8002/api/weather/current?location=coimbatore"
```

Forecast:

```bash
curl "http://localhost:8002/api/weather/forecast?location=coimbatore&days=7"
```

### Example chat request

```bash
curl -X POST "http://localhost:8002/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the best irrigation schedule for tomato crops in hot weather?"
  }'
```

### Example RAG request

```bash
curl -X POST "http://localhost:8002/api/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Summarize the fertilizer recommendations in my uploaded document."
  }'
```

### Example frontend API usage

```javascript
import { getCurrentWeather, getWeatherForecast } from './services/api'

const current = await getCurrentWeather('coimbatore')
const forecast = await getWeatherForecast('coimbatore', 7)
```

## Configuration

### Environment variables

| Variable | Description | Default |
|---|---|---|
| `GROQ_API_KEY` | Groq key for chat and RAG | empty |
| `GROQ_MODEL` | Groq model name | `llama-3.1-8b-instant` |
| `WEATHER_API_KEY` | Weather provider key for live weather | empty |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://smartfarm_user:strongpassword@localhost:5433/smartfarm_db` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173,http://localhost:3000` |
| `CHUNK_SIZE` | RAG chunk size in characters | `500` |
| `CHUNK_OVERLAP` | RAG chunk overlap | `50` |
| `TOP_K_CHUNKS` | Number of retrieved chunks per query | `3` |
| `ENVIRONMENT` | App environment label | `development` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Docker compose configuration

The backend compose file is [docker-compose.yml](docker-compose.yml). It defines:

- `db` on host port `5433`
- `backend` on host port `8002`
- persistent volumes for PostgreSQL and application data
- health checks for both services

## API / Documentation

### OpenAPI docs

Once the backend is running, documentation is available at:

- `http://localhost:8002/docs`
- `http://localhost:8002/redoc`

### Core routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/` | Service metadata |
| POST | `/api/chat` | AI chat |
| GET | `/api/chat/sessions` | List chat sessions |
| POST | `/api/chat/sessions` | Create session |
| GET | `/api/chat/history/{id}` | Message history |
| GET | `/api/chat/export/{id}` | Export a session |
| POST | `/api/rag/upload` | Upload documents |
| POST | `/api/rag/query` | Ask over documents |
| GET | `/api/rag/stats` | Knowledge base stats |
| GET | `/api/rag/documents` | List documents |
| GET | `/api/rag/documents/{id}/content` | View document content |
| GET | `/api/rag/documents/{id}/download` | Download document |
| DELETE | `/api/rag/documents/{id}` | Delete document |
| POST | `/api/predict/crop` | Crop recommendation |
| POST | `/api/predict/yield` | Yield prediction |
| GET | `/api/predict/crops/list` | Supported crops |
| GET | `/api/weather/current` | Current weather |
| GET | `/api/weather/forecast` | Forecast |
| GET | `/api/weather/locations` | Supported locations |
| POST | `/api/weather/farm-location` | Weather lookup by coordinates |
| GET | `/api/market/prices` | Market prices |
| POST | `/api/irrigation/advice` | Irrigation advice |
| GET | `/api/irrigation/logs` | Irrigation logs |
| POST | `/api/economics/margin` | Profit margin calculator |
| GET | `/api/calendar` | Calendar entries |
| GET | `/api/calendar/crops/list` | Calendar crop list |
| GET/POST | `/api/records` | Yield record CRUD |
| GET/POST | `/api/farm/profile` | Farm profile CRUD |
| GET | `/api/sensors/readings` | Sensor readings |
| POST | `/api/sensors/data` | Sensor ingestion |
| GET | `/api/sensors/webhook-url` | Webhook URL |
| POST | `/api/translate` | Translation |
| GET | `/api/languages` | Supported languages |
| POST | `/api/feedback` | User feedback |
| POST | `/api/correction` | Correction submission |
| GET | `/api/profile/{deviceId}` | User profile |
| GET | `/api/profile/{deviceId}/stats` | User stats |

### Weather defaults

- Default backend weather location: `coimbatore`
- Default frontend weather state: `Tamil Nadu`
- Default frontend weather sub-location: `Coimbatore`

## Testing

There is no formal unit test suite committed in this repository, so validation is based on smoke tests and build checks.

### Backend smoke checks

```bash
curl "http://localhost:8002/health"
curl "http://localhost:8002/api/weather/current"
curl "http://localhost:8002/api/weather/forecast"
```

Expected results:

- `/health` returns a JSON payload with status `ok`.
- Weather endpoints return `location`, `temperature`, `humidity`, `wind_speed`, and `forecast` data.

### Frontend build check

```bash
npm run build
```

Expected result:

- Vite completes a production build successfully.

### Docker validation

```bash
docker compose -f docker-compose.yml up -d --build
docker compose -f docker-compose.yml ps
```

Expected result:

- `db` is healthy.
- `backend` is healthy.

## Troubleshooting

### Backend container restarts

- Inspect [app/db/database.py](app/db/database.py) for syntax corruption or accidental escaped quotes.
- Check Docker logs:

```bash
docker compose -f docker-compose.yml logs --tail=100 backend
```

### Weather returns an error

- Confirm `WEATHER_API_KEY` is set in `.env`.
- Confirm the backend has been rebuilt or restarted after changing the key.
- Verify that the weather API key matches the configured provider.

### Chat or RAG fails

- Confirm `GROQ_API_KEY` is set.
- Make sure your Groq account is active and has quota available.
- Upload documents before trying RAG queries.

### Frontend cannot reach backend

- Check that the backend is running on port `8002`.
- Confirm the frontend URL is included in `ALLOWED_ORIGINS`.
- Check browser console errors for CORS or network problems.

### PostgreSQL connection errors

- Ensure PostgreSQL is running.
- If using Docker, wait for the `db` service health check to pass.
- Confirm the `DATABASE_URL` matches your runtime setup.

## Contributing

Contributions are welcome.

Recommended workflow:

1. Create a feature branch.
2. Make focused changes with clear commit messages.
3. Run the backend and frontend smoke checks.
4. Update documentation when behavior changes.
5. Open a pull request describing the change and any follow-up work.

Guidelines:

- Keep API contracts stable unless a breaking change is necessary.
- Avoid committing secrets or generated artifacts.
- Prefer small, targeted changes over broad refactors.
- Update `.env.example` when adding new environment variables.

## License

No license file is currently present in this repository. Until a license is added, treat the project as all rights reserved and do not redistribute or reuse it outside the owner’s permission.

## Contact / Support

For help:

- Review the API docs at `http://localhost:8002/docs`.
- Inspect the backend in [app](app) and the frontend in [../frontend/src](../frontend/src).
- Report issues through the repository owner’s preferred support channel or issue tracker.
