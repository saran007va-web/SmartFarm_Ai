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

## Backend Features (UI reference)

This section provides detailed backend feature descriptions, API shapes, realtime events, and behaviours intended to help design a complete UI.

**Overview**
- **Auth:** JWT-based authentication with endpoints for register/login, session info, profile update, password change, and token refresh.
- **Multi-tenant farms:** Users can create/manage multiple farms. Farm resources (fields, sensors, crop plans, tasks) are scoped to a farm.
- **Crop planning & tasks:** Create crop plans, generate tasks, autosave drafts, and query tasks by date or status.
- **Realtime:** Socket.IO channels for farm rooms, user rooms, market updates, typing indicators, and task updates.
- **Market & Weather:** Cached market prices and weather forecasts; endpoints for current + historical data.
- **Notifications:** In-app notifications delivered via API and Socket.IO; persisted in DB.
- **Files & Storage:** Uploads stored in Supabase (or local fallback) with endpoints for listing/downloading/deleting.

**Authentication & Sessions**
- `POST /api/auth/register` — body: `{ name, email, password }`. Returns `200 { user, token }`.
- `POST /api/auth/login` — body: `{ email, password }`. Returns `200 { user, token }`.
- `GET /api/auth/me` — header: `Authorization: Bearer <token>`. Returns `200 { user }`.
- `PUT /api/auth/profile` — body: partial user fields. Returns updated user.
- `POST /api/auth/change-password` — body: `{ oldPassword, newPassword }`.

User object (UI-relevant fields):
```
{ id, name, email, avatarUrl, role, createdAt, lastLogin }
```

**Farms**
- `GET /api/farms` — list farms for user. Supports `?page=&limit=`.
- `POST /api/farms` — create farm. Body example:
```
{ name, location: { lat, lng, name }, sizeHa, primaryCrop }
```
- `GET /api/farms/:id` — returns farm with fields, sensors summary, and active crop plans.
- `PUT /api/farms/:id` — update farm metadata.
- `DELETE /api/farms/:id` — remove farm (soft delete preferred).

Farm model highlights (UI):
```
{ id, name, location: { lat,lng,name }, sizeHa, ownerId, collaborators: [{id,name,role}], createdAt }
```

**Crop Planning & Tasks**
- `GET /api/planning` — list crop plans; supports filtering by farm, crop, status.
- `POST /api/planning` — create plan. Body includes `farmId, crop, startDate, endDate, fields, inputs, notes`.
- `GET /api/planning/:id` — full plan with estimated yields and schedule.
- `PUT /api/planning/:id` — update plan.
- `DELETE /api/planning/:id` — delete plan.
- `GET /api/planning/tasks/today` — tasks scheduled for today across farms or for a selected farm.
- `GET /api/planning/tasks/by-date?start=YYYY-MM-DD&end=YYYY-MM-DD` — tasks in range.
- `POST /api/planning/autosave` — body `{ entityType, entityId, data }` returns draft id.
- `GET /api/planning/autosave/:entityType/:entityId` — load draft data.

Task object (UI fields):
```
{ id, farmId, planId?, title, description, dueDate, assignedTo: {id,name}, status: 'TODO|IN_PROGRESS|COMPLETED', priority, attachments: [], createdAt }
```

UI behaviors to support:
- Calendar view with tasks by date and quick actions (complete, reschedule, assign).
- Kanban / list view for plan tasks.
- Autosave indicator + restore draft flow.

**Realtime (Socket.IO) events**
- Connection: client connects with token; server validates and may join `user:<userId>` room.
- `join` — payload: `userId` to join `user:<userId>`.
- `join-farm` — payload: `farmId` to join `farm:<farmId>` for farm-scoped realtime updates.
- `task:updated` — emitted to `farm:<farmId>` with `{ taskId, status, updatedAt }`.
- `cropplan:updated` — emitted to `farm:<farmId>` with plan diffs.
- `market:update` — emitted to `market:updates` room with price updates.
- `typing:start` / `typing:stop` — farm chat typing indicators.

UI should:
- Subscribe to `farm:<id>` when viewing a farm dashboard.
- Optimistically update task status and reconcile on server ack.

**Market & Weather APIs**
- `GET /api/market/prices?crop=&from=&to=&page=&limit=` — paginated market prices with `date, price, unit, marketName`.
- `GET /api/market/prices/:crop` — latest prices and 30d history sample.
- `GET /api/weather/current?lat=&lng=` — current conditions.
- `GET /api/weather/forecast?lat=&lng=&days=7` — daily/hourly forecast arrays.

Caching behavior (important for UI):
- Market and weather responses are cached in Redis with TTL (e.g., 5–60 minutes). UI can use `ETag`/`last-modified` headers to reduce re-fetches.

**Notifications**
- `GET /api/notifications` — list notifications (paginated).
- `POST /api/notifications/mark-read` — mark one or multiple read.
- Socket events: `notification:new` emitted to `user:<userId>`.

Notification shape:
```
{ id, userId, type, title, message, targetUrl, read: boolean, createdAt }
```

**Uploads & Storage**
- `POST /api/uploads/upload` — multipart file upload; returns file metadata `{ id, url, mimeType, size }`.
- `GET /api/uploads` — list files with filtering by farm or user.
- `GET /api/uploads/:id/download` — redirect or stream file.
- `DELETE /api/uploads/:id` — delete file (soft or hard depending on policy).

UI notes: show upload progress, thumbnails for images, and actions for replacing or deleting files.

**Search & Filters**
- APIs support query params `q`, `page`, `limit`, `sort`, and field filters (e.g., `crop=maize`).
- Provide suggest/autocomplete endpoints where applicable (e.g., location search, crop names).

**Analytics & Reports**
- `GET /api/analytics/overview?farmId=&from=&to=` — returns KPIs: area planted, est yield, revenue estimate, tasks completed.
- `GET /api/analytics/time-series?metric=&farmId=&from=&to=` — timeseries for charts.

**Background Jobs & Degraded Mode**
- Background workers use BullMQ with Redis. If Redis is unavailable the API will continue in degraded mode (no background processing, immediate fallbacks).
- UI should surface degraded warnings on the dashboard if `GET /api/health` returns `redis: disconnected`.

**Health & Diagnostics**
- `GET /api/health` — returns `{ status, database, redis, timestamp, version }`.
- Use this endpoint in a UI Admin/Debug panel to show system health.

**Pagination & Error Handling**
- All list endpoints follow `{ data: [], meta: { page, limit, total } }`.
- Errors use standard shape: `{ error: { code, message, details? } }` with appropriate HTTP codes (400,401,403,404,429,500).

**Rate Limiting & Security**
- API uses rate limiting middleware. UI should handle `429` by showing a friendly retry message and respecting `Retry-After` header.
- Sensitive actions require re-authentication confirmation where needed (change password, delete farm).

---
If you'd like, I can:
- Generate an OpenAPI (Swagger) spec from the controllers to drive UI mockups.
- Produce example JSON fixtures for key screens (dashboard, farm detail, crop plan editor).

File updated: [backend/README.md](backend/README.md)