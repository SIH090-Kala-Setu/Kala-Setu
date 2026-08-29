# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies for psycopg2-binary, opencv, rembg, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies into a dedicated prefix
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Runtime libs needed by opencv / rembg at execution time
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Pre-download lightweight u2netp ONNX model (~4.5MB) during image build
# so the server never hangs attempting to download it during runtime requests
RUN python -c "import rembg; rembg.new_session('u2netp')"

# Copy application source (exclude venv, __pycache__, local .env)
COPY . .
RUN rm -rf venv __pycache__ .env backup.sql

# Render injects environment variables; never bake secrets into the image.
# Required env vars:
#   DATABASE_URL          – Supabase / any PostgreSQL connection string
#   SECRET_KEY            – JWT signing secret
#   GEMINI_API_KEY        – Google Gemini API key
#   SMS_GATEWAY_URL       – SMS gateway endpoint
#   SMS_GATEWAY_USERNAME  – SMS gateway username
#   SMS_GATEWAY_PASSWORD  – SMS gateway password

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Render assigns a random PORT via env var; default to 8000 locally
ENV PORT=8000

EXPOSE $PORT

# Start with gunicorn for production or fall back to uvicorn for simplicity
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT} --log-level info
