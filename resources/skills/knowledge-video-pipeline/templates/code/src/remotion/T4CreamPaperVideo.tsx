import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  staticFile,
  Audio,
} from "remotion";
// ⚠️ 换期只改两处：① 下面 timing.json 的路径；② 把 T4plan.example.ts 复制成 plan.ts 后改这里
import timingData from "../../videos/demo/timing.json";
import { SECTION_PLAN, SectionPlan } from "./T4plan.example";
import { RepoTree } from "./T4RepoTree";
import { YearTable } from "./T4YearTable";

// ===== T4 奶油论文图解配色 =====
const CREAM = "#FDFBF4";
const INK = "#1A1A2E";
const INK_FAINT = "#7A7A8C";
const YELLOW = "#F4D758";
const BLUE_DEEP = "#1E3A8A";
const SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif";
const GRID =
  "linear-gradient(rgba(26,26,46,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,46,0.035) 1px, transparent 1px)";
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const TOP_BAR = "linear-gradient(90deg,#3B82F6 55%,#F4D758 78%,#E84A5F 100%)";

type Sec = {
  name: string;
  start_sec: number;
  duration_sec: number;
  start_frame: number;
  duration_frames: number;
  is_silent: boolean;
  sentences: { text: string; start: number; end: number }[];
};

const SECTIONS = (timingData as unknown as { sections: Sec[] }).sections;

