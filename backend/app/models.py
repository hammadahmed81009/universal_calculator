from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict, Any

from sqlmodel import SQLModel, Field, Column, JSON


class Manufacturer(SQLModel, table=True):
  id: Optional[int] = Field(default=None, primary_key=True)
  name: str = Field(index=True)
  logo_url: Optional[str] = Field(default=None, nullable=True)


class Product(SQLModel, table=True):
  id: Optional[int] = Field(default=None, primary_key=True)
  name: str
  description: Optional[str] = Field(default=None)
  unit_price: float = Field(default=0)
  final_price: Optional[float] = Field(default=None)
  category: str = Field(index=True)
  manufacturer_id: int = Field(foreign_key="manufacturer.id", index=True)
  manufacturer_name: Optional[str] = Field(default=None)
  image_url: Optional[str] = Field(default=None)
  kit_size: Optional[str] = Field(default=None)
  spread_rate: Optional[str] = Field(default=None)
  unit: Optional[str] = Field(default=None)
  sku: Optional[str] = Field(default=None, index=True)
  technical_data_sheet_url: Optional[str] = Field(default=None)


class SavedBid(SQLModel, table=True):
  """
  Persisted bid from the Universal Calculator.

  We store the full calculator payload as JSON so the backend
  does not need to understand every field, while still exposing
  a stable REST surface to the frontend.
  """

  id: Optional[int] = Field(default=None, primary_key=True)
  created_at: datetime = Field(default_factory=datetime.utcnow)
  updated_at: datetime = Field(default_factory=datetime.utcnow)

  # Source helps distinguish universal-calculator vs quick-pricer etc.
  source: str = Field(default="universal-calculator", index=True)

  # Denormalised headline fields for easier querying and potential future use.
  name: str = Field(index=True)
  description: Optional[str] = Field(default=None)
  client_id: Optional[int] = Field(default=None, index=True)
  manufacturer_id: Optional[int] = Field(default=None, index=True)

  # Full calculator payload as JSON blob.
  payload: Dict[str, Any] = Field(
    sa_column=Column(JSON, nullable=False)
  )


class SchemaMigration(SQLModel, table=True):
  """
  Track applied schema migrations so each one only runs once.
  """

  id: Optional[int] = Field(default=None, primary_key=True)
  name: str = Field(index=True, unique=True)
  applied_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class DataSeed(SQLModel, table=True):
  """
  Track applied data seed scripts so they are idempotent.
  """

  id: Optional[int] = Field(default=None, primary_key=True)
  name: str = Field(index=True, unique=True)
  applied_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


