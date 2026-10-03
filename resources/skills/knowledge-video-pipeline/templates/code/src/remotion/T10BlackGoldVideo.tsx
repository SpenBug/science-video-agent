import React from "react";
import { AbsoluteFill, Audio, interpolate, Easing, staticFile } from "remotion";
import timingData from "../../videos/demo/timing.json";
import { useScene } from "./shared/scene";
import { Subtitle } from "./shared/Subtitle";
import { AUTH_SCENES, type AuthScene } from "./demoData";
import type { TimingData } from "./shared/types";

/**
 * T10 · 黑金权威档 —— 完整视频组件
 *
 * 动效要「庄重」：慢、稳、有落定感。金印用带过冲的缓动做「盖章落定」。
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

const FALLBACK: AuthScene = {
  header: "占位",
  headerRight: "—",
  title: "缺内容配置",
  clauses: [],
};

export const T10BlackGoldVideo: React.FC = () => {
  const timing = timingData as TimingData;
  const { frame, sec, section } = useScene(timing);
  const sc = AUTH_SCENES[section.name] ?? FALLBACK;
  const lf = frame - section.start_frame;

  const fade = (s: number, d = 18) => interpolate(lf, [s, s + d], [0, 1], { ...CLAMP, easing: EASE });

  const spread = interpolate(lf, [10, 46], [0, 1], { ...CLAMP, easing: EASE });

  const sealP = interpolate(lf, [30, 68], [0, 1], {
    ...CLAMP,
    easing: Easing.bezier(0.2, 1.4, 0.4, 1),
  });
  const sealScale = 1.35 - 0.35 * sealP;
  const sealRot = (1 - sealP) * -22;

  const titleNode = sc.titleAccent && sc.title.includes(sc.titleAccent)
    ? sc.title.split(sc.titleAccent).flatMap((seg, i, arr) =>
        i < arr.length - 1
          ? [<span key={`s${i}`}>{seg}</span>, <span key={`a${i}`} style={{ color: GOLD_LIGHT }}>{sc.titleAccent}</span>]
          : [<span key={`s${i}`}>{seg}</span>]
      )
    : sc.title;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: SANS }}>
      <AbsoluteFill style={{ background: `linear-gradient(150deg, ${BG2} 0%, ${BG} 55%, #08080A 100%)` }} />
      <AbsoluteFill
        style={{ background: "radial-gradient(900px 620px at 76% 34%, rgba(201,162,39,0.10), transparent 64%)" }}
      />

      {/* 双层金框 */}
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

      {/* 页眉 —— 必须限高 */}
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
        <span style={{ fontFamily: SANS, fontSize: 20, color: GOLD, letterSpacing: 7, opacity: fade(6), whiteSpace: "nowrap" }}>
          {sc.header}
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
        <span style={{ fontFamily: SANS, fontSize: 20, color: DIM, letterSpacing: 4, opacity: fade(14), whiteSpace: "nowrap" }}>
          {sc.headerRight}
        </span>
      </AbsoluteFill>

      {/* 标题 */}
      <AbsoluteFill style={{ padding: "172px 130px 0", width: 1240 }}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 90,
            fontWeight: 900,
            color: IVORY,
            lineHeight: 1.24,
            letterSpacing: 6,
            whiteSpace: "pre-line",
            opacity: fade(18),
          }}
        >
          {titleNode}
        </div>
        <div
          style={{
            marginTop: 30,
            width: interpolate(lf, [30, 60], [0, 320], { ...CLAMP, easing: EASE }),
            height: 2,
            background: `linear-gradient(90deg, ${GOLD}, transparent)`,
          }}
        />
      </AbsoluteFill>

      {/* 条款 —— 贴底 */}
      <AbsoluteFill style={{ padding: "0 130px 176px", justifyContent: "flex-end" }}>
        {sc.clauses.map((c, i) => {
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
              <span style={{ fontFamily: SANS, fontSize: 25, color: DIM, letterSpacing: 1 }}>{c.desc}</span>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* 金印 */}
      {sc.sealChar && (
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
              {sc.sealChar}
            </text>
          </svg>
        </div>
      )}

      <Subtitle
        section={section}
        sec={sec}
        s={{
          fontSize: 32,
          bg: "rgba(11,11,13,0.90)",
          color: IVORY,
          radius: 6,
          fontFamily: SANS,
          bottom: 84,
          maxWidth: 1100,
        }}
      />
      {/* 音轨：人声 + BGM 混音（_gen_tts.py 产出；系列惯例播 mixed_audio.wav 而不是 podcast_audio.wav） */}
      <Audio src={staticFile("mixed_audio.wav")} />

    </AbsoluteFill>
  );
};
