import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .agro_models import AgroBase

AGRO_DB_URL = os.getenv("AGRO_DB_URL", os.getenv("DATABASE_URL", ""))

agro_engine = create_engine(AGRO_DB_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
AgroSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=agro_engine)


def get_agro_db():
    db = AgroSessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_agro_tables():
    AgroBase.metadata.create_all(bind=agro_engine)