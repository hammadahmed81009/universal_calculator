"""
Schema migration scripts live in this package.

Each module should be named with an ordered prefix, for example:

  0001_initial_schema.py
  0002_add_new_table.py

and must define:

  MIGRATION_NAME: str
  def upgrade(engine) -> None
"""

