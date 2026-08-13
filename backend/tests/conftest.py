import os
import tempfile

# Must run before any `app.` import: points the module-level settings/engine
# at a throwaway dir so lifespan (migrations/seed/sweep) never touches dev data.
os.environ.setdefault("NYTKA_DATA_DIR", tempfile.mkdtemp(prefix="nytka-test-"))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.fts import create_fts
from app.db.seed import ensure_default_project
from app.db.session import get_db
from app.main import app


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    # metadata.create_all cannot create virtual tables or triggers — without this the
    # FTS index simply does not exist and every search/trigger test fails on "no such table".
    create_fts(engine)
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
    with TestingSession() as session:
        ensure_default_project(session)
        yield session


@pytest.fixture()
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
