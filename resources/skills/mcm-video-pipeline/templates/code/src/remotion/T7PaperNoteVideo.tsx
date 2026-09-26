import React from "react";
import { AbsoluteFill, Audio, interpolate, Easing, staticFile } from "remotion";
import timingData from "../../videos/demo/timing.json";
import { useScene } from "./shared/scene";
import { Subtitle } from "./shared/Subtitle";
import { NOTE_PAGES, type NotePage } from "./demoData";
import type { TimingData } from "./shared/types";

/**
 * T7 · 纸感笔记档 —— 完整视频组件
 *
 * 与 T7PaperNote.tsx（单页演示）的区别：
 * - 场景由 timing.json 驱动，按帧自动切换，不写死坐标
 * - 每场景的内容从 NOTE_PAGES[section.name] 取
 * - 动画用「场景内局部帧」localFrame，不是绝对帧——换场景时长不用改动画
 * - 底部字幕条按句级实时刻硬切（Subtitle 组件）
 *
 * 换期只改 demoData.ts 的 NOTE_PAGES，key 与 podcast.txt 的 [SECTION:name] 一致。
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

const FALLBACK: NotePage = {
  section: "占位",
  title: "缺内容配置",
  body: ["NOTE_PAGES 里没有这个场景的配置。"],
  page: "—",
};

export const T7PaperNoteVideo: React.FC = () => {
  const timing = timingData as TimingData;
  const { frame, sec, section, p } = useScene(timing);
  const page = NOTE_PAGES[section.name] ?? FALLBACK;

  // 场景内局部帧：所有动画基于它，与场景起点无关
  const lf = frame - section.start_frame;

  const enter = (start: number, dur = 16) =>
    interpolate(lf, [start, start + dur], [0, 1], { ...CLAMP, easing: EASE });
  const fadeUp = (start: number, dur = 16) => {
    const v = enter(start, dur);
    return { opacity: v, transform: `translateY(${(1 - v) * 14}px)` };
  };

  // 荧光笔从左扫出
  const sweep = interpolate(lf, [34, 58], [100, 0], { ...CLAMP, easing: EASE });
  // 批注引线逐段画出
  const leader = interpolate(lf, [58, 76], [0, 1], { ...CLAMP, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, fontFamily: SERIF }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${RULE} 1px, transparent 1px), linear-gradient(90deg, ${RULE} 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
        }}
      />
      <AbsoluteFill style={{ left: 132, width: 1.5, background: BIND }} />
      <AbsoluteFill style={{ left: 138, width: 1, background: "rgba(31,29,26,0.05)" }} />

      {/* 页眉 */}
      <AbsoluteFill
        style={{
          top: 0,
          height: 130,
          padding: "0 96px 0 0",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 28,
          pointerEvents: "none",
        }}
      >
        <span style={{ fontFamily: SANS, fontSize: 21, color: INK_FAINT, letterSpacing: 2 }}>
          2026 · 数模国赛复盘
        </span>
        <span style={{ fontFamily: SANS, fontSize: 21, color: INK_FAINT, letterSpacing: 2 }}>
          {page.page}
        </span>
      </AbsoluteFill>

      {/* 正文区 */}
      <AbsoluteFill style={{ padding: "120px 460px 160px 196px", flexDirection: "column" }}>
        <div style={fadeUp(6)}>
          <span style={{ fontFamily: SANS, fontSize: 22, fontWeight: 600, color: RED, letterSpacing: 6 }}>
            {page.section}
          </span>
        </div>

        <div
          style={{
            ...fadeUp(14),
            marginTop: 22,
            fontSize: 78,
            fontWeight: 900,
            color: INK,
            lineHeight: 1.22,
            letterSpacing: 1,
            whiteSpace: "pre-line",
          }}
        >
          {page.title}
        </div>

        <div
          style={{
            marginTop: 30,
            width: interpolate(lf, [22, 46], [0, 140], { ...CLAMP, easing: EASE }),
            height: 3,
            background: INK,
          }}
        />

        <div
          style={{
            ...fadeUp(30),
            marginTop: 40,
            fontSize: 33,
            color: INK_SOFT,
            lineHeight: 2,
            letterSpacing: 0.5,
          }}
        >
          {page.body.map((para, i) => {
            const hl = page.highlight && page.highlight.paraIndex === i;
            if (!hl) return <p key={i} style={{ margin: i ? "22px 0 0" : 0 }}>{para}</p>;
            const [before, after] = para.split(page.highlight!.text);
            return (
              <p key={i} style={{ margin: i ? "22px 0 0" : 0 }}>
                {before}
                <span style={{ position: "relative", display: "inline-block", padding: "0 4px" }}>
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
                  <span style={{ position: "relative" }}>{page.highlight!.text}</span>
                </span>
                {after}
              </p>
            );
          })}
        </div>

        {/* 本页要点 */}
        {page.points && (
          <div
            style={{
              ...fadeUp(62),
              marginTop: "auto",
              background: "#FFF8D6",
              border: "1px solid rgba(31,29,26,0.10)",
              borderLeft: `6px solid ${HILITE}`,
              borderRadius: 4,
              padding: "24px 30px 26px",
              maxWidth: 760,
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
            {page.points.map((t, i) => (
              <div
                key={t}
                style={{ display: "flex", gap: 12, fontFamily: SERIF, fontSize: 27, color: INK_SOFT, lineHeight: 1.7 }}
              >
                <span style={{ color: RED, fontWeight: 700 }}>{i + 1}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        )}
      </AbsoluteFill>

      {/* 右侧楷体批注 */}
      {page.margin && (
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
          <div style={{ borderLeft: `3px solid ${RED}`, paddingLeft: 22 }}>
            <div style={{ fontFamily: KAI, fontSize: 27, color: RED, lineHeight: 1.75, whiteSpace: "pre-line" }}>
              {page.margin}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 19, color: INK_FAINT, marginTop: 14, letterSpacing: 1 }}>
              {page.marginTag ?? "批注 · 易错点"}
            </div>
          </div>
        </AbsoluteFill>
      )}

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

      {/* 字幕条（句级实时刻硬切） */}
      <Subtitle
        section={section}
        sec={sec}
        s={{
          fontSize: 34,
          bg: "rgba(31,29,26,0.86)",
          color: "#FBF8F2",
          radius: 10,
          fontFamily: SERIF,
          bottom: 86,
          maxWidth: 1180,
        }}
      />

      {/* 场景内进度条（细，底部） */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div style={{ height: 3, width: `${p * 100}%`, background: RED, opacity: 0.5 }} />
      </AbsoluteFill>
      {/* 音轨：人声 + BGM 混音（_gen_tts.py 产出；系列惯例播 mixed_audio.wav 而不是 podcast_audio.wav） */}
      <Audio src={staticFile("mixed_audio.wav")} />

    </AbsoluteFill>
  );
};
