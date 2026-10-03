import React from "react";
import { AbsoluteFill, Audio, interpolate, Easing, staticFile } from "remotion";
import timingData from "../../videos/demo/timing.json";
import { useScene } from "./shared/scene";
import { Subtitle } from "./shared/Subtitle";
import { SPREADS, type Spread } from "./demoData";
import type { TimingData } from "./shared/types";

/**
 * T9 · 杂志排版档 —— 完整视频组件
 *
 * ⚠️ 本档动效极弱：只做 opacity 淡入 + 细线展开，禁止位移 / 缩放 / 旋转。
 * 杂志的高级感来自克制，任何「弹一下」都会立刻变廉价。
 */

const WHITE = "#FFFFFF";
const OFFWHITE = "#F4F2ED";
const INK = "#111111";
const GRAY = "#4A4A4A";
const FAINT = "#9B9B9B";
const ACCENT = "#E63946";

const SERIF = "'Noto Serif SC','Songti SC','SimSun',serif";
const SANS = "'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

const FALLBACK: Spread = {
  section: "占位",
  title: "缺内容配置",
  lead: "SPREADS 里没有这个场景的配置。",
  columns: [["—"]],
  page: "—",
};

export const T9MagazineVideo: React.FC = () => {
  const timing = timingData as TimingData;
  const { frame, sec, section } = useScene(timing);
  const sp = SPREADS[section.name] ?? FALLBACK;
  const lf = frame - section.start_frame;

  const fade = (start: number, dur = 20) => interpolate(lf, [start, start + dur], [0, 1], { ...CLAMP, easing: EASE });
  const line = (start: number, w: number, color = INK) => ({
    width: interpolate(lf, [start, start + 26], [0, w], { ...CLAMP, easing: EASE }),
    height: 2,
    background: color,
  });

  // 标题里染色强调词
  const titleNode = sp.accentWord && sp.title.includes(sp.accentWord)
    ? sp.title.split(sp.accentWord).flatMap((seg, i, arr) =>
        i < arr.length - 1
          ? [<span key={`s${i}`}>{seg}</span>, <span key={`a${i}`} style={{ color: ACCENT }}>{sp.accentWord}</span>]
          : [<span key={`s${i}`}>{seg}</span>]
      )
    : sp.title;

  return (
    <AbsoluteFill style={{ backgroundColor: WHITE, fontFamily: SANS }}>
      <AbsoluteFill
        style={{
          left: 0,
          width: interpolate(lf, [0, 30], [0, 118], { ...CLAMP, easing: EASE }),
          background: OFFWHITE,
        }}
      />

      {/* 页眉 —— 必须限高 */}
      <AbsoluteFill
        style={{
          top: 0,
          height: 132,
          padding: "0 96px 0 176px",
          flexDirection: "row",
          alignItems: "center",
          gap: 26,
        }}
      >
        <div style={{ ...line(6, 1180, INK), opacity: fade(6) }} />
        <span
          style={{
            fontFamily: SANS,
            fontSize: 19,
            color: FAINT,
            letterSpacing: 5,
            opacity: fade(14),
            whiteSpace: "nowrap",
          }}
        >
          {sp.page}
        </span>
      </AbsoluteFill>

      {/* 左栏 */}
      <AbsoluteFill style={{ padding: "150px 60px 140px 176px", width: 880, flexDirection: "column" }}>
        <div style={{ opacity: fade(10) }}>
          <span style={{ fontFamily: SANS, fontSize: 21, fontWeight: 600, color: ACCENT, letterSpacing: 8 }}>
            {sp.section}
          </span>
        </div>

        <div
          style={{
            marginTop: 30,
            fontFamily: SERIF,
            fontSize: 116,
            fontWeight: 900,
            color: INK,
            lineHeight: 1.1,
            letterSpacing: -3,
            whiteSpace: "pre-line",
            opacity: fade(16),
          }}
        >
          {titleNode}
        </div>

        <div style={{ ...line(30, 168, ACCENT), marginTop: 44 }} />

        <div
          style={{
            marginTop: 34,
            fontFamily: SERIF,
            fontSize: 30,
            color: GRAY,
            lineHeight: 1.85,
            letterSpacing: 0.5,
            opacity: fade(38),
            maxWidth: 620,
            whiteSpace: "pre-line",
          }}
        >
          {sp.lead}
        </div>
      </AbsoluteFill>

      {/* 右栏 —— width 必须显式给 */}
      <AbsoluteFill
        style={{ left: 950, width: 970, padding: "150px 96px 140px 0", flexDirection: "row", gap: 44 }}
      >
        {sp.columns.slice(0, 2).map((col, ci) => (
          <div
            key={ci}
            style={{
              flex: 1,
              fontFamily: SERIF,
              fontSize: 25,
              color: GRAY,
              lineHeight: 2,
              opacity: fade(46 + ci * 8),
            }}
          >
            {col.map((para, pi) => (
              <p key={pi} style={{ margin: pi ? "26px 0 0" : 0 }}>
                {ci === 0 && pi === 0 && (
                  <span
                    style={{
                      float: "left",
                      fontFamily: SERIF,
                      fontSize: 72,
                      fontWeight: 900,
                      lineHeight: 0.82,
                      color: INK,
                      marginRight: 12,
                      marginTop: 6,
                    }}
                  >
                    {para.slice(0, 1)}
                  </span>
                )}
                {ci === 0 && pi === 0 ? para.slice(1) : para}
              </p>
            ))}
            {/* 引文挂在第二栏 */}
            {ci === 1 && sp.quote && (
              <div style={{ marginTop: 34, paddingTop: 26, borderTop: "1px solid rgba(17,17,17,0.14)" }}>
                <div style={{ fontFamily: SERIF, fontSize: 27, fontStyle: "italic", color: INK, lineHeight: 1.8 }}>
                  {sp.quote.text}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 18, color: FAINT, letterSpacing: 2, marginTop: 14 }}>
                  {sp.quote.source}
                </div>
              </div>
            )}
          </div>
        ))}
      </AbsoluteFill>

      {/* 右栏底部侧栏 */}
      {sp.sidebar && (
        <AbsoluteFill style={{ left: 950, width: 970, top: 760, height: 200, padding: "0 96px 0 0" }}>
          <div
            style={{
              borderTop: `2px solid ${ACCENT}`,
              paddingTop: 26,
              display: "flex",
              flexDirection: "row",
              gap: 34,
              opacity: fade(66),
            }}
          >
            {sp.sidebar.map((s) => (
              <div key={s.n} style={{ flex: 1 }}>
                <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 700, color: ACCENT, letterSpacing: 3 }}>
                  {s.n}
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 21, color: GRAY, lineHeight: 1.7, marginTop: 10 }}>
                  {s.d}
                </div>
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* 页脚 */}
      <AbsoluteFill
        style={{
          padding: "0 96px 58px 176px",
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontFamily: SANS, fontSize: 19, color: FAINT, letterSpacing: 5, opacity: fade(62) }}>
          数模AI冲国奖
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: fade(62) }}>
          <div style={line(62, 90, INK)} />
          <span style={{ fontFamily: SANS, fontSize: 19, color: INK, letterSpacing: 4 }}>{sp.page}</span>
        </div>
      </AbsoluteFill>

      <Subtitle
        section={section}
        sec={sec}
        s={{
          fontSize: 32,
          bg: "rgba(17,17,17,0.86)",
          color: "#FFFFFF",
          radius: 8,
          fontFamily: SERIF,
          bottom: 84,
          maxWidth: 1100,
        }}
      />
      {/* 音轨：人声 + BGM 混音（_gen_tts.py 产出；系列惯例播 mixed_audio.wav 而不是 podcast_audio.wav） */}
      <Audio src={staticFile("mixed_audio.wav")} />

    </AbsoluteFill>
  );
};
