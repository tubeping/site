"""
셀러라이프 카테고리 소싱 엑셀 로더

data/sellerlife/ 에 저장된 엑셀 파일을 읽어
키워드별 검색량/경쟁률/가격 데이터를 제공합니다.
"""

from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).parent.parent / "data" / "sellerlife"

# 컬럼명 정규화 매핑 (줄바꿈 제거 + 간소화)
COLUMN_MAP = {
    "키워드": "keyword",
    "카테고리": "category",
    "경쟁률": "competition",
    "최근 1개월 검색량": "search_volume_1m",
    "예상 1개월 검색량": "search_volume_1m_est",
    "예상1개월 검색량 상승률": "search_trend_1m",
    "최근 3개월 검색량": "search_volume_3m",
    "예상 3개월 검색량": "search_volume_3m_est",
    "예상3개월 검색량 상승률": "search_trend_3m",
    "작년 검색량": "search_volume_year",
    "계절성": "seasonality",
    "계절성 월": "season_months",
    "네이버 상품수": "naver_products",
    "네이버 해외 상품수": "naver_overseas",
    "네이버 평균가": "naver_avg_price",
    "네이버 경쟁강도": "naver_competition",
    "쿠팡 평균가": "coupang_avg_price",
    "쿠팡 총리뷰수": "coupang_reviews_total",
    "쿠팡 최대리뷰수": "coupang_reviews_max",
    "쿠팡 평균리뷰수": "coupang_reviews_avg",
    "신규진입 키워드": "is_new",
    "브랜드 키워드": "is_brand",
    "쇼핑성 키워드": "is_shopping",
}


