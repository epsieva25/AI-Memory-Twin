FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first — separate layer for pip cache
COPY requirements.txt .

# Upgrade pip, then install dependencies
# Note: legacy-resolver removed; modern pip resolves correctly
RUN pip install --upgrade pip setuptools wheel && \
    pip install \
    --no-cache-dir \
    --default-timeout=120 \
    -r requirements.txt

# Download nltk resources
RUN python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('stopwords', quiet=True)" || true

# Copy project files
COPY . .

# Ensure runtime directories exist
# (datasets/ and ml/ are mounted as named volumes in docker-compose)
RUN mkdir -p datasets ml

# FastAPI port
EXPOSE 8000

# Start application — waits for postgres then starts uvicorn
CMD ["python", "startup.py"]