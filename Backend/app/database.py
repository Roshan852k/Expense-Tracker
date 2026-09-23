import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# The DB location must be provided via environment variable for PostgreSQL.
DATABASE_URL = os.environ.get("SPEND_TRACKER_DB_URL")

if not DATABASE_URL:
    raise ValueError("SPEND_TRACKER_DB_URL environment variable is not set. Please provide a PostgreSQL connection string.")

# SQLAlchemy 1.4+ requires postgresql:// instead of postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
