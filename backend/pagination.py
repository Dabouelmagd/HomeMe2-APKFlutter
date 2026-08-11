"""
Server-side pagination utility for HomeMe API
Usage:
    from pagination import paginate
    
    result = await paginate(
        collection=db.users,
        query={"compound_id": cid},
        page=page,
        limit=limit,
        sort_field="created_at",
        sort_dir=-1,
        projection={"_id": 0}
    )
    return result  # { items, total, page, limit, pages }
"""
from math import ceil


async def paginate(
    collection,
    query: dict = None,
    page: int = 1,
    limit: int = 50,
    sort_field: str = "created_at",
    sort_dir: int = -1,
    projection: dict = None,
) -> dict:
    if query is None:
        query = {}
    
    # Clamp values
    page = max(1, page)
    limit = max(1, min(200, limit))  # max 200 per page
    skip = (page - 1) * limit

    total = await collection.count_documents(query)
    
    cursor = collection.find(query, projection or {"_id": 0})
    cursor = cursor.sort(sort_field, sort_dir)
    cursor = cursor.skip(skip).limit(limit)
    
    items = await cursor.to_list(limit)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": ceil(total / limit) if total > 0 else 1,
        "has_next": page * limit < total,
        "has_prev": page > 1,
    }
