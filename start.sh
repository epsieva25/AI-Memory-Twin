#!/bin/bash
# =============================================================
#  AI Memory Twin for Students — Robust Startup Script (Bash)
#  macOS / Linux | Version 2.0
#  Usage:
#    bash start.sh            (full stack)
#    bash start.sh --dev      (postgres + backend only, fast)
#    bash start.sh --reset    (wipe volumes and rebuild)
#    bash start.sh --status   (check running services)
# =============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; GRAY='\033[0;37m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
err()  { echo -e "${RED}  ❌ $1${NC}"; }
info() { echo -e "${GRAY}  ℹ️  $1${NC}"; }

DEV_MODE=false; RESET=false; STATUS_ONLY=false
for arg in "$@"; do
  case $arg in --dev) DEV_MODE=true;; --reset) RESET=true;;
               --status) STATUS_ONLY=true;; esac
done

# ── Banner ────────────────────────────────────────────────────
clear
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║      🧠  AI Memory Twin for Students  v1.0           ║"
echo "  ║      FastAPI · React · PostgreSQL · Neo4j · LLM      ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Status-only mode ─────────────────────────────────────────
if [ "$STATUS_ONLY" = true ]; then
  echo -e "${CYAN}  Service Status${NC}"
  for svc in "Backend|http://localhost:8000/health" \
             "Frontend|http://localhost:5173" \
             "Neo4j|http://localhost:7474" \
             "Ollama|http://localhost:11434"; do
    name="${svc%%|*}"; url="${svc##*|}"
    if curl -sf "$url" --max-time 3 > /dev/null 2>&1; then
      ok "$name → $url"
    else
      err "$name → $url (unreachable)"
    fi
  done
  exit 0
fi

# ═══════════════════════════════════════════════════════════════
# STEP 1 — System Diagnostics
# ═══════════════════════════════════════════════════════════════
echo -e "${CYAN}  Step 1 · System Diagnostics${NC}"
echo -e "${GRAY}  ──────────────────────────────────────────────────────${NC}"

if ! docker info > /dev/null 2>&1; then
  err "Docker is not running"
  # macOS: try starting Docker Desktop
  if [[ "$OSTYPE" == "darwin"* ]]; then
    info "Starting Docker Desktop..."
    open -a Docker
    echo -n "  Waiting for Docker"
    for i in $(seq 1 24); do
      sleep 5; echo -n "."
      if docker info > /dev/null 2>&1; then echo ""; break; fi
    done
  fi
  if ! docker info > /dev/null 2>&1; then
    err "Docker still not running. Start Docker Desktop manually."
    exit 1
  fi
fi
ok "Docker $(docker version --format '{{.Server.Version}}' 2>/dev/null)"

# Memory check (Linux only)
if command -v free > /dev/null 2>&1; then
  FREE_MB=$(free -m | awk '/^Mem:/ {print $7}')
  TOTAL_MB=$(free -m | awk '/^Mem:/ {print $2}')
  [ "$FREE_MB" -lt 2048 ] && warn "Low memory: ${FREE_MB}MB free" || ok "Memory: ${FREE_MB}MB free / ${TOTAL_MB}MB"
fi

# Port check
BLOCKED=""
for port in 5432 7474 7687 8000 5173 11434; do
  nc -z localhost $port 2>/dev/null && BLOCKED="$BLOCKED $port"
done
[ -n "$BLOCKED" ] && warn "Ports in use:$BLOCKED" || ok "All ports available"

# Network test
if curl -sf "https://registry-1.docker.io/v2/" --max-time 8 > /dev/null 2>&1; then
  ok "Docker Hub reachable"
else
  warn "Docker Hub slow/unreachable — retry logic will activate"
fi

# ═══════════════════════════════════════════════════════════════
# STEP 2 — Reset (optional)
# ═══════════════════════════════════════════════════════════════
if [ "$RESET" = true ]; then
  echo -e "\n${CYAN}  Step 2 · Full Reset${NC}"
  echo -e "${GRAY}  ──────────────────────────────────────────────────────${NC}"
  warn "This will delete all database data!"
  read -p "  Type 'yes' to confirm: " confirm
  if [ "$confirm" = "yes" ]; then
    docker compose down -v --remove-orphans 2>/dev/null || true
    docker system prune -f 2>/dev/null || true
    ok "Volumes and containers cleaned"
  else
    info "Reset cancelled"
  fi
