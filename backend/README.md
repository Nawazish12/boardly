# Backend (Node + Express + MongoDB Atlas)

MVC API with JWT auth, rate limiting, Helmet, and Swagger docs.

## Setup

1. Copy the environment file and fill in your MongoDB Atlas credentials:

```bash
cp .env.example .env
```

2. Set these values in `backend/.env`:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string for signing tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default: `7d`) |

### MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. **Database Access** — create a user and password.
3. **Network Access** — add your IP (or `0.0.0.0/0` for development).
4. **Database → Connect → Drivers** — under connection string type, choose **Standard** (starts with `mongodb://`, not `mongodb+srv://`). Copy the URI with all three hosts and `replicaSet=atlas-…-shard-0`.
5. In `backend/.env`, set `MONGODB_URI`:
   - Replace `<password>` with your real password, [URL-encoded](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding) if it contains `$ ! * % @` etc.
   - Ensure the database name is in the path, e.g. `/mernApp`:

```env
MONGODB_URI=mongodb://USER:URL_ENCODED_PASSWORD@host0:27017,host1:27017,host2:27017/mernApp?ssl=true&authSource=admin&replicaSet=atlas-xxxxx-shard-0&retryWrites=true&w=majority
```

Use this **standard** `mongodb://` form for Docker, production, and local dev. Avoid `mongodb+srv://` if you see `queryTxt ESERVFAIL` or `URI malformed` (Docker DNS and special characters in passwords).

## Run with Docker Compose (from repo root)

```bash
docker-compose up -d --build
```

| Endpoint | URL |
|----------|-----|
| Health | [http://localhost:5000/health](http://localhost:5000/health) |
| Swagger UI | [http://localhost:5000/api-docs](http://localhost:5000/api-docs) |
| OpenAPI JSON | [http://localhost:5000/api-docs.json](http://localhost:5000/api-docs.json) |

## API routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Get current user (Bearer token) |

### Example: register

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"SecurePass123"}'
```

### Example: login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"SecurePass123"}'
```

## Project structure

```
backend/src/
├── config/          # env, database, swagger
├── controllers/     # request handlers
├── middleware/      # auth, rate limit, errors
├── models/          # Mongoose schemas
├── routes/          # route definitions + Swagger JSDoc
├── services/        # business logic
├── utils/           # helpers
├── validators/      # request validation
└── server.js        # Express app, DB connection, entry point
```

## Optional: local Node (without Docker)

```bash
cd backend
npm install
npm run dev
```
