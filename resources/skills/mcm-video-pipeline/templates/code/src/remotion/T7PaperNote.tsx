import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";

/**
 * T7 · 纸感笔记档（Paper Note）
 * 像一本摊开的精装笔记本：米白纸、装订线、衬线正文、荧光笔高亮、楷体批注。
 * 适合：知识点讲解 / 公式定义 / 复盘笔记 / 方法论沉淀
 */

const PAPER = "#FAF7F0";
const INK = "#1F1D1A";
const INK_SOFT = "#5C5750";
const INK_FAINT = "#A8A29A";
const RULE = "rgba(31,29,26,0.045)";
const BIND = "rgba(31,29,26,0.22)";
const HILITE = "#FFE066";
const RED = "#C8402F";

const SERIF = "'Noto Serif SC','Songti SC','SimSun',serif";
const SANS = "'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif";
const KAI = "'Kaiti SC','STKaiti','KaiTi','楷体',serif";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

const fadeUp = (frame: number, start: number, dur = 16) => {
  const p = interpolate(frame, [start, start + dur], [0, 1], { ...CLAMP, easing: EASE });
  return { opacity: p, transform: `translateY(${(1 - p) * 14}px)` };
};

export const T7PaperNote: React.FC = () => {
  const frame = useCurrentFrame();

  // 荧光笔从左扫出
  const sweep = interpolate(frame, [34, 58], [100, 0], { ...CLAMP, easing: EASE });
  // 批注引线逐段画出
  const leader = interpolate(frame, [58, 76], [0, 1], { ...CLAMP, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, fontFamily: SERIF }}>
      {/* 极细方格 */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${RULE} 1px, transparent 1px), linear-gradient(90deg, ${RULE} 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
        }}
      />
      {/* 装订线 */}
      <AbsoluteFill style={{ left: 132, width: 1.5, background: BIND }} />
      <AbsoluteFill style={{ left: 138, width: 1, background: "rgba(31,29,26,0.05)" }} />

      {/* 页眉：日期 / 页码 */}
      <AbsoluteFill
        style={{
          padding: "46px 96px 0 0",
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 28,
          pointerEvents: "none",
        }}
      >
        <span style={{ fontFamily: SANS, fontSize: 21, color: INK_FAINT, letterSpacing: 2 }}>
          2026 · 数模国赛复盘
        </span>
        <span style={{ fontFamily: SANS, fontSize: 21, color: INK_FAINT, letterSpacing: 2 }}>
          第 07 页
        </span>
      </AbsoluteFill>

      {/* 正文区 */}
      <AbsoluteFill style={{ padding: "120px 460px 130px 196px", flexDirection: "column" }}>
        <div style={{ ...fadeUp(frame, 6) }}>
          <span
            style={{
              fontFamily: SANS,
              fontSize: 22,
              fontWeight: 600,
              color: RED,
              letterSpacing: 6,
            }}
          >
            灵敏度分析
          </span>
        </div>

        <div
          style={{
            ...fadeUp(frame, 14),
            marginTop: 22,
            fontSize: 78,
            fontWeight: 900,
            color: INK,
            lineHeight: 1.22,
            letterSpacing: 1,
          }}
        >
          参数动一点，
          <br />
          结论会不会翻？
        </div>

        <div
          style={{
            marginTop: 30,
            width: interpolate(frame, [22, 46], [0, 140], { ...CLAMP, easing: EASE }),
            height: 3,
            background: INK,
          }}
        />

        <div
          style={{
            ...fadeUp(frame, 30),
            marginTop: 40,
            fontSize: 33,
            color: INK_SOFT,
            lineHeight: 2,
            letterSpacing: 0.5,
          }}
        >
          <p style={{ margin: 0 }}>
            别只报一个点估计。把关键参数各扰动
            <span
              style={{
                position: "relative",
                display: "inline-block",
                padding: "0 4px",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: -2,
                  right: -2,
                  top: 4,
                  bottom: 6,
                  background: HILITE,
                  clipPath: `inset(0 ${sweep}% 0 0)`,
                  borderRadius: 2,
                }}
              />
              <span style={{ position: "relative" }}>正负百分之二十</span>
            </span>
            ，重跑一遍看结论稳不稳。
          </p>
          <p style={{ margin: "22px 0 0" }}>
            如果排序变了，说明模型对参数过度敏感，这个结论不能写进摘要。
          </p>
        </div>

        {/* 本页要点（贴纸感） */}
        <div
          style={{
            ...fadeUp(frame, 62),
            marginTop: "auto",
            background: "#FFF8D6",
            border: `1px solid rgba(31,29,26,0.10)`,
            borderLeft: `6px solid ${HILITE}`,
            borderRadius: 4,
            padding: "24px 30px 26px",
            maxWidth: 760,
            boxShadow: "0 2px 0 rgba(31,29,26,0.06)",
          }}
        >
          <div
            style={{
              fontFamily: SANS,
              fontSize: 20,
              fontWeight: 700,
              color: INK,
              letterSpacing: 4,
              marginBottom: 14,
            }}
          >
            本页要点
          </div>
          {["关键参数各扰动正负百分之二十，重跑一遍", "排序一变，结论就不许进摘要"].map((t, i) => (
            <div
              key={t}
              style={{
                display: "flex",
                gap: 12,
                fontFamily: SERIF,
                fontSize: 27,
                color: INK_SOFT,
                lineHeight: 1.7,
              }}
            >
              <span style={{ color: RED, fontWeight: 700 }}>{i + 1}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </AbsoluteFill>

      {/* 右侧楷体批注 */}
      <AbsoluteFill style={{ left: 1400, top: 300, width: 400, opacity: leader }}>
        <svg width="120" height="90" style={{ position: "absolute", left: -104, top: 24 }}>
          <path
            d="M4 6 C 46 8, 84 30, 116 62"
            fill="none"
            stroke={RED}
            strokeWidth="1.6"
            strokeDasharray="300"
            strokeDashoffset={(1 - leader) * 300}
          />
          <circle cx="118" cy="64" r="3.4" fill={RED} opacity={leader} />
        </svg>
        <div
          style={{
            borderLeft: `3px solid ${RED}`,
            paddingLeft: 22,
          }}
        >
          <div style={{ fontFamily: KAI, fontSize: 27, color: RED, lineHeight: 1.75 }}>
            去年有队只测了一组，
            <br />
            评委一问就答不上来。
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 19,
              color: INK_FAINT,
              marginTop: 14,
              letterSpacing: 1,
            }}
          >
            批注 · 易错点
          </div>
        </div>
      </AbsoluteFill>

      {/* 页脚 */}
      <AbsoluteFill
        style={{
          padding: "0 96px 48px 196px",
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontFamily: SANS, fontSize: 21, color: INK_FAINT, letterSpacing: 3 }}>
          数模AI冲国奖 · 笔记体
        </span>
        <span style={{ fontFamily: SANS, fontSize: 21, color: INK_FAINT, letterSpacing: 3 }}>
          灵敏度 ≠ 换个数字再算一遍
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
