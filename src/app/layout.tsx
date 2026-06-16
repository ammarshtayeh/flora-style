import type { Metadata, Viewport } from "next";
import { Alexandria, Assistant, Manrope } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

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
  metadataBase: new URL("https://flora-style.vercel.app"),
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
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
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
  }
};

export const viewport: Viewport = {
  themeColor: "#0b0b0a"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${arabicFont.variable} ${hebrewFont.variable} ${latinFont.variable}`}>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
