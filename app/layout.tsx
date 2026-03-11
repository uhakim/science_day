import type { Metadata } from "next";
import { Nanum_Gothic } from "next/font/google";
import "./globals.css";

const nanum = Nanum_Gothic({
  variable: "--font-nanum",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

export const metadata: Metadata = {
  title: "과학의 날 조 신청",
  description: "초등학교 과학 행사 참가 신청 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${nanum.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