export const TemplateVideo: React.FC<{ isPortrait?: boolean }> = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  // ---- 定位当前场景 ----
  let si = 0;
  for (let i = SECTIONS.length - 1; i >= 0; i--) {
    if (t >= SECTIONS[i].start_sec) {
      si = i;
      break;
    }
  }
  const sec = SECTIONS[si];
  const plan: SectionPlan = SECTION_PLAN[sec.name] ?? SECTION_PLAN.hook;
  const hue = plan.hue;
  const isOpen = plan.mode === "open";
  const isTree = plan.mode === "tree";
  const isYear = plan.mode === "year";

  // ---- 场景内进度 ----
  const secLocalT = (t - sec.start_sec) / Math.max(0.001, sec.duration_sec);

  // ---- 定位当前句 ----
  let qi = 0;
  for (let i = sec.sentences.length - 1; i >= 0; i--) {
    if (t >= sec.sentences[i].start) {
      qi = i;
      break;
    }
  }
  const cue = sec.sentences[qi] ?? { text: "", start: sec.start_sec, end: sec.start_sec + 1 };
  const localT = (t - cue.start) / Math.max(0.001, cue.end - cue.start);

  // ---- 图片：按句索引轮换 ----
  const img = plan.imgs.length ? plan.imgs[qi % plan.imgs.length] : null;
  // 同图内多句不重放动画
  let firstQi = qi;
  for (let j = qi; j >= 0; j--) {
    if (plan.imgs.length && plan.imgs[j % plan.imgs.length] === img) firstQi = j;
    else break;
  }
  const imgT = t - sec.sentences[firstQi].start;
  const imgP = Math.min(Math.max(imgT / 1.2, 0), 1);
  const imgZoom = interpolate(imgP, [0, 1], [1.04, 1.0], { extrapolateRight: "clamp" });
  const imgFade = interpolate(imgP, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ---- 字幕 ----
  const subOpacity = interpolate(localT, [0, 0.06, 0.94, 1], [0, 1, 1, 0.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subSlide = interpolate(localT, [0, 0.1], [26, 0], {
    extrapolateRight: "clamp",
    easing: EASE,
  });

  // ---- 左侧要点卡 ----
  const noteOpacity = interpolate(localT, [0, 0.14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const noteSlide = interpolate(localT, [0, 0.14], [18, 0], {
    extrapolateRight: "clamp",
    easing: EASE,
  });

  // ---- 章节标签：场景首句才重放 ----
  const tagOpacity = interpolate(localT, [0, 0.2], [qi === 0 ? 0 : 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tagSlide = interpolate(localT, [0, 0.2], [qi === 0 ? -22 : 0, 0], {
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: CREAM, fontFamily: SANS }}>
      <AbsoluteFill style={{ background: GRID, backgroundSize: "44px 44px" }} />
      <AbsoluteFill style={{ height: 14, top: 0, background: TOP_BAR }} />
      <AbsoluteFill style={{ height: 14, bottom: 0, background: TOP_BAR }} />

      {/* 顶部：章节标签 + 品牌 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 130,
          padding: "40px 70px 0 70px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pointerEvents: "none",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            opacity: tagOpacity,
            transform: `translateY(${tagSlide}px)`,
            fontSize: 30,
            fontWeight: 800,
            color: "#fff",
            background: hue,
            padding: "8px 26px",
            borderRadius: 12,
            letterSpacing: 2,
          }}
        >
          {plan.label}
        </span>
        <span style={{ fontSize: 26, fontWeight: 700, color: INK_FAINT, letterSpacing: 3 }}>
          数模AI冲国奖
        </span>
      </div>

      {/* 内容区 */}
      {isOpen && img ? (
        <AbsoluteFill
          style={{
            top: 130,
            bottom: 150,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 60px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <img
              src={staticFile(img)}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                opacity: imgFade,
                transform: `scale(${imgZoom})`,
                borderRadius: 18,
                boxShadow: "0 24px 70px rgba(26,26,46,0.18)",
                border: "1px solid rgba(26,26,46,0.08)",
              }}
            />
          </div>
        </AbsoluteFill>
      ) : isTree ? (
        <AbsoluteFill
          style={{
            top: 155,
            bottom: 175,
            padding: "0 110px",
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <RepoTree localT={secLocalT} />
        </AbsoluteFill>
      ) : isYear ? (
        <AbsoluteFill style={{ top: 140, bottom: 150, padding: "0 100px", display: "flex", justifyContent: "center", flexDirection: "column" }}>
          <YearTable localT={secLocalT} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            top: 140,
            bottom: 190,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "0 90px",
            gap: 56,
          }}
        >
          {/* 左：标题 + 要点卡 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ width: 12, height: 56, background: hue, borderRadius: 6, flexShrink: 0 }} />
              <div>
                <div
                  style={{
                    fontSize: 46,
                    fontWeight: 900,
                    color: INK,
                    fontFamily: "'Songti SC','SimSun',serif",
                    lineHeight: 1.2,
                  }}
                >
                  {plan.chapter}
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, color: INK_FAINT, letterSpacing: 2, marginTop: 6 }}>
                  {plan.label}
                </div>
              </div>
            </div>

            <div
              style={{
                opacity: noteOpacity,
                transform: `translateY(${noteSlide}px)`,
                marginTop: 30,
                background: "#FFFFFF",
                border: "2px solid " + YELLOW,
                borderRadius: 16,
                padding: "18px 26px",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, color: hue, letterSpacing: 1 }}>▍本页要点</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: BLUE_DEEP, lineHeight: 1.5, marginTop: 10 }}>
                {plan.note}
              </div>
            </div>
          </div>

          {/* 右：PDF 页图卡片 */}
          <div style={{ width: "36%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {img && (
              <div
                style={{
                  width: "100%",
                  background: "#FFFFFF",
                  borderRadius: 16,
                  padding: 10,
                  opacity: imgFade,
                  transform: `scale(${imgZoom})`,
                  boxShadow: "0 18px 50px rgba(26,26,46,0.14)",
                  border: "1px solid rgba(26,26,46,0.08)",
                  boxSizing: "border-box",
                }}
              >
                <img
                  src={staticFile(img)}
                  style={{
                    width: "100%",
                    maxHeight: 690,
                    objectFit: "contain",
                    borderRadius: 8,
                    display: "block",
                    margin: "0 auto",
                  }}
                />
              </div>
            )}
          </div>
        </AbsoluteFill>
      )}

      {/* 底部字幕条 */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "0 120px 26px 120px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            opacity: subOpacity,
            transform: `translateY(${subSlide}px)`,
            maxWidth: 1500,
            backgroundColor: "rgba(26,26,46,0.82)",
            borderRadius: 20,
            padding: "16px 40px",
          }}
        >
          <span
            style={{
              fontSize: 40,
              fontWeight: 600,
              color: "#ffffff",
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            {cue.text}
          </span>
        </div>
      </AbsoluteFill>

      <Audio src={staticFile("mixed_audio.wav")} />
    </AbsoluteFill>
  );
};
