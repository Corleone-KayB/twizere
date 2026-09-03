FROM python:3.11-slim

WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

# --reload is fine here: this is a dev/hackathon setup, not a production image.
# DATABASE_URL is read from the environment at runtime (see app/config.py) — it
# is NOT hardcoded to localhost so this works against a docker-compose "db" host.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
