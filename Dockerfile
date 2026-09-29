# SecCraft deployment images. Build the frontend separately from the API so either target can
# be updated without making account/database secrets part of the static browser bundle.
FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend
ARG VITE_BASE=/
ARG VITE_API_BASE=
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_ANON_KEY=
ENV VITE_BASE=${VITE_BASE} \
    VITE_API_BASE=${VITE_API_BASE} \
    VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine AS web
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-build /src/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

FROM python:3.11-slim AS backend
WORKDIR /app/backend
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PLATFORM_AUTO_CREATE_TABLES=false

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
# Paths match config.py's repository-root layout so static content and curated capture fallbacks work.
COPY content/ /app/content/
COPY frontend/src/content/ /app/frontend/src/content/
COPY frontend/public/pcaps/ /app/frontend/public/pcaps/
COPY frontend/public/lab-data/ /app/frontend/public/lab-data/
RUN useradd --system --uid 10001 --create-home seccraft \
    && chown -R seccraft:seccraft /app
USER seccraft
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
