# ai-project

Monorepo layout: **frontend** (Vite + React) and **backend** (Node + Express). Both run in Docker; `npm install` on your machine is optional.

## Requirements

- Docker
- `docker-compose` (legacy v1) or Docker Compose v2

## Run everything

From the repository root:

```bash
docker-compose down   # if you see a 'ContainerConfig' error on recreate
docker-compose up -d --build
```

Set `MONGODB_URI` in `backend/.env` to your MongoDB Atlas connection string before using auth routes.

| Service  | URL |
|----------|-----|
| Frontend | [http://localhost:5173](http://localhost:5173) — login, register, profile (`/api/auth/me`) |
| Backend  | [http://localhost:5000](http://localhost:5000) |
| Health   | [http://localhost:5000/health](http://localhost:5000/health) |

### Frontend auth (local dev without Docker)

```bash
cd frontend
cp .env.example .env   # optional; defaults to /api via Vite proxy
npm install
npm run dev
```

Ensure the backend is running on port 5000 (or set `VITE_PROXY_TARGET` in `.env`).

Stop:

```bash
docker-compose down
```

## Separate Git repository for backend

If you want the backend as its own repo, copy the `backend/` folder into a new repository (or use `git subtree split`) and keep the same `Dockerfile` and `package.json` there. Point `docker-compose.yml` `build.context` to that path, or run the backend container from that repo alone (see `backend/README.md`).
