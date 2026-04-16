"""
추천 별점 산출 엔진 — 카테고리별 추천

채널 페르소나 × 상품 데이터를 카테고리별로 분석해 추천 별점(1~5)을 산출합니다.

별점 공식:
  콘텐츠 키워드 매칭 (25%)   — 영상 제목 키워드 × 상품 키워드
  댓글 구매의향 (20%)        — GPT 추출 구매 시그널
  검색량 + 쇼핑성 (20%)      — 셀러라이프 데이터
  아이보스 트렌드 (15%)      — 시즌/마케팅 키워드
  데이터랩 연령매칭 (20%)    — 시청자 연령별 인기검색어 순위
"""

from pathlib import Path

import pandas as pd
import yaml

CONFIG_DIR = Path(__file__).parent.parent / "config"

# 카테고리 이모지
CATEGORY_EMOJI = {
    "패션의류": "👗", "패션잡화": "👜", "화장품/미용": "💄",
    "디지털/가전": "📱", "가구/인테리어": "🛋️", "출산/육아": "👶",
    "식품": "🍎", "스포츠/레저": "⚽", "생활/건강": "💊",
    "여가/생활편의": "🎫", "도서": "📚", "면세점": "✈️",
}


class RecommendScorer:
    """카테고리별 추천 별점 산출기"""

    WEIGHTS = {
        "content_match": 0.25,
        "purchase_intent": 0.20,
        "search_demand": 0.20,
        "trend_match": 0.15,
        "audience_match": 0.20,
    }

    def __init__(self):
        self.season_cfg = self._load_yaml("season.yaml")
        self.categories_cfg = self._load_yaml("naver_categories.yaml")

    # ── 카테고리별 추천 (메인 메서드) ────────────────────────────────────

    def score_by_category(
        self,
        channel_config: dict,
        video_titles: list[str] = None,
        purchase_signals: list[str] = None,
        trend_keywords: list[str] = None,
        category_ids: list[str] = None,
        top_n_per_category: int = 10,
    ) -> dict[str, pd.DataFrame]:
        """
        카테고리별 추천 별점 산출 (전체 파이프라인)

        네이버 검색광고 API(키워드도구) + 데이터랩 연령별 인기검색어로
        카테고리별 상품 키워드를 수집/분석합니다.

        Args:
            channel_config: 채널 설정 (age, gender, interests 등)
            video_titles: 영상 제목 리스트
            purchase_signals: 구매 시그널 키워드
            trend_keywords: 아이보스/시즌 트렌드 키워드
            category_ids: 분석할 데이터랩 카테고리 ID (None이면 auto_mapping)
            top_n_per_category: 카테고리당 추천 수

        Returns:
            {카테고리명: scored_DataFrame}
        """
        from fetchers.datalab_ranking import DataLabRanking
        from fetchers.naver_searchad import NaverSearchAd

        dl = DataLabRanking()
        sa = NaverSearchAd()

        # 카테고리 결정 (데이터랩 ID 기준)
        if category_ids is None:
            category_ids = self._auto_map_categories(channel_config)
        if not category_ids:
            category_ids = ["50000006", "50000008"]

        # 검색광고 API로 카테고리별 키워드 수집
        category_names = [self._get_category_name(cid) for cid in category_ids]
        if sa.is_available:
            sa_data = sa.get_keywords_for_channel(
                channel_config, category_names=category_names, top_n_per_category=200
            )
        else:
            sa_data = {}

        results = {}

        for cat_id in category_ids:
            cat_name = self._get_category_name(cat_id)

            # 1. 데이터랩: 이 카테고리의 연령별 인기검색어
            audience_ranks = self._get_audience_ranks_for_category(
                dl, cat_id, channel_config
            )

            # 2. 검색광고 API: 이 카테고리의 키워드 + 검색량 + 클릭수
            sa_keywords = sa_data.get(cat_name, pd.DataFrame())

            # 3. 병합: 검색광고 키워드 + 데이터랩 인기검색어
            combined = self._merge_searchad_and_datalab(
                sa_keywords, audience_ranks, cat_name
            )

            if combined.empty:
                continue

            # 4. 별점 산출
            scored = self.score(
                keywords_df=combined,
                channel_config=channel_config,
                video_titles=video_titles,
                purchase_signals=purchase_signals,
                audience_ranks=audience_ranks,
                trend_keywords=trend_keywords,
            )

            if not scored.empty:
                scored["category"] = cat_name
                scored["category_emoji"] = CATEGORY_EMOJI.get(cat_name, "📦")
                results[cat_name] = scored.head(top_n_per_category)

        return results

    def print_recommendations(self, results: dict[str, pd.DataFrame], channel_name: str = ""):
        """카테고리별 추천 결과 콘솔 출력"""
        print(f"\n{'='*70}")
        print(f"  {channel_name} 채널 맞춤 추천 상품")
        print(f"{'='*70}")

        for cat_name, df in results.items():
            emoji = CATEGORY_EMOJI.get(cat_name, "📦")
            print(f"\n{emoji} {cat_name} (TOP {len(df)})")
            print(f"{'─'*60}")
            print(f"{'순위':>4} {'별점':<7} {'점수':>5} {'키워드':<15} {'검색량':>10} {'연령':>5} {'콘텐츠':>5}")

            for i, (_, row) in enumerate(df.iterrows(), 1):
                kw = str(row.get("keyword", ""))[:14]
                stars = row.get("stars_display", "")
                score = row.get("recommend_score", 0)
                vol = int(row.get("search_volume_1m", 0) or 0)
                aud = row.get("audience_score", 0)
                cont = row.get("content_score", 0)
                print(f"{i:>4} {stars:<7} {score:>5.1f} {kw:<15} {vol:>10,} {aud:>5.0f} {cont:>5.0f}")

    # ── 개별 키워드 점수 산출 ────────────────────────────────────────────

    def score(
        self,
        keywords_df: pd.DataFrame,
        channel_config: dict,
        video_titles: list[str] = None,
        purchase_signals: list[str] = None,
        audience_ranks: pd.DataFrame = None,
        trend_keywords: list[str] = None,
    ) -> pd.DataFrame:
        """키워드 DataFrame에 추천 별점 산출"""
        if keywords_df.empty:
            return keywords_df

        df = keywords_df.copy()

        df["content_score"] = df.apply(
            lambda r: self._content_match(r, channel_config, video_titles), axis=1
        )
        df["purchase_score"] = df.apply(
            lambda r: self._purchase_intent(r, purchase_signals), axis=1
        )
        df["demand_score"] = df.apply(
            lambda r: self._search_demand(r), axis=1
        )
        df["trend_score"] = df.apply(
            lambda r: self._trend_match(r, trend_keywords), axis=1
        )
        df["audience_score"] = df.apply(
            lambda r: self._audience_match(r, audience_ranks), axis=1
        )

        w = self.WEIGHTS
        df["recommend_score"] = (
            df["content_score"] * w["content_match"]
            + df["purchase_score"] * w["purchase_intent"]
            + df["demand_score"] * w["search_demand"]
            + df["trend_score"] * w["trend_match"]
            + df["audience_score"] * w["audience_match"]
        ).round(2)

        df["stars"] = df["recommend_score"].apply(self._score_to_stars)
        df["stars_display"] = df["stars"].apply(
            lambda s: "★" * int(s) + ("☆" if s % 1 >= 0.5 else "")
        )

        return df.sort_values("recommend_score", ascending=False).reset_index(drop=True)

    # ── 카테고리별 데이터 수집 ───────────────────────────────────────────

    def _get_audience_ranks_for_category(
        self, dl, cat_id: str, channel_config: dict
    ) -> pd.DataFrame:
        """카테고리별 연령 가중 인기검색어 수집"""
        age_dist = channel_config.get("age", {})
        gender_dist = channel_config.get("gender", {})

        female_pct = gender_dist.get("여성", 50) / 100
        male_pct = gender_dist.get("남성", 50) / 100

        # 주요 성별 결정
        if male_pct >= 0.6:
            primary_gender = "m"
        elif female_pct >= 0.6:
            primary_gender = "f"
        else:
            primary_gender = ""

        # 유효 연령 세그먼트 (비율 10% 이상, 상위 3개로 제한)
        from fetchers.datalab_ranking import AGE_CODES
        age_segments = []
        for age_label, pct in age_dist.items():
            code = self._normalize_age_code(age_label)
            if code and pct >= 10:
                age_segments.append((code, pct / 100))
        # 상위 3개만 (API 호출 수 제한)
        age_segments = sorted(age_segments, key=lambda x: -x[1])[:3]

        if not age_segments:
            age_segments = [("", 1.0)]

        # 연령별 수집 + 가중 합산
        kw_scores = {}
        for age_code, age_weight in age_segments:
            ranks = dl.get_keyword_rank(
                cat_id, age=age_code, gender=primary_gender, max_keywords=100
            )
            for r in ranks:
                kw = r["keyword"]
                rank_score = max(1, 101 - r["rank"])
                if kw not in kw_scores:
                    kw_scores[kw] = 0
                kw_scores[kw] += rank_score * age_weight

        if not kw_scores:
            return pd.DataFrame()

        df = pd.DataFrame([
            {"keyword": k, "weighted_score": round(v, 2)}
            for k, v in sorted(kw_scores.items(), key=lambda x: -x[1])
        ])
        df.insert(0, "rank", range(1, len(df) + 1))
        return df

    def _merge_searchad_and_datalab(
        self, sa_df: pd.DataFrame, audience_ranks: pd.DataFrame, cat_name: str
    ) -> pd.DataFrame:
        """검색광고 API 키워드 + 데이터랩 인기검색어 병합"""
        rows = []

        # 검색광고 API 키워드 (검색량 + 클릭수 + CTR 포함)
        if not sa_df.empty and "keyword" in sa_df.columns:
            for _, r in sa_df.iterrows():
                row = dict(r)
                # 셀러라이프 호환 컬럼명 매핑
                row["search_volume_1m"] = row.get("monthly_total", 0)
                row["is_shopping"] = "O" if row.get("monthly_total_clicks", 0) > 0 else "X"
                rows.append(row)

        # 데이터랩 인기검색어 중 검색광고에 없는 것 추가
        if not audience_ranks.empty:
            existing_kws = set(r.get("keyword", "") for r in rows) if rows else set()
            for _, r in audience_ranks.head(50).iterrows():
                kw = r["keyword"]
                if kw not in existing_kws:
                    rows.append({
                        "keyword": kw,
                        "search_volume_1m": 0,
                        "monthly_total": 0,
                        "monthly_total_clicks": 0,
                        "click_rate": 0,
                        "competition": "",
                        "is_shopping": "",
                        "source_category": cat_name,
                        "from_datalab": True,
                    })

        if not rows:
            return pd.DataFrame()

        return pd.DataFrame(rows)

    # ── 개별 점수 계산 ───────────────────────────────────────────────────

    def _content_match(self, row, channel_config, video_titles=None):
        keyword = str(row.get("keyword", "")).lower()
        score = 0.0

        interests = [kw.lower() for kw in channel_config.get("interests", []) + channel_config.get("keywords", [])]
        for interest in interests:
            if interest in keyword or keyword in interest:
                score += 40
                break

        if video_titles:
            title_text = " ".join(video_titles).lower()
            if keyword in title_text:
                score += 60
            else:
                for title in video_titles:
                    if len(keyword) >= 2 and keyword[:2] in title.lower():
                        score += 20
                        break

        return min(100, score)

    def _purchase_intent(self, row, purchase_signals=None):
        if not purchase_signals:
            return 30

        keyword = str(row.get("keyword", "")).lower()
        score = 0.0

        for signal in purchase_signals:
            signal_lower = signal.lower()
            if keyword in signal_lower or signal_lower in keyword:
                score += 50
            elif any(w in keyword for w in signal_lower.split() if len(w) >= 2):
                score += 20

        return min(100, score + 20)

    def _search_demand(self, row):
        import numpy as np
        score = 0.0

        # 검색량 (0~40점) — 로그 스케일
        volume = pd.to_numeric(
            row.get("monthly_total", row.get("search_volume_1m", 0)), errors="coerce"
        ) or 0
        if volume > 0:
            log_score = min(40, max(0, (np.log10(max(volume, 1)) - 3) / 2 * 40))
            score += log_score

        # 클릭수 — 실제 구매전환 지표 (0~30점)
        clicks = pd.to_numeric(row.get("monthly_total_clicks", 0), errors="coerce") or 0
        if clicks > 0:
            click_score = min(30, max(0, (np.log10(max(clicks, 1)) - 1) / 2 * 30))
            score += click_score

        # CTR — 구매의향 강도 (0~15점)
        ctr = pd.to_numeric(row.get("click_rate", 0), errors="coerce") or 0
        if ctr >= 3.0:
            score += 15
        elif ctr >= 2.0:
            score += 12
        elif ctr >= 1.0:
            score += 8
        elif ctr > 0:
            score += 4

        # 쇼핑성 (0~15점)
        is_shopping = str(row.get("is_shopping", "")).upper()
        if is_shopping == "O":
            score += 15

        return min(100, score)

    def _trend_match(self, row, trend_keywords=None):
        keyword = str(row.get("keyword", "")).lower()
        score = 30

        if trend_keywords:
            for tk in trend_keywords:
                if tk.lower() in keyword or keyword in tk.lower():
                    score += 40
                    break

        from datetime import datetime
        month = datetime.today().month
        for season_data in self.season_cfg.get("seasons", {}).values():
            if month in season_data.get("months", []):
                for item in season_data.get("boost_keywords", []):
                    if item["keyword"] in keyword:
                        score += 30
                        break
                break

        for item in self.season_cfg.get("evergreen_keywords", []):
            if item["keyword"] in keyword:
                score += 15
                break

        return min(100, score)

    def _audience_match(self, row, audience_ranks=None):
        if audience_ranks is None or audience_ranks.empty:
            return 30

        keyword = str(row.get("keyword", ""))

        match = audience_ranks[audience_ranks["keyword"] == keyword]
        if match.empty:
            match = audience_ranks[audience_ranks["keyword"].str.contains(keyword, case=False, na=False)]

        if match.empty:
            return 10

        max_score = audience_ranks["weighted_score"].max()
        if max_score <= 0:
            return 30

        weighted = match.iloc[0]["weighted_score"]
        return min(100, round((weighted / max_score) * 100, 2))

    # ── 유틸 ─────────────────────────────────────────────────────────────

    def _auto_map_categories(self, channel_config):
        mapping = self.categories_cfg.get("auto_mapping", {})
        interests = channel_config.get("interests", []) + channel_config.get("keywords", [])
        categories = self.categories_cfg.get("categories", {})

        matched = set()
        for interest in interests:
            interest_lower = interest.lower()
            for key, cat_names in mapping.items():
                if key in interest_lower or interest_lower in key:
                    for cat_name in cat_names:
                        for name, data in categories.items():
                            if cat_name in name or name in cat_name:
                                matched.add(data["id"])
        return list(matched)

    def _get_category_name(self, cat_id):
        for name, data in self.categories_cfg.get("categories", {}).items():
            if data.get("id") == cat_id:
                return name
        return cat_id

    def _normalize_age_code(self, age_label):
        from fetchers.datalab_ranking import AGE_CODES
        for label, code in AGE_CODES.items():
            if label in age_label:
                return code
        if "55" in age_label or "64" in age_label:
            return "50"
        if "65" in age_label:
            return "60"
        return ""

    @staticmethod
    def _score_to_stars(score):
        if score >= 80: return 5.0
        elif score >= 65: return 4.5
        elif score >= 55: return 4.0
        elif score >= 45: return 3.5
        elif score >= 35: return 3.0
        elif score >= 25: return 2.5
        elif score >= 15: return 2.0
        elif score >= 5: return 1.5
        else: return 1.0

    def _load_yaml(self, filename):
        path = CONFIG_DIR / filename
        if not path.exists():
            return {}
        with open(path, encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
