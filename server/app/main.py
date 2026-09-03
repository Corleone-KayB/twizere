from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from .db import engine, init_db
from .routers import loans, prequalify, ws
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with Session(engine) as session:
        seed_if_empty(session)
    yield


app = FastAPI(title="Twizere API", lifespan=lifespan)

# Dev-only hackathon setting: allow all origins so the separately-built React
# frontend can call this API from any host/port without CORS friction.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prequalify.router, prefix="/api")
app.include_router(loans.router, prefix="/api")
app.include_router(ws.router)  # mounts /ws (no /api prefix)


@app.get("/api/health")
def health():
    return {"status": "ok"}
