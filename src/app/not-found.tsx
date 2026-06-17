"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        background: "#0b0b0a",
        color: "#f8f9fa",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        fontFamily: "var(--font-ui), Arial, sans-serif"
      }}
    >
      <h1
        style={{
          fontSize: "clamp(64px, 12vw, 120px)",
          fontWeight: 300,
          margin: 0,
          background: "linear-gradient(135deg, #bf953f 0%, #fcf6ba 50%, #b38728 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "0 0 30px rgba(212, 175, 55, 0.25)"
        }}
      >
        404
      </h1>
      <h2 style={{ fontSize: "24px", fontWeight: 400, color: "#a39b8c", margin: "10px 0 30px" }}>
        الصفحة غير موجودة | Page Not Found
      </h2>
      <p style={{ maxWidth: "480px", color: "#a39b8c", lineHeight: 1.8, margin: "0 0 40px" }}>
        الرابط الذي تحاول الوصول إليه غير متوفر حالياً. يمكنك العودة إلى الصفحة الرئيسية للمتجر والتسوق من جديد.
        <br />
        <span style={{ fontSize: "14px", opacity: 0.6 }}>
          The page you are looking for is not available. You can return to the storefront.
        </span>
      </p>
      <Link
        href="/"
        style={{
          background: "#d4af37",
          color: "#0b0b0a",
          fontWeight: 800,
          fontSize: "13px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "16px 36px",
          borderRadius: "30px",
          boxShadow: "0 4px 15px rgba(212, 175, 55, 0.3)",
          transition: "all 0.3s ease"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f3e5ab";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(212, 175, 55, 0.5)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#d4af37";
          e.currentTarget.style.boxShadow = "0 4px 15px rgba(212, 175, 55, 0.3)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        العودة للمتجر / Back to Store
      </Link>
    </main>
  );
}
