# Deployment & Infrastructure Guide

## Docker Containerization
Run production container:
```bash
docker build -t alphamind:latest .
docker run -p 8000:8000 -p 5173:5173 alphamind:latest
```

## Production Hardening
- Configure reverse proxy (NGINX / Caddy) with TLS termination.
- Set CORS origins explicitly in production environment.
- Limit max debate iterations to prevent timeout bounds.
