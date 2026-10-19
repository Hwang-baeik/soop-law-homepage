import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "../components/site-header";
import { ManagedCompanyCountBanner } from "../components/managed-company-count-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sooplaw.com"),
  title: "숲 법무사 사무소",
  description: "서울 성동구 성수역 인근 숲 법무사 사무소. 법인등기, 부동산등기, 상속절차 및 민사서류 업무의 필요서류·비용·일정을 안내합니다.",
    
    verification: {
    google: "kEDBgoWg7GpUDbUjWnLofF2Cy4A4Qg3onmY4TpGtINY",
    other: {
      "naver-site-verification": "c3f0dffec0cd8fa5698befb437956d73352831fa" ,
    },
  },
  openGraph: {
    title: "숲 법무사 사무소",
    description:
      "법인등기, 부동산등기, 상속등기, 민사서류 업무를 정확하게 안내합니다.",
    url: "https://sooplaw.com",
    siteName: "숲 법무사 사무소",
    locale: "ko_KR",
    type: "website",
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
      <body className="min-h-full flex flex-col"><SiteHeader /><ManagedCompanyCountBanner />{children}</body>
    </html>
  );
}
