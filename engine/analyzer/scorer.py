"""
상품 소싱 점수 계산 엔진

각 상품에 대해 아래 4가지 점수를 계산해 최종 추천 점수를 산출합니다.
  - trend_score   : DataLab 검색 트렌드 (급상승 키워드 매칭)
  - season_score  : 현재 시즌 적합성
  - margin_score  : 예상 마진율
  - channel_fit   : 채널 카테고리/키워드 적합성
"""

from datetime import datetime
from pathlib import Path

import pandas as pd
import yaml


CONFIG_DIR = Path(__file__).parent.parent / "config"


class ProductScorer:
    """상품 점수 계산기"""

    def __init__(self):
        self.season_cfg = self._load_yaml("season.yaml")
        self.channels_cfg = self._load_yaml("channels.yaml")
        self.current_season = self._detect_season()
        self.weights = self.season_cfg.get("scoring_weights", {
            "trend_score": 0.35,
            "season_score": 0.20,
            "margin_score": 0.25,
            "channel_fit": 0.20,
        })

    # ── 외부 인터페이스 ───────────────────────────────────────────────────────

    def score_products(
        self,
        products_df: pd.DataFrame,
        trend_summary: dict[str, dict],
        channel: dict,
    ) -> pd.DataFrame:
        """
        상품 목록에 점수를 매겨 정렬된 DataFrame 반환

        Args:
            products_df: 셀러라이프 상품 데이터
            trend_summary: DataLabFetcher.summarize_trends() 결과
            channel: channels.yaml의 채널 설정 dict

        Returns:
            점수 컬럼이 추가된 DataFrame (total_score 내림차순 정렬)
        """
        if products_df.empty:
            return products_df

        df = products_df.copy()

        df["trend_score"] = df.apply(
            lambda r: self._calc_trend_score(r, trend_summary), axis=1
        )
        df["season_score"] = df.apply(
            lambda r: self._calc_season_score(r), axis=1
        )
        df["margin_score"] = df.apply(
            lambda r: self._calc_margin_score(r, channel), axis=1
        )
        df["channel_fit"] = df.apply(
            lambda r: self._calc_channel_fit(r, channel), axis=1
        )
        df["total_score"] = df.apply(
            lambda r: self._calc_total(r), axis=1
        )
        df["grade"] = df["total_score"].apply(self._score_to_grade)
        df["recommendation"] = df.apply(
            lambda r: self._build_recommendation_text(r, trend_summary), axis=1
        )

        return df.sort_values("total_score", ascending=False).reset_index(drop=True)

    # ── 점수 계산 메서드 ──────────────────────────────────────────────────────

    def _calc_trend_score(self, row: pd.Series, trend_summary: dict) -> float:
        """트렌드 점수 (0~100): 키워드 DataLab 순위 기반"""
        keyword = row.get("search_keyword", "")
        name = row.get("name", "")

        best_score = 0.0
        for kw, data in trend_summary.items():
            # 검색 키워드 일치
            if kw == keyword or kw in name or keyword in kw:
                score = data.get("score", 0)
                direction_bonus = {
                    "급상승": 15,
                    "상승": 8,
                    "유지": 0,
                    "하락": -10,
                }.get(data.get("trend_direction", "유지"), 0)
                best_score = max(best_score, min(100, score + direction_bonus))

        return round(best_score, 2)

    def _calc_season_score(self, row: pd.Series) -> float:
        """시즌 점수 (0~100): 현재 시즌 키워드 매칭"""
        name = (row.get("name", "") + " " + row.get("search_keyword", "")).lower()

        season = self.season_cfg.get("seasons", {}).get(self.current_season, {})
        boost_keywords = season.get("boost_keywords", [])
        penalty_keywords = season.get("penalty_keywords", [])
        evergreen = self.season_cfg.get("evergreen_keywords", [])

        base_score = 50.0  # 기본 50점

        for item in boost_keywords:
            if item["keyword"] in name:
                base_score = min(100, base_score * item["boost"])

        for item in penalty_keywords:
            if item["keyword"] in name:
                base_score = max(0, base_score * item.get("penalty", 0.7))

        for item in evergreen:
            if item["keyword"] in name:
                base_score = min(100, base_score * item.get("boost", 1.1))

        return round(base_score, 2)

    def _calc_margin_score(self, row: pd.Series, channel: dict) -> float:
        """마진 점수 (0~100): 목표 마진 대비 실제 마진율"""
        margin_rate = row.get("margin_rate", 0)
        target = channel.get("margin_target", 0.30) * 100  # % 단위로 변환

        if margin_rate <= 0:
            return 0.0

        # 목표 마진 달성 비율로 점수 계산 (최대 100점)
        ratio = margin_rate / target
        if ratio >= 1.5:
            score = 100.0
        elif ratio >= 1.0:
            score = 70 + (ratio - 1.0) * 60  # 70~100
        elif ratio >= 0.7:
            score = 40 + (ratio - 0.7) * 100  # 40~70
        else:
            score = ratio / 0.7 * 40  # 0~40

        return round(min(100, score), 2)

    def _calc_channel_fit(self, row: pd.Series, channel: dict) -> float:
        """채널 적합성 점수 (0~100): 채널 키워드와의 매칭"""
        name = (row.get("name", "") + " " + row.get("search_keyword", "")).lower()
        channel_keywords = [kw.lower() for kw in channel.get("keywords", [])]

        matched = sum(1 for kw in channel_keywords if kw in name)
        if not channel_keywords:
            return 50.0

        # 매칭 비율 + 가격대 적합성
        keyword_score = (matched / len(channel_keywords)) * 70

        price_range = channel.get("target_price_range", [0, 999999])
        retail_price = row.get("retail_price", 0)
        if price_range[0] <= retail_price <= price_range[1]:
            price_score = 30.0
        elif retail_price < price_range[0]:
            price_score = max(0, 30 - (price_range[0] - retail_price) / price_range[0] * 30)
        else:
            price_score = max(0, 30 - (retail_price - price_range[1]) / price_range[1] * 30)

        return round(keyword_score + price_score, 2)

    def _calc_total(self, row: pd.Series) -> float:
        """가중 합산 최종 점수"""
        w = self.weights
        total = (
            row.get("trend_score", 0) * w.get("trend_score", 0.35)
            + row.get("season_score", 0) * w.get("season_score", 0.20)
            + row.get("margin_score", 0) * w.get("margin_score", 0.25)
            + row.get("channel_fit", 0) * w.get("channel_fit", 0.20)
        )
        return round(total, 2)

    # ── 등급 및 텍스트 ────────────────────────────────────────────────────────

    @staticmethod
    def _score_to_grade(score: float) -> str:
        if score >= 80:
            return "S"
        elif score >= 65:
            return "A"
        elif score >= 50:
            return "B"
        elif score >= 35:
            return "C"
        else:
            return "D"

    def _build_recommendation_text(
        self, row: pd.Series, trend_summary: dict
    ) -> str:
        """추천 사유 텍스트 생성"""
        reasons = []
        kw = row.get("search_keyword", "")

        if row.get("trend_score", 0) >= 70:
            direction = trend_summary.get(kw, {}).get("trend_direction", "")
            reasons.append(f"검색 트렌드 {direction}" if direction else "검색 트렌드 높음")

        if row.get("season_score", 0) >= 70:
            reasons.append(f"{self.season_cfg.get('seasons', {}).get(self.current_season, {}).get('label', '')} 시즌 적합")

        if row.get("margin_score", 0) >= 70:
            margin = row.get("margin_rate", 0)
            reasons.append(f"마진율 양호 ({margin:.1f}%)")

        if row.get("channel_fit", 0) >= 70:
            reasons.append("채널 타겟 적합")

        return " / ".join(reasons) if reasons else "기본 추천"

    # ── 유틸 ──────────────────────────────────────────────────────────────────

    def _detect_season(self) -> str:
        month = datetime.today().month
        for season_name, season_data in self.season_cfg.get("seasons", {}).items():
            if month in season_data.get("months", []):
                return season_name
        return "spring"

    def _load_yaml(self, filename: str) -> dict:
        path = CONFIG_DIR / filename
        if not path.exists():
            return {}
        with open(path, encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def get_channel_config(self, name: str) -> dict | None:
        for ch in self.get_all_channels():
            if ch.get("name") == name:
                return ch
        return None

    def get_all_channels(self) -> list[dict]:
        """channels.yaml을 파싱해 정규화된 채널 dict 목록 반환.

        구 형식 (channels: list with id/keywords/...) 과
        신 형식 (채널명 key + 인구통계 dict) 모두 지원.
        """
        raw = self.channels_cfg

        # ── 구 형식: channels 키 아래 리스트 ──────────────────────────────
        if "channels" in raw and isinstance(raw["channels"], list):
            return raw["channels"]

        # ── 신 형식: 채널명이 최상위 키 ──────────────────────────────────
        _category_id_map = {
            "식품":        "50000016",
            "생활건강":    "50000167",
            "화장품/미용": "50000009",
            "완구/취미":   "50000062",
            "반려동물":    "50000191",
            "스포츠/레저": "50000075",
            "디지털/가전": "50000078",
            "패션/의류":   "50000070",
            "문구/사무":   "50000004",
        }

        channels = []
        for name, data in raw.items():
            if not isinstance(data, dict):
                continue
            cats = data.get("categories", [])
            naver_id = _category_id_map.get(cats[0], "50000167") if cats else "50000167"
            keywords = data.get("interests", []) + cats

            channels.append({
                "id":                 name,
                "name":               name,
                "naver_category_id":  naver_id,
                "keywords":           keywords,
                "target_price_range": [5000, 100000],
                "margin_target":      0.35,
                "weight":             1.0,
                **data,  # subscriber, age, gender 등 원본 필드 보존
            })
        return channels
