# Fast Single-Stage Dockerfile for HomeMe
FROM python:3.11-slim

# Install Node.js quickly
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gcc \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (faster caching)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Build frontend quickly
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN yarn install --silent --network-timeout 60000 \
    && yarn build \
    && mv build /app/static \
    && cd /app && rm -rf frontend

# Copy backend
WORKDIR /app
COPY backend/ ./

EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]