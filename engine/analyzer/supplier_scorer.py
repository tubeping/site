"""
공급사 적합도 점수 산출

수집된 공급사 데이터를 기준으로 TubePing 유튜브 쇼핑 플랫폼에
적합한 공급사를 점수화하여 우선순위를 매깁니다.

점수 기준 (총 100점):
  - 안정성 (30%): 운영 기간, 연락처 확인
  - 상품력 (40%): 소싱 다양성, 가격대, 트렌드
  - 채널 적합성 (20%): 채널 카테고리/키워드 매칭
  - 역량 (10%): 상품 수, 위탁배송 가능 여부
"""

import pandas as pd
from datetime import datetime


class SupplierScorer:
    """공급사 점수 산출"""

    def __init__(self, channel_categories: list[str] = None, channel_keywords: list[str] = None):
        self.channel_categories = [c.lower() for c in (channel_categories or ["식품", "생활건강", "생활/건강"])]
        self.channel_keywords = [k.lower() for k in (channel_keywords or [])]

    def score_suppliers(self, suppliers_df: pd.DataFrame) -> pd.DataFrame:
        """
        공급사 DataFrame에 점수/등급/추천이유 컬럼 추가

        필수 컬럼: 판매처(네이버), 인기상품 키워드수, TOP10 횟수,
                  인기 키워드, 평균가격, 카테고리, 연락처확인
        """
        df = suppliers_df.copy()

        df["안정성"] = df.apply(self._calc_stability, axis=1)
        df["상품력"] = df.apply(self._calc_product_quality, axis=1)
        df["채널적합"] = df.apply(self._calc_channel_fit, axis=1)
        df["역량"] = df.apply(self._calc_capability, axis=1)

        df["total_score"] = (
            df["안정성"] * 0.30
            + df["상품력"] * 0.40
            + df["채널적합"] * 0.20
            + df["역량"] * 0.10
        ).round(1)

        df["grade"] = df["total_score"].apply(self._to_grade)
        df["추천이유"] = df.apply(self._build_reason, axis=1)

        # 점수 내림차순 정렬 + 순위
        df = df.sort_values("total_score", ascending=False).reset_index(drop=True)
        if "순위" in df.columns:
            df["순위"] = range(1, len(df) + 1)
        else:
            df.insert(0, "순위", range(1, len(df) + 1))

        # 컬럼 정리
        col_order = [
            "순위", "grade", "total_score",
            "판매처(네이버)", "사업자명", "전화번호", "이메일",
            "인기상품 키워드수", "TOP10 횟수", "인기 키워드",
            "대표상품", "평균가격", "대카테고리", "카테고리",
            "브랜드", "쇼핑몰", "사업자번호", "주소", "지역",
            "연락처확인", "추천이유",
        ]
        existing = [c for c in col_order if c in df.columns]
        df = df[existing]

        return df

    # ── 점수 계산 ────────────────────────────────────────────────────────

    def _calc_stability(self, row) -> float:
        """안정성 점수 (0~100)"""
        score = 50  # 기본

        # 연락처 확인 여부 (+30)
        if row.get("연락처확인"):
            score += 30

        # 전화번호 있음 (+10)
        phone = str(row.get("전화번호", ""))
        if phone and phone not in ("", "nan"):
            score += 10

        # 사업자번호 있음 (+10)
        biz_no = str(row.get("사업자번호", ""))
        if biz_no and biz_no not in ("", "nan"):
            score += 10

        return min(score, 100)

    def _calc_product_quality(self, row) -> float:
        """상품력 점수 (0~100)"""
        score = 0

        # 인기 키워드 수 (0~40)
        kw_count = int(row.get("인기상품 키워드수", 0) or 0)
        score += min(kw_count * 4, 40)

        # TOP10 횟수 (0~30)
        top10 = int(row.get("TOP10 횟수", 0) or 0)
        score += min(top10 * 6, 30)

        # 가격대 적정성 (0~30) — 5,000~100,000원 범위가 유튜브쇼핑에 적합
        avg_price = int(row.get("평균가격", 0) or 0)
        if 5000 <= avg_price <= 100000:
            score += 30
        elif 3000 <= avg_price <= 200000:
            score += 20
        elif avg_price > 0:
            score += 10

        return min(score, 100)

    def _calc_channel_fit(self, row) -> float:
        """채널 적합성 점수 (0~100)"""
        score = 0

        # 카테고리 매칭
        cats = str(row.get("카테고리", "")).lower()
        for ch_cat in self.channel_categories:
            if ch_cat in cats:
                score += 25

        # 키워드 매칭
        keywords = str(row.get("인기 키워드", "")).lower()
        match_count = 0
        for ch_kw in self.channel_keywords:
            if ch_kw in keywords:
                match_count += 1
        score += min(match_count * 15, 50)

        return min(score, 100)

    def _calc_capability(self, row) -> float:
        """역량 점수 (0~100)"""
        score = 30  # 기본

        # 대표상품 수
        products = str(row.get("대표상품", ""))
        product_count = len(products.split("|")) if products and products != "nan" else 0
        score += min(product_count * 15, 45)

        # 브랜드 보유 (+25)
        brand = str(row.get("브랜드", ""))
        if brand and brand not in ("", "nan"):
            score += 25

        return min(score, 100)

    # ── 등급 ─────────────────────────────────────────────────────────────

    @staticmethod
    def _to_grade(score: float) -> str:
        if score >= 85:
            return "S"
        elif score >= 70:
            return "A"
        elif score >= 55:
            return "B"
        elif score >= 40:
            return "C"
        else:
            return "D"

    # ── 추천 이유 ────────────────────────────────────────────────────────

    def _build_reason(self, row) -> str:
        """추천 이유 텍스트 생성"""
        parts = []

        # 연락처
        phone = str(row.get("전화번호", ""))
        email = str(row.get("이메일", ""))
        if phone and phone not in ("", "nan"):
            parts.append("전화연락(사무실)")
        if email and email not in ("", "nan"):
            parts.append("이메일확인")

        # 키워드
        kw_count = int(row.get("인기상품 키워드수", 0) or 0)
        if kw_count > 0:
            parts.append(f"인기키워드 {kw_count}개 매칭중")

        # TOP10
        top10 = int(row.get("TOP10 횟수", 0) or 0)
        if top10 > 0:
            parts.append(f"TOP10 {top10}회")

        # 키워드 샘플
        keywords = str(row.get("인기 키워드", ""))
        if keywords and keywords != "nan":
            parts.append(f"키워드: {keywords[:50]}")

        # 평균가격
        avg_price = int(row.get("평균가격", 0) or 0)
        if avg_price > 0:
            parts.append(f"평균가격 약 {avg_price:,}원")

        # 대표상품
        products = str(row.get("대표상품", ""))
        if products and products != "nan":
            parts.append(f"대표: {products[:60]}")

        return " | ".join(parts)


def merge_supplier_sources(*dfs: pd.DataFrame) -> pd.DataFrame:
    """여러 수집 결과를 병합 (판매처 기준 중복 제거)"""
    if not dfs:
        return pd.DataFrame()
    merged = pd.concat(dfs, ignore_index=True)
    merged = merged.drop_duplicates(subset=["판매처(네이버)"], keep="first")
    return merged.reset_index(drop=True)
