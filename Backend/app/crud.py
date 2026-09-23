from datetime import date
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas


def create_expense(db: Session, expense: schemas.ExpenseCreate) -> models.Expense:
    db_expense = models.Expense(
        amount=expense.amount,
        category=expense.category,
        note=expense.note or "",
        date=expense.date,
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


def list_expenses(
    db: Session,
    category: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[models.Expense]:
    query = db.query(models.Expense)
    if category:
        query = query.filter(models.Expense.category == category)
    if date_from:
        query = query.filter(models.Expense.date >= date_from)
    if date_to:
        query = query.filter(models.Expense.date <= date_to)
    query = query.order_by(models.Expense.date.desc(), models.Expense.id.desc())
    return query.offset(offset).limit(limit).all()


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    return start, end


def _prev_month(year: int, month: int) -> tuple[int, int]:
    if month == 1:
        return year - 1, 12
    return year, month - 1


def _sum_between(db: Session, start: date, end_exclusive: date) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(models.Expense.amount), 0))
        .filter(models.Expense.date >= start, models.Expense.date < end_exclusive)
        .scalar()
    )
    return Decimal(total)


def _category_totals_between(db: Session, start: date, end_exclusive: date) -> dict:
    rows = (
        db.query(models.Expense.category, func.sum(models.Expense.amount))
        .filter(models.Expense.date >= start, models.Expense.date < end_exclusive)
        .group_by(models.Expense.category)
        .all()
    )
    return {cat: Decimal(total) for cat, total in rows}


# A category's current-month spend more than this many percent above its
# previous-month spend gets flagged in the summary's `insights` list.
SPIKE_THRESHOLD_PCT = Decimal("20")


def _build_insights(
    current_by_category: dict, previous_by_category: dict
) -> List["schemas.CategoryInsight"]:
    insights = []
    # Only compare categories that actually had spend last month — a
    # percentage increase off a $0 base is undefined/infinite and not a
    # meaningful "spike" signal, so brand-new categories are skipped here
    # rather than reported as a false +∞% flag.
    for category, prev_total in previous_by_category.items():
        if prev_total <= 0:
            continue
        cur_total = current_by_category.get(category, Decimal("0"))
        pct_change = ((cur_total - prev_total) / prev_total) * 100
        if pct_change > SPIKE_THRESHOLD_PCT:
            insights.append(
                schemas.CategoryInsight(
                    category=category,
                    previous_month_total=prev_total,
                    current_month_total=cur_total,
                    pct_change=pct_change.quantize(Decimal("0.01")),
                    message=(
                        f"{category} spend is up "
                        f"{pct_change.quantize(Decimal('0.1'))}% vs last month "
                        f"(${prev_total} → ${cur_total})."
                    ),
                )
            )
    # Largest increase first.
    insights.sort(key=lambda i: i.pct_change, reverse=True)
    return insights


def get_summary(db: Session, today: Optional[date] = None) -> schemas.SummaryOut:
    """Builds the summary. `today` is injectable for deterministic testing."""
    if today is None:
        today = date.today()

    total_spend = Decimal(
        db.query(func.coalesce(func.sum(models.Expense.amount), 0)).scalar()
    )

    category_rows = (
        db.query(models.Expense.category, func.sum(models.Expense.amount))
        .group_by(models.Expense.category)
        .order_by(func.sum(models.Expense.amount).desc())
        .all()
    )
    by_category = [
        schemas.CategoryTotal(category=cat, total=Decimal(total))
        for cat, total in category_rows
    ]

    cur_start, cur_end = _month_bounds(today.year, today.month)
    prev_year, prev_month = _prev_month(today.year, today.month)
    prev_start, prev_end = _month_bounds(prev_year, prev_month)

    current_total = _sum_between(db, cur_start, cur_end)
    previous_total = _sum_between(db, prev_start, prev_end)

    change = current_total - previous_total
    if previous_total != 0:
        change_pct = (change / previous_total) * 100
    else:
        change_pct = None

    current_by_category = _category_totals_between(db, cur_start, cur_end)
    previous_by_category = _category_totals_between(db, prev_start, prev_end)
    insights = _build_insights(current_by_category, previous_by_category)

    return schemas.SummaryOut(
        total_spend=total_spend,
        by_category=by_category,
        current_month=schemas.MonthlyTotal(
            month=f"{cur_start.year:04d}-{cur_start.month:02d}", total=current_total
        ),
        previous_month=schemas.MonthlyTotal(
            month=f"{prev_start.year:04d}-{prev_start.month:02d}", total=previous_total
        ),
        month_over_month_change=change,
        month_over_month_change_pct=(
            change_pct.quantize(Decimal("0.01")) if change_pct is not None else None
        ),
        insights=insights,
    )
