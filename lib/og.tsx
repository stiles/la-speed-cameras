import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_HOST } from "./site";
import type { Shape } from "./types";

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#23232a";
const SIREN = "#d63c2c";
const PAPER = "#f6f5f1";
const MUTED = "#6b6b73";

type Card = {
  kicker: string;
  title: string;
  count?: number;
  countLabel?: string;
  note?: string;
  footer?: string;
  shape?: Shape;
  /** Dot radius as a share of the shape's longest side. Smaller for city-wide shapes. */
  dotScale?: number;
};

const font = (file: string) => fs.readFileSync(path.join(process.cwd(), "assets/fonts", file));

let fonts: { name: string; data: Buffer; weight: 400 | 600 | 800 | 900; style: "normal" }[] | null = null;
function loadFonts() {
  fonts ??= [
    { name: "Public Sans", data: font("public-sans-latin-400-normal.woff"), weight: 400, style: "normal" },
    { name: "Public Sans", data: font("public-sans-latin-600-normal.woff"), weight: 600, style: "normal" },
    { name: "Overpass", data: font("overpass-latin-800-normal.woff"), weight: 800, style: "normal" },
    { name: "Overpass", data: font("overpass-latin-900-normal.woff"), weight: 900, style: "normal" },
  ];
  return fonts;
}

function ShapeArt({ shape, dotScale }: { shape: Shape; dotScale: number }) {
  const box = 430;
  const pad = 30;
  const vw = shape.w + pad * 2;
  const vh = shape.h + pad * 2;
  const k = Math.min(box / vw, box / vh);
  const r = Math.max(shape.w, shape.h) * dotScale;
  return (
    <svg width={Math.round(vw * k)} height={Math.round(vh * k)} viewBox={`${-pad} ${-pad} ${vw} ${vh}`}>
      <path d={shape.path} fill="#ffffff" stroke={INK} strokeWidth={Math.max(shape.w, shape.h) / 160} strokeLinejoin="round" />
      {shape.dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={SIREN} stroke="#ffffff" strokeWidth={r / 3} />
      ))}
    </svg>
  );
}

export function ogCard({ kicker, title, count, countLabel = "speed cameras", note, footer = "Watch your rear end out there.", shape, dotScale = 1 / 40 }: Card) {
  const titleSize = title.length > 28 ? 64 : title.length > 16 ? 82 : 100;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAPER, color: INK, fontFamily: "Public Sans", padding: "44px 64px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: SIREN, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" width={26} height={26} fill="#ffffff">
              <path d="M4 7h11a2 2 0 0 1 2 2v1.2l3.4-2a1 1 0 0 1 1.6.8v6a1 1 0 0 1-1.6.8l-3.4-2V15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
            </svg>
          </div>
          <span style={{ fontFamily: "Overpass", fontWeight: 800, fontSize: 30 }}>LA Speed Cameras</span>
        </div>

        <div style={{ flex: 1, display: "flex", gap: 40, marginTop: 36 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 26, color: MUTED, fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase" }}>{kicker}</div>
              <div style={{ fontFamily: "Overpass", fontSize: titleSize, fontWeight: 900, lineHeight: 1.02, marginTop: 12, letterSpacing: -1.5 }}>{title}</div>
            </div>
            {count !== undefined ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
                <span style={{ fontFamily: "Overpass", fontSize: 140, fontWeight: 900, color: SIREN, lineHeight: 0.8 }}>{count}</span>
                <span style={{ fontSize: 38, fontWeight: 600, lineHeight: 1, marginBottom: 16 }}>{count === 1 ? countLabel.replace(/s\b/, "") : countLabel}</span>
              </div>
            ) : note ? (
              <div style={{ fontSize: 36, lineHeight: 1.3, color: "#3f3f46", maxWidth: 640 }}>{note}</div>
            ) : (
              <div />
            )}
          </div>
          {shape && (
            <div style={{ width: 440, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShapeArt shape={shape} dotScale={dotScale} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, paddingTop: 22, borderTop: `3px solid ${INK}`, fontSize: 26 }}>
          <span style={{ color: MUTED }}>{footer}</span>
          <span style={{ fontWeight: 600 }}>{SITE_HOST}</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: loadFonts() },
  );
}