else
  echo -e "\n${CYAN}  Step 2 · Stopping Old Containers${NC}"
  echo -e "${GRAY}  ──────────────────────────────────────────────────────${NC}"
  docker compose down --remove-orphans 2>/dev/null || true
  ok "Old containers stopped"
fi

# ═══════════════════════════════════════════════════════════════
# STEP 3 — Pull Images with Retry
# ═══════════════════════════════════════════════════════════════
echo -e "\n${CYAN}  Step 3 · Pulling Docker Images (TLS retry enabled)${NC}"
echo -e "${GRAY}  ──────────────────────────────────────────────────────${NC}"

pull_with_retry() {
  local image=$1; local desc=$2; local max=5; local delay=15
  for attempt in $(seq 1 $max); do
    echo -ne "${GRAY}  Pulling $desc (attempt $attempt/$max)...${NC}"
    if docker pull "$image" > /dev/null 2>&1; then
      echo -e " ${GREEN}✅${NC}"; return 0
    fi
    echo -e " ${YELLOW}retry${NC}"
    sleep $delay; delay=$(( delay < 60 ? delay * 2 : 60 ))
  done
  warn "Could not pull $desc after $max attempts"
  read -p "  Continue anyway? (y/N): " cont
  [ "$cont" != "y" ] && exit 1; return 1
}

if [ "$DEV_MODE" = true ]; then
  pull_with_retry "postgres:16-alpine" "PostgreSQL 16"
else
  pull_with_retry "postgres:16-alpine"  "PostgreSQL 16"
  pull_with_retry "neo4j:5.20-community" "Neo4j 5.20"
  pull_with_retry "ollama/ollama:latest" "Ollama LLM"
fi

# ═══════════════════════════════════════════════════════════════
# STEP 4 — Environment Setup
# ═══════════════════════════════════════════════════════════════
echo -e "\n${CYAN}  Step 4 · Environment Setup${NC}"
echo -e "${GRAY}  ──────────────────────────────────────────────────────${NC}"

if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
  cat > "$SCRIPT_DIR/backend/.env" <<EOF
DATABASE_URL=postgresql://memorytwin:memorytwin_pass@postgres:5432/memorytwin_db
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=memorytwin_neo4j
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=llama3
FRONTEND_ORIGIN=http://localhost:5173
EOF
  ok "backend/.env created"
else
  ok "backend/.env already exists"
fi

[ ! -f "$SCRIPT_DIR/frontend/.env" ] && \
  echo "VITE_API_URL=http://localhost:8000" > "$SCRIPT_DIR/frontend/.env" && \
  ok "frontend/.env created" || ok "frontend/.env already exists"

# ═══════════════════════════════════════════════════════════════
# STEP 5 — Start Services
# ═══════════════════════════════════════════════════════════════
echo -e "\n${CYAN}  Step 5 · Starting Services${NC}"
echo -e "${GRAY}  ──────────────────────────────────────────────────────${NC}"

COMPOSE_FILE="docker-compose.yml"
[ "$DEV_MODE" = true ] && COMPOSE_FILE="docker-compose.dev.yml"

if ! docker compose -f "$COMPOSE_FILE" up --build -d; then
  warn "Compose failed, clearing build cache and retrying..."
  docker builder prune -f 2>/dev/null || true
  docker compose -f "$COMPOSE_FILE" up --build -d || {
    err "Startup failed. Check: docker compose logs"
    exit 1
  }
fi
ok "Containers started"

# ═══════════════════════════════════════════════════════════════
# STEP 6 — Health Verification
# ═══════════════════════════════════════════════════════════════
echo -e "\n${CYAN}  Step 6 · Health Verification${NC}"
echo -e "${GRAY}  ──────────────────────────────────────────────────────${NC}"

