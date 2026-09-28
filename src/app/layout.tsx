import type { CSSProperties, ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Noto_Naskh_Arabic, Noto_Sans_Arabic, Vazirmatn } from "next/font/google";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/queries";
import "./globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
  display: "swap",
});

const notoSans = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoNaskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-naskh",
  display: "swap",
});

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
      ? "var(--font-noto-sans), Tahoma, sans-serif"
      : settings.fontFamily === "noto-naskh"
        ? "var(--font-noto-naskh), Tahoma, sans-serif"
        : "var(--font-vazir), Tahoma, sans-serif";

  return (
    <html
      lang="fa"
      dir="rtl"
      data-theme={settings.themeMode}
      data-size={settings.fontSize}
      data-font={settings.fontFamily}
      className={`${vazir.variable} ${notoSans.variable} ${notoNaskh.variable}`}
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
