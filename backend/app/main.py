from __future__ import annotations

from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from .database import engine, init_db
from .migration_runner import run_pending_migrations
from .routers import manufacturers, products, saved_bids
from .seed_data import seed_all


def create_app() -> FastAPI:
  app = FastAPI(title="Universal Calculator API", version="1.0.0")

  # CORS: allow local frontend by default, configurable via env var.
  app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
  )

  @app.on_event("startup")
  def on_startup() -> None:
    init_db()
    run_pending_migrations()
    with Session(engine) as session:
      seed_all(session)

  # Routers
  app.include_router(manufacturers.router)
  app.include_router(products.router)
  app.include_router(saved_bids.router)

  @app.get("/health", tags=["meta"])
  def health() -> dict:
    return {"status": "ok"}

  return app


app = create_app()

