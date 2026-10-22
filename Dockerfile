# One container: FastAPI serves the API and the built React app.

# ---- build the frontend ----
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- run the backend ----
FROM python:3.12-slim
WORKDIR /app/backend
ENV PYTHONUNBUFFERED=1 MILO_DB_PATH=/data/milo.db
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY sample_data/ /app/sample_data/
COPY --from=web /web/dist /app/frontend/dist
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
