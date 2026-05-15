# AgriTech Backend

Production-ready backend for the Smart AI Farming Platform.

## Features

- **Express.js** server with Socket.IO for realtime updates
- **PostgreSQL** database with Prisma ORM
- **Redis** caching for weather and market data
- **JWT authentication** with session management
- **Supabase Storage** for document uploads
- **Weather API** using Open-Meteo (free, no API key required)
- **Market Prices** API with historical data
- **Autosave** functionality for crop planning

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL + Redis)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Start database and cache:
```bash
docker-compose up -d
```

4. Generate Prisma client:
```bash
npm run db:generate
```

5. Push schema to database:
```bash
npm run db:push
```

6. Start development server:
```bash
npm run dev
```

The server runs on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Farms
- `GET /api/farms` - List farms
- `POST /api/farms` - Create farm
- `GET /api/farms/:id` - Get farm
- `PUT /api/farms/:id` - Update farm
- `DELETE /api/farms/:id` - Delete farm

### Crop Planning
- `GET /api/planning` - List crop plans
- `POST /api/planning` - Create crop plan
- `GET /api/planning/:id` - Get crop plan
- `PUT /api/planning/:id` - Update crop plan
- `DELETE /api/planning/:id` - Delete crop plan
- `GET /api/planning/tasks/today` - Get today's tasks
- `GET /api/planning/tasks/by-date` - Get tasks by date range
- `POST /api/planning/autosave` - Save draft
- `GET /api/planning/autosave/:entityType/:entityId` - Load draft

### File Uploads
- `GET /api/uploads` - List files
- `POST /api/uploads/upload` - Upload file
- `GET /api/uploads/:id/download` - Download file
- `DELETE /api/uploads/:id` - Delete file

### Weather
- `GET /api/weather/current?location=...` - Current weather
- `GET /api/weather/forecast?location=...&days=7` - Forecast
- `GET /api/weather/locations?q=...` - Search locations

### Market
- `GET /api/market/prices` - All market prices
- `GET /api/market/prices/:crop` - Specific crop price

## Production Deployment

### Using Docker Compose

```bash
# Build and start
docker-compose up --build

# Or with environment file
DATABASE_URL=postgresql://user:pass@host:5432/db \
JWT_SECRET=your-secret \
docker-compose up -d
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://postgres:postgres@localhost:5432/agritech |
| JWT_SECRET | JWT signing secret | your-super-secret-key-change-in-production |
| SUPABASE_URL | Supabase project URL | - |
| SUPABASE_SERVICE_KEY | Supabase service role key | - |
| SUPABASE_ANON_KEY | Supabase anon key | - |
| REDIS_HOST | Redis host | localhost |
| REDIS_PORT | Redis port | 6379 |
| PORT | Server port | 3001 |
| NODE_ENV | Environment | development |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Express   │────▶│  PostgreSQL │
└─────────────┘     │    API      │     │   (Prisma)  │
                    └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │   (Cache)   │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Supabase   │
                    │  Storage    │
                    └─────────────┘
```