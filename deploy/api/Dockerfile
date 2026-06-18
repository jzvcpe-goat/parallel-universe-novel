FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend/src
ENV NARRATIVEOS_DEPLOY_ENV=production

WORKDIR /app

COPY backend/requirements.txt backend/pyproject.toml /app/backend/
RUN python -m pip install --no-cache-dir --upgrade pip \
  && python -m pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/src /app/backend/src
COPY backend/examples /app/backend/examples
COPY backend/configs /app/backend/configs
COPY backend/prompts /app/backend/prompts
COPY backend/specs /app/backend/specs
COPY backend/db /app/backend/db
COPY docs/product/rules /app/docs/product/rules

EXPOSE 8787

CMD ["python", "-m", "uvicorn", "narrativeos.api.app_factory:create_app", "--factory", "--app-dir", "backend/src", "--host", "0.0.0.0", "--port", "8787"]
