FROM python:3.11-slim

# System deps for psycopg2, faiss, sentence-transformers
RUN apt-get update && apt-get install -y \
    gcc g++ libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-only torch first so sentence-transformers does not pull CUDA wheels.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.3.1+cpu

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directories
RUN mkdir -p data/faiss_index data/ml_models data/uploads

# Non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
