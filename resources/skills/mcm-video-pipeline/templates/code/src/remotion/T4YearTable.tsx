import React from "react";
import { interpolate, Easing } from "remotion";
import { YEAR_ROWS } from "./T4plan.example";

const INK = "#1A1A2E";
const SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif";
const MONO = "'JetBrains Mono', 'Consolas', monospace";
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const YearTable: React.FC<{ localT: number }> = ({ localT }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      <div style={{ display: "flex", gap: 14 }}>
        <div
          style={{
            flex: 1,
            background: "#0E9F9E",
            color: "#fff",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: 2,
            textAlign: "center",
          }}
        >
          ✓ 该改的（赛事标识）
        </div>
        <div
          style={{
            flex: 1,
            background: "#EF4444",
            color: "#fff",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: 2,
            textAlign: "center",
          }}
        >
          ✗ 碰不得的（历史事实）
        </div>
      </div>

      {YEAR_ROWS.map((r, i) => {
        const d = i * 0.08;
        const op = interpolate(localT, [d, d + 0.16], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const y = interpolate(localT, [d, d + 0.16], [22, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE,
        });
        const ok = r.kind === "ok";
        return (
          <div
            key={r.file}
            style={{
              opacity: op,
              transform: `translateY(${y}px)`,
              display: "flex",
              alignItems: "center",
              gap: 18,
              background: "#FFFFFF",
              borderLeft: `10px solid ${ok ? "#0E9F9E" : "#EF4444"}`,
              borderRadius: 12,
              padding: "13px 24px",
              boxShadow: "0 10px 26px rgba(26,26,46,0.08)",
              border: "1px solid rgba(26,26,46,0.07)",
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 800, color: INK, minWidth: 430 }}>
              {r.file}
            </span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#7A7A8C",
                textDecoration: ok ? "line-through" : "none",
                minWidth: 250,
              }}
            >
              {r.old}
            </span>
            <span style={{ fontSize: 30, color: ok ? "#0E9F9E" : "#EF4444", fontWeight: 900 }}>→</span>
            <span
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: ok ? "#0E9F9E" : "#EF4444",
              }}
            >
              {r.now}
            </span>
          </div>
        );
      })}

      <div
        style={{
          opacity: interpolate(localT, [0.6, 0.75], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          marginTop: 4,
          fontFamily: SANS,
          fontSize: 26,
          fontWeight: 800,
          color: "#1E3A8A",
        }}
      >
        ▍ 改之前先问自己：这是赛事标识，还是历史事实？
      </div>
    </div>
  );
};
