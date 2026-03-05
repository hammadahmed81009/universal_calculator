from __future__ import annotations

import importlib
import pkgutil
from pathlib import Path
from typing import Set

from sqlmodel import Session, select

from .models import DataSeed


def _discover_seed_modules() -> list[str]:
  """
  Discover all seed modules in the local app.seeders package.

  Filenames should be prefixed with an order, for example:
    001_initial_catalog.py
    010_demo_data.py
  """
  seeders_path = Path(__file__).resolve().parent / "seeders"
  if not seeders_path.exists():
    return []

  module_names: list[str] = []
  for _, name, is_pkg in pkgutil.iter_modules([str(seeders_path)]):
    if is_pkg:
      continue
    if name.startswith("_"):
      continue
    module_names.append(name)

  module_names.sort()
  return module_names


def run_all_seeds(session: Session) -> None:
  """
  Run all data seed scripts that have not yet been applied.

  Each seed module must define:

    SEED_NAME: str
    def run(session: Session) -> None: ...

  Applied seed names are stored in the DataSeed table so they
  will not re-run on subsequent startups.
  """
  module_prefix = "app.seeders"
  modules = _discover_seed_modules()

  if not modules:
    return

  applied: Set[str] = {
    row.name for row in session.exec(select(DataSeed)).all()
  }

  for module_name in modules:
    module = importlib.import_module(f"{module_prefix}.{module_name}")
    seed_name: str = getattr(module, "SEED_NAME", module_name)

    if seed_name in applied:
      continue

    run = getattr(module, "run", None)
    if not callable(run):
      continue

    run(session)
    session.add(DataSeed(name=seed_name))
    session.commit()

