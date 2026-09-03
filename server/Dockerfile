FROM python:3.11-slim

WORKDIR /srv

COPY requirements.txt .
# --retries/--timeout smooth over the transient PyPI/network blips that are
# common inside Docker Desktop's build VM (a bare "could not find a version"
# error here is usually that, not a bad pin — retry the build if it recurs).
RUN pip install --no-cache-dir --retries 5 --timeout 60 -r requirements.txt

COPY app ./app

EXPOSE 8000

# --reload is fine here: this is a dev/hackathon setup, not a production image.
# DATABASE_URL is read from the environment at runtime (see app/config.py) — it
# is NOT hardcoded to localhost so this works against a docker-compose "db" host.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
