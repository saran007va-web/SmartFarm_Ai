"""
Database engine, session factory, and Base for ORM models.
"""
import logging

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


# Create the engine once at module load
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # verify connection is alive before using
    pool_size=10,
    max_overflow=20,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency that yields a DB session and closes it when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables():
    """Create all tables defined in models. Called at app startup."""
    # Import models so SQLAlchemy registers them on Base.metadata
    from app.db import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_crop_planning_columns()
    logger.info("Database tables created / verified.")


def _ensure_crop_planning_columns():
    def add_missing_column(table_name: str, column_name: str, column_sql: str):
        inspector = inspect(engine)
        existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
        if column_name in existing_columns:
            return
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}"))
        logger.info("Added missing column %s.%s", table_name, column_name)

    inspector = inspect(engine)
    if inspector.has_table("crop_plans"):
        add_missing_column("crop_plans", "duration_days", "INTEGER")
        add_missing_column("crop_plans", "growth_stages", "JSON")
        add_missing_column("crop_plans", "status", "VARCHAR(32)")

    if inspector.has_table("maintenance_tasks"):
        add_missing_column("maintenance_tasks", "title", "VARCHAR(255)")
        add_missing_column("maintenance_tasks", "start_time", "VARCHAR(16)")
        add_missing_column("maintenance_tasks", "end_time", "VARCHAR(16)")
        add_missing_column("maintenance_tasks", "priority", "VARCHAR(16)")
        add_missing_column("maintenance_tasks", "status", "VARCHAR(16)")
        add_missing_column("maintenance_tasks", "reminder_minutes", "INTEGER")
        add_missing_column("maintenance_tasks", "assigned_crop", "VARCHAR(64)")
        add_missing_column("maintenance_tasks", "growth_stage", "VARCHAR(64)")
        add_missing_column("maintenance_tasks", "plan_day_offset", "INTEGER")
        add_missing_column("maintenance_tasks", "is_auto_generated", "BOOLEAN")


def check_db_connection():
    """Quick health check - raises if DB is unreachable."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Database connection OK.")
