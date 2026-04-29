"""
Performance Budget Tracker

Tracks latency of every endpoint hit by the smoke-test runner over time, computes
per-endpoint baselines (p50 / p95 / mean), and detects regressions automatically.

Storage:
- perf_samples: {endpoint, ms, status_code, recorded_at, source}  — bounded ring (last 200/endpoint)
- perf_baselines: {endpoint, p50, p95, mean, sample_count, computed_at}
- perf_regressions: {endpoint, current_ms, p50, threshold_ms, detected_at, resolved_at}

Regression heuristic:
- threshold = max(p50 * 2, p95 + 100, 500)  — endpoint-specific
- streak >= 3 consecutive samples above threshold ⇒ regression
- streak < 3 ⇒ resolved (auto-clear)
"""
from __future__ import annotations

import logging
import statistics
from datetime import datetime, timezone
from typing import Iterable

from database import get_db

# Tunables (overridable via env in future)
SAMPLES_PER_ENDPOINT = 200
MIN_BASELINE_SAMPLES = 8
REGRESSION_STREAK = 3
ABSOLUTE_FLOOR_MS = 500.0  # Don't flag endpoints whose absolute latency is < 500ms even if 5× baseline


def _percentile(sorted_vals: list[float], p: float) -> float:
    if not sorted_vals:
        return 0.0
    if p <= 0:
        return sorted_vals[0]
    if p >= 100:
        return sorted_vals[-1]
    k = (len(sorted_vals) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


async def record_samples(samples: Iterable[dict], source: str = "smoke_test"):
    """Append latency samples (one per endpoint per run). Trims oldest to keep ring bounded."""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for s in samples:
        ep = s.get("endpoint") or s.get("name")
        ms = s.get("ms")
        if not ep or ms is None:
            continue
        docs.append({
            "endpoint": ep,
            "ms": float(ms),
            "status_code": s.get("status_code"),
            "passed": bool(s.get("passed", True)),
            "recorded_at": now,
            "source": source,
        })
    if not docs:
        return 0
    await db.perf_samples.insert_many(docs)
    # Trim per-endpoint ring (best-effort)
    for ep in {d["endpoint"] for d in docs}:
        try:
            count = await db.perf_samples.count_documents({"endpoint": ep})
            if count > SAMPLES_PER_ENDPOINT:
                excess = count - SAMPLES_PER_ENDPOINT
                cursor = db.perf_samples.find({"endpoint": ep}, {"_id": 1}).sort("recorded_at", 1).limit(excess)
                ids = [d["_id"] async for d in cursor]
                if ids:
                    await db.perf_samples.delete_many({"_id": {"$in": ids}})
        except Exception as e:
            logging.warning(f"perf_samples trim for {ep} failed: {e}")
    return len(docs)


async def recompute_baselines() -> dict:
    """Recompute p50/p95/mean per endpoint from perf_samples. Returns counts."""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    pipeline = [
        {"$match": {"passed": True}},
        {"$group": {
            "_id": "$endpoint",
            "samples": {"$push": "$ms"},
            "count": {"$sum": 1},
        }},
    ]
    updated = 0
    skipped = 0
    async for doc in db.perf_samples.aggregate(pipeline):
        ep = doc["_id"]
        samples = sorted(s for s in doc["samples"] if s is not None)
        if len(samples) < MIN_BASELINE_SAMPLES:
            skipped += 1
            continue
        baseline = {
            "endpoint": ep,
            "p50": round(_percentile(samples, 50), 1),
            "p95": round(_percentile(samples, 95), 1),
            "mean": round(statistics.mean(samples), 1),
            "min": round(samples[0], 1),
            "max": round(samples[-1], 1),
            "sample_count": len(samples),
            "computed_at": now,
        }
        await db.perf_baselines.update_one(
            {"endpoint": ep},
            {"$set": baseline},
            upsert=True,
        )
        updated += 1
    return {"updated": updated, "skipped_insufficient": skipped, "computed_at": now}


def _threshold(p50: float, p95: float) -> float:
    return max(p50 * 2.0, p95 + 100.0, ABSOLUTE_FLOOR_MS)


async def detect_regressions() -> dict:
    """For each endpoint with a baseline, look at the last `REGRESSION_STREAK` samples;
    if all of them exceed the threshold, mark as regression. Otherwise auto-resolve.
    Returns {new_regressions, resolved, currently_regressed}.
    """
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    new_regs, resolved, current = [], [], []

    async for bl in db.perf_baselines.find({}, {"_id": 0}):
        ep = bl["endpoint"]
        threshold = _threshold(bl["p50"], bl["p95"])
        # Last N samples
        samples = []
        async for s in db.perf_samples.find({"endpoint": ep}, {"_id": 0, "ms": 1, "recorded_at": 1, "passed": 1}).sort("recorded_at", -1).limit(REGRESSION_STREAK):
            samples.append(s)
        if len(samples) < REGRESSION_STREAK:
            continue
        breach = all((s.get("ms") or 0) > threshold and s.get("passed", True) for s in samples)
        latest_ms = samples[0]["ms"]

        existing = await db.perf_regressions.find_one({"endpoint": ep, "resolved_at": None})

        if breach and not existing:
            doc = {
                "endpoint": ep,
                "current_ms": latest_ms,
                "p50": bl["p50"],
                "p95": bl["p95"],
                "threshold_ms": round(threshold, 1),
                "detected_at": now,
                "resolved_at": None,
            }
            await db.perf_regressions.insert_one(dict(doc))
            new_regs.append(doc)
            current.append(doc)
        elif breach and existing:
            existing.pop("_id", None)
            existing["current_ms"] = latest_ms
            existing["threshold_ms"] = round(threshold, 1)
            await db.perf_regressions.update_one(
                {"endpoint": ep, "resolved_at": None},
                {"$set": {"current_ms": latest_ms, "threshold_ms": round(threshold, 1)}},
            )
            current.append(existing)
        elif not breach and existing:
            await db.perf_regressions.update_one(
                {"endpoint": ep, "resolved_at": None},
                {"$set": {"resolved_at": now}},
            )
            existing.pop("_id", None)
            resolved.append(existing)

    return {
        "new_regressions": new_regs,
        "resolved": resolved,
        "currently_regressed": current,
    }


async def get_overview(limit: int = 30) -> dict:
    """Return baseline + latest sample for the top `limit` slowest endpoints."""
    db = get_db()
    out = []
    async for bl in db.perf_baselines.find({}, {"_id": 0}).sort("p95", -1).limit(limit):
        ep = bl["endpoint"]
        latest = await db.perf_samples.find_one({"endpoint": ep}, {"_id": 0, "ms": 1, "recorded_at": 1, "passed": 1}, sort=[("recorded_at", -1)])
        # Last 20 samples for sparkline
        spark = []
        async for s in db.perf_samples.find({"endpoint": ep}, {"_id": 0, "ms": 1}).sort("recorded_at", -1).limit(20):
            spark.append(round(s["ms"], 1))
        spark.reverse()
        threshold = _threshold(bl["p50"], bl["p95"])
        out.append({
            **bl,
            "threshold_ms": round(threshold, 1),
            "latest_ms": (latest or {}).get("ms"),
            "latest_at": (latest or {}).get("recorded_at"),
            "sparkline": spark,
            "regressed": bool(latest and latest.get("ms", 0) > threshold and latest.get("passed", True)),
        })
    return {"endpoints": out, "count": len(out)}


async def get_active_regressions() -> dict:
    db = get_db()
    out = []
    async for r in db.perf_regressions.find({"resolved_at": None}, {"_id": 0}).sort("detected_at", -1):
        out.append(r)
    return {"regressions": out, "count": len(out)}
