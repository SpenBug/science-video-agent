import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";

/**
 * T10 · 黑金权威档（Black & Gold）
 * 近黑底 + 金色细线 + 象牙白衬线，像正式文件或颁奖典礼。有「官方」的压迫感。
 * 适合：评审细则 / 处罚条款 / 奖项设置 / 红线警告
 */

const BG = "#0B0B0D";
const BG2 = "#121114";
const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8C55F";
const GOLD_DIM = "rgba(201,162,39,0.34)";
const GOLD_FAINT = "rgba(201,162,39,0.14)";
const IVORY = "#F5F1E8";
const DIM = "#8A8578";

const SERIF = "'Noto Serif SC','Songti SC','SimSun',serif";
const SANS = "'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

const CLAUSES = [
  { no: "01", title: "摘要必须有数字", desc: "每一问至少一个具体数值，不能只有定性描述" },
  { no: "02", title: "图表先引后出", desc: "正文提到「如图 3」之后，图才能出现" },
  { no: "03", title: "灵敏度要有结论", desc: "只放一张图不给判断，等于没做" },
];

export const T10BlackGold: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = (s: number, d = 18) =>
    interpolate(frame, [s, s + d], [0, 1], { ...CLAMP, easing: EASE });

  // 金线从中间向两侧展开
  const spread = interpolate(frame, [10, 46], [0, 1], { ...CLAMP, easing: EASE });
  // 印章落定：缩放 + 旋转
  const sealP = interpolate(frame, [30, 68], [0, 1], { ...CLAMP, easing: Easing.bezier(0.2, 1.4, 0.4, 1) });
  const sealScale = 1.35 - 0.35 * sealP;
  const sealRot = (1 - sealP) * -22;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: SANS }}>
      <AbsoluteFill style={{ background: `linear-gradient(150deg, ${BG2} 0%, ${BG} 55%, #08080A 100%)` }} />
      <AbsoluteFill
        style={{ background: "radial-gradient(900px 620px at 76% 34%, rgba(201,162,39,0.10), transparent 64%)" }}
      />

      {/* 双层金色内边框 + 四角标记 */}
      <AbsoluteFill style={{ inset: 44, border: `1px solid ${GOLD_DIM}` }} />
      <AbsoluteFill style={{ inset: 54, border: `1px solid ${GOLD_FAINT}` }} />
      {[
        { top: 44, left: 44 },
        { top: 44, right: 44 },
        { bottom: 44, left: 44 },
        { bottom: 44, right: 44 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 26,
            height: 26,
            borderTop: `2px solid ${GOLD}`,
            borderLeft: `2px solid ${GOLD}`,
            transform: `rotate(${[0, 90, -90, 180][i]}deg)`,
            ...pos,
          }}
        />
      ))}

      {/* 页眉 —— 必须限高，否则 alignItems:center 会把内容拉到画布垂直中点 */}
      <AbsoluteFill
        style={{
          top: 0,
          height: 150,
          padding: "0 130px",
          flexDirection: "row",
          alignItems: "center",
          gap: 24,
        }}
      >
        <span style={{ fontFamily: SANS, fontSize: 20, color: GOLD, letterSpacing: 7, opacity: fade(6) }}>
          评审细则
        </span>
        <div
          style={{
            height: 1,
            flex: 1,
            background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DIM}, transparent)`,
            transform: `scaleX(${spread})`,
            transformOrigin: "left",
          }}
        />
        <span style={{ fontFamily: SANS, fontSize: 20, color: DIM, letterSpacing: 4, opacity: fade(14) }}>
          2026 修订稿
        </span>
      </AbsoluteFill>

      {/* 标题 */}
      <AbsoluteFill style={{ padding: "172px 130px 0", width: 1240 }}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 96,
            fontWeight: 900,
            color: IVORY,
            lineHeight: 1.24,
            letterSpacing: 6,
            opacity: fade(18),
          }}
        >
          这三条
          <br />
          <span style={{ color: GOLD_LIGHT }}>评委一定会看</span>
        </div>
        <div
          style={{
            marginTop: 30,
            width: interpolate(frame, [30, 60], [0, 320], { ...CLAMP, easing: EASE }),
            height: 2,
            background: `linear-gradient(90deg, ${GOLD}, transparent)`,
          }}
        />
      </AbsoluteFill>

      {/* 条款 */}
      <AbsoluteFill style={{ padding: "0 130px 120px", justifyContent: "flex-end" }}>
        {CLAUSES.map((c, i) => {
          const s = 42 + i * 12;
          return (
            <div
              key={c.no}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 30,
                padding: "22px 0",
                borderTop: `1px solid ${i === 0 ? GOLD_DIM : GOLD_FAINT}`,
                opacity: fade(s),
                transform: `translateY(${(1 - fade(s)) * 16}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: SERIF,
                  fontSize: 40,
                  fontWeight: 900,
                  color: GOLD,
                  letterSpacing: 2,
                  width: 78,
                }}
              >
                {c.no}
              </span>
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: 34,
                  fontWeight: 700,
                  color: IVORY,
                  letterSpacing: 2,
                  width: 380,
                }}
              >
                {c.title}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 25, color: DIM, letterSpacing: 1 }}>
                {c.desc}
              </span>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* 金印 */}
      <div
        style={{
          position: "absolute",
          right: 150,
          top: 330,
          width: 300,
          height: 300,
          transform: `scale(${sealScale}) rotate(${sealRot}deg)`,
          opacity: sealP,
        }}
      >
        <svg width="300" height="300" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" fill="none" stroke={GOLD} strokeWidth="3" />
          <circle cx="150" cy="150" r="124" fill="none" stroke={GOLD_DIM} strokeWidth="1" />
          <circle
            cx="150"
            cy="150"
            r="112"
            fill="none"
            stroke={GOLD}
            strokeWidth="2"
            strokeDasharray="4 8"
            transform={`rotate(${frame * 0.35} 150 150)`}
          />
          <text
            x="150"
            y="152"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily={SERIF}
            fontSize="104"
            fontWeight="900"
            fill={GOLD_LIGHT}
          >
            评
          </text>
        </svg>
      </div>
    </AbsoluteFill>
  );
};
