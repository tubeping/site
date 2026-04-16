"""
셀러라이프(sellerlife.co.kr) 상품 수집기

셀러라이프는 국내 도매/위탁 소싱 플랫폼으로,
로그인 후 카테고리/키워드로 상품을 검색하고 도매가·소매가·MOQ 정보를 제공합니다.
"""

import json
import time
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode

import requests
import pandas as pd
from bs4 import BeautifulSoup

DATA_DIR = Path(__file__).parent.parent / "data" / "sellerlife"

BASE_URL = "https://www.sellerlife.co.kr"
LOGIN_URL = f"{BASE_URL}/member/login_proc.php"
SEARCH_URL = f"{BASE_URL}/goods/goods_search.php"
CATEGORY_URL = f"{BASE_URL}/goods/goods_list.php"


class SellerLifeFetcher:
    """셀러라이프 상품 데이터 수집"""

    def __init__(self, username: str = None, password: str = None, cookies: str = None):
        """
        Args:
            username: 셀러라이프 아이디
            password: 셀러라이프 비밀번호
            cookies: 브라우저에서 복사한 Cookie 문자열 (로그인 대체)
        """
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Referer": BASE_URL,
        })
        self.logged_in = False

        if cookies:
            self._set_cookies(cookies)
            self.logged_in = True
        elif username and password:
            self.login(username, password)

    def _set_cookies(self, cookie_str: str):
        """쿠키 문자열을 세션에 적용"""
        for item in cookie_str.split(";"):
            item = item.strip()
            if "=" in item:
                name, value = item.split("=", 1)
                self.session.cookies.set(name.strip(), value.strip(), domain="www.sellerlife.co.kr")

    def login(self, username: str, password: str) -> bool:
        """셀러라이프 로그인"""
        try:
            resp = self.session.post(
                LOGIN_URL,
                data={"id": username, "pw": password, "autoLogin": "1"},
                allow_redirects=True,
                timeout=10,
            )
            if "로그아웃" in resp.text or "mypage" in resp.url:
                self.logged_in = True
                print("  셀러라이프 로그인 성공")
                return True
            else:
                print("  셀러라이프 로그인 실패: 아이디/비밀번호 확인")
                return False
        except Exception as e:
            print(f"  로그인 오류: {e}")
            return False

    # ── 상품 검색 ─────────────────────────────────────────────────────────────

    def search_products(
        self,
        keyword: str,
        max_pages: int = 3,
        min_price: int = 0,
        max_price: int = 999999,
        sort: str = "popular",  # popular | new | low_price | high_price
    ) -> pd.DataFrame:
        """
        키워드로 상품 검색

        Args:
            keyword: 검색 키워드
            max_pages: 최대 수집 페이지 수
            min_price: 최소 도매가 (원)
            max_price: 최대 도매가 (원)
            sort: 정렬 방식

        Returns:
            상품 DataFrame (name, wholesale_price, retail_price, moq, margin_rate, url, ...)
        """
        all_products = []
        sort_map = {"popular": "popular", "new": "reg_dt", "low_price": "price_asc", "high_price": "price_desc"}

        for page in range(1, max_pages + 1):
            params = {
                "search_type": "all",
                "keyword": keyword,
                "page": page,
                "sort": sort_map.get(sort, "popular"),
            }
            try:
                resp = self.session.get(SEARCH_URL, params=params, timeout=15)
                resp.raise_for_status()
                products = self._parse_product_list(resp.text, keyword)
                if not products:
                    break
                all_products.extend(products)
                time.sleep(0.5)
            except Exception as e:
                print(f"  [경고] 페이지 {page} 수집 실패: {e}")
                break

        df = pd.DataFrame(all_products)
        if not df.empty and min_price > 0:
            df = df[df["wholesale_price"] >= min_price]
        if not df.empty and max_price < 999999:
            df = df[df["wholesale_price"] <= max_price]
        return df

    def fetch_by_channel(
        self,
        channel_id: str,
        keywords: list[str],
        price_range: tuple = (0, 999999),
        max_pages: int = 3,
    ) -> pd.DataFrame:
        """채널 키워드 목록으로 상품 일괄 수집 후 저장"""
        all_dfs = []
        for kw in keywords:
            print(f"  셀러라이프 검색: '{kw}'")
            df = self.search_products(
                kw,
                max_pages=max_pages,
                min_price=price_range[0],
                max_price=price_range[1],
            )
            if not df.empty:
                df["search_keyword"] = kw
                all_dfs.append(df)
            time.sleep(0.3)

        if not all_dfs:
            return pd.DataFrame()

        result = pd.concat(all_dfs, ignore_index=True)
        result = result.drop_duplicates(subset=["product_id"], keep="first")

        # 저장
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        filename = DATA_DIR / f"{channel_id}_{datetime.today().strftime('%Y%m%d')}.csv"
        result.to_csv(filename, index=False, encoding="utf-8-sig")
        print(f"  저장 완료: {filename} ({len(result)}개 상품)")

        return result

    # ── HTML 파싱 ─────────────────────────────────────────────────────────────

    def _parse_product_list(self, html: str, keyword: str) -> list[dict]:
        """상품 목록 HTML 파싱"""
        soup = BeautifulSoup(html, "html.parser")
        products = []

        # 셀러라이프 상품 목록 구조에 맞게 파싱
        # 실제 구조: <div class="goods_list"> > <li class="item"> ...
        items = soup.select("ul.goods_list li.item") or soup.select(".prd_list .prd_item")

        for item in items:
            try:
                product = self._parse_product_item(item, keyword)
                if product:
                    products.append(product)
            except Exception:
                continue

        return products

    def _parse_product_item(self, item, keyword: str) -> dict | None:
        """단일 상품 아이템 파싱"""
        # 상품명
        name_el = item.select_one(".goods_name") or item.select_one(".prd_name") or item.select_one("a.name")
        if not name_el:
            return None
        name = name_el.get_text(strip=True)

        # 상품 URL & ID
        link_el = item.select_one("a[href*='goods_no']") or item.select_one("a[href*='goods_view']")
        url = BASE_URL + link_el["href"] if link_el else ""
        product_id = re.search(r"goods_no=(\d+)", url)
        product_id = product_id.group(1) if product_id else ""

        # 도매가 (공급가)
        supply_el = (
            item.select_one(".supply_price")
            or item.select_one(".cost_price")
            or item.select_one("[class*='supply']")
        )
        wholesale_price = self._extract_price(supply_el)

        # 소비자가 (판매가)
        retail_el = (
            item.select_one(".sell_price")
            or item.select_one(".consumer_price")
            or item.select_one("[class*='sell']")
        )
        retail_price = self._extract_price(retail_el)

        # 마진율 계산
        if retail_price > 0 and wholesale_price > 0:
            margin_rate = round((retail_price - wholesale_price) / retail_price * 100, 1)
        else:
            margin_rate = 0.0

        # MOQ (최소주문수량)
        moq_el = item.select_one(".moq") or item.select_one("[class*='min_qty']")
        moq_text = moq_el.get_text(strip=True) if moq_el else "1"
        moq = int(re.search(r"\d+", moq_text).group()) if re.search(r"\d+", moq_text) else 1

        # 이미지
        img_el = item.select_one("img")
        img_url = img_el.get("src", "") if img_el else ""
        if img_url.startswith("//"):
            img_url = "https:" + img_url

        # 배송비
        ship_el = item.select_one(".delivery_price") or item.select_one("[class*='ship']")
        ship_text = ship_el.get_text(strip=True) if ship_el else ""
        ship_price = self._extract_price(ship_el) if ship_el else 0

        return {
            "product_id": product_id,
            "name": name,
            "search_keyword": keyword,
            "wholesale_price": wholesale_price,
            "retail_price": retail_price,
            "margin_rate": margin_rate,
            "moq": moq,
            "shipping_price": ship_price,
            "url": url,
            "image_url": img_url,
            "fetched_at": datetime.today().strftime("%Y-%m-%d"),
        }

    @staticmethod
    def _extract_price(el) -> int:
        """HTML 요소에서 가격 숫자 추출"""
        if el is None:
            return 0
        text = el.get_text(strip=True)
        nums = re.findall(r"[\d,]+", text)
        if nums:
            return int(nums[0].replace(",", ""))
        return 0


def load_cached_products(channel_id: str, date_str: str = None) -> pd.DataFrame:
    """캐시된 셀러라이프 상품 데이터 로드"""
    if date_str is None:
        date_str = datetime.today().strftime("%Y%m%d")
    path = DATA_DIR / f"{channel_id}_{date_str}.csv"
    if path.exists():
        return pd.read_csv(path)
    return pd.DataFrame()
