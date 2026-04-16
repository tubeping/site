"""Instagram 해시태그 기반 공구 상품 수집기.

쿠키(data/gonggu/instagram_cookies.json)로 로그인 세션을 유지한 채
hashtag web_info API를 호출하여 게시물·유저·캡션을 수집한다.
"""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Iterator
from urllib.parse import quote

import requests

IG_APP_ID = "936619743392459"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
HASHTAG_URL = "https://www.instagram.com/api/v1/tags/web_info/?tag_name={tag}"
POST_URL = "https://www.instagram.com/p/{code}/"

PRICE_RE = re.compile(r"([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\s*원")
MANWON_RE = re.compile(r"([0-9]+(?:\.[0-9]+)?)\s*만\s*원")


@dataclass
class Post:
    url: str
    username: str
    caption: str
    likes: int
    product_name: str = ""
    price: int = 0
    brand: str = ""
    category: str = ""
    hashtag: str = ""
    matched_keywords: list[str] = field(default_factory=list)


def load_cookies(path: Path) -> dict[str, str]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {c["name"]: c["value"] for c in raw}


def make_headers(cookies: dict[str, str]) -> dict[str, str]:
    return {
        "User-Agent": UA,
        "x-ig-app-id": IG_APP_ID,
        "x-csrftoken": cookies.get("csrftoken", ""),
        "Accept": "application/json",
        "Referer": "https://www.instagram.com/",
    }


def iter_medias(sections: list[dict]) -> Iterator[dict]:
    for sec in sections or []:
        lc = sec.get("layout_content") or {}
        for m in lc.get("medias") or []:
            media = m.get("media")
            if media:
                yield media
        for fi in lc.get("fill_items") or []:
            media = fi.get("media")
            if media:
                yield media
        obt = lc.get("one_by_two_item") or {}
        clips = (obt.get("clips") or {}).get("items") or []
        for c in clips:
            media = c.get("media")
            if media:
                yield media


def extract_price(caption: str) -> int:
    best = 0
    for m in PRICE_RE.finditer(caption):
        val = int(m.group(1).replace(",", ""))
        if 500 <= val <= 10_000_000:
            best = max(best, val)
    for m in MANWON_RE.finditer(caption):
        val = int(float(m.group(1)) * 10_000)
        if 500 <= val <= 10_000_000:
            best = max(best, val)
    return best


def fetch_hashtag(session: requests.Session, headers: dict, tag: str) -> list[dict]:
    url = HASHTAG_URL.format(tag=quote(tag))
    r = session.get(url, headers=headers, timeout=20)
    if r.status_code != 200:
        print(f"  [{tag}] HTTP {r.status_code}")
        return []
    try:
        j = r.json()
    except ValueError:
        print(f"  [{tag}] invalid json")
        return []
    data = j.get("data") or {}
    medias: list[dict] = []
    for key in ("top", "recent"):
        sec = (data.get(key) or {}).get("sections") or []
        medias.extend(iter_medias(sec))
    total = data.get("media_count")
    print(f"  [{tag}] fetched {len(medias)} media (전체 {total})")
    return medias


def media_to_post(media: dict, tag: str, keywords: Iterable[str]) -> Post | None:
    code = media.get("code")
    if not code:
        return None
    user = media.get("user") or {}
    cap_obj = media.get("caption") or {}
    caption = cap_obj.get("text") or ""
    matched = [kw for kw in keywords if kw in caption]
    return Post(
        url=POST_URL.format(code=code),
        username=user.get("username") or "",
        caption=caption,
        likes=media.get("like_count") or 0,
        price=extract_price(caption),
        category="반려동물",
        hashtag=tag,
        matched_keywords=matched,
    )


def collect(
    keywords_for_filter: list[str],
    hashtags: list[str],
    cookies_path: Path,
    sleep: float = 2.0,
) -> list[Post]:
    cookies = load_cookies(cookies_path)
    session = requests.Session()
    session.cookies.update(cookies)
    headers = make_headers(cookies)

    seen: set[str] = set()
    posts: list[Post] = []
    for tag in hashtags:
        try:
            medias = fetch_hashtag(session, headers, tag)
        except requests.RequestException as e:
            print(f"  [{tag}] error: {e}")
            continue
        for m in medias:
            post = media_to_post(m, tag, keywords_for_filter)
            if not post or post.url in seen:
                continue
            seen.add(post.url)
            posts.append(post)
        time.sleep(sleep)
    return posts
