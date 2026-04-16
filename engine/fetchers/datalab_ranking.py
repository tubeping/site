"""
네이버 데이터랩 — 연령/성별별 카테고리 인기검색어 수집

카테고리 + 연령 + 성별 조합으로 인기검색어 TOP 500을 가져옵니다.
채널 시청자 인구통계와 매칭해 추천 점수 산출에 사용합니다.
"""

import os
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests
import pandas as pd
import yaml

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

CONFIG_DIR = Path(__file__).parent.parent / "config"
RANK_URL = "https://datalab.naver.com/shoppingInsight/getCategoryKeywordRank.naver"

# 연령 코드
AGE_CODES = {
    "10대": "10",
    "20대": "20",
    "30대": "30",
    "40대": "40",
    "50대": "50",
    "60대이상": "60",
}

# 성별 코드
GENDER_CODES = {
    "여성": "f",
    "남성": "m",
}


class DataLabRanking:
    """네이버 데이터랩 연령/성별별 인기검색어 수집기"""

    def __init__(self, cookies: str = None):
        self.cookies = cookies or os.getenv("DATALAB_COOKIES", "")
        self.categories = self._load_categories()
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://datalab.naver.com/shoppingInsight/sCategory.naver",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
        })
        if self.cookies:
            self.session.headers["Cookie"] = self.cookies

    # ── 핵심: 연령별 인기검색어 조회 ─────────────────────────────────────

    def get_keyword_rank(
        self,
        category_id: str,
        age: str = "",
        gender: str = "",
        start_date: str = None,
        end_date: str = None,
        max_keywords: int = 500,
    ) -> list[dict]:
        """
        카테고리 + 연령 + 성별 인기검색어 조회

        Args:
            category_id: 데이터랩 카테고리 ID (예: "50000006")
            age: 연령 코드 ("10","20","30","40","50","60" 또는 빈값=전체)
            gender: "f"(여성), "m"(남성), ""(전체)
            start_date: 시작일 YYYY-MM-DD (기본: 1개월 전)
            end_date: 종료일 YYYY-MM-DD (기본: 오늘)
            max_keywords: 최대 키워드 수 (최대 500)

        Returns:
            [{"rank": 1, "keyword": "오메가3"}, ...]
        """
        if not self.cookies:
            return []

        if end_date is None:
            end_date = datetime.today().strftime("%Y-%m-%d")
        if start_date is None:
            start_date = (datetime.today() - timedelta(days=30)).strftime("%Y-%m-%d")

        all_ranks = []
        per_page = 20
        pages = (max_keywords + per_page - 1) // per_page

        for page in range(1, pages + 1):
            params = {
                "cid": category_id,
                "timeUnit": "date",
                "startDate": start_date,
                "endDate": end_date,
                "age": age,
                "gender": gender,
                "device": "",
                "page": str(page),
                "count": str(per_page),
            }

            try:
                resp = self.session.post(RANK_URL, data=params, timeout=15)
                if resp.status_code != 200:
                    break
                data = resp.json()
                ranks = data.get("ranks", [])
                if not ranks:
                    break
                all_ranks.extend(ranks)
                time.sleep(0.3)
            except Exception:
                break

        return all_ranks[:max_keywords]

    # ── 채널 시청자 매칭용: 가중 인기검색어 ──────────────────────────────

    def get_audience_weighted_keywords(
        self,
        channel_config: dict,
        category_ids: list[str] = None,
        max_keywords: int = 100,
    ) -> pd.DataFrame:
        """
        채널 시청자 인구통계 × 데이터랩 인기검색어 = 가중 순위

        채널의 연령/성별 비율을 가중치로 사용해
        각 인구 세그먼트의 인기검색어를 합산합니다.

        Args:
            channel_config: 채널 설정 (age, gender 필드 필요)
            category_ids: 조회할 카테고리 ID 리스트 (None이면 auto_mapping 사용)
            max_keywords: 최종 결과 수

        Returns:
            DataFrame[keyword, weighted_score, rank, category, segments]
        """
        age_dist = channel_config.get("age", {})
        gender_dist = channel_config.get("gender", {})

        # 카테고리 자동 매핑
        if category_ids is None:
            category_ids = self._auto_map_categories(channel_config)

        if not category_ids:
            category_ids = ["50000006", "50000008"]  # 기본: 식품 + 생활/건강

        # 유효 연령 세그먼트 (비율 5% 이상)
        age_segments = []
        for age_label, pct in age_dist.items():
            code = self._normalize_age_code(age_label)
            if code and pct >= 5:
                age_segments.append((code, pct / 100))

        if not age_segments:
            age_segments = [("", 1.0)]  # 전체

        # 성별 가중치
        female_pct = gender_dist.get("여성", 50) / 100
        male_pct = gender_dist.get("남성", 50) / 100

        # 세그먼트별 인기검색어 수집 + 가중 합산
        keyword_scores = {}  # {keyword: {"score": float, "categories": set, "segments": list}}

        for cat_id in category_ids:
            cat_name = self._get_category_name(cat_id)

            for age_code, age_weight in age_segments:
                # 성별 분리 조회 (성별 편향이 큰 경우) 또는 통합
                if abs(female_pct - male_pct) > 0.2:
                    # 성별 분리
                    for gender_code, gender_weight in [("f", female_pct), ("m", male_pct)]:
                        if gender_weight < 0.15:
                            continue
                        ranks = self.get_keyword_rank(
                            cat_id, age=age_code, gender=gender_code, max_keywords=100
                        )
                        segment_label = f"{self._age_label(age_code)}/{self._gender_label(gender_code)}"
                        self._accumulate_scores(
                            keyword_scores, ranks, age_weight * gender_weight, cat_name, segment_label
                        )
                else:
                    # 성별 통합
                    ranks = self.get_keyword_rank(
                        cat_id, age=age_code, gender="", max_keywords=100
                    )
                    segment_label = self._age_label(age_code)
                    self._accumulate_scores(
                        keyword_scores, ranks, age_weight, cat_name, segment_label
                    )

        if not keyword_scores:
            return pd.DataFrame()

        # DataFrame 변환
        rows = []
        for kw, data in keyword_scores.items():
            rows.append({
                "keyword": kw,
                "weighted_score": round(data["score"], 2),
                "categories": ", ".join(sorted(data["categories"])),
                "segments": ", ".join(sorted(data["segments"])),
            })

        df = pd.DataFrame(rows)
        df = df.sort_values("weighted_score", ascending=False).reset_index(drop=True)
        df.insert(0, "rank", range(1, len(df) + 1))

        return df.head(max_keywords)

    # ── 내부 유틸 ────────────────────────────────────────────────────────

    def _accumulate_scores(
        self, scores: dict, ranks: list, weight: float, category: str, segment: str
    ):
        """인기검색어 순위를 가중 점수로 누적"""
        for item in ranks:
            kw = item["keyword"]
            # 순위 기반 점수: 1위=100, 2위=99, ... 100위=1
            rank_score = max(1, 101 - item["rank"])
            weighted = rank_score * weight

            if kw not in scores:
                scores[kw] = {"score": 0, "categories": set(), "segments": []}
            scores[kw]["score"] += weighted
            scores[kw]["categories"].add(category)
            if segment not in scores[kw]["segments"]:
                scores[kw]["segments"].append(segment)

    def _auto_map_categories(self, channel_config: dict) -> list[str]:
        """채널 관심사 → 데이터랩 카테고리 ID 자동 매핑"""
        mapping = self._load_auto_mapping()
        interests = channel_config.get("interests", []) + channel_config.get("keywords", [])
        interests = list(set(interests))

        matched_cats = set()
        for interest in interests:
            interest_lower = interest.lower()
            for key, cat_names in mapping.items():
                if key in interest_lower or interest_lower in key:
                    for cat_name in cat_names:
                        cat_id = self._get_category_id(cat_name)
                        if cat_id:
                            matched_cats.add(cat_id)

        return list(matched_cats)

    def _normalize_age_code(self, age_label: str) -> str:
        """연령 라벨 → 데이터랩 코드 변환"""
        # "50대" → "50", "55-64세" → "50", "60대이상" → "60"
        for label, code in AGE_CODES.items():
            if label in age_label:
                return code
        if "55" in age_label or "64" in age_label:
            return "50"
        if "65" in age_label:
            return "60"
        return ""

    def _age_label(self, code: str) -> str:
        for label, c in AGE_CODES.items():
            if c == code:
                return label
        return "전체"

    def _gender_label(self, code: str) -> str:
        return {"f": "여성", "m": "남성"}.get(code, "전체")

    def _get_category_name(self, cat_id: str) -> str:
        for name, data in self.categories.items():
            if data.get("id") == cat_id:
                return name
        return cat_id

    def _get_category_id(self, cat_name: str) -> str | None:
        data = self.categories.get(cat_name)
        if data:
            return data.get("id")
        # 부분 매칭
        for name, d in self.categories.items():
            if cat_name in name or name in cat_name:
                return d.get("id")
        return None

    def _load_categories(self) -> dict:
        path = CONFIG_DIR / "naver_categories.yaml"
        if not path.exists():
            return {}
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        return data.get("categories", {})

    def _load_auto_mapping(self) -> dict:
        path = CONFIG_DIR / "naver_categories.yaml"
        if not path.exists():
            return {}
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        return data.get("auto_mapping", {})
