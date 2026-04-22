# tubeping.site (회사 홈페이지) — Claude 작업 지침

이 디렉토리는 **tubeping.site 홈페이지 전용**입니다.
TubePing 크리에이터 커머스 풀필먼트 서비스의 **공개 마케팅 사이트**.

## 작업 실행 규칙
- 모든 파일 생성/수정 작업은 승인 없이 자동으로 진행
- 중간에 yes/no 확인 요청 금지
- 판단이 필요한 경우 최선의 선택을 하고 실행 후 결과 보고

## ⚠️ 이 디렉토리 범위 (절대 규칙)

### 허용 경로
- `c:/tubeping-site/` 내 모든 파일
- `git push origin main` (`tubeping/site` repo)
- Vercel `tubeping.site` 프로젝트 배포

### 절대 금지
- ❌ `c:/tubeping-sourcing/` 디렉토리 참조/수정 (builder/admin 영역)
- ❌ `tubeping/builder`, `tubeping/admin` repo를 원격 추가
- ❌ `app/page.tsx`를 `redirect("/dashboard")` 등으로 변경
- ❌ `app/dashboard`, `app/admin`, `app/onboarding`, `app/shop`, `app/auth` 추가
- ❌ builder용 API 추가 (`app/api/cafe24`, `coupang`, `me`, `picks`, `shop`, `youtube`, `parse-insight` 등)

### 과거 사고 이력 (3회 반복)
이 코드는 과거 `tubeping/admin` repo와 코드를 공유했음. 빌더 에이전트 작업이
tubeping.site를 3회 오염시켰음. **2026-04-22에 완전 분리 완료.**

## 레포지토리 및 배포

| 항목 | 값 |
|------|-----|
| GitHub | `tubeping/site` |
| Vercel | `tubeping.site` (prj_cnOMLvvk1SNaQwG5tIm67cwURgvY) |
| 도메인 | tubeping.site |
| 자동배포 | `git push origin main` → Vercel 자동 빌드 |

## 페이지 구성 (전체)

```
app/
├── page.tsx              ← 랜딩페이지 (절대 redirect로 변경 금지)
├── layout.tsx            ← 공통 레이아웃 + SEO 메타
├── blog/
│   ├── page.tsx          ← 블로그 목록 (검색·카테고리 필터)
│   ├── [slug]/page.tsx   ← 블로그 상세 (Article JSON-LD)
│   └── _components/      ← BlogListClient 등
├── terms/page.tsx        ← 이용약관
├── privacy/page.tsx      ← 개인정보처리방침
├── sitemap.ts            ← 동적 sitemap
├── robots.ts             ← robots.txt
├── feed.xml/route.ts     ← RSS 피드
└── api/
    ├── apply/            ← 입점신청 (Gmail SMTP로 master@shinsananalytics.com에 알림)
    ├── blog/             ← 블로그 CRUD
    └── cron/gsc-report/  ← 주간 SEO 자동 리포트 (Vercel Cron, 매주 월요일)
```

## middleware.ts 방어 코드

`tubeping.site` 호스트로 들어오는 요청 중 허용된 경로 외
(예: `/dashboard`, `/admin`, `/onboarding` 등)는 자동으로 `/`로 302 리다이렉트.
**빌더 코드가 실수로 유입되더라도 사용자에게 노출되지 않도록 하는 방어 장치.**
절대 제거하지 말 것.

## 환경변수 (Vercel Production)

| 키 | 용도 |
|----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 블로그 글 조회 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 블로그 글 조회 |
| `SUPABASE_SERVICE_ROLE_KEY` | 블로그 글 서버사이드 조회 |
| `SMTP_USER` / `SMTP_PASS` | 입점신청·SEO 리포트 Gmail 발송 |
| `CRON_SECRET` | Vercel Cron 엔드포인트 보호 |
| `REPORT_EMAIL` | SEO 리포트 수신자 |
| `GSC_CLIENT_EMAIL`, `GSC_PRIVATE_KEY` | Google Search Console API (설정 필요) |
| `ANTHROPIC_API_KEY` | AI 분석 (선택) |

## 기술 스택

- Next.js 16.x App Router + TypeScript
- Tailwind CSS
- Supabase (블로그 `blog_posts` 테이블만 사용)
- Vercel 배포

## 브랜드

- **Tube**: `#C41E1E` (빨강)
- **Ping**: `#111111` (검정)
- Primary 버튼: bg `#C41E1E`, hover `#A01818`

## SEO 체크리스트

모든 페이지 반드시 갖출 것:
- `generateMetadata()` 또는 정적 `metadata` export
- `alternates.canonical` 설정
- OG 태그 (title, description, image, type, url)
- Twitter Card 메타
- 블로그 글은 Article JSON-LD 포함

현재 SEO 상태 (2026-04-22):
- ✅ robots.txt: admin/api/dashboard 차단
- ✅ sitemap.xml: 모든 블로그 글 자동 포함
- ✅ Google Search Console 인증
- ✅ Naver 웹마스터 인증
- ✅ 주간 자동 리포트 (GSC API → Claude 분석 → Gmail)

## 보안

- `.env.local`은 git 커밋 금지 (.gitignore 확인)
- Supabase RLS 필수
- API 라우트는 API 키 검증 필수
