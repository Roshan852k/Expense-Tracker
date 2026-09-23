from datetime import date
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .auth import require_api_key
from .database import engine, get_db, Base

# Create tables on startup (fine for SQLite / small projects; a real project
# would use Alembic migrations instead — see README).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Spend Tracker API", version="1.0.0")

import os

# Read allowed origins from env var, defaulting to '*' for local dev
cors_origins_str = os.environ.get("CORS_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in cors_origins_str.split(",")] if cors_origins_str != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    # Flatten pydantic's verbose error format into a single readable message.
    messages = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err["loc"] if p not in ("body",))
        messages.append(f"{loc}: {err['msg']}" if loc else err["msg"])
    return JSONResponse(status_code=422, content={"detail": "; ".join(messages)})


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post(
    "/expenses",
    response_model=schemas.ExpenseOut,
    status_code=201,
    dependencies=[Depends(require_api_key)],
)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    db_expense = crud.create_expense(db, expense)
    return db_expense


@app.get(
    "/expenses",
    response_model=List[schemas.ExpenseOut],
    dependencies=[Depends(require_api_key)],
)
def read_expenses(
    category: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None, description="Inclusive start date, YYYY-MM-DD"),
    date_to: Optional[date] = Query(default=None, description="Inclusive end date, YYYY-MM-DD"),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=400, detail="date_from must be on or before date_to")
    return crud.list_expenses(
        db, category=category, date_from=date_from, date_to=date_to, limit=limit, offset=offset
    )


@app.get(
    "/summary",
    response_model=schemas.SummaryOut,
    dependencies=[Depends(require_api_key)],
)
def read_summary(db: Session = Depends(get_db)):
    return crud.get_summary(db)
