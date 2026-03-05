from __future__ import annotations

"""
Backward-compatible entry point for seeding.

New seed scripts live in app/seeders and are orchestrated by seed_runner.
"""

from sqlmodel import Session

from .seed_runner import run_all_seeds


def seed_all(session: Session) -> None:
  """
  Run all registered seed scripts exactly once.

  Kept for compatibility with existing imports; delegates to the new
  seed runner which tracks applied seeds in the DataSeed table.
  """
  run_all_seeds(session)

