"""
0001_initial_schema
--------------------

This placeholder migration ensures the base SQLModel metadata is applied.

We still rely on SQLModel.metadata.create_all(engine) for the initial
schema, but wiring this through the migration runner establishes a
pattern for future incremental, code-based migrations.
"""

from __future__ import annotations

from sqlmodel import SQLModel


MIGRATION_NAME = "0001_initial_schema"


def upgrade(engine) -> None:  # pragma: no cover - simple delegation
  # Idempotent: calling create_all repeatedly is safe.
  SQLModel.metadata.create_all(engine)

