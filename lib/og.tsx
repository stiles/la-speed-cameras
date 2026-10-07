import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_HOST } from "./site";

export const OG_SIZE = { width: 1200, height: 630 };

type Shape = { w: number; h: number; path: string; dots: [number, number][] };

type Card = {
  kicker: string;
  title: string;
  count?: number;
  countLabel?: string;
  note?: string;
  footer?: string;
  shape?: Shape;
};

const font = (pkg: string, file: string) =>
  fs.readFileSync(path.join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

let fonts: { name: string; data: Buffer; weight: 400 | 600 | 800; style: "normal" }[] | null = null;
function loadFonts() {
  fonts ??= [
    { name: "Inter", data: font("inter", "inter-latin-400-normal.woff"), weight: 400, style: "normal" },
    { name: "Inter", data: font("inter", "inter-latin-600-normal.woff"), weight: 600, style: "normal" },
    { name: "Bricolage", data: font("bricolage-grotesque", "bricolage-grotesque-latin-800-normal.woff"), weight: 800, style: "normal" },
  ];
  return fonts;
}

export function ogCard({ kicker, title, count, countLabel = "speed cameras", note, footer = "Watch your rear end out there.", shape }: Card) {
  const titleSize = title.length > 28 ? 66 : title.length > 16 ? 84 : 104;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#16161d", color: "white", fontFamily: "Inter" }}>
        <div style={{ height: 18, width: "100%", display: "flex", backgroundImage: "repeating-linear-gradient(-45deg, #16161d 0 22px, #facc15 22px 44px)" }} />
        <div style={{ flex: 1, display: "flex", padding: "48px 64px 0", gap: 40 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 28, color: "#ff3b1f", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>{kicker}</div>
              <div style={{ fontFamily: "Bricolage", fontSize: titleSize, fontWeight: 800, lineHeight: 1.0, marginTop: 14, letterSpacing: -2 }}>{title}</div>
            </div>
            {count !== undefined ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
                <span style={{ fontFamily: "Bricolage", fontSize: 150, fontWeight: 800, color: "#ff3b1f", lineHeight: 1 }}>{count}</span>
                <span style={{ fontSize: 40, color: "rgba(255,255,255,0.85)" }}>{count === 1 ? countLabel.replace(/s\b/, "") : countLabel}</span>
              </div>
            ) : note ? (
              <div style={{ fontSize: 40, lineHeight: 1.25, color: "rgba(255,255,255,0.85)", maxWidth: 640 }}>{note}</div>
            ) : (
              <div />
            )}
          </div>
          {shape && (
            <div style={{ width: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={380} height={380} viewBox={`-30 -30 ${shape.w + 60} ${shape.h + 60}`}>
                <path d={shape.path} fill="#2b2b35" stroke="#ffffff" strokeWidth={8} strokeLinejoin="round" />
                {shape.dots.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={Math.max(shape.w, shape.h) / 36} fill="#ff3b1f" stroke="#ffffff" strokeWidth={6} />
                ))}
              </svg>
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 64px 40px", fontSize: 28, color: "rgba(255,255,255,0.6)" }}>
          <span>{footer}</span>
          <span style={{ color: "white", fontWeight: 600 }}>{SITE_HOST}</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: loadFonts() },
  );
}
