"""Direct DB tests for award_referrer_credit idempotency + apply-credit happy path.
This uses the backend's own MongoDB connection to seed and verify state.
"""
import asyncio
import os
import sys
import time
import requests

sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

from motor.motor_asyncio import AsyncIOMotorClient
from database import init_db
init_db()

BASE_URL = ""
with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"


def login(u, p):
    last = None
    for _ in range(4):
        try:
            r = requests.post(f"{API}/auth/login", json={"username": u, "password": p}, timeout=60)
            if r.status_code == 200:
                return r.json()["access_token"]
            last = r.text
        except Exception as e:
            last = str(e)
            time.sleep(3)
    raise AssertionError(f"login failed: {last}")


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    # Find testcompany2's company_id
    user = await db.users.find_one({"username": "testcompany2"}, {"_id": 0})
    cid = user["company_id"]
    print("testcompany2 company_id:", cid)

    # Find a referred company that doesn't yet have referral_reward_given
    refdoc = await db.company_referrals.find_one({"company_id": cid}, {"_id": 0})
    print("Referrer doc before:", {k: refdoc.get(k) for k in ("code", "total_signups", "successful_referrals", "pending_credit_days", "applied_credit_days", "referred_company_ids")})

    referred_ids = refdoc.get("referred_company_ids") or []
    candidate = None
    for rid in referred_ids:
        c = await db.companies.find_one({"id": rid}, {"_id": 0})
        if c and not c.get("referral_reward_given"):
            candidate = c
            break

    if not candidate:
        print("No unrewarded referred company found; creating one via auth.register")
        ts = int(time.time())
        username = f"awardtest_{ts}"
        rr = requests.post(f"{API}/auth/register", json={
            "username": username, "password": "AwardTest123!",
            "email": f"{username}@test.com", "full_name": f"Award Test {ts}",
            "role": "company_admin", "company_name": f"شركة المكافأة {ts}",
            "compound_id": "", "referral_code": refdoc["code"],
        }, timeout=45)
        assert rr.status_code in (200, 201), rr.text
        new_user = await db.users.find_one({"username": username}, {"_id": 0})
        candidate = await db.companies.find_one({"id": new_user["company_id"]}, {"_id": 0})
        print("Created referred company:", candidate.get("id"), "referred_by:", candidate.get("referred_by_company_id"))

    paid_id = candidate["id"]

    # Snapshot referrer state
    before = await db.company_referrals.find_one({"company_id": cid}, {"_id": 0})
    pending_before = before.get("pending_credit_days", 0)
    successful_before = before.get("successful_referrals", 0)

    # Call award_referrer_credit directly
    from routes.company_referrals import award_referrer_credit, apply_pending_credit  # noqa

    res1 = await award_referrer_credit(paid_id)
    print("award #1 returned:", res1)

    res2 = await award_referrer_credit(paid_id)
    print("award #2 (should be False - idempotent):", res2)

    after = await db.company_referrals.find_one({"company_id": cid}, {"_id": 0})
    pending_after = after.get("pending_credit_days", 0)
    successful_after = after.get("successful_referrals", 0)
    print(f"pending: {pending_before} -> {pending_after} (delta={pending_after-pending_before}, expected 30)")
    print(f"successful: {successful_before} -> {successful_after} (delta={successful_after-successful_before}, expected 1)")

    assert res1 is True, "first award should succeed"
    assert res2 is False, "second award must be idempotent"
    assert pending_after - pending_before == 30
    assert successful_after - successful_before == 1

    # Verify referred company marked
    marked = await db.companies.find_one({"id": paid_id}, {"_id": 0, "referral_reward_given": 1})
    assert marked.get("referral_reward_given") is True
    print("referral_reward_given marked True ✓")

    # Verify notification
    notif = await db.notifications.find_one(
        {"user_id": user["id"], "type": "referral_reward_earned"},
        sort=[("created_at", -1)],
    )
    assert notif, "expected reward notification"
    print("Notification created:", notif.get("title"))

    # Now test apply-credit endpoint via HTTP
    tok = login("testcompany2", "Company123!")
    r = requests.post(f"{API}/company-admin/referral/apply-credit",
                      headers={"Authorization": f"Bearer {tok}"}, timeout=45)
    print("apply-credit status:", r.status_code, "body:", r.text[:300])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("success") is True
    assert body.get("applied_days") == 30

    after_apply = await db.company_referrals.find_one({"company_id": cid}, {"_id": 0})
    print(f"after apply: pending={after_apply.get('pending_credit_days')}, applied={after_apply.get('applied_credit_days')}")
    assert after_apply.get("pending_credit_days") == pending_after - 30
    assert after_apply.get("applied_credit_days") == before.get("applied_credit_days", 0) + 30
    # credit_history should have a credit_applied entry at the end
    last_event = (after_apply.get("credit_history") or [])[-1]
    assert last_event.get("event") == "credit_applied"
    print("apply-credit verified, credit_history pushed ✓")

    print("\nALL DIRECT TESTS PASSED ✓")


if __name__ == "__main__":
    asyncio.run(main())
