"""Iter 146 — Feature #53: Auto-ban brute force IPs + email alert."""
import os
import sys
import time
import asyncio
from datetime import datetime, timezone, timedelta

import requests
import pytest

sys.path.insert(0, "/app/backend")
from database import init_db, get_db  # noqa: E402


def _read_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip()
    return ""


BASE_URL = _read_backend_url().rstrip("/")
API = f"{BASE_URL}/api"


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _hdr(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="module")
def db():
    init_db()
    return get_db()


@pytest.fixture(scope="module")
def owner_token():
    return _login({"username": "Owner_homeme", "password": "Dalia1234@"})


class TestAutoBan:
    def test_run_once_creates_ban_for_brute_ip(self, event_loop, db):
        async def go():
            from security_protector import _run_once, is_ip_banned

            # Clean slate
            await db.login_attempts.delete_many({"username": {"$regex": "^pytest_ab_"}})
            await db.banned_ips.delete_many({"ip": "192.0.2.66"})

            now = datetime.now(timezone.utc)
            # Seed 20 fresh failures from one IP within last hour
            docs = []
            for i in range(20):
                docs.append({
                    "username": f"pytest_ab_{i}",
                    "ip": "192.0.2.66",
                    "user_agent": "bot/1",
                    "success": False,
                    "created_at": (now - timedelta(minutes=i + 1)).isoformat(),
                })
            await db.login_attempts.insert_many(docs)

            stats = await _run_once()
            assert stats["new_bans"] >= 1, f"expected a ban: {stats}"

            # The IP must now be active in banned_ips
            doc = await db.banned_ips.find_one({"ip": "192.0.2.66", "active": True})
            assert doc is not None, "ban not recorded"
            assert doc["reason"] == "auto_ban_brute_force"
            assert doc["failed_attempts"] >= 20
            assert "expires_at" in doc

            # is_ip_banned helper agrees
            assert await is_ip_banned("192.0.2.66") is True

            # Idempotency: re-running sweep doesn't double-ban
            stats2 = await _run_once()
            assert stats2["new_bans"] == 0
            assert stats2["skipped_existing"] >= 1

        event_loop.run_until_complete(go())

    def test_run_once_below_threshold_no_ban(self, event_loop, db):
        async def go():
            from security_protector import _run_once

            await db.login_attempts.delete_many({"username": {"$regex": "^pytest_ab_small_"}})
            await db.banned_ips.delete_many({"ip": "192.0.2.77"})

            now = datetime.now(timezone.utc)
            # Only 5 failures — below 20 threshold
            for i in range(5):
                await db.login_attempts.insert_one({
                    "username": f"pytest_ab_small_{i}",
                    "ip": "192.0.2.77",
                    "user_agent": "bot/1",
                    "success": False,
                    "created_at": (now - timedelta(minutes=i + 1)).isoformat(),
                })

            await _run_once()
            doc = await db.banned_ips.find_one({"ip": "192.0.2.77", "active": True})
            assert doc is None, "IP should NOT be banned below threshold"

        event_loop.run_until_complete(go())


class TestBannedIpsApi:
    def test_owner_can_list_bans(self, owner_token):
        r = requests.get(
            f"{API}/super-admin/banned-ips", headers=_hdr(owner_token), timeout=15
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "active" in d and "recent_inactive" in d
        # The earlier sweep should have at least seeded one ban for 192.0.2.66
        ips = [x["ip"] for x in d["active"]]
        assert "192.0.2.66" in ips

    def test_owner_can_unban(self, owner_token):
        r = requests.delete(
            f"{API}/super-admin/banned-ips/192.0.2.66",
            headers=_hdr(owner_token), timeout=15,
        )
        assert r.status_code == 200, r.text
        # Subsequent list shouldn't include it as active
        r2 = requests.get(
            f"{API}/super-admin/banned-ips", headers=_hdr(owner_token), timeout=15,
        )
        ips_active = [x["ip"] for x in r2.json()["active"]]
        assert "192.0.2.66" not in ips_active

    def test_unban_nonexistent_returns_404(self, owner_token):
        r = requests.delete(
            f"{API}/super-admin/banned-ips/198.51.100.99",
            headers=_hdr(owner_token), timeout=15,
        )
        assert r.status_code == 404, r.text


class TestGlobalAlert:
    def test_alert_fires_above_global_threshold(self, event_loop, db):
        """If 50+ failed attempts/hour exist, an email alert row is logged."""
        async def go():
            from security_protector import _run_once

            await db.login_attempts.delete_many({"username": {"$regex": "^pytest_alert_"}})
            await db.security_alerts.delete_many({"kind": "global_brute_force"})

            now = datetime.now(timezone.utc)
            for i in range(55):
                await db.login_attempts.insert_one({
                    "username": f"pytest_alert_{i % 5}",
                    "ip": f"203.0.113.{i % 10}",
                    "user_agent": "bot/global",
                    "success": False,
                    "created_at": (now - timedelta(minutes=(i % 50) + 1)).isoformat(),
                })

            stats = await _run_once()
            assert stats.get("alert_sent") is True or stats.get("alert_sent") is False
            # A row must be logged regardless of SMTP success
            row = await db.security_alerts.find_one({"kind": "global_brute_force"})
            assert row is not None, "expected security_alerts row"
            assert row["failures_last_hour"] >= 50

            # Cooldown: a second run within the cooldown does NOT add another row
            count_before = await db.security_alerts.count_documents({"kind": "global_brute_force"})
            await _run_once()
            count_after = await db.security_alerts.count_documents({"kind": "global_brute_force"})
            assert count_after == count_before, "cooldown should suppress duplicate alerts"

        event_loop.run_until_complete(go())
