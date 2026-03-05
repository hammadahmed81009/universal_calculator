from __future__ import annotations

import importlib
import pkgutil
from pathlib import Path
from typing import Set

from sqlmodel import Session, select

from .database import engine
from .models import SchemaMigration


def _discover_migration_modules() -> list[str]:
  """
  Discover all migration modules in the local app.migrations package.

  We sort by module name so '0001_...' runs before '0002_...'.
  """
  migrations_path = Path(__file__).resolve().parent / "migrations"
  if not migrations_path.exists():
    return []

  module_names: list[str] = []
  for _, name, is_pkg in pkgutil.iter_modules([str(migrations_path)]):
    if is_pkg:
      continue
    if name.startswith("_"):
      continue
    module_names.append(name)

  module_names.sort()
  return module_names


def run_pending_migrations() -> None:
  """
  Run all schema migrations that have not yet been applied.

  Each migration module must define:

    MIGRATION_NAME: str
    def upgrade(engine) -> None: ...

  We record each applied migration in the SchemaMigration table so
  they will not re-run on subsequent startups.
  """
  module_prefix = "app.migrations"
  modules = _discover_migration_modules()

  if not modules:
    return

  with Session(engine) as session:
    existing: Set[str] = {
      row.name for row in session.exec(select(SchemaMigration)).all()
    }

    for module_name in modules:
      module = importlib.import_module(f"{module_prefix}.{module_name}")
      migration_name: str = getattr(module, "MIGRATION_NAME", module_name)

      if migration_name in existing:
        continue

      upgrade = getattr(module, "upgrade", None)
      if not callable(upgrade):
        continue

      # Run the migration against the shared engine.
      upgrade(engine)

      # Record as applied.
      session.add(SchemaMigration(name=migration_name))
      session.commit()

