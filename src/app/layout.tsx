import type { Metadata, Viewport } from "next";
import { Alexandria, Assistant, Manrope } from "next/font/google";
import { OneSignalCartSync } from "@/components/onesignal-cart-sync";
import { OneSignalInit } from "@/components/onesignal-init";
import { PwaRegister } from "@/components/pwa-register";
import { SmoothScroll } from "@/components/smooth-scroll";
import { siteUrl } from "@/lib/site";
import "./globals.css";
import "./flora-2026.css";

const arabicFont = Alexandria({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic"
});

const hebrewFont = Assistant({
  subsets: ["hebrew"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hebrew"
});

const latinFont = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-latin"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Flora Style",
    template: "%s | Flora Style"
  },
  description: "Luxury bilingual fashion storefront for handbags, accessories, watches, and curated statement pieces.",
  applicationName: "Flora Style",
  manifest: "/manifest.webmanifest",
  keywords: ["Flora Style", "luxury fashion", "Arabic storefront", "Hebrew storefront", "bags", "accessories", "watches"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: ["/favicon.svg"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "Flora Style",
    statusBarStyle: "default"
  },
  openGraph: {
    title: "Flora Style",
    description: "Shop Flora Style collections and order directly through WhatsApp.",
    images: ["/opengraph-image"],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Flora Style",
    description: "Luxury bilingual shopping experience with direct WhatsApp ordering.",
    images: ["/opengraph-image"]
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  other: {
    "google-adsense-account": "ca-pub-9795267028504854"
  }
};

export const viewport: Viewport = {
  themeColor: "#f7f3ee",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-theme="light"
      className={`${arabicFont.variable} ${hebrewFont.variable} ${latinFont.variable}`}
    >
      <body>
        <SmoothScroll>{children}</SmoothScroll>
        <OneSignalInit />
        <OneSignalCartSync />
        <PwaRegister />
      </body>
    </html>
  );
}
