import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "守望先锋战绩 AI 总结",
  description: "查询公开守望先锋战绩，并用 AI 生成中文分析和锐评。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
