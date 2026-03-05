from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlmodel import SQLModel, create_engine, Session


def get_database_url() -> str:
  """
  Resolve the database URL.

  Defaults to a local SQLite file for easy local development
  and avoids depending on any external services.
  """
  url = os.getenv("DATABASE_URL")
  if url:
    return url
  base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
  db_path = os.path.join(base_dir, "calculator.db")
  return f"sqlite:///{db_path}"


engine = create_engine(
  get_database_url(),
  echo=False,
  connect_args={"check_same_thread": False} if get_database_url().startswith("sqlite") else {},
)


def init_db() -> None:
  """
  Create all tables if they do not exist.
  """
  SQLModel.metadata.create_all(engine)


def get_session() -> Session:
  """
  FastAPI dependency that yields a database session.
  """
  with Session(engine) as session:
    yield session

