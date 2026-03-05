from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import get_session
from ..models import SavedBid


router = APIRouter(prefix="/api/saved-bids", tags=["saved-bids"])


class SavedBidPayload(BaseModel):
  """
  Shape of the Universal Calculator payload we persist.

  We intentionally keep this model relaxed (lots of Optional/Any) so that
  frontend evolution does not require frequent backend changes, while still
  validating basic structure.
  """

  source: str = Field(default="universal-calculator")
  name: str
  description: Optional[str] = None
  client_id: Optional[int] = None
  manufacturer_id: Optional[int] = None

  # Everything else is stored as-is.
  # Use a catch-all to avoid over-constraining the contract.
  other: Dict[str, Any] = Field(default_factory=dict)

  class Config:
    extra = "allow"


class SavedBidCreateResponse(BaseModel):
  id: int


class SavedBidListItem(BaseModel):
  id: int
  name: str
  description: Optional[str] = None
  created_at: datetime
  updated_at: datetime
  client_id: Optional[int] = None
  manufacturer_id: Optional[int] = None


class SavedBidListResponse(BaseModel):
  items: List[SavedBidListItem]
  total: int
  page: int
  page_size: int


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_saved_bid(
  payload: Dict[str, Any],
  session: Annotated[Session, Depends(get_session)],
) -> SavedBidCreateResponse:
  """
  Persist a new saved bid.

  We perform a light validation pass via `SavedBidPayload`, then store the
  entire payload JSON to remain forward-compatible with UI changes.
  """
  parsed = SavedBidPayload(**payload)

  bid = SavedBid(
    source=parsed.source,
    name=parsed.name,
    description=parsed.description,
    client_id=parsed.client_id,
    manufacturer_id=parsed.manufacturer_id,
    payload=payload,
  )
  session.add(bid)
  session.commit()
  session.refresh(bid)
  return SavedBidCreateResponse(id=bid.id)  # type: ignore[arg-type]


@router.get("/")
def list_saved_bids(
  session: Annotated[Session, Depends(get_session)],
  page: Annotated[int, Query(ge=1)] = 1,
  page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> SavedBidListResponse:
  """
  Return a paginated list of saved bids, newest first.
  """
  offset = (page - 1) * page_size

  total = len(
    session.exec(
      select(SavedBid.id).where(SavedBid.source == "universal-calculator")
    ).all()
  )

  statement = (
    select(SavedBid)
    .where(SavedBid.source == "universal-calculator")
    .order_by(SavedBid.created_at.desc())
    .offset(offset)
    .limit(page_size)
  )
  bids: List[SavedBid] = list(session.exec(statement).all())

  items = [
    SavedBidListItem(
      id=bid.id or 0,
      name=bid.name,
      description=bid.description,
      created_at=bid.created_at,
      updated_at=bid.updated_at,
      client_id=bid.client_id,
      manufacturer_id=bid.manufacturer_id,
    )
    for bid in bids
  ]

  return SavedBidListResponse(
    items=items,
    total=total,
    page=page,
    page_size=page_size,
  )


@router.get("/{bid_id}")
def get_saved_bid(
  bid_id: int,
  session: Annotated[Session, Depends(get_session)],
) -> Dict[str, Any]:
  bid = session.get(SavedBid, bid_id)
  if not bid:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved bid not found")
  # Expose the original payload with the persisted id attached.
  payload_with_id: Dict[str, Any] = dict(bid.payload)
  payload_with_id.setdefault("id", bid.id)
  return payload_with_id


@router.put("/{bid_id}", status_code=status.HTTP_200_OK)
def update_saved_bid(
  bid_id: int,
  payload: Dict[str, Any],
  session: Annotated[Session, Depends(get_session)],
) -> Dict[str, Any]:
  bid = session.get(SavedBid, bid_id)
  if not bid:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved bid not found")

  parsed = SavedBidPayload(**payload)

  bid.name = parsed.name
  bid.description = parsed.description
  bid.client_id = parsed.client_id
  bid.manufacturer_id = parsed.manufacturer_id
  bid.payload = payload
  bid.updated_at = datetime.utcnow()

  session.add(bid)
  session.commit()
  # Return minimal confirmation payload with id, matching create semantics.
  return {"id": bid.id}
