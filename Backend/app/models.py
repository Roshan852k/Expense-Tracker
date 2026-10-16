from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime, ForeignKey, func, Index,
)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # Google's stable account id ("sub" claim). Never changes, unlike email.
    google_sub = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(320), nullable=False, index=True)
    name = Column(String(255), nullable=True)
    picture = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_login_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    # Owner. DB-level nullable only so pre-login legacy rows survive the
    # migration; the app always sets it and always filters by it.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    # Numeric(12, 2) avoids float rounding issues with money.
    amount = Column(Numeric(12, 2), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    note = Column(String(500), nullable=True, default="")
    date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="expenses")

    __table_args__ = (
        Index("ix_expenses_user_date", "user_id", "date"),
        Index("ix_expenses_category_date", "category", "date"),
    )