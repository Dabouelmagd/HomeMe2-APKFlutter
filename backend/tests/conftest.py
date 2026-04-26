"""
Shared pytest fixtures.

Spins up an httpx AsyncClient against the locally running backend
(http://127.0.0.1:8001) and seeds tokens for the standard test users.
"""
import os
import pytest
import httpx

BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:8001")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def http_client(base_url):
    with httpx.Client(base_url=base_url, timeout=15.0) as c:
        yield c


def _login(client: httpx.Client, username: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    r.raise_for_status()
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="session")
def owner_token(http_client):
    return _login(http_client, os.environ.get("TEST_OWNER_USERNAME", "Owner_homeme"), os.environ.get("TEST_OWNER_PASSWORD", "Dalia1234@"))


@pytest.fixture(scope="session")
def admin_token(http_client):
    return _login(http_client, os.environ.get("TEST_ADMIN_USERNAME", "dalia"), os.environ.get("TEST_ADMIN_PASSWORD", "Dalia1234@"))


@pytest.fixture
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
