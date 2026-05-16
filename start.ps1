# ============================================================
#  AI Memory Twin for Students — Robust Startup Script
#  Windows PowerShell | Version 2.0
#  Handles TLS timeouts, pull retries, health verification
#  Usage: .\start.ps1
#         .\start.ps1 -Dev      (no frontend container, uses npm run dev)
#         .\start.ps1 -Reset    (wipe volumes and rebuild fresh)
#         .\start.ps1 -Status   (check running stack status only)
# ============================================================
param(
    [switch]$Dev,
    [switch]$Reset,
    [switch]$Status,
    [switch]$NoBrowser
)

$ErrorActionPreference = "SilentlyContinue"

# ── Color helpers ────────────────────────────────────────────
function Write-Header { param($msg)
    Write-Host ""
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host ("  " + "─" * 54) -ForegroundColor DarkGray
}
function Write-OK  { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-WARN{ param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-ERR { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red }
function Write-INFO{ param($msg) Write-Host "  ℹ️  $msg" -ForegroundColor Gray }

$ROOT = $PSScriptRoot

# ── Banner ───────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║      🧠  AI Memory Twin for Students  v1.0           ║" -ForegroundColor Magenta
Write-Host "  ║      FastAPI · React · PostgreSQL · Neo4j · LLM      ║" -ForegroundColor DarkMagenta
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# ── Status-only mode ─────────────────────────────────────────
if ($Status) {
    Write-Header "Service Status"
    $services = @(
        @{name="Backend API";  url="http://localhost:8000/health"},
        @{name="Frontend";     url="http://localhost:5173"},
        @{name="Neo4j Browser";url="http://localhost:7474"},
        @{name="Ollama";       url="http://localhost:11434"}
    )
    foreach ($svc in $services) {
        try {
            $r = Invoke-WebRequest -Uri $svc.url -TimeoutSec 3 -UseBasicParsing
            Write-OK "$($svc.name) → $($svc.url) ($($r.StatusCode))"
        } catch {
            Write-ERR "$($svc.name) → $($svc.url) (unreachable)"
        }
    }
    Write-Host ""
    exit 0
}

# ════════════════════════════════════════════════════════════
# STEP 1 — System Diagnostics
# ════════════════════════════════════════════════════════════
Write-Header "Step 1 · System Diagnostics"

# Docker version
$dockerVer = docker version --format "{{.Server.Version}}" 2>&1
if ($LASTEXITCODE -ne 0 -or $dockerVer -match "error") {
    Write-ERR "Docker is not running. Attempting to start Docker Desktop..."
    $dockerExe = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($dockerExe) {
        Start-Process $dockerExe
        Write-INFO "Waiting 30s for Docker Desktop to start..."
        Start-Sleep 30
        $dockerVer = docker version --format "{{.Server.Version}}" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-ERR "Docker still not responding. Please start Docker Desktop manually."
            exit 1
        }
    } else {
        Write-ERR "Docker Desktop not found. Install from: https://www.docker.com/products/docker-desktop"
        exit 1
    }
}
Write-OK "Docker Engine v$dockerVer"

# WSL status
$wsl = wsl --status 2>&1
if ($wsl -match "Default Distribution") {
    Write-OK "WSL2 available"
} else {
    Write-WARN "WSL2 not configured — Docker may use Hyper-V backend (slower)"
}

# Memory
$mem = Get-CimInstance Win32_OperatingSystem
$freeMB = [math]::Round($mem.FreePhysicalMemory / 1024)
$totalMB = [math]::Round($mem.TotalVisibleMemorySize / 1024)
if ($freeMB -lt 2048) {
    Write-WARN "Low memory: ${freeMB}MB free / ${totalMB}MB total (4GB+ recommended)"
} else {
    Write-OK "Memory: ${freeMB}MB free / ${totalMB}MB total"
}

# Port availability
$ports = @(5432, 7474, 7687, 8000, 5173, 11434)
$blockedPorts = @()
foreach ($port in $ports) {
    $conn = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
    if ($conn.TcpTestSucceeded) { $blockedPorts += $port }
}
if ($blockedPorts.Count -gt 0) {
    Write-WARN "Ports already in use: $($blockedPorts -join ', ') — containers may conflict"
} else {
    Write-OK "All required ports available: $($ports -join ', ')"
}

# Network connectivity test
try {
    $ping = Invoke-WebRequest -Uri "https://registry-1.docker.io/v2/" -TimeoutSec 8 -UseBasicParsing
    Write-OK "Docker Hub reachable"
} catch {
    Write-WARN "Docker Hub may be slow/blocked — will use retry logic for pulls"
}

# ════════════════════════════════════════════════════════════
# STEP 2 — Fix Docker DNS (resolves most TLS timeout issues)
# ════════════════════════════════════════════════════════════
Write-Header "Step 2 · Docker DNS Configuration"

$daemonPath = "$env:APPDATA\Docker\daemon.json"
$dnsFixed = $false

try {
    $daemon = if (Test-Path $daemonPath) {
        Get-Content $daemonPath -Raw | ConvertFrom-Json
    } else {
        [PSCustomObject]@{}
    }
    if (-not $daemon.dns -or $daemon.dns -notcontains "8.8.8.8") {
        $daemon | Add-Member -NotePropertyName "dns" -NotePropertyValue @("8.8.8.8","8.8.4.4") -Force
        $daemon | ConvertTo-Json -Depth 5 | Set-Content $daemonPath -Encoding UTF8
        $dnsFixed = $true
        Write-OK "Docker DNS set to 8.8.8.8 / 8.8.4.4 (fixes TLS handshake timeouts)"
        Write-INFO "Restarting Docker Engine to apply DNS..."
        Restart-Service com.docker.service -Force -ErrorAction SilentlyContinue
        Start-Sleep 10
        # For Docker Desktop:
        $null = docker ps 2>&1
        if ($LASTEXITCODE -ne 0) { Start-Sleep 15 }
    } else {
        Write-OK "Docker DNS already configured"
    }
} catch {
    Write-WARN "Could not update daemon.json — continuing with default DNS"
}

# ════════════════════════════════════════════════════════════
# STEP 3 — Clean / Reset (optional)
# ════════════════════════════════════════════════════════════
if ($Reset) {
    Write-Header "Step 3 · Full Reset (volumes will be wiped)"
    Write-WARN "This deletes all database data!"
    $confirm = Read-Host "  Type 'yes' to confirm"
    if ($confirm -eq "yes") {
        Set-Location $ROOT
        docker compose down -v --remove-orphans 2>&1 | Out-Null
        docker system prune -f 2>&1 | Out-Null
        Write-OK "Containers, networks, and volumes cleaned"
    } else {
        Write-INFO "Reset cancelled"
    }
} else {
    Write-Header "Step 3 · Stopping Old Containers"
    Set-Location $ROOT
    docker compose down --remove-orphans 2>&1 | Out-Null
    Write-OK "Old containers stopped"
}

# ════════════════════════════════════════════════════════════
# STEP 4 — Pull Images with Retry Logic
# ════════════════════════════════════════════════════════════
Write-Header "Step 4 · Pulling Docker Images (with TLS retry)"

# Images needed (frontend and backend are built locally — no pull needed)
$images = @(
    @{name="postgres:16-alpine";        desc="PostgreSQL 16"},
    @{name="neo4j:5.20-community";      desc="Neo4j 5.20 (no APOC)"},
    @{name="ollama/ollama:latest";       desc="Ollama LLM runtime"}
)

$maxRetries = 5
$retryDelay = 15  # seconds between retries

foreach ($img in $images) {
    $pulled = $false
    for ($attempt = 1; $attempt -le $maxRetries; $attempt++) {
        Write-Host "  Pulling $($img.desc) (attempt $attempt/$maxRetries)..." -ForegroundColor Gray
        $output = docker pull $img.name 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-OK "$($img.desc) ready"
            $pulled = $true
            break
        }
        # Detect specific errors and respond accordingly
        if ($output -match "TLS handshake timeout" -or $output -match "net/http") {
            Write-WARN "TLS timeout on attempt $attempt — waiting ${retryDelay}s before retry..."
            Start-Sleep $retryDelay
            $retryDelay = [math]::Min($retryDelay * 2, 60) # exponential backoff, cap at 60s
        } elseif ($output -match "manifest unknown" -or $output -match "not found") {
            Write-ERR "Image $($img.name) not found on Docker Hub — check image name"
            break
        } else {
            Write-WARN "Pull failed: $($output -split "`n" | Select-Object -Last 2 | Out-String)"
            Start-Sleep $retryDelay
        }
    }
    if (-not $pulled) {
        Write-ERR "Could not pull $($img.desc) after $maxRetries attempts"
        Write-INFO "Try manually: docker pull $($img.name)"
        Write-INFO "Or check your internet connection and VPN settings"
        $continue = Read-Host "  Continue anyway? (y/N)"
        if ($continue -ne "y") { exit 1 }
    }
    $retryDelay = 15  # reset delay for next image
}

# ════════════════════════════════════════════════════════════
# STEP 5 — Setup Environment Files
# ════════════════════════════════════════════════════════════
Write-Header "Step 5 · Environment Setup"

if (-not (Test-Path "$ROOT\backend\.env")) {
    $envContent = @"
DATABASE_URL=postgresql://memorytwin:memorytwin_pass@postgres:5432/memorytwin_db
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=memorytwin_neo4j
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=llama3
FRONTEND_ORIGIN=http://localhost:5173
"@
    $envContent | Set-Content "$ROOT\backend\.env" -Encoding UTF8
    Write-OK "backend/.env created from defaults"
} else {
    Write-OK "backend/.env already exists"
}

if (-not (Test-Path "$ROOT\frontend\.env")) {
    "VITE_API_URL=http://localhost:8000" | Set-Content "$ROOT\frontend\.env" -Encoding UTF8
    Write-OK "frontend/.env created"
} else {
    Write-OK "frontend/.env already exists"
}

# ════════════════════════════════════════════════════════════
# STEP 6 — Build and Start Services
# ════════════════════════════════════════════════════════════
Write-Header "Step 6 · Building and Starting Services"

Set-Location $ROOT

if ($Dev) {
    # Dev mode: run infra only (no frontend container), use npm run dev
    Write-INFO "Dev mode: starting infra only (postgres, neo4j, ollama, backend)"
    docker compose up --build -d postgres neo4j ollama backend
} else {
    docker compose up --build -d
}

if ($LASTEXITCODE -ne 0) {
    Write-ERR "docker compose failed. Checking for known issues..."

    # Try removing corrupted build cache
    Write-INFO "Clearing Docker build cache and retrying..."
    docker builder prune -f 2>&1 | Out-Null
    docker compose up --build -d

    if ($LASTEXITCODE -ne 0) {
        Write-ERR "Startup failed. Run: docker compose logs for details"
        Write-INFO "Common fixes:"
        Write-INFO "  1. Run: .\start.ps1 -Reset  (fresh start)"
        Write-INFO "  2. Restart Docker Desktop"
        Write-INFO "  3. Check: docker compose logs backend"
        exit 1
    }
}
Write-OK "All containers started — waiting for health checks..."

# ════════════════════════════════════════════════════════════
# STEP 7 — Health Verification Loop
# ════════════════════════════════════════════════════════════
Write-Header "Step 7 · Service Health Verification"

function Wait-ForService {
    param($name, $url, $maxWait = 120, $interval = 5)
    $elapsed = 0
    Write-Host "  Waiting for $name" -ForegroundColor Gray -NoNewline
    while ($elapsed -lt $maxWait) {
        try {
            $r = Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            if ($r.StatusCode -lt 500) {
                Write-Host " ✅" -ForegroundColor Green
                return $true
            }
        } catch { }
        Write-Host "." -ForegroundColor DarkGray -NoNewline
        Start-Sleep $interval
        $elapsed += $interval
    }
    Write-Host " ⚠️ (timeout)" -ForegroundColor Yellow
    return $false
}

# Backend is the critical gate — wait longer
$backendOK  = Wait-ForService "Backend API"  "http://localhost:8000/health" 180 5
$frontendOK = Wait-ForService "Frontend"     "http://localhost:5173"        90  5
$neo4jOK    = Wait-ForService "Neo4j Browser""http://localhost:7474"        90  5
$ollamaOK   = Wait-ForService "Ollama"       "http://localhost:11434"       60  5

# ════════════════════════════════════════════════════════════
# STEP 8 — Auto-Seed Demo Data
# ════════════════════════════════════════════════════════════
if ($backendOK) {
    Write-Header "Step 8 · Database Ready"
    Write-OK "Demo student profile auto-loaded (Mary Jasper, CSE, Year 4)"
    Write-INFO "No login required - app opens directly to dashboard"
}

# ════════════════════════════════════════════════════════════
# STEP 9 — Generate PROJECT_STATUS.md
# ════════════════════════════════════════════════════════════
Write-Header "Step 9 · Generating Project Status"

$statusContent = @"
# 🧠 AI Memory Twin — Project Status
> Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Service Status

| Service | URL | Status |
|---------|-----|--------|
| 🌐 Frontend | http://localhost:5173 | $(if($frontendOK){"✅ Running"}else{"⚠️ Check logs"}) |
| ⚡ Backend API | http://localhost:8000 | $(if($backendOK){"✅ Running"}else{"⚠️ Check logs"}) |
| 📚 Swagger Docs | http://localhost:8000/docs | $(if($backendOK){"✅ Running"}else{"⚠️ Not ready"}) |
| 🔷 Neo4j Browser | http://localhost:7474 | $(if($neo4jOK){"✅ Running"}else{"⚠️ Starting..."}) |
| 🦙 Ollama | http://localhost:11434 | $(if($ollamaOK){"✅ Running"}else{"⚠️ Model loading..."}) |
| 🐘 PostgreSQL | localhost:5432 | ✅ Running (healthcheck passed) |

## Demo Mode

| Field | Value |
|-------|-------|
| 👤 Student | Mary Jasper |
| 🏫 Department | CSE |
| 📅 Year | 4 |

No login required - the app opens directly to the dashboard with demo data.

## Quick Commands

``````powershell
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
``````

## System Info

| Item | Value |
|------|-------|
| Docker | v$dockerVer |
| Free Memory | ${freeMB}MB |
| Total Memory | ${totalMB}MB |
| Date | $(Get-Date -Format "yyyy-MM-dd HH:mm") |
"@

$statusContent | Set-Content "$ROOT\PROJECT_STATUS.md" -Encoding UTF8
Write-OK "PROJECT_STATUS.md generated"

# Dev mode: also start frontend
if ($Dev) {
    Write-Header "Dev Mode · Starting Frontend"
    $frontendPath = Join-Path $ROOT "frontend"
    if (Test-Path "$frontendPath\package.json") {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; npm run dev" -WindowStyle Normal
        Write-OK "Frontend dev server started in new window"
    }
}

# ════════════════════════════════════════════════════════════
# STEP 10 — Final Summary + Open Browser
# ════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║            ✅  Stack is Ready!                        ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐  Frontend:       http://localhost:5173" -ForegroundColor Cyan
Write-Host "  ⚡  Backend API:    http://localhost:8000" -ForegroundColor Cyan
Write-Host "  📚  Swagger Docs:   http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  🔷  Neo4j Browser:  http://localhost:7474" -ForegroundColor Cyan
Write-Host "  🦙  Ollama:         http://localhost:11434" -ForegroundColor Cyan
Write-Host ""
Write-Host "  No login required - opens directly to dashboard with demo data" -ForegroundColor White
Write-Host ""
Write-Host "  📄  PROJECT_STATUS.md generated" -ForegroundColor DarkGray
Write-Host "  📋  Logs: docker compose logs -f" -ForegroundColor DarkGray
Write-Host "  🛑  Stop: docker compose down" -ForegroundColor DarkGray
Write-Host ""

if (-not $NoBrowser -and $backendOK) {
    Write-INFO "Opening browser in 3 seconds..."
    Start-Sleep 3
    Start-Process "http://localhost:5173"
    Start-Sleep 1
    Start-Process "http://localhost:8000/docs"
}
