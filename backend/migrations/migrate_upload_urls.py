"""One-time migration: rewrite legacy /uploads/* URLs in DB to /api/files/* so they
work through the K8s ingress. Idempotent — safe to re-run.
"""
import asyncio
import re
from database import init_db, get_db


def _rewrite(value: str | None) -> str | None:
    if not isinstance(value, str):
        return value
    if value.startswith("/uploads/"):
        return "/api/files/" + value[len("/uploads/"):]
    return value


async def main():
    init_db()
    db = get_db()
    total_rewrites = 0

    rules = [
        ("users", ["profile_picture_url", "profile_image", "avatar_url"]),
        ("family_members", ["profile_image", "profile_picture_url"]),
        ("internal_ads", ["image_url", "video_url", "media_url"]),
        ("ad_campaigns", ["image_url"]),
        ("compounds", ["logo_url", "branding.logo_url"]),
        ("maintenance_requests", ["image_url"]),
        ("complaints", ["image_url"]),
        ("messages", ["file_url", "thumbnail_url"]),
        ("voice_messages", ["file_url"]),
        ("gallery", ["url", "thumbnail_url"]),
    ]

    for coll, fields in rules:
        async for doc in db[coll].find({}, {"_id": 1}):
            full = await db[coll].find_one({"_id": doc["_id"]})
            if not full:
                continue
            updates = {}
            for f in fields:
                # Support nested paths like 'branding.logo_url'
                if "." in f:
                    parts = f.split(".")
                    cur = full
                    for p in parts:
                        if not isinstance(cur, dict):
                            cur = None
                            break
                        cur = cur.get(p)
                    new = _rewrite(cur)
                    if new != cur and isinstance(cur, str):
                        updates[f] = new
                else:
                    cur = full.get(f)
                    if isinstance(cur, str):
                        new = _rewrite(cur)
                        if new != cur:
                            updates[f] = new
                    elif isinstance(cur, list):
                        new_list = [_rewrite(x) if isinstance(x, str) else x for x in cur]
                        if new_list != cur:
                            updates[f] = new_list
            if updates:
                await db[coll].update_one({"_id": doc["_id"]}, {"$set": updates})
                total_rewrites += 1
        print(f"  collection {coll}: scanned")

    print(f"DONE — documents updated: {total_rewrites}")


if __name__ == "__main__":
    asyncio.run(main())
