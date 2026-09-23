from datetime import date as date_type
from decimal import Decimal
from typing import Optional, List, Dict

from pydantic import BaseModel, Field, field_validator, ConfigDict


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(..., description="Positive amount, up to 2 decimal places")
    category: str = Field(..., min_length=1, max_length=64)
    note: Optional[str] = Field(default="", max_length=500)
    date: date_type

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        # Reject more than 2 decimal places (e.g. 1.999) rather than silently rounding.
        if v.as_tuple().exponent < -2:
            raise ValueError("amount must have at most 2 decimal places")
        return v

    @field_validator("category")
    @classmethod
    def category_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("category must not be blank")
        return v

    @field_validator("note", mode="before")
    @classmethod
    def default_note(cls, v):
        return v if v is not None else ""


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: Decimal
    category: str
    note: str
    date: date_type


class CategoryTotal(BaseModel):
    category: str
    total: Decimal


class MonthlyTotal(BaseModel):
    month: str  # "YYYY-MM"
    total: Decimal


class CategoryInsight(BaseModel):
    category: str
    previous_month_total: Decimal
    current_month_total: Decimal
    pct_change: Decimal
    message: str


class SummaryOut(BaseModel):
    total_spend: Decimal
    by_category: List[CategoryTotal]
    current_month: MonthlyTotal
    previous_month: MonthlyTotal
    month_over_month_change: Decimal  # absolute difference, current - previous
    month_over_month_change_pct: Optional[Decimal]  # None if previous month total is 0
    insights: List[CategoryInsight] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    detail: str
