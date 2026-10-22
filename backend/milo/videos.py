"""How-to videos for exercises, from YouTube.

With YOUTUBE_API_KEY set, search.list returns real videos (embeddable,
safe search). The free key allows about 100 searches a day, so every
result is cached in SQLite and reused. Without a key, or when the quota is
used up, the UI still gets a YouTube search link.
"""
from __future__ import annotations

import html
import json
import logging
import urllib.parse
import urllib.request
from typing import Callable

from . import config

log = logging.getLogger("milo.videos")
SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


def search_link(query: str) -> str:
    return "https://www.youtube.com/results?" + urllib.parse.urlencode({"search_query": query})


def normalize(query: str) -> str:
    return " ".join(query.lower().split())[:120]


def _youtube_search(query: str, key: str, limit: int) -> list[dict]:
    params = urllib.parse.urlencode({
        "part": "snippet", "type": "video", "q": query, "maxResults": limit,
        "videoEmbeddable": "true", "safeSearch": "strict", "relevanceLanguage": "en", "key": key,
    })
    with urllib.request.urlopen(f"{SEARCH_URL}?{params}", timeout=8) as r:  # noqa: S310 (fixed https URL)
        data = json.load(r)
    out = []
    for item in data.get("items", []):
        vid = (item.get("id") or {}).get("videoId")
        sn = item.get("snippet") or {}
        if not vid:
            continue
        thumbs = sn.get("thumbnails") or {}
        thumb = (thumbs.get("medium") or thumbs.get("high") or thumbs.get("default") or {}).get("url", "")
        out.append({"id": vid, "title": html.unescape(sn.get("title", "")),
                    "channel": html.unescape(sn.get("channelTitle", "")), "thumbnail": thumb})
    return out


# Tests replace this to avoid the network.
fetcher: Callable[[str, str, int], list[dict]] = _youtube_search


def find_videos(store, query: str, limit: int = 3) -> dict:
    q = normalize(query)
    result = {"query": q, "search_url": search_link(q), "items": [], "source": "link"}
    if not q:
        return result
    cached = store.get_video_cache(q)
    if cached is not None:
        return {**result, "items": cached, "source": "youtube"}
    key = config.YOUTUBE_API_KEY
    if not key:
        return result
    try:
        items = fetcher(q, key, limit)
    except Exception as e:  # quota used up, network, bad key: fall back to the link
        log.warning("YouTube search failed for %r: %s", q, e)
        return result
    store.save_video_cache(q, items)
    return {**result, "items": items, "source": "youtube"}
