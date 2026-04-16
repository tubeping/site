"""
YouTube Data API v3 — 채널 자동 분석

채널 URL 또는 이름을 입력하면:
  1. 채널 기본 정보 (구독자, 총조회수, 영상수, 개설일)
  2. 최신 영상 N개 (제목, 조회수, 좋아요, 댓글수, 게시일)
  3. 인기 영상의 댓글 상위 M개
를 수집합니다.
"""

import os
import re
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import requests


class YouTubeFetcher:
    """YouTube Data API v3 채널 분석기"""

    BASE_URL = "https://www.googleapis.com/youtube/v3"

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("YOUTUBE_API_KEY", "")

    # ── 채널 조회 ────────────────────────────────────────────────────────

    def resolve_channel(self, query: str) -> dict | None:
        """
        채널 URL, 핸들(@), 채널ID, 또는 채널명으로 채널 정보 조회

        지원 형식:
          - https://www.youtube.com/@handle
          - https://www.youtube.com/channel/UCxxxxxx
          - https://www.youtube.com/c/ChannelName
          - @handle
          - 채널명 (검색)
        """
        query = query.strip()

        # @handle 형식
        handle = self._extract_handle(query)
        if handle:
            return self._get_channel_by_handle(handle)

        # channel ID 형식
        channel_id = self._extract_channel_id(query)
        if channel_id:
            return self._get_channel_by_id(channel_id)

        # /c/이름 또는 /user/이름
        custom_name = self._extract_custom_name(query)
        if custom_name:
            result = self._search_channel(custom_name)
            if result:
                return result

        # 그 외: 검색
        return self._search_channel(query)

    def _extract_handle(self, query: str) -> str | None:
        """URL 또는 텍스트에서 @handle 추출"""
        # https://youtube.com/@handle
        m = re.search(r"youtube\.com/@([\w.-]+)", query)
        if m:
            return m.group(1)
        # @handle 직접 입력
        m = re.match(r"^@([\w.-]+)$", query)
        if m:
            return m.group(1)
        return None

    def _extract_channel_id(self, query: str) -> str | None:
        """URL에서 channel ID 추출"""
        m = re.search(r"youtube\.com/channel/(UC[\w-]{22})", query)
        if m:
            return m.group(1)
        # UC로 시작하는 24자 ID 직접 입력
        if re.match(r"^UC[\w-]{22}$", query):
            return query
        return None

    def _extract_custom_name(self, query: str) -> str | None:
        """/c/Name 또는 /user/Name 추출"""
        m = re.search(r"youtube\.com/(?:c|user)/([\w.-]+)", query)
        return m.group(1) if m else None

    def _get_channel_by_handle(self, handle: str) -> dict | None:
        """@handle로 채널 조회"""
        resp = self._api_get("channels", {
            "part": "snippet,statistics,contentDetails",
            "forHandle": handle,
        })
        items = resp.get("items", [])
        return self._parse_channel(items[0]) if items else self._search_channel(handle)

    def _get_channel_by_id(self, channel_id: str) -> dict | None:
        """채널 ID로 조회"""
        resp = self._api_get("channels", {
            "part": "snippet,statistics,contentDetails",
            "id": channel_id,
        })
        items = resp.get("items", [])
        return self._parse_channel(items[0]) if items else None

    def _search_channel(self, query: str) -> dict | None:
        """채널명으로 검색"""
        resp = self._api_get("search", {
            "part": "snippet",
            "q": query,
            "type": "channel",
            "maxResults": 1,
        })
        items = resp.get("items", [])
        if not items:
            return None

        channel_id = items[0]["snippet"]["channelId"]
        return self._get_channel_by_id(channel_id)

    def _parse_channel(self, item: dict) -> dict:
        """API 응답을 정규화된 채널 dict로 변환"""
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        content = item.get("contentDetails", {})

        return {
            "channel_id": item.get("id", ""),
            "name": snippet.get("title", ""),
            "description": snippet.get("description", "")[:500],
            "custom_url": snippet.get("customUrl", ""),
            "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
            "country": snippet.get("country", ""),
            "published_at": snippet.get("publishedAt", ""),
            "subscriber": int(stats.get("subscriberCount", 0)),
            "total_views": int(stats.get("viewCount", 0)),
            "video_count": int(stats.get("videoCount", 0)),
            "uploads_playlist": content.get("relatedPlaylists", {}).get("uploads", ""),
        }

    # ── 최신 영상 조회 ───────────────────────────────────────────────────

    def get_recent_videos(self, channel_id: str, max_results: int = 30) -> list[dict]:
        """채널의 최신 영상 목록 조회"""
        # 1. 업로드 재생목록 ID 가져오기
        ch = self._get_channel_by_id(channel_id)
        if not ch:
            return []

        playlist_id = ch.get("uploads_playlist", "")
        if not playlist_id:
            return []

        # 2. 재생목록에서 영상 ID 수집
        video_ids = []
        page_token = None
        while len(video_ids) < max_results:
            params = {
                "part": "contentDetails",
                "playlistId": playlist_id,
                "maxResults": min(50, max_results - len(video_ids)),
            }
            if page_token:
                params["pageToken"] = page_token

            resp = self._api_get("playlistItems", params)
            for item in resp.get("items", []):
                vid = item.get("contentDetails", {}).get("videoId")
                if vid:
                    video_ids.append(vid)

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

        if not video_ids:
            return []

        # 3. 영상 상세 정보 조회 (50개씩 배치)
        videos = []
        for i in range(0, len(video_ids), 50):
            batch = video_ids[i:i+50]
            resp = self._api_get("videos", {
                "part": "snippet,statistics,contentDetails",
                "id": ",".join(batch),
            })
            for item in resp.get("items", []):
                videos.append(self._parse_video(item))

        return videos

    def _parse_video(self, item: dict) -> dict:
        """영상 API 응답 파싱"""
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})

        return {
            "video_id": item.get("id", ""),
            "title": snippet.get("title", ""),
            "description": snippet.get("description", "")[:300],
            "published_at": snippet.get("publishedAt", ""),
            "tags": snippet.get("tags", []),
            "category_id": snippet.get("categoryId", ""),
            "view_count": int(stats.get("viewCount", 0)),
            "like_count": int(stats.get("likeCount", 0)),
            "comment_count": int(stats.get("commentCount", 0)),
        }

    # ── 댓글 조회 ────────────────────────────────────────────────────────

    def get_video_comments(self, video_id: str, max_results: int = 50) -> list[dict]:
        """영상의 인기 댓글 조회"""
        resp = self._api_get("commentThreads", {
            "part": "snippet",
            "videoId": video_id,
            "order": "relevance",
            "maxResults": min(100, max_results),
            "textFormat": "plainText",
        })

        comments = []
        for item in resp.get("items", []):
            top = item.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
            comments.append({
                "text": top.get("textDisplay", ""),
                "like_count": top.get("likeCount", 0),
                "published_at": top.get("publishedAt", ""),
                "author": top.get("authorDisplayName", ""),
            })

        return comments

    def get_channel_comments(
        self, channel_id: str, video_count: int = 10, comments_per_video: int = 30
    ) -> list[dict]:
        """채널 최신 영상들의 댓글 일괄 수집"""
        videos = self.get_recent_videos(channel_id, max_results=video_count)
        all_comments = []

        for v in videos:
            if v["comment_count"] == 0:
                continue
            try:
                comments = self.get_video_comments(v["video_id"], max_results=comments_per_video)
                for c in comments:
                    c["video_title"] = v["title"]
                    c["video_id"] = v["video_id"]
                all_comments.extend(comments)
            except Exception:
                continue  # 댓글 비활성화된 영상 등

        return all_comments

    # ── 전체 분석 패키지 ─────────────────────────────────────────────────

    def analyze_channel(
        self,
        query: str,
        video_count: int = 20,
        comments_per_video: int = 30,
    ) -> dict | None:
        """
        채널 URL/이름 입력 → 전체 분석 데이터 패키지 반환

        Returns:
            {
                "channel": 채널 기본 정보,
                "videos": 최신 영상 리스트,
                "comments": 댓글 리스트,
                "stats": 통계 요약,
            }
        """
        if not self.api_key:
            return None

        channel = self.resolve_channel(query)
        if not channel:
            return None

        videos = self.get_recent_videos(channel["channel_id"], max_results=video_count)

        comments = self.get_channel_comments(
            channel["channel_id"],
            video_count=min(10, len(videos)),
            comments_per_video=comments_per_video,
        )

        # 기본 통계
        if videos:
            avg_views = sum(v["view_count"] for v in videos) / len(videos)
            avg_likes = sum(v["like_count"] for v in videos) / len(videos)
            avg_comments = sum(v["comment_count"] for v in videos) / len(videos)
            top_video = max(videos, key=lambda v: v["view_count"])
        else:
            avg_views = avg_likes = avg_comments = 0
            top_video = None

        stats = {
            "video_count_analyzed": len(videos),
            "comment_count_collected": len(comments),
            "avg_views": round(avg_views),
            "avg_likes": round(avg_likes),
            "avg_comments": round(avg_comments),
            "engagement_rate": round(
                (avg_likes + avg_comments) / max(avg_views, 1) * 100, 2
            ),
            "top_video": top_video,
        }

        return {
            "channel": channel,
            "videos": videos,
            "comments": comments,
            "stats": stats,
        }

    # ── API 헬퍼 ─────────────────────────────────────────────────────────

    def _api_get(self, endpoint: str, params: dict) -> dict:
        """YouTube API GET 요청"""
        params["key"] = self.api_key
        resp = requests.get(
            f"{self.BASE_URL}/{endpoint}",
            params=params,
            timeout=15,
        )
        if resp.status_code == 200:
            return resp.json()

        error = resp.json().get("error", {})
        msg = error.get("message", resp.text[:200])
        raise Exception(f"YouTube API 오류 ({resp.status_code}): {msg}")
