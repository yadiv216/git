FROM node:22-alpine AS frontend-build
WORKDIR /build
COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm ci
COPY Frontend/ ./
ENV VITE_SAME_ORIGIN_API=true
RUN npm run build

FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY Backend/requirements.txt /app/Backend/requirements.txt
RUN pip install --no-cache-dir -r /app/Backend/requirements.txt
COPY Backend/ /app/Backend/
COPY ["Datasets/Geek Girls", "/app/Datasets/Geek Girls"]
COPY --from=frontend-build /build/dist /app/Frontend/dist
WORKDIR /app/Backend
EXPOSE 10000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
