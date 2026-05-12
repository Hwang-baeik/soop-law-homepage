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
  title: "숲 법무사 사무소",
  description: "숲 법무사 사무소에 오신것을 환영합니다.",
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
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
