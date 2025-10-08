# Optimized Single-Stage Dockerfile for HomeMe Application
FROM node:18-alpine AS base

# Install Python and system dependencies
RUN apk add --no-cache python3 py3-pip gcc musl-dev python3-dev

WORKDIR /app

# Build Frontend (parallel with Python setup)
COPY frontend/package.json frontend/yarn.lock frontend/
WORKDIR /app/frontend
RUN yarn install --network-timeout 100000 --production --silent && yarn cache clean

COPY frontend/ ./
RUN yarn build --silent

# Setup Backend
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

# Copy backend code and frontend build
COPY backend/ ./
COPY --from=0 /app/frontend/build ./static

# Cleanup to reduce image size
RUN rm -rf /app/frontend && apk del gcc musl-dev python3-dev

# Expose port
EXPOSE 8001

# Start the application
CMD ["python3", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]