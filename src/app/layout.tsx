import type { CSSProperties, ReactNode } from "react";
import type { Metadata, Viewport } from "next";
// فونت‌ها از پکیج‌های npm و داخل خودِ پروژه سرو می‌شوند (self-hosted).
// قبلاً از next/font/google استفاده می‌شد که در زمان build فایل‌ها را از
// fonts.googleapis.com دانلود می‌کرد و اگر بیلدسرور به گوگل دسترسی نداشت،
// کل بیلد ورسل شکست می‌خورد.
import "@fontsource-variable/noto-naskh-arabic";
import "@fontsource-variable/noto-sans-arabic";
import "@fontsource-variable/vazirmatn";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/queries";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "حساب من | حسابداری ساده دکان",
  description: "خرید، فروش، گدام و خزانه برای کسب‌وکار کوچک — به افغانی و چند ارز",
  manifest: "/manifest.json",
  applicationName: "حساب من",
  appleWebApp: {
    capable: true,
    title: "حساب من",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/icon-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#147A6A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  let settings = DEFAULT_SETTINGS;
  try {
    settings = await getSettings();
  } catch {
    settings = DEFAULT_SETTINGS;
  }

  const fontFamily =
    settings.fontFamily === "noto-sans"
      ? '"Noto Sans Arabic Variable", Tahoma, sans-serif'
      : settings.fontFamily === "noto-naskh"
        ? '"Noto Naskh Arabic Variable", Tahoma, sans-serif'
        : '"Vazirmatn Variable", Tahoma, sans-serif';

  return (
    <html
      lang="fa"
      dir="rtl"
      data-theme={settings.themeMode}
      data-size={settings.fontSize}
      data-font={settings.fontFamily}
      style={
        {
          "--primary": settings.primaryColor,
          "--primary-soft": `${settings.primaryColor}24`,
          fontFamily,
        } as CSSProperties
      }
    >
      <body>{children}</body>
    </html>
  );
}
