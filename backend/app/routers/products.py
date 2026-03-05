from __future__ import annotations

from typing import List, Optional, Annotated

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from ..database import get_session
from ..models import Product


router = APIRouter(prefix="/api/user-products", tags=["products"])


@router.get("/my-products")
def list_products_for_user(
  session: Annotated[Session, Depends(get_session)],
  manufacturer_id: Annotated[Optional[int], Query(ge=1)] = None,
  product_categories: Annotated[Optional[str], Query(alias="product_categories")] = None,
  limit: Annotated[int, Query(ge=1, le=1000)] = 500,
) -> List[Product]:
  """
  Return products scoped to a manufacturer and a set of category keywords.

  This endpoint mirrors the legacy `/api/user-products/my-products` surface
  expected by the frontend.
  """
  statement = select(Product)

  if manufacturer_id is not None:
    statement = statement.where(Product.manufacturer_id == manufacturer_id)

  if product_categories:
    categories = [c.strip().lower() for c in product_categories.split(",") if c.strip()]
    if categories:
      # Basic, case-insensitive "contains" match on category field.
      from sqlalchemy import or_

      ors = []
      for cat in categories:
        ors.append(Product.category.ilike(f"%{cat.split('/')[0]}%"))
      statement = statement.where(or_(*ors))

  statement = statement.limit(limit)
  return session.exec(statement).all()

