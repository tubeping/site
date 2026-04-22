import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tubeping.site"),
  title: {
    default: "TubePing — 유튜브 쇼핑 채널을 위한 올인원 커머스 플랫폼",
    template: "%s | TubePing",
  },
  description:
    "인플루언서는 콘텐츠에만 집중하세요. 상품 소싱부터 배송·CS까지 TubePing이 합니다. 초기 투자비 0원. 신산애널리틱스 운영.",
  keywords: [
    "튜핑", "TubePing", "유튜브 쇼핑", "SNS 커머스", "인플루언서 커머스",
    "유튜브 쇼핑몰", "크리에이터 커머스", "신산애널리틱스",
    "유튜브 상품 판매", "인플루언서 쇼핑몰", "SNS 풀필먼트",
    "유튜브 채널 수익화", "크리에이터 굿즈", "소셜 커머스 플랫폼",
  ],
  authors: [{ name: "신산애널리틱스", url: "https://tubeping.site" }],
  creator: "신산애널리틱스",
  publisher: "신산애널리틱스",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
  },
  openGraph: {
    title: "TubePing — 콘텐츠에만 집중하세요. 쇼핑 사업은 TUBEPING이 합니다.",
    description:
      "상품 소싱부터 배송·CS까지 필요한 모든 것을 제공합니다. 23+ 파트너 유튜버, 1,000만+ 누적 구독자. 초기 투자비 0원.",
    siteName: "TubePing",
    locale: "ko_KR",
    type: "website",
    url: "https://tubeping.site",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TubePing — 유튜브 쇼핑 채널 올인원 커머스",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TubePing — 유튜브 쇼핑 채널 올인원 커머스",
    description: "콘텐츠에만 집중하세요. 쇼핑 사업은 TUBEPING이 합니다.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://tubeping.site",
    types: {
      "application/rss+xml": "https://tubeping.site/feed.xml",
    },
  },
  verification: {
    google: "rLxhpki-m73eWm1G0Vhv3E51ZwTs54SzhZeMTtAyw4A",
    other: {
      "naver-site-verification": "d35669a74761ebebc181fa4b03c4f37cd744845f",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://tubeping.site/#organization",
                  name: "TubePing",
                  alternateName: "튜핑",
                  url: "https://tubeping.site",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://tubeping.site/favicon.png",
                    width: 256,
                    height: 256,
                  },
                  description:
                    "유튜브 쇼핑 채널을 위한 올인원 커머스 플랫폼. 상품 소싱부터 배송·CS까지 인플루언서 커머스에 필요한 모든 것을 제공합니다.",
                  foundingDate: "2025",
                  founder: {
                    "@type": "Person",
                    name: "최준",
                  },
                  parentOrganization: {
                    "@type": "Organization",
                    name: "신산애널리틱스",
                    alternateName: "㈜신산애널리틱스",
                  },
                  sameAs: [],
                  contactPoint: {
                    "@type": "ContactPoint",
                    telephone: "+82-10-8550-4919",
                    contactType: "sales",
                    availableLanguage: "Korean",
                  },
                  offers: {
                    "@type": "Offer",
                    description: "SNS 커머스 풀필먼트 서비스",
                    price: "0",
                    priceCurrency: "KRW",
                  },
                },
                {
                  "@type": "WebSite",
                  "@id": "https://tubeping.site/#website",
                  url: "https://tubeping.site",
                  name: "TubePing",
                  description:
                    "유튜브 쇼핑 채널을 위한 올인원 커머스 플랫폼",
                  publisher: { "@id": "https://tubeping.site/#organization" },
                  inLanguage: "ko-KR",
                },
              ],
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
