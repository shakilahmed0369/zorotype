import { ImageResponse } from "next/og";
import { OG_FEATURES, SITE_NAME, SITE_URL } from "@/lib/seo";

// A .png route instead of the app/opengraph-image convention: with a static export the convention
// writes the file without an extension, which hosts then serve as octet-stream and social crawlers
// refuse. /og.png keeps a real image content type on every host.
// Required for a static export: the card is rendered once at build time.
export const dynamic = "force-static";

const KEYCAPS = ["z", "o", "r", "o", "t", "y", "p", "e"];

// The app's own default palette, so the card matches the trainer it advertises. Satori only
// understands a flexbox subset of CSS, so every rule is inline and every container is a flex box.
const COLORS = {
  backdrop: "#0e1218",
  panel: "#141b23",
  edge: "#212830",
  accent: "#41ce5c",
  text: "#ccdae6",
  muted: "#788386",
};

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: COLORS.backdrop,
          color: COLORS.text,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", width: "100%", height: 14, backgroundColor: COLORS.accent }} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "56px 72px 0" }}>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 7, color: COLORS.accent }}>
            SPLIT &amp; MATRIX KEYBOARDS
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 6,
              fontSize: 120,
              fontWeight: 700,
              letterSpacing: -5,
              color: COLORS.accent,
            }}
          >
            zorotype
          </div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 40, lineHeight: 1.25, maxWidth: 980 }}>
            Learn your keymap before you flash it — live keycaps that follow your ZMK layers.
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 36 }}>
            {KEYCAPS.map((letter, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 92,
                  height: 92,
                  marginRight: 12,
                  backgroundColor: COLORS.panel,
                  border: `2px solid ${COLORS.edge}`,
                  borderRadius: 16,
                  fontSize: 46,
                  color: COLORS.text,
                }}
              >
                {letter}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", marginTop: 20, fontSize: 26, color: COLORS.muted, width: 1056 }}>
            {OG_FEATURES.join(" · ")} · 86-board library · free, no account
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 72px 46px",
            fontSize: 26,
            color: COLORS.muted,
          }}
        >
          <div style={{ display: "flex" }}>{SITE_NAME} — free, no account needed</div>
          <div style={{ display: "flex", color: COLORS.accent }}>{SITE_URL.replace("https://", "")}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
