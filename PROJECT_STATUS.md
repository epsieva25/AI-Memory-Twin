# 🧠 AI Memory Twin — Project Status
> Generated: 2026-05-16 19:07:30

## Service Status

| Service | URL | Status |
|---------|-----|--------|
| 🌐 Frontend | http://localhost:5173 | ✅ Running |
| ⚡ Backend API | http://localhost:8000 | ✅ Running |
| 📚 Swagger Docs | http://localhost:8000/docs | ✅ Running |
| 🔷 Neo4j Browser | http://localhost:7474 | ⚠️ Starting... |
| 🦙 Ollama | http://localhost:11434 | ✅ Running |
| 🐘 PostgreSQL | localhost:5432 | ✅ Running (healthcheck passed) |

## Demo Mode

| Field | Value |
|-------|-------|
| 👤 Student | Mary Jasper |
| 🏫 Department | CSE |
| 📅 Year | 4 |

No login required - the app opens directly to the dashboard with demo data.

## Quick Commands

```powershell
# Check status anytime
.\start.ps1 -Status

# View backend logs
docker compose logs backend -f

# View all logs
docker compose logs -f

# Restart backend only
docker compose restart backend

# Full reset (clears data)
.\start.ps1 -Reset

# Stop everything
docker compose down
```

## System Info

| Item | Value |
|------|-------|
| Docker | v29.4.1 |
| Free Memory | 674MB |
| Total Memory | 15710MB |
| Date | 2026-05-16 19:07 |
