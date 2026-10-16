from datetime import date
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .auth import (
    create_access_token, get_current_user, upsert_user, verify_google_credential,
)
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


@app.post("/auth/google", response_model=schemas.TokenOut)
def login_with_google(body: schemas.GoogleLoginIn, db: Session = Depends(get_db)):
    """Exchange a Google ID token for this app's session token."""
    claims = verify_google_credential(body.credential)
    user = upsert_user(db, claims)
    return schemas.TokenOut(access_token=create_access_token(user), user=user)
 
 
@app.get("/auth/me", response_model=schemas.UserOut)
def read_me(user: models.User = Depends(get_current_user)):
    return user
 

@app.post(
    "/expenses",
    response_model=schemas.ExpenseOut,
    status_code=201
)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user),):
    db_expense = crud.create_expense(db, user.id, expense)
    return db_expense


@app.get(
    "/expenses",
    response_model=List[schemas.ExpenseOut]
)
def read_expenses(
    category: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None, description="Inclusive start date, YYYY-MM-DD"),
    date_to: Optional[date] = Query(default=None, description="Inclusive end date, YYYY-MM-DD"),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=400, detail="date_from must be on or before date_to")
    return crud.list_expenses(
        db,  user.id, category=category, date_from=date_from, date_to=date_to, limit=limit, offset=offset
    )


@app.delete(
    "/expenses/{expense_id}",
    status_code=204
)
def delete_expense(expense_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user),):
    if not crud.delete_expense(db, user.id, expense_id):
        raise HTTPException(status_code=404, detail=f"Expense {expense_id} not found")
    

@app.get(
    "/summary",
    response_model=schemas.SummaryOut,
)
def read_summary(db: Session = Depends(get_db), user: models.User = Depends(get_current_user),):
    return crud.get_summary(db, user.id)


@app.get(
    "/summary/monthly",
    response_model=schemas.MonthlySeriesOut,
)
def read_monthly(
    months: int = Query(default=6, ge=1, le=24, description="How many months back, including this one"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return crud.get_monthly_totals(db, user.id, months=months)