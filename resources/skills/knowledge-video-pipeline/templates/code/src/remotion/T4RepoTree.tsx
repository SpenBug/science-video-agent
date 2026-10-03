import React from "react";
import { interpolate, Easing } from "remotion";
import { REPO_TREE } from "./T4plan.example";

const INK = "#1A1A2E";
const INK_FAINT = "#7A7A8C";
const SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif";
const MONO = "'JetBrains Mono', 'Consolas', monospace";
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const RepoTree: React.FC<{ localT: number }> = ({ localT }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {REPO_TREE.map((item, i) => {
        const d = i * 0.07;
        const op = interpolate(localT, [d, d + 0.16], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const x = interpolate(localT, [d, d + 0.16], [-34, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE,
        });
        return (
          <div
            key={item.name}
            style={{
              opacity: op,
              transform: `translateX(${x}px)`,
              display: "flex",
              alignItems: "center",
              gap: 18,
              background: "#FFFFFF",
              borderLeft: `9px solid ${item.accent}`,
              borderRadius: 11,
              padding: "11px 22px",
              boxShadow: "0 9px 24px rgba(26,26,46,0.09)",
              border: "1px solid rgba(26,26,46,0.07)",
            }}
          >
            <span style={{ fontSize: 20, color: item.accent }}>{item.icon}</span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 28,
                fontWeight: 800,
                color: INK,
                minWidth: 340,
              }}
            >
              {item.name}
            </span>
            <span style={{ fontSize: 23, fontWeight: 600, color: INK_FAINT }}>{item.desc}</span>
          </div>
        );
      })}
      <div
        style={{
          opacity: interpolate(localT, [0.45, 0.6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          marginTop: 4,
          fontFamily: SANS,
          fontSize: 22,
          fontWeight: 700,
          color: "#0E9F9E",
          letterSpacing: 1,
        }}
      >
        ▍ 克隆下来，xelatex 编译三遍（含 bibtex），一条命令的事
      </div>
    </div>
  );
};
