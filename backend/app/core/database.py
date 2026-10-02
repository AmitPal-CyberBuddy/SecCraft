from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import AUTO_CREATE_TABLES, DATABASE_URL, IS_SQLITE

connect_args = {"check_same_thread": False} if IS_SQLITE else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
# Runtime content lives in PostgreSQL's private `content` schema. SQLite tests have no schemas,
# so translate only that schema token to the default namespace.
if IS_SQLITE:
    engine = engine.execution_options(schema_translate_map={"content": None})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
Base = declarative_base()


def init_db() -> None:
    """Create tables only for local SQLite development/tests; deployments use Alembic migrations."""
    if not IS_SQLITE or not AUTO_CREATE_TABLES:
        return
    # Import the application model package so metadata is complete before local create_all().
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
