## Universal Calculator Backend (FastAPI)

This directory contains the FastAPI backend that powers manufacturers, products, and saved bids for the Universal Calculator frontend.

### Features

- **Manufacturers API**
  - `GET /api/manufacturers` – list all manufacturers.

- **Products API**
  - `GET /api/user-products/my-products` – list products filtered by `manufacturer_id` and `product_categories`, mirroring the legacy path used by the frontend.

- **Saved Bids API**
  - `POST /api/saved-bids/` – create a new saved bid from the Universal Calculator payload; returns `{ "id": number }`.
  - `GET /api/saved-bids/{id}` – fetch a previously saved bid; returns the original calculator payload plus an `id` field.
  - `PUT /api/saved-bids/{id}` – update an existing saved bid in-place.

All bid payloads are stored as JSON for forward compatibility while still validating top‑level fields.

### Local development

1. **Create and activate a virtual environment** (recommended):

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   ```

2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Run the API**:

   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

4. **Configure the frontend**:

   The frontend Axios client defaults to `http://localhost:8000`. If you change the backend URL or port, set:

   ```bash
   # In frontend/.env.local
   VITE_API_BASE_URL=http://localhost:8000
   ```

5. **API docs**

   Once running, interactive docs are available at:

   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

