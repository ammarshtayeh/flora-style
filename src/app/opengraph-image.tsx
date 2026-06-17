import { ImageResponse } from "next/og";

export const alt = "Flora Style";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#0b0b0a",
          color: "#f8f5f0",
          display: "flex",
          height: "100%",
          padding: "54px",
          width: "100%"
        }}
      >
        <div
          style={{
            border: "1px solid rgba(212,175,55,0.28)",
            borderRadius: "28px",
            display: "flex",
            flex: 1,
            overflow: "hidden",
            position: "relative"
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.03))",
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "54px"
            }}
          >
            <div style={{ color: "#d4af37", display: "flex", fontSize: 24, letterSpacing: 8, textTransform: "uppercase" }}>
              Luxury Pieces, Quietly Curated
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", fontSize: 88, fontWeight: 300, lineHeight: 1 }}>Flora Style</div>
              <div style={{ color: "#d2c5b1", display: "flex", fontSize: 30, maxWidth: 700 }}>
                Bilingual luxury storefront for handbags, accessories, watches, and direct WhatsApp ordering.
              </div>
            </div>
            <div style={{ color: "#f0e4c3", display: "flex", fontSize: 22 }}>Arabic + Hebrew experience</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
