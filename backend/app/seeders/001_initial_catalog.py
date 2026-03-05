from __future__ import annotations

from sqlmodel import Session

from app.models import Manufacturer, Product


SEED_NAME = "001_initial_catalog"


def _seed_manufacturers(session: Session) -> None:
  """
  Seed a small, realistic manufacturer catalog.
  """
  if session.query(Manufacturer).count() > 0:
    return

  manufacturers = [
    Manufacturer(
      id=1,
      name="Westcoat",
      logo_url="https://www.westcoat.com/wp-content/uploads/2022/12/westcoat-logo-fixed.svg",
    ),
    Manufacturer(
      id=2,
      name="Stonecoat",
      logo_url="https://stonecoat.com/wp-content/uploads/2023/06/Side-Solid-COAT-e1687468038183.png",
    ),
    Manufacturer(
      id=3,
      name="Rust-Oleum",
      logo_url="https://www.rustoleum.com/-/media/D8E6CBF2AB7B4195973D7F1C2D901600.png",
    ),
    Manufacturer(
      id=4,
      name="Legacy Industrial",
      logo_url="https://www.legacyindustrial.co/wp-content/uploads/2020/11/legacy-industrial-logo-1.png",
    ),
    Manufacturer(
      id=5,
      name="Epoxy.com",
      logo_url="https://epoxy.com/images/EPOXY.com%20LOGO360.JPG",
    ),
  ]
  session.add_all(manufacturers)
  session.commit()


def _seed_products(session: Session) -> None:
  """
  Seed a focused set of products mirroring the dummy data patterns.
  """
  if session.query(Product).count() > 0:
    return

  products = []
  base_products = [
    ("Epoxy", 89.0),
    ("Polyurea", 95.0),
    ("Polyaspartic", 110.0),
    ("Primers", 65.0),
    ("Flake Colors", 75.0),
    ("Top Coat", 120.0),
    ("Base Pigments", 45.0),
    ("Metallic Money Coat", 130.0),
    ("Metallic Pigments", 60.0),
    ("Cleaners", 25.0),
    ("Crack & Joint Filler", 55.0),
    ("Sealers", 80.0),
    ("Densifiers", 70.0),
    ("Metallic Art Coats", 140.0),
    ("Flood Coats", 135.0),
    ("Incidentals", 30.0),
  ]

  sku_counter = 1
  for manu_id in range(1, 6):
    manu = session.get(Manufacturer, manu_id)
    if not manu:
      continue
    manu_name = manu.name
    for cat, base_price in base_products:
      price = float(base_price)
      products.append(
        Product(
          name=f"{manu_name} {cat} Product",
          description=f"{cat} for {manu_name}",
          unit_price=price,
          final_price=price,
          category=cat,
          manufacturer_id=manu_id,
          manufacturer_name=manu_name,
          unit="gal",
          sku=f"SKU-{manu_id}-{sku_counter}",
        )
      )
      sku_counter += 1

  session.add_all(products)
  session.commit()


def run(session: Session) -> None:
  """
  Entry point used by the seed runner.
  """
  _seed_manufacturers(session)
  _seed_products(session)

