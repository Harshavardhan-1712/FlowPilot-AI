import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

logger = logging.getLogger("flowpilot.database")

Base = declarative_base()

connect_args = {}
if settings.is_sqlite:
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True,
)

# Enable foreign keys and WAL mode for SQLite
if settings.is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create tables and ensure required schema setup."""
    from app.models import (
        user,
        workspace,
        workflow,
        execution,
        knowledge,
        approval,
        audit,
    )
    # If postgresql, enable vector extension if available
    if not settings.is_sqlite:
        with engine.connect() as conn:
            try:
                conn.execute(Base.metadata.schema and None or "CREATE EXTENSION IF NOT EXISTS vector;")
                conn.commit()
            except Exception as e:
                logger.warning(f"Could not enable pgvector extension automatically: {e}")

    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully.")
