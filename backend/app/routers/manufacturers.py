from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Manufacturer


router = APIRouter(prefix="/api/manufacturers", tags=["manufacturers"])


@router.get("/", response_model=List[Manufacturer])
def list_manufacturers(session: Session = Depends(get_session)) -> List[Manufacturer]:
  statement = select(Manufacturer).order_by(Manufacturer.name)
  return session.exec(statement).all()

