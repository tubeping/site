"""
네이버 DataLab 쇼핑인사이트 데이터 수집기

두 가지 방식 지원:
1. 공식 API (권장): 네이버 개발자센터에서 발급한 Client ID/Secret 사용
2. 쿠키 방식 (비공식): 브라우저 쿠키로 직접 크롤링
"""

import json
import time
import os
from datetime import datetime, timedelta
from pathlib import Path

import requests
import pandas as pd

DATA_DIR = Path(__file__).parent.parent / "data" / "datalab"

# 공식 API 엔드포인트
DATALAB_API_URL = "https://openapi.naver.com/v1/datalab/shopping/category/keywords"

# 비공식 웹 엔드포인트 (쿠키 방식)
DATALAB_WEB_URL = "https://datalab.naver.com/v2/a/getCategoryKeyword"


class DataLabFetcher:
    """네이버 DataLab 쇼핑인사이트 키워드 트렌드 수집"""

    def __init__(self, client_id: str = None, client_secret: str = None, cookies: str = None):
        """
        Args:
            client_id: 네이버 API Client ID (공식 방식)
            client_secret: 네이버 API Client Secret (공식 방식)
            cookies: 브라우저에서 복사한 Cookie 헤더 문자열 (쿠키 방식)
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.cookies = cookies
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        })

    # ── 공식 API 방식 ─────────────────────────────────────────────────────────

    def fetch_keyword_trend_api(
        self,
        category_id: str,
        keywords: list[str],
        start_date: str = None,
        end_date: str = None,
        time_unit: str = "week",
    ) -> pd.DataFrame:
        """
        공식 API로 키워드 트렌드 조회

        Args:
            category_id: 네이버 쇼핑 카테고리 ID (예: "50000167")
            keywords: 조회할 키워드 목록 (최대 5개)
            start_date: 시작일 (YYYY-MM-DD), 기본값: 3개월 전
            end_date: 종료일 (YYYY-MM-DD), 기본값: 오늘
            time_unit: "date" | "week" | "month"

        Returns:
            키워드별 기간 트렌드 DataFrame
        """
        if not self.client_id or not self.client_secret:
            raise ValueError("공식 API 방식에는 client_id와 client_secret이 필요합니다.")

        if end_date is None:
            end_date = datetime.today().strftime("%Y-%m-%d")
        if start_date is None:
            start_date = (datetime.today() - timedelta(days=90)).strftime("%Y-%m-%d")

        # 키워드는 최대 5개씩 나눠서 요청
        all_results = []
        for i in range(0, len(keywords), 5):
            chunk = keywords[i : i + 5]
            payload = {
                "startDate": start_date,
                "endDate": end_date,
                "timeUnit": time_unit,
                "category": category_id,
                "keyword": [{"name": kw, "param": [kw]} for kw in chunk],
                "device": "",
                "ages": [],
                "gender": "",
            }
            headers = {
                "X-Naver-Client-Id": self.client_id,
                "X-Naver-Client-Secret": self.client_secret,
                "Content-Type": "application/json",
            }
            resp = self.session.post(DATALAB_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            all_results.extend(data.get("results", []))
            time.sleep(0.5)

        return self._parse_api_results(all_results)

    # ── 쿠키(비공식) 방식 ─────────────────────────────────────────────────────

    def fetch_keyword_trend_cookie(
        self,
        category_id: str,
        keywords: list[str],
        start_date: str = None,
        end_date: str = None,
        time_unit: str = "week",
    ) -> pd.DataFrame:
        """
        쿠키 방식으로 키워드 트렌드 조회 (네이버 로그인 쿠키 필요)

        쿠키 얻는 방법:
            1. https://datalab.naver.com 접속 후 네이버 로그인
            2. 개발자도구(F12) → Network 탭
            3. 쇼핑인사이트 검색 실행
            4. 요청 헤더의 Cookie 값 전체 복사

        Args:
            category_id: 네이버 쇼핑 카테고리 ID
            keywords: 조회할 키워드 목록
            start_date: 시작일 (YYYY-MM-DD)
            end_date: 종료일 (YYYY-MM-DD)
            time_unit: "date" | "week" | "month"
        """
        if not self.cookies:
            raise ValueError("쿠키 방식에는 cookies 값이 필요합니다.")

        if end_date is None:
            end_date = datetime.today().strftime("%Y-%m-%d")
        if start_date is None:
            start_date = (datetime.today() - timedelta(days=90)).strftime("%Y-%m-%d")

        headers = {
            "Cookie": self.cookies,
            "Referer": "https://datalab.naver.com/shoppingInsight/sCategory.naver",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
        }

        all_results = []
        for kw in keywords:
            params = {
                "cid": category_id,
                "keyword": kw,
                "startDate": start_date.replace("-", "."),
                "endDate": end_date.replace("-", "."),
                "timeUnit": time_unit,
                "device": "pc",
                "gender": "",
                "age": "",
            }
            try:
                resp = self.session.post(
                    DATALAB_WEB_URL, headers=headers, data=params, timeout=10
                )
                resp.raise_for_status()
                data = resp.json()
                if "result" in data:
                    all_results.append({"keyword": kw, "data": data["result"]})
            except Exception as e:
                print(f"  [경고] '{kw}' 키워드 조회 실패: {e}")
            time.sleep(0.3)

        return self._parse_cookie_results(all_results)

    # ── 편의 메서드 ───────────────────────────────────────────────────────────

    def fetch(
        self,
        category_id: str,
        keywords: list[str],
        start_date: str = None,
        end_date: str = None,
    ) -> pd.DataFrame:
        """인증 방식을 자동 선택해서 트렌드 조회"""
        if self.client_id and self.client_secret:
            return self.fetch_keyword_trend_api(category_id, keywords, start_date, end_date)
        elif self.cookies:
            return self.fetch_keyword_trend_cookie(category_id, keywords, start_date, end_date)
        else:
            raise ValueError(
                "API 인증 정보가 없습니다. "
                "client_id/client_secret 또는 cookies를 설정하세요."
            )

    def fetch_and_save(
        self,
        channel_id: str,
        category_id: str,
        keywords: list[str],
        start_date: str = None,
        end_date: str = None,
    ) -> pd.DataFrame:
        """트렌드 조회 후 data/datalab/ 에 저장"""
        print(f"  DataLab 조회 중: 카테고리={category_id}, 키워드={keywords}")
        df = self.fetch(category_id, keywords, start_date, end_date)

        if not df.empty:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            filename = DATA_DIR / f"{channel_id}_{datetime.today().strftime('%Y%m%d')}.csv"
            df.to_csv(filename, index=False, encoding="utf-8-sig")
            print(f"  저장 완료: {filename}")

        return df

    # ── 파싱 헬퍼 ─────────────────────────────────────────────────────────────

    def _parse_api_results(self, results: list) -> pd.DataFrame:
        """공식 API 응답 파싱 → DataFrame"""
        rows = []
        for item in results:
            keyword = item.get("title", "")
            for point in item.get("data", []):
                rows.append({
                    "keyword": keyword,
                    "period": point.get("period"),
                    "ratio": float(point.get("ratio", 0)),
                })
        if not rows:
            return pd.DataFrame(columns=["keyword", "period", "ratio"])
        return pd.DataFrame(rows)

    def _parse_cookie_results(self, results: list) -> pd.DataFrame:
        """쿠키 방식 응답 파싱 → DataFrame"""
        rows = []
        for item in results:
            keyword = item.get("keyword", "")
            for point in item.get("data", []):
                rows.append({
                    "keyword": keyword,
                    "period": point.get("period") or point.get("date"),
                    "ratio": float(point.get("ratio") or point.get("value") or 0),
                })
        if not rows:
            return pd.DataFrame(columns=["keyword", "period", "ratio"])
        return pd.DataFrame(rows)

    # ── 트렌드 요약 점수 계산 ─────────────────────────────────────────────────

    @staticmethod
    def summarize_trends(df: pd.DataFrame, recent_weeks: int = 4) -> dict[str, dict]:
        """
        키워드별 트렌드 요약 점수 계산

        Returns:
            {keyword: {score, avg_ratio, trend_direction, recent_avg}}
        """
        if df.empty:
            return {}

        summary = {}
        for kw, group in df.groupby("keyword"):
            group = group.sort_values("period")
            ratios = group["ratio"].tolist()

            if not ratios:
                continue

            avg = sum(ratios) / len(ratios)
            recent = ratios[-recent_weeks:] if len(ratios) >= recent_weeks else ratios
            recent_avg = sum(recent) / len(recent)

            # 트렌드 방향: 최근 4주 평균 vs 전체 평균
            if avg > 0:
                trend_ratio = recent_avg / avg
            else:
                trend_ratio = 1.0

            # 상승 트렌드면 점수 부스트
            if trend_ratio >= 1.3:
                direction = "급상승"
                score = min(100, recent_avg * trend_ratio * 1.3)
            elif trend_ratio >= 1.1:
                direction = "상승"
                score = min(100, recent_avg * trend_ratio * 1.1)
            elif trend_ratio >= 0.9:
                direction = "유지"
                score = min(100, recent_avg)
            else:
                direction = "하락"
                score = min(100, recent_avg * trend_ratio * 0.8)

            summary[kw] = {
                "score": round(score, 2),
                "avg_ratio": round(avg, 2),
                "recent_avg": round(recent_avg, 2),
                "trend_direction": direction,
                "trend_ratio": round(trend_ratio, 2),
            }

        return summary


def load_cached_trends(channel_id: str, date_str: str = None) -> pd.DataFrame:
    """캐시된 DataLab 데이터 로드 (당일 또는 지정 날짜)"""
    if date_str is None:
        date_str = datetime.today().strftime("%Y%m%d")
    path = DATA_DIR / f"{channel_id}_{date_str}.csv"
    if path.exists():
        return pd.read_csv(path)
    return pd.DataFrame()
