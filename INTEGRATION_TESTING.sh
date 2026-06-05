# AI Memory Twin for Students — Integration Testing Guide
# =========================================================
# Run these commands to verify all Docker services are healthy
# and the end-to-end system works correctly.

# ─────────────────────────────────────────────────────────────────
# STEP 0 — Start the entire stack
# ─────────────────────────────────────────────────────────────────

# Option A: Windows PowerShell (recommended)
.\start.ps1

# Option B: Manual Docker Compose
docker compose up --build -d

# Wait for all containers to be healthy
docker compose ps

# Expected output — all services should show "running" or "healthy":
# memorytwin_postgres   running (healthy)
# memorytwin_neo4j      running
# memorytwin_ollama     running
# memorytwin_backend    running (healthy)
# memorytwin_frontend   running

# ─────────────────────────────────────────────────────────────────
# STEP 1 — Backend Health Check
# ─────────────────────────────────────────────────────────────────

# Test root endpoint
curl http://localhost:8000/

# Expected response:
# {"service":"AI Memory Twin for Students","status":"✅ running","version":"1.0.0",...}

# Test detailed health check
curl http://localhost:8000/health

# Expected response (after DB is ready):
# {"status":"healthy","database":"connected","uptime_seconds":...}

# ─────────────────────────────────────────────────────────────────
# STEP 2 — PostgreSQL Verification
# ─────────────────────────────────────────────────────────────────

# Connect to PostgreSQL inside container
docker exec -it memorytwin_postgres psql -U memorytwin -d memorytwin_db

# Inside psql — verify tables were created:
\dt
# Expected tables: students, academic_records, stress_logs, study_plans, notifications, chatbot_history

# Verify demo student was seeded:
SELECT id, name, email FROM students;
# Expected: 1 | Alex Chen | demo@memorytwin.ai

# Check academic records:
SELECT subject, marks, attendance FROM academic_records LIMIT 5;

\q  # Exit psql

# ─────────────────────────────────────────────────────────────────
# STEP 3 — Demo Login via API
# ─────────────────────────────────────────────────────────────────

# Register (or use demo credentials)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@memorytwin.ai","password":"demo1234"}'

# Expected response:
# {"access_token":"eyJ...","token_type":"bearer","user":{"id":1,"name":"Alex Chen",...}}

# Save the token for subsequent requests:
TOKEN="eyJ..."  # Paste your actual token here

# ─────────────────────────────────────────────────────────────────
# STEP 4 — Protected API Verification
# ─────────────────────────────────────────────────────────────────

# Get authenticated profile
curl http://localhost:8000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# Get dashboard analytics
curl http://localhost:8000/api/analytics/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Get weak subject predictions
curl http://localhost:8000/api/predict/weak-subject \
  -H "Authorization: Bearer $TOKEN"

# Get burnout risk
curl http://localhost:8000/api/predict/burnout \
  -H "Authorization: Bearer $TOKEN"

# Get study planner tasks
curl http://localhost:8000/api/planner \
  -H "Authorization: Bearer $TOKEN"

# Get notifications
curl http://localhost:8000/api/notifications/ \
  -H "Authorization: Bearer $TOKEN"

# Get Neo4j knowledge graph
curl http://localhost:8000/api/graph/student-map \
  -H "Authorization: Bearer $TOKEN"

# ─────────────────────────────────────────────────────────────────
# STEP 5 — AI Tutor Chat Test
# ─────────────────────────────────────────────────────────────────

curl -X POST http://localhost:8000/api/tutor/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain what a neural network is in simple terms"}'

# Expected: JSON with "response" key containing Markdown text
# If Ollama is loading: returns fallback study tips (this is expected behavior)

# ─────────────────────────────────────────────────────────────────
# STEP 6 — Neo4j Verification
# ─────────────────────────────────────────────────────────────────

# Open Neo4j Browser at: http://localhost:7474
# Login: neo4j / memorytwin_neo4j

# Run these Cypher queries in Neo4j Browser:
# View all student nodes:
MATCH (s:Student) RETURN s LIMIT 5

# View student-subject relationships:
MATCH (s:Student)-[r:STUDIES]->(sub:Subject) RETURN s, r, sub LIMIT 20

# View weakness links:
MATCH (s:Student)-[:HAS_WEAKNESS]->(w:Weakness) RETURN s.name, w.subject, w.marks

# ─────────────────────────────────────────────────────────────────
# STEP 7 — Ollama / Llama 3 Verification
# ─────────────────────────────────────────────────────────────────

# Check if Ollama is running
curl http://localhost:11434/api/tags

# Expected: JSON with list of available models
# If llama3 is still downloading, you'll see an empty list — wait a few minutes

# Manually pull llama3 if needed:
docker exec memorytwin_ollama ollama pull llama3

# Test a direct Ollama chat:
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3","messages":[{"role":"user","content":"Say hello in one sentence."}],"stream":false}'

# ─────────────────────────────────────────────────────────────────
# STEP 8 — Frontend Verification
# ─────────────────────────────────────────────────────────────────

# Open browser at: http://localhost:5173
# 1. Login with:  demo@memorytwin.ai / demo1234
# 2. Dashboard should show: GPA, attendance, stress charts, weak subject alerts
# 3. AI Tutor: type a question → should get response (fallback if Ollama loading)
# 4. Study Planner: tasks should appear from seeded data
# 5. Analytics: charts should render with data
# 6. Graph View: network graph should appear (fallback data if Neo4j empty)
# 7. Notifications: 6 seeded notifications should appear
# 8. Settings: profile form should show Alex Chen's info

# ─────────────────────────────────────────────────────────────────
# STEP 9 — ML Models Verification
# ─────────────────────────────────────────────────────────────────

# Check if models are trained (inside backend container):
docker exec memorytwin_backend ls ml/

# Expected files: weak_subject_model.pkl  burnout_model.pkl

# If missing, trigger training manually:
docker exec memorytwin_backend python ml/train_models.py

# ─────────────────────────────────────────────────────────────────
# STEP 10 — Container Logs (debugging)
# ─────────────────────────────────────────────────────────────────

# View backend startup logs
docker compose logs backend --tail=50

# View all service logs live
docker compose logs -f

# Restart a specific service
docker compose restart backend

# Full reset (preserves volumes/data)
docker compose down && docker compose up -d

# Nuclear reset (deletes all data — fresh start)
docker compose down -v && docker compose up --build -d

# ─────────────────────────────────────────────────────────────────
# SWAGGER UI — Interactive API Testing
# ─────────────────────────────────────────────────────────────────
# Open: http://localhost:8000/docs
# 1. Click "Authorize" button
# 2. Paste Bearer token from Step 3
# 3. Test any endpoint interactively
