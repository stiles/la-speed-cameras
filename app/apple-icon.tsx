import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#d63c2c" }}>
        <svg viewBox="0 0 24 24" width="104" height="104" fill="#fff">
          <path d="M4 7h11a2 2 0 0 1 2 2v1.2l3.4-2a1 1 0 0 1 1.6.8v6a1 1 0 0 1-1.6.8l-3.4-2V15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
        </svg>
      </div>
    ),
    size,
  );
}