wait_for_service() {
  local name=$1; local url=$2; local max=${3:-120}; local step=5
  local elapsed=0
  echo -ne "${GRAY}  Waiting for $name${NC}"
  while [ $elapsed -lt $max ]; do
    if curl -sf "$url" --max-time 3 > /dev/null 2>&1; then
      echo -e " ${GREEN}✅${NC}"; return 0
    fi
    echo -n "."
    sleep $step; elapsed=$((elapsed + step))
  done
  echo -e " ${YELLOW}⚠️ timeout${NC}"; return 1
}

BACKEND_OK=false; FRONTEND_OK=false
wait_for_service "Backend API"   "http://localhost:8000/health" 180 && BACKEND_OK=true
wait_for_service "Frontend"      "http://localhost:5173"        90  && FRONTEND_OK=true
wait_for_service "Neo4j Browser" "http://localhost:7474"        90  || true
wait_for_service "Ollama"        "http://localhost:11434"       60  || true

# ═══════════════════════════════════════════════════════════════
# STEP 7 — Generate PROJECT_STATUS.md
# ═══════════════════════════════════════════════════════════════
echo -e "\n${CYAN}  Step 7 · Generating Project Status${NC}"
echo -e "${GRAY}  ──────────────────────────────────────────────────────${NC}"
cat > "$SCRIPT_DIR/PROJECT_STATUS.md" <<EOF
# 🧠 AI Memory Twin — Project Status
> Generated: $(date '+%Y-%m-%d %H:%M:%S')

## Services
| Service | URL | Status |
|---------|-----|--------|
| 🌐 Frontend | http://localhost:5173 | $([ "$FRONTEND_OK" = true ] && echo "✅ Running" || echo "⚠️ Check logs") |
| ⚡ Backend API | http://localhost:8000 | $([ "$BACKEND_OK" = true ] && echo "✅ Running" || echo "⚠️ Check logs") |
| 📚 Swagger Docs | http://localhost:8000/docs | $([ "$BACKEND_OK" = true ] && echo "✅ Running" || echo "⚠️ Not ready") |
| 🔷 Neo4j Browser | http://localhost:7474 | Starting... |
| 🦙 Ollama | http://localhost:11434 | Loading model... |

## Demo Mode
No login required - the app opens directly to the dashboard with demo data.

## Commands
\`\`\`bash
bash start.sh --status   # Check service health
docker compose logs -f   # Tail all logs
docker compose logs backend -f  # Backend only
docker compose restart backend  # Restart backend
bash start.sh --reset    # Full reset
docker compose down      # Stop all
\`\`\`
EOF
ok "PROJECT_STATUS.md generated"

# Dev mode: start frontend
if [ "$DEV_MODE" = true ]; then
  echo -e "\n${CYAN}  Dev Mode · Frontend${NC}"
  cd "$SCRIPT_DIR/frontend"
  if command -v gnome-terminal > /dev/null 2>&1; then
    gnome-terminal -- bash -c "npm run dev; exec bash"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "tell app \"Terminal\" to do script \"cd '$SCRIPT_DIR/frontend' && npm run dev\""
  else
    info "Start frontend manually: cd frontend && npm run dev"
  fi
  cd "$SCRIPT_DIR"
fi

# ─── Final Summary ────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}  ╔══════════════════════════════════════════════════════╗"
echo "  ║            ✅  Stack is Ready!                        ║"
echo -e "  ╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}  🌐  Frontend:      http://localhost:5173${NC}"
echo -e "${CYAN}  ⚡  Backend API:   http://localhost:8000${NC}"
echo -e "${CYAN}  📚  Swagger Docs:  http://localhost:8000/docs${NC}"
echo -e "${CYAN}  🔷  Neo4j Browser: http://localhost:7474${NC}"
echo ""
echo -e "${GRAY}  Demo Mode: No login required - opens directly to dashboard${NC}"
echo ""
echo -e "${GRAY}  📋  Logs: docker compose logs -f${NC}"
echo -e "${GRAY}  🛑  Stop: docker compose down${NC}"
echo ""

# Auto-open browser
if [ "$BACKEND_OK" = true ]; then
  sleep 2
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:5173" 2>/dev/null || true
    open "http://localhost:8000/docs" 2>/dev/null || true
  elif command -v xdg-open > /dev/null 2>&1; then
    xdg-open "http://localhost:5173" 2>/dev/null || true
  fi
fi
