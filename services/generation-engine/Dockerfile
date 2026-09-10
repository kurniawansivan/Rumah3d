FROM python:3.12-slim AS base
WORKDIR /app
RUN pip install --no-cache-dir uv

FROM base AS builder
COPY pyproject.toml ./
COPY src ./src
RUN uv sync --no-dev

FROM python:3.12-slim
RUN useradd -m appuser
WORKDIR /app
COPY --from=builder /app /app
ENV PATH="/app/.venv/bin:$PATH"
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request as u; u.urlopen('http://localhost:8000/v1/health')" || exit 1
CMD ["uvicorn", "generation_engine.main:app", "--host", "0.0.0.0", "--port", "8000"]
