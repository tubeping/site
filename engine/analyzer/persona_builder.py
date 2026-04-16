"""
AI 채널 페르소나 자동 생성기

YouTube 채널 데이터(영상 제목 + 댓글 + 통계)를 분석해
시청자 페르소나 + 추천 상품 카테고리를 자동 생성합니다.

GPT-4o를 사용하여:
  1. 영상 제목 패턴 → 콘텐츠 카테고리 분류
  2. 댓글 텍스트 → 시청자 관심사/연령대/성별 추정
  3. 조회수 패턴 → 잘 되는 콘텐츠 유형 식별
  4. 종합 → 채널 페르소나 + 추천 상품 카테고리
"""

import json
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from openai import OpenAI


PERSONA_PROMPT = """당신은 유튜브 채널 분석 전문가입니다.
아래 채널 데이터를 분석해서 채널 페르소나를 생성해주세요.

## 채널 기본 정보
- 채널명: {channel_name}
- 구독자: {subscribers:,}명
- 총 조회수: {total_views:,}회
- 영상 수: {video_count}개
- 평균 조회수: {avg_views:,}회
- 평균 좋아요: {avg_likes:,}개
- 참여율: {engagement_rate}%
- 채널 설명: {description}

## 최신 영상 제목 (최근 {video_analyzed}개)
{video_titles}

## 인기 영상 TOP 3
{top_videos}

## 시청자 댓글 샘플 ({comment_count}개 중 상위)
{comments_sample}

---

위 데이터를 분석해서 반드시 아래 JSON 형식으로만 응답해주세요:

{{
  "channel_category": "메인 콘텐츠 카테고리 (예: 건강/웰빙, 재테크, 뷰티 등)",
  "sub_categories": ["서브 카테고리1", "서브 카테고리2"],
  "content_style": "콘텐츠 스타일 한 줄 요약",
  "audience": {{
    "estimated_age": {{
      "10대": 비율,
      "20대": 비율,
      "30대": 비율,
      "40대": 비율,
      "50대": 비율,
      "60대이상": 비율
    }},
    "estimated_gender": {{
      "여성": 비율,
      "남성": 비율
    }},
    "core_interests": ["관심사1", "관심사2", "관심사3", "관심사4", "관심사5"],
    "pain_points": ["시청자 고민/니즈1", "고민/니즈2", "고민/니즈3"],
    "purchase_signals": ["구매 관련 댓글 패턴1", "패턴2"]
  }},
  "recommended_product_categories": ["추천 상품 카테고리1", "카테고리2", "카테고리3"],
  "recommended_keywords": ["추천 소싱 키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "channel_strengths": ["채널 강점1", "강점2"],
  "collab_fit": "이 채널과 상품 협업 시 포인트 한 줄 요약",
  "tier": "메가/매크로/마이크로/나노 중 하나"
}}

주의사항:
- 비율은 % 기호 없이 숫자만 (합계 100)
- 댓글에서 구매의향/관심사를 꼭 추출해주세요
- 추천 키워드는 셀러라이프/네이버 쇼핑에서 검색할 수 있는 실제 상품 키워드로
- 채널 구독자 규모: 100만+ 메가, 10만+ 매크로, 1만+ 마이크로, 그 외 나노
"""


class PersonaBuilder:
    """AI 기반 채널 페르소나 생성기"""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def build_persona(self, analysis: dict) -> dict | None:
        """
        YouTubeFetcher.analyze_channel() 결과 → 페르소나 생성

        Args:
            analysis: {channel, videos, comments, stats}

        Returns:
            페르소나 dict (JSON 파싱 결과)
        """
        channel = analysis["channel"]
        videos = analysis["videos"]
        comments = analysis["comments"]
        stats = analysis["stats"]

        # 영상 제목 포맷
        video_titles = "\n".join(
            f"- {v['title']} (조회수 {v['view_count']:,})"
            for v in videos[:30]
        )

        # TOP 3 인기 영상
        sorted_vids = sorted(videos, key=lambda v: v["view_count"], reverse=True)
        top_videos = "\n".join(
            f"- [{i+1}위] {v['title']} — 조회 {v['view_count']:,} / 좋아요 {v['like_count']:,} / 댓글 {v['comment_count']:,}"
            for i, v in enumerate(sorted_vids[:3])
        )

        # 댓글 샘플 (좋아요 많은 순)
        sorted_comments = sorted(comments, key=lambda c: c["like_count"], reverse=True)
        comments_sample = "\n".join(
            f"- [{c.get('video_title', '')[:20]}] {c['text'][:100]} (좋아요 {c['like_count']})"
            for c in sorted_comments[:30]
        )

        prompt = PERSONA_PROMPT.format(
            channel_name=channel["name"],
            subscribers=channel["subscriber"],
            total_views=channel["total_views"],
            video_count=channel["video_count"],
            avg_views=stats["avg_views"],
            avg_likes=stats["avg_likes"],
            engagement_rate=stats["engagement_rate"],
            description=channel["description"][:200],
            video_analyzed=len(videos),
            video_titles=video_titles,
            top_videos=top_videos,
            comment_count=len(comments),
            comments_sample=comments_sample,
        )

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.3,
        )

        text = response.choices[0].message.content.strip()

        # JSON 추출
        if "```" in text:
            start = text.find("{")
            end = text.rfind("}") + 1
            text = text[start:end]

        try:
            persona = json.loads(text)
            # 원본 채널 정보 병합
            persona["_channel"] = channel
            persona["_stats"] = stats
            return persona
        except json.JSONDecodeError:
            return None

    def persona_to_channel_config(self, persona: dict) -> dict:
        """
        페르소나 → scorer/recommend_bot이 사용하는 채널 config dict 변환
        """
        channel = persona.get("_channel", {})
        audience = persona.get("audience", {})
        age = audience.get("estimated_age", {})
        gender = audience.get("estimated_gender", {"여성": 50, "남성": 50})

        interests = audience.get("core_interests", [])
        categories = persona.get("recommended_product_categories", [])
        keywords = persona.get("recommended_keywords", [])

        _category_id_map = {
            "식품": "50000016",
            "생활건강": "50000167",
            "화장품/미용": "50000009",
            "디지털/가전": "50000078",
            "패션/의류": "50000070",
            "스포츠/레저": "50000075",
            "완구/취미": "50000062",
            "반려동물": "50000191",
        }

        # 추천 카테고리에서 네이버 카테고리 ID 매핑
        naver_id = "50000167"  # 기본: 생활건강
        for cat in categories:
            for key, cid in _category_id_map.items():
                if key in cat:
                    naver_id = cid
                    break

        return {
            "id": channel.get("channel_id", channel.get("name", "")),
            "name": channel.get("name", ""),
            "subscriber": channel.get("subscriber", 0),
            "age": age,
            "gender": gender,
            "device": {"모바일": 75, "PC": 15, "TV": 5, "태블릿": 5},
            "interests": interests,
            "categories": categories,
            "keywords": interests + keywords,
            "naver_category_id": naver_id,
            "target_price_range": [5000, 100000],
            "margin_target": 0.35,
            "weight": 1.0,
            # 페르소나 추가 정보
            "channel_category": persona.get("channel_category", ""),
            "content_style": persona.get("content_style", ""),
            "pain_points": audience.get("pain_points", []),
            "purchase_signals": audience.get("purchase_signals", []),
            "channel_strengths": persona.get("channel_strengths", []),
            "collab_fit": persona.get("collab_fit", ""),
            "thumbnail": channel.get("thumbnail", ""),
            "description": channel.get("description", ""),
        }
