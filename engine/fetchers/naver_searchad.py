"""
네이버 검색광고 API — 키워드도구

카테고리별 시드 키워드를 넣으면 연관 키워드 + 검색량 + 클릭수 + CTR을 반환합니다.
셀러라이프 엑셀을 대체하는 실시간 키워드 데이터 소스입니다.

API 문서: https://naver.github.io/searchad-apidoc/
"""

import hashlib
import hmac
import os
import time
from pathlib import Path

import requests
import pandas as pd

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

API_BASE = "https://api.searchad.naver.com"
KEYWORD_TOOL_URL = f"{API_BASE}/keywordstool"

# 네이버 데이터랩 카테고리 → 시드 키워드 매핑
CATEGORY_SEEDS = {
    "패션의류": ["여성의류", "남성의류", "원피스", "자켓", "코트", "청바지"],
    "패션잡화": ["가방", "신발", "지갑", "모자", "벨트"],
    "화장품/미용": ["스킨케어", "선크림", "파운데이션", "향수", "클렌징"],
    "디지털/가전": ["노트북", "이어폰", "스마트워치", "공기청정기", "로봇청소기"],
    "가구/인테리어": ["소파", "침대", "책상", "조명", "커튼"],
    "출산/육아": ["기저귀", "분유", "유모차", "아기옷", "장난감"],
    "식품": ["오메가3", "비타민", "유산균", "홍삼", "닭가슴살", "커피", "견과류", "올리브오일"],
    "스포츠/레저": ["헬스", "요가매트", "캠핑용품", "등산화", "골프채"],
    "생활/건강": ["비타민", "영양제", "안마의자", "정수기", "세제", "칫솔"],
    "여가/생활편의": ["여행", "호텔", "공연티켓", "렌탈", "구독"],
    "도서": ["베스트셀러", "자기계발", "경제서적", "소설", "주식책"],
}


