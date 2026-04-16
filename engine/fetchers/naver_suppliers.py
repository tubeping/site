"""
네이버 쇼핑 공급사 수집기

네이버 쇼핑 검색 API로 상품을 검색하고,
스마트스토어 판매자 정보(사업자명, 전화, 이메일 등)를 수집합니다.
"""

import os
import re
import time
import json
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

import requests
import pandas as pd
from bs4 import BeautifulSoup

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATA_DIR = Path(__file__).parent.parent / "data" / "suppliers"

SHOP_SEARCH_URL = "https://openapi.naver.com/v1/search/shop.json"


class NaverSupplierFetcher:
    """네이버 쇼핑 검색 → 판매자 정보 수집"""

    def __init__(
        self,
        client_id: str = None,
        client_secret: str = None,
    ):
        self.client_id = client_id or os.getenv("NAVER_CLIENT_ID", "")
        self.client_secret = client_secret or os.getenv("NAVER_CLIENT_SECRET", "")
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/147.0.0.0 Safari/537.36"
            ),
        })

    @property
    def is_available(self) -> bool:
        return bool(self.client_id and self.client_secret)

    # ── 1단계: 키워드별 상품 검색 → 판매자 목록 수집 ──────────────────────

    def search_sellers_by_keyword(
        self,
        keyword: str,
        max_items: int = 100,
    ) -> list[dict]:
        """
        키워드로 네이버 쇼핑 검색 → 판매자(mallName) 추출

        Returns:
            [{"mall_name": ..., "products": [...], "keyword": ...}, ...]
        """
        sellers = {}  # mallName → {products, prices, categories, ...}
        display = min(max_items, 100)

        for start in range(1, max_items + 1, display):
            headers = {
                "X-Naver-Client-Id": self.client_id,
                "X-Naver-Client-Secret": self.client_secret,
            }
            params = {
                "query": keyword,
                "display": display,
                "start": start,
                "sort": "sim",
            }

            try:
                resp = requests.get(
                    SHOP_SEARCH_URL, headers=headers, params=params, timeout=15
                )
                if resp.status_code != 200:
                    print(f"    API {resp.status_code}: {resp.text[:100]}")
                    break
                data = resp.json()
                items = data.get("items", [])
                if not items:
                    break

                for item in items:
                    mall = item.get("mallName", "").strip()
                    if not mall or mall in ("네이버",):
                        continue

                    if mall not in sellers:
                        sellers[mall] = {
                            "mall_name": mall,
                            "products": [],
                            "prices": [],
                            "categories": set(),
                            "brands": set(),
                            "keywords": set(),
                        }

                    # 상품 정보 누적
                    title = re.sub(r"<[^>]+>", "", item.get("title", ""))
                    lprice = int(item.get("lprice", 0) or 0)

                    sellers[mall]["products"].append(title)
                    if lprice > 0:
                        sellers[mall]["prices"].append(lprice)

                    cat1 = item.get("category1", "")
                    cat2 = item.get("category2", "")
                    if cat1:
                        sellers[mall]["categories"].add(cat1)
                    if cat2:
                        sellers[mall]["categories"].add(cat2)

                    brand = item.get("brand", "")
                    if brand:
                        sellers[mall]["brands"].add(brand)

                    sellers[mall]["keywords"].add(keyword)

                time.sleep(0.15)

            except Exception as e:
                print(f"    [오류] {keyword} start={start}: {e}")
                break

        return list(sellers.values())

    def collect_sellers_by_keywords(
        self,
        keywords: list[str],
        max_items_per_keyword: int = 100,
    ) -> dict:
        """
        여러 키워드로 판매자 수집 → 중복 합산

        Returns:
            {mall_name: {products, prices, categories, brands, keywords, keyword_count, top10_count}}
        """
        all_sellers = {}

        for i, kw in enumerate(keywords, 1):
            print(f"  [{i}/{len(keywords)}] '{kw}' 검색...", end=" ")
            results = self.search_sellers_by_keyword(kw, max_items=max_items_per_keyword)
            print(f"{len(results)}개 판매자")

            for seller in results:
                mall = seller["mall_name"]
                if mall not in all_sellers:
                    all_sellers[mall] = {
                        "mall_name": mall,
                        "products": [],
                        "prices": [],
                        "categories": set(),
                        "brands": set(),
                        "keywords": set(),
                        "top10_count": 0,
                    }

                s = all_sellers[mall]
                s["products"].extend(seller["products"])
                s["prices"].extend(seller["prices"])
                s["categories"].update(seller["categories"])
                s["brands"].update(seller["brands"])
                s["keywords"].update(seller["keywords"])

                # 해당 키워드에서 상위 10개 안에 들었으면 카운트
                if len(seller["products"]) > 0:
                    # 검색 결과 상위에 여러 상품이 나왔으면 TOP10 후보
                    top_products = seller["products"][:10]
                    if top_products:
                        s["top10_count"] += 1

            time.sleep(0.3)

        return all_sellers

    # ── 2단계: 스마트스토어 판매자 상세 정보 수집 ──────────────────────────

    def fetch_seller_info(self, mall_name: str) -> dict:
        """
        스마트스토어 판매자 페이지에서 사업자 정보 수집

        Returns:
            {"business_name": ..., "business_no": ..., "phone": ...,
             "email": ..., "address": ..., "store_url": ...}
        """
        info = {
            "business_name": "",
            "business_no": "",
            "phone": "",
            "email": "",
            "address": "",
            "region": "",
            "store_url": "",
        }

        # 스마트스토어 URL 시도
        store_url = f"https://smartstore.naver.com/{quote(mall_name)}"
        try:
            resp = self.session.get(store_url, timeout=10, allow_redirects=True)
            if resp.status_code == 200:
                info["store_url"] = resp.url
                page_info = self._parse_store_page(resp.text)
                info.update(page_info)
        except Exception:
            pass

        # 프로필 페이지 시도
        if not info["business_no"]:
            try:
                profile_url = f"{store_url}/profile"
                resp = self.session.get(profile_url, timeout=10)
                if resp.status_code == 200:
                    page_info = self._parse_store_page(resp.text)
                    info.update({k: v for k, v in page_info.items() if v})
            except Exception:
                pass

        return info

    def fetch_sellers_info_batch(
        self,
        mall_names: list[str],
        delay: float = 0.3,
        progress_every: int = 100,
    ) -> dict:
        """판매자 상세 정보 일괄 수집"""
        results = {}
        total = len(mall_names)

        for i, mall in enumerate(mall_names, 1):
            if i % progress_every == 0 or i == 1:
                print(f"  판매자 정보 수집: {i}/{total} ({i/total*100:.0f}%)")

            info = self.fetch_seller_info(mall)
            results[mall] = info
            time.sleep(delay)

        return results

    # ── HTML 파싱 ─────────────────────────────────────────────────────────

    def _parse_store_page(self, html: str) -> dict:
        """스마트스토어 페이지에서 사업자 정보 추출"""
        info = {}
        soup = BeautifulSoup(html, "html.parser")

        # JSON-LD 또는 __NEXT_DATA__ 에서 추출 시도
        script_tags = soup.find_all("script", type="application/json")
        for script in script_tags:
            try:
                data = json.loads(script.string or "")
                info.update(self._extract_from_json(data))
            except (json.JSONDecodeError, TypeError):
                pass

        # __NEXT_DATA__
        next_data = soup.find("script", id="__NEXT_DATA__")
        if next_data:
            try:
                data = json.loads(next_data.string or "")
                info.update(self._extract_from_next_data(data))
            except (json.JSONDecodeError, TypeError):
                pass

        # 텍스트 기반 추출 (fallback)
        text = soup.get_text(" ", strip=True)

        # 사업자등록번호
        if not info.get("business_no"):
            biz_match = re.search(r"(\d{3}-\d{2}-\d{5})", text)
            if biz_match:
                info["business_no"] = biz_match.group(1)

        # 전화번호
        if not info.get("phone"):
            phone_match = re.search(
                r"(0\d{1,2}[-)]?\s?\d{3,4}[-]?\d{4})", text
            )
            if phone_match:
                info["phone"] = phone_match.group(1)

        # 이메일
        if not info.get("email"):
            email_match = re.search(
                r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text
            )
            if email_match:
                info["email"] = email_match.group(0)

        # 주소 → 지역
        if info.get("address") and not info.get("region"):
            info["region"] = self._extract_region(info["address"])

        return info

    def _extract_from_json(self, data: dict) -> dict:
        """JSON 데이터에서 사업자 정보 추출"""
        info = {}
        if isinstance(data, dict):
            for key, val in data.items():
                if isinstance(val, str):
                    k_lower = key.lower()
                    if "businessno" in k_lower or "bizno" in k_lower:
                        info["business_no"] = val
                    elif "representname" in k_lower or "ceoname" in k_lower:
                        info["business_name"] = val
                    elif "phone" in k_lower or "tel" in k_lower:
                        info["phone"] = val
                    elif "email" in k_lower or "mail" in k_lower:
                        info["email"] = val
                    elif "address" in k_lower or "addr" in k_lower:
                        info["address"] = val
                elif isinstance(val, dict):
                    info.update(self._extract_from_json(val))
                elif isinstance(val, list):
                    for item in val:
                        if isinstance(item, dict):
                            info.update(self._extract_from_json(item))
        return {k: v for k, v in info.items() if v}

    def _extract_from_next_data(self, data: dict) -> dict:
        """__NEXT_DATA__에서 스토어 정보 추출"""
        info = {}
        try:
            props = data.get("props", {}).get("pageProps", {})
            # 여러 경로 시도
            for path in [
                props.get("channelInfo", {}),
                props.get("storeInfo", {}),
                props.get("sellerInfo", {}),
                props,
            ]:
                if isinstance(path, dict):
                    info.update(self._extract_from_json(path))
        except (AttributeError, TypeError):
            pass
        return info

    @staticmethod
    def _extract_region(address: str) -> str:
        """주소에서 시/도 추출"""
        regions = [
            "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
            "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
        ]
        for r in regions:
            if r in address:
                return r + ("특별시" if r == "서울" else
                           "광역시" if r in ("부산", "대구", "인천", "광주", "대전", "울산") else
                           "특별자치시" if r == "세종" else
                           "특별자치도" if r == "제주" else "도")
        return ""

    # ── 전체 파이프라인 ───────────────────────────────────────────────────

    def run_full_pipeline(
        self,
        keywords: list[str],
        max_items_per_keyword: int = 100,
        fetch_details: bool = True,
        detail_delay: float = 0.3,
    ) -> pd.DataFrame:
        """
        키워드 검색 → 판매자 수집 → 상세 정보 → DataFrame

        Returns:
            판매자 DataFrame (mall_name, business_name, phone, email, ...)
        """
        print(f"\n[1/3] 키워드 {len(keywords)}개로 판매자 수집")
        print("=" * 60)
        sellers = self.collect_sellers_by_keywords(keywords, max_items_per_keyword)
        print(f"\n  → 총 {len(sellers)}개 판매자 발견")

        if not sellers:
            return pd.DataFrame()

        # DataFrame 기본 구성
        rows = []
        for mall, data in sellers.items():
            prices = data["prices"]
            avg_price = int(sum(prices) / len(prices)) if prices else 0

            # 대표 상품 3개
            seen = set()
            top_products = []
            for p in data["products"]:
                if p not in seen and len(top_products) < 3:
                    top_products.append(p)
                    seen.add(p)

            rows.append({
                "판매처(네이버)": mall,
                "인기상품 키워드수": len(data["keywords"]),
                "TOP10 횟수": data["top10_count"],
                "인기 키워드": ", ".join(sorted(data["keywords"])),
                "대표상품": " | ".join(top_products),
                "평균가격": avg_price,
                "대카테고리": ", ".join(sorted(data["categories"]))[:50] if data["categories"] else "",
                "카테고리": ", ".join(sorted(data["categories"])),
                "브랜드": ", ".join(sorted(data["brands"]))[:50] if data["brands"] else "",
            })

        df = pd.DataFrame(rows)

        # 상세 정보 수집
        if fetch_details:
            print(f"\n[2/3] 판매자 상세 정보 수집 ({len(df)}개)")
            print("=" * 60)
            details = self.fetch_sellers_info_batch(
                df["판매처(네이버)"].tolist(),
                delay=detail_delay,
                progress_every=50,
            )

            # 상세 정보 병합
            df["사업자명"] = df["판매처(네이버)"].map(lambda m: details.get(m, {}).get("business_name", ""))
            df["전화번호"] = df["판매처(네이버)"].map(lambda m: details.get(m, {}).get("phone", ""))
            df["이메일"] = df["판매처(네이버)"].map(lambda m: details.get(m, {}).get("email", ""))
            df["사업자번호"] = df["판매처(네이버)"].map(lambda m: details.get(m, {}).get("business_no", ""))
            df["주소"] = df["판매처(네이버)"].map(lambda m: details.get(m, {}).get("address", ""))
            df["지역"] = df["판매처(네이버)"].map(lambda m: details.get(m, {}).get("region", ""))
            df["쇼핑몰"] = df["판매처(네이버)"].map(lambda m: details.get(m, {}).get("store_url", ""))
            df["연락처확인"] = (df["전화번호"] != "") | (df["이메일"] != "")
        else:
            print("\n[2/3] 상세 정보 수집 건너뜀")
            for col in ["사업자명", "전화번호", "이메일", "사업자번호", "주소", "지역", "쇼핑몰", "연락처확인"]:
                df[col] = ""

        # 저장
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        today = datetime.today().strftime("%Y%m%d_%H%M")
        cache_path = DATA_DIR / f"naver_suppliers_{today}.csv"
        df.to_csv(cache_path, index=False, encoding="utf-8-sig")
        print(f"\n  캐시 저장: {cache_path}")

        return df
