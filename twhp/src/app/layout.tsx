import type { Metadata } from "next";
// 1. นำเข้า Noto_Sans_Thai (และ Geist_Mono ถ้ายังอยากใช้กับ code block)
import { Noto_Sans_Thai, Geist_Mono } from "next/font/google";
import "./globals.css";

// 2. ประกาศตัวแปร Noto Sans Thai
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-sans-thai",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

// คงไว้เฉพาะ Mono ถ้าต้องการใช้กับพวก code (ถ้าไม่ใช้ ลบออกได้เลย)
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "twhp",
  description: "twhp สถานประกอบการ ปลอดโรค ปลอดภัย กายใจเป็นสุข",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        // ใส่ variable เข้าไปตรงนี้
        className={`${notoSansThai.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}