class NaverSearchAd:
    """네이버 검색광고 API 키워드도구"""

    def __init__(
        self,
        api_license: str = None,
        api_secret: str = None,
        customer_id: str = None,
    ):
        self.api_license = api_license or os.getenv("NAVER_AD_API_LICENSE", "")
        self.api_secret = api_secret or os.getenv("NAVER_AD_API_SECRET", "")
        self.customer_id = customer_id or os.getenv("NAVER_AD_CUSTOMER_ID", "")

    @property
    def is_available(self) -> bool:
        return bool(self.api_license and self.api_secret and self.customer_id)

    # ── 키워드도구 API ───────────────────────────────────────────────────

    def get_keywords(
        self,
        seed_keywords: list[str],
        show_detail: bool = True,
    ) -> pd.DataFrame:
        """
        시드 키워드로 연관 키워드 + 검색 통계 조회

        Args:
            seed_keywords: 시드 키워드 리스트 (최대 5개)
            show_detail: 월별 상세 데이터 포함 여부

        Returns:
            DataFrame[keyword, monthly_pc_qc, monthly_mobile_qc, monthly_total,
                       monthly_pc_clicks, monthly_mobile_clicks, monthly_total_clicks,
                       click_rate, competition, avg_cpc]
        """
        if not self.is_available:
            return pd.DataFrame()

        all_results = []

        # 5개씩 나눠서 호출
        for i in range(0, len(seed_keywords), 5):
            chunk = seed_keywords[i:i + 5]
            params = {
                "hintKeywords": ",".join(chunk),
                "showDetail": "1" if show_detail else "0",
            }

            try:
                resp = self._api_get(KEYWORD_TOOL_URL, params)
                if resp.status_code == 200:
                    data = resp.json()
                    keywords = data.get("keywordList", [])
                    all_results.extend(keywords)
                else:
                    print(f"  [경고] 검색광고 API {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                print(f"  [오류] 검색광고 API: {e}")

            time.sleep(0.5)

        if not all_results:
            return pd.DataFrame()

        return self._parse_keyword_results(all_results)

    def get_keywords_by_category(
        self,
        category_name: str,
        extra_seeds: list[str] = None,
    ) -> pd.DataFrame:
        """
        카테고리명으로 키워드 조회

        CATEGORY_SEEDS에서 시드 키워드를 가져오고,
        extra_seeds가 있으면 추가합니다.
        """
        seeds = CATEGORY_SEEDS.get(category_name, []).copy()

        if extra_seeds:
            seeds.extend(extra_seeds)

        if not seeds:
            return pd.DataFrame()

        # 중복 제거
        seeds = list(dict.fromkeys(seeds))

        return self.get_keywords(seeds)

    def get_all_categories(
        self,
        category_names: list[str] = None,
        extra_seeds_per_category: dict[str, list[str]] = None,
    ) -> dict[str, pd.DataFrame]:
        """
        여러 카테고리 일괄 조회

        Returns:
            {카테고리명: DataFrame}
        """
        if category_names is None:
            category_names = list(CATEGORY_SEEDS.keys())

        results = {}
        for cat in category_names:
            extra = (extra_seeds_per_category or {}).get(cat, [])
            df = self.get_keywords_by_category(cat, extra_seeds=extra)
            if not df.empty:
                df["category"] = cat
                results[cat] = df
                print(f"  {cat}: {len(df)}개 키워드")
            time.sleep(0.3)

        return results

    # ── 채널 맞춤 키워드 추천 ────────────────────────────────────────────

    def get_keywords_for_channel(
        self,
        channel_config: dict,
        category_names: list[str] = None,
        top_n_per_category: int = 100,
    ) -> dict[str, pd.DataFrame]:
        """
        채널 관심사 기반으로 카테고리별 키워드 조회

        채널의 interests/keywords를 시드 키워드에 추가해
        더 정확한 연관 키워드를 가져옵니다.
        """
        interests = channel_config.get("interests", [])
        keywords = channel_config.get("keywords", [])
        extra_seeds = list(set(interests + keywords))

        if category_names is None:
            # auto_mapping으로 카테고리 결정
            category_names = self._map_channel_to_categories(channel_config)

        results = {}
        for cat in category_names:
            # 채널 관심사를 시드에 추가
            cat_seeds = CATEGORY_SEEDS.get(cat, []).copy()
            combined_seeds = list(dict.fromkeys(cat_seeds + extra_seeds))[:15]  # 최대 15개

            df = self.get_keywords(combined_seeds)
            if not df.empty:
                df["category"] = cat
                # 검색량 순 정렬 + 상위 N개
                df = df.sort_values("monthly_total", ascending=False).head(top_n_per_category)
                results[cat] = df.reset_index(drop=True)

        return results

    # ── 파싱 ─────────────────────────────────────────────────────────────

    def _parse_keyword_results(self, results: list[dict]) -> pd.DataFrame:
        """API 응답 파싱"""
        rows = []
        for item in results:
            pc_qc = self._safe_int(item.get("monthlyPcQcCnt", 0))
            mobile_qc = self._safe_int(item.get("monthlyMobileQcCnt", 0))
            total_qc = pc_qc + mobile_qc

            pc_clicks = self._safe_int(item.get("monthlyAvePcClkCnt", 0))
            mobile_clicks = self._safe_int(item.get("monthlyAveMobileClkCnt", 0))
            total_clicks = pc_clicks + mobile_clicks

            click_rate = round(total_clicks / max(total_qc, 1) * 100, 2) if total_qc > 0 else 0

            rows.append({
                "keyword": item.get("relKeyword", ""),
                "monthly_pc_qc": pc_qc,
                "monthly_mobile_qc": mobile_qc,
                "monthly_total": total_qc,
                "monthly_pc_clicks": pc_clicks,
                "monthly_mobile_clicks": mobile_clicks,
                "monthly_total_clicks": total_clicks,
                "click_rate": click_rate,
                "competition": item.get("compIdx", ""),
                "avg_cpc": self._safe_int(item.get("monthlyAvePcCpc", 0)),
                "is_shopping": "O" if total_clicks > 0 else "X",
            })

        df = pd.DataFrame(rows)

        # 중복 키워드 제거 (검색량 높은 것 유지)
        if not df.empty:
            df = df.sort_values("monthly_total", ascending=False).drop_duplicates(
                subset=["keyword"], keep="first"
            ).reset_index(drop=True)

        return df

    @staticmethod
    def _safe_int(val) -> int:
        """< 10 등 문자열을 int로 안전 변환"""
        if isinstance(val, (int, float)):
            return int(val)
        if isinstance(val, str):
            val = val.replace(",", "").replace("<", "").strip()
            try:
                return int(val)
            except ValueError:
                return 0
        return 0

    # ── 카테고리 매핑 ────────────────────────────────────────────────────

    def _map_channel_to_categories(self, channel_config: dict) -> list[str]:
        """채널 관심사 → 카테고리 매핑"""
        import yaml
        config_path = Path(__file__).parent.parent / "config" / "naver_categories.yaml"
        if not config_path.exists():
            return ["식품", "생활/건강"]

        with open(config_path, encoding="utf-8") as f:
            cfg = yaml.safe_load(f) or {}

        mapping = cfg.get("auto_mapping", {})
        interests = channel_config.get("interests", []) + channel_config.get("keywords", [])

        matched = set()
        for interest in interests:
            for key, cats in mapping.items():
                if key in interest.lower() or interest.lower() in key:
                    matched.update(cats)

        return list(matched) if matched else ["식품", "생활/건강"]

    # ── API 인증 ─────────────────────────────────────────────────────────

    def _api_get(self, url: str, params: dict) -> requests.Response:
        """서명 포함 API GET 요청"""
        timestamp = str(int(time.time() * 1000))
        signature = self._generate_signature(timestamp, "GET", "/keywordstool")

        headers = {
            "X-Timestamp": timestamp,
            "X-API-KEY": self.api_license,
            "X-Customer": self.customer_id,
            "X-Signature": signature,
        }

        return requests.get(url, params=params, headers=headers, timeout=30)

    def _generate_signature(self, timestamp: str, method: str, path: str) -> str:
        """HMAC-SHA256 서명 생성 (base64 인코딩)"""
        import base64
        message = f"{timestamp}.{method}.{path}"
        sign = hmac.new(
            self.api_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        return base64.b64encode(sign).decode("utf-8")
