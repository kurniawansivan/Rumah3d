import pytest
from fastapi.testclient import TestClient

from generation_engine.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
