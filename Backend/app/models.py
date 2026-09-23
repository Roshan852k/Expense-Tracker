from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, func, Index
from .database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    # Numeric(12, 2) avoids float rounding issues with money.
    amount = Column(Numeric(12, 2), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    note = Column(String(500), nullable=True, default="")
    date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_expenses_category_date", "category", "date"),
    )
