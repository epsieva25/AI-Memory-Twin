FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# curl + wget needed for Docker healthchecks
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('stopwords', quiet=True)" || true

# Copy project files
COPY . .

# Create required directories
RUN mkdir -p datasets ml

# Generate dataset and train ML models at build time
# These are || true so a missing optional dependency never breaks the build
RUN python datasets/generate_data.py || true
RUN python ml/train_models.py || true

# Expose FastAPI port
EXPOSE 8000

# startup.py waits for PostgreSQL then exec-replaces itself with uvicorn
# This prevents import cascade failures on container startup race conditions
CMD ["python", "startup.py"]