class SellerLifeExcel:
    """셀러라이프 엑셀 DB"""

    def __init__(self):
        self.data = {}  # {카테고리명: DataFrame}
        self._load_all()

    def _load_all(self):
        """data/sellerlife/ 의 모든 엑셀 파일 로드"""
        if not DATA_DIR.exists():
            return

        for f in DATA_DIR.glob("*.xlsx"):
            try:
                df = pd.read_excel(f)
                df.columns = [c.replace("\n", " ") for c in df.columns]

                # 컬럼 정규화 (완전 일치 우선, 부분 일치 fallback)
                rename = {}
                for orig, norm in COLUMN_MAP.items():
                    # 완전 일치 먼저
                    if orig in df.columns:
                        rename[orig] = norm
                        continue
                    # 부분 일치 fallback
                    for col in df.columns:
                        if orig in col and col not in rename:
                            rename[col] = norm
                            break
                df = df.rename(columns=rename)

                # 카테고리명 추출 (파일명에서)
                cat_name = f.stem.split("_")[0]  # "식품_20260324..." → "식품"
                self.data[cat_name] = df

            except Exception:
                continue

    def get_categories(self) -> list[str]:
        """사용 가능한 카테고리 목록"""
        return list(self.data.keys())

    def get_keywords(self, category: str) -> pd.DataFrame:
        """카테고리별 전체 키워드 데이터"""
        return self.data.get(category, pd.DataFrame())

    def search_keywords(
        self,
        interests: list[str],
        categories: list[str] = None,
        min_search_volume: int = 10000,
        max_competition: float = 10.0,
    ) -> pd.DataFrame:
        """
        관심사/키워드로 매칭되는 상품 키워드 검색

        Args:
            interests: 채널 관심사 키워드 리스트
            categories: 셀러라이프 카테고리 필터 (None이면 전체)
            min_search_volume: 최소 월간 검색량
            max_competition: 최대 경쟁률

        Returns:
            매칭된 키워드 DataFrame (점수 컬럼 포함)
        """
        target_cats = categories if categories else list(self.data.keys())
        results = []

        for cat in target_cats:
            df = self.data.get(cat)
            if df is None or df.empty:
                continue

            df = df.copy()
            df["source_category"] = cat

            # 검색량 필터
            if "search_volume_1m" in df.columns:
                df = df[pd.to_numeric(df["search_volume_1m"], errors="coerce").fillna(0) >= min_search_volume]

            # 경쟁률 필터
            if "competition" in df.columns:
                df = df[pd.to_numeric(df["competition"], errors="coerce").fillna(999) <= max_competition]

            # 관심사 매칭 점수
            if "keyword" in df.columns:
                df["interest_match"] = df["keyword"].apply(
                    lambda kw: self._calc_interest_match(str(kw), interests)
                )
            else:
                df["interest_match"] = 0

            results.append(df)

        if not results:
            return pd.DataFrame()

        combined = pd.concat(results, ignore_index=True)

        # 종합 점수 계산
        combined = self._add_sourcing_score(combined)

        return combined.sort_values("sourcing_score", ascending=False).reset_index(drop=True)

    def recommend_for_channel(
        self,
        channel_config: dict,
        top_n: int = 30,
        min_search_volume: int = 5000,
        max_competition: float = 15.0,
    ) -> pd.DataFrame:
        """
        채널 config → 맞춤 키워드 추천

        channel_config는 persona_builder.persona_to_channel_config() 출력 또는
        기존 channels.yaml 형식 모두 지원.
        """
        interests = channel_config.get("interests", []) + channel_config.get("keywords", [])
        interests = list(set(interests))  # 중복 제거

        # 셀러라이프 카테고리 매핑
        cat_mapping = {
            "식품": "식품",
            "생활건강": "생활",
            "건강": "생활",
            "뷰티": "화장품",
            "화장품/미용": "화장품",
        }
        sl_categories = None  # 전체 검색
        ch_categories = channel_config.get("categories", [])
        if ch_categories:
            mapped = set()
            for cat in ch_categories:
                for key, val in cat_mapping.items():
                    if key in cat:
                        # 실제 로드된 카테고리에서 매칭
                        for loaded_cat in self.data.keys():
                            if val in loaded_cat:
                                mapped.add(loaded_cat)
            if mapped:
                sl_categories = list(mapped)

        result = self.search_keywords(
            interests=interests,
            categories=sl_categories,
            min_search_volume=min_search_volume,
            max_competition=max_competition,
        )

        return result.head(top_n)

    # ── 점수 계산 ────────────────────────────────────────────────────────

    def _calc_interest_match(self, keyword: str, interests: list[str]) -> float:
        """키워드 ↔ 관심사 매칭 점수 (0~100)"""
        if not interests:
            return 0

        keyword_lower = keyword.lower()
        matched = sum(1 for i in interests if i.lower() in keyword_lower or keyword_lower in i.lower())
        return min(100, (matched / max(len(interests), 1)) * 100 + (30 if matched > 0 else 0))

    def _add_sourcing_score(self, df: pd.DataFrame) -> pd.DataFrame:
        """소싱 종합 점수 추가"""
        df = df.copy()

        # 수치형 변환
        for col in ["search_volume_1m", "competition", "naver_avg_price", "coupang_avg_price", "search_trend_3m"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

        # 검색량 점수 (0~35): 로그 스케일
        if "search_volume_1m" in df.columns:
            import numpy as np
            max_vol = df["search_volume_1m"].max()
            if max_vol > 0:
                df["volume_score"] = (np.log1p(df["search_volume_1m"]) / np.log1p(max_vol) * 35).round(2)
            else:
                df["volume_score"] = 0
        else:
            df["volume_score"] = 0

        # 경쟁률 점수 (0~25): 낮을수록 좋음
        if "competition" in df.columns:
            df["competition_score"] = df["competition"].apply(
                lambda x: max(0, 25 - min(x, 50) / 2)
            ).round(2)
        else:
            df["competition_score"] = 12.5

        # 트렌드 점수 (0~20): 상승률 기반
        if "search_trend_3m" in df.columns:
            df["trend_score"] = df["search_trend_3m"].apply(
                lambda x: min(20, max(0, 10 + x * 50)) if x != 0 else 10
            ).round(2)
        else:
            df["trend_score"] = 10

        # 관심사 매칭 점수 (0~20)
        if "interest_match" in df.columns:
            df["match_score"] = (df["interest_match"] / 100 * 20).round(2)
        else:
            df["match_score"] = 0

        # 종합 점수
        df["sourcing_score"] = (
            df["volume_score"] + df["competition_score"] +
            df["trend_score"] + df["match_score"]
        ).round(2)

        # 등급
        df["grade"] = df["sourcing_score"].apply(
            lambda s: "S" if s >= 65 else "A" if s >= 50 else "B" if s >= 40 else "C" if s >= 30 else "D"
        )

        return df
