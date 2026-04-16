"""
TubePing 상품 소싱 추천 시스템

사용법:
    python main.py run          # 전체 실행 (수집 + 분석 + 리포트)
    python main.py fetch        # 데이터 수집만
    python main.py analyze      # 저장된 데이터로 분석만
    python main.py run --channels ch001 ch002   # 특정 채널만

환경변수 (.env 파일 또는 직접 설정):
    NAVER_CLIENT_ID       - 네이버 API Client ID (공식 API 방식)
    NAVER_CLIENT_SECRET   - 네이버 API Client Secret
    DATALAB_COOKIES       - DataLab 브라우저 쿠키 (쿠키 방식)
    SELLERLIFE_ID         - 셀러라이프 아이디
    SELLERLIFE_PW         - 셀러라이프 비밀번호
    SELLERLIFE_COOKIES    - 셀러라이프 브라우저 쿠키 (쿠키 방식)
"""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

# .env 파일 자동 로드 (python-dotenv 있을 경우)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fetchers.datalab import DataLabFetcher, load_cached_trends
from fetchers.sellerlife import SellerLifeFetcher, load_cached_products
from analyzer.scorer import ProductScorer
from output.exporter import export_results
from agents.recommend_bot import RecommendBot


def build_fetchers() -> tuple[DataLabFetcher, SellerLifeFetcher]:
    """환경변수에서 인증정보를 읽어 fetcher 인스턴스 생성"""
    datalab = DataLabFetcher(
        client_id=os.getenv("NAVER_CLIENT_ID"),
        client_secret=os.getenv("NAVER_CLIENT_SECRET"),
        cookies=os.getenv("DATALAB_COOKIES"),
    )
    sellerlife = SellerLifeFetcher(
        username=os.getenv("SELLERLIFE_ID"),
        password=os.getenv("SELLERLIFE_PW"),
        cookies=os.getenv("SELLERLIFE_COOKIES"),
    )
    return datalab, sellerlife


def run_fetch(channels: list[dict], datalab: DataLabFetcher, sellerlife: SellerLifeFetcher):
    """채널별 데이터 수집"""
    print("\n[1/3] 데이터 수집 시작")
    print("=" * 60)

    for ch in channels:
        cid = ch["id"]
        name = ch["name"]
        print(f"\n채널: {name} ({cid})")

        # DataLab 수집
        if datalab.client_id or datalab.cookies:
            datalab.fetch_and_save(
                channel_id=cid,
                category_id=ch["naver_category_id"],
                keywords=ch["keywords"],
            )
        else:
            print("  [건너뜀] DataLab 인증정보 없음 → .env 파일 확인")

        # 셀러라이프 수집
        if sellerlife.logged_in:
            sellerlife.fetch_by_channel(
                channel_id=cid,
                keywords=ch["keywords"],
                price_range=tuple(ch.get("target_price_range", [0, 999999])),
            )
        else:
            print("  [건너뜀] 셀러라이프 미로그인 → .env 파일 확인")


def run_analyze(channels: list[dict], scorer: ProductScorer) -> dict:
    """저장된 데이터로 분석 실행"""
    print("\n[2/3] 분석 시작")
    print("=" * 60)

    results = {}
    today = datetime.today().strftime("%Y%m%d")

    for ch in channels:
        cid = ch["id"]
        name = ch["name"]
        print(f"\n채널: {name} ({cid})")

        # 캐시 로드
        trend_df = load_cached_trends(cid, today)
        products_df = load_cached_products(cid, today)

        if trend_df.empty:
            print("  [경고] DataLab 데이터 없음 (트렌드 점수 0으로 처리)")
        if products_df.empty:
            print("  [경고] 셀러라이프 데이터 없음 → fetch 먼저 실행")
            continue

        # 트렌드 요약
        from fetchers.datalab import DataLabFetcher
        trend_summary = DataLabFetcher.summarize_trends(trend_df) if not trend_df.empty else {}

        # 점수 계산
        scored = scorer.score_products(products_df, trend_summary, ch)
        results[name] = scored

        # 상위 5개 미리보기
        top5 = scored.head(5)[["name", "total_score", "grade", "recommendation"]]
        print(f"  TOP 5 추천 상품:")
        for _, row in top5.iterrows():
            print(f"    [{row['grade']}] {row['total_score']:5.1f}점  {row['name'][:30]}")
            print(f"          → {row['recommendation']}")

    return results


def run_recommend(results: dict, top_n: int = 10, min_grade: str = "B"):
    """추천봇: 인플루언서 맞춤 상품 추천"""
    print("\n[추천봇] 인플루언서 맞춤 추천 생성")
    print("=" * 60)

    if not results:
        print("  분석 결과 없음 - 추천 생성 건너뜀")
        return

    bot = RecommendBot()
    packages = bot.recommend(results, top_n=top_n, min_grade=min_grade)
    bot.print_recommendations(packages)
    bot.export_briefs(packages)


def run_export(results: dict, output_file: str = None):
    """Excel 리포트 생성"""
    print("\n[3/3] 리포트 생성")
    print("=" * 60)

    if not results:
        print("  분석 결과 없음 - 리포트 생성 건너뜀")
        return

    path = export_results(results, filename=output_file)
    print(f"  리포트: {path}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="TubePing 상품 소싱 추천 시스템",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "command",
        choices=["run", "fetch", "analyze", "recommend"],
        help="실행 모드 (recommend: 추천봇 인플루언서 맞춤 추천)",
    )
    parser.add_argument(
        "--channel",
        nargs="+",
        metavar="CHANNEL_NAME",
        help="처리할 채널명 (예: 신사임당 뉴스엔진). 생략하면 전체 채널",
    )
    parser.add_argument(
        "--output",
        metavar="FILENAME",
        help="리포트 파일명 (기본: tubeping_sourcing_YYYYMMDD_HHMM.xlsx)",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=30,
        help="채널별 상위 N개 (기본: 30)",
    )
    args = parser.parse_args()

    scorer = ProductScorer()
    all_channels = scorer.get_all_channels()

    # 채널 필터
    if args.channel:
        channels = [ch for ch in all_channels if ch["name"] in args.channel]
        if not channels:
            available = [ch["name"] for ch in all_channels]
            print(f"오류: 채널을 찾을 수 없습니다: {args.channel}")
            print(f"등록된 채널: {available}")
            sys.exit(1)
    else:
        channels = all_channels

    print(f"\nTubePing 소싱 추천 시스템")
    print(f"대상 채널: {[ch['name'] for ch in channels]}")
    print(f"실행 모드: {args.command}")

    datalab, sellerlife = build_fetchers()

    if args.command == "fetch":
        run_fetch(channels, datalab, sellerlife)

    elif args.command == "analyze":
        results = run_analyze(channels, scorer)
        run_export(results, args.output)

    elif args.command == "recommend":
        results = run_analyze(channels, scorer)
        run_recommend(results, top_n=args.top, min_grade="B")

    elif args.command == "run":
        run_fetch(channels, datalab, sellerlife)
        results = run_analyze(channels, scorer)
        run_export(results, args.output)
        run_recommend(results, top_n=args.top, min_grade="B")

    print("\n완료!")


if __name__ == "__main__":
    main()
