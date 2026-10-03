import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { pickSentence } from "./scene";
import type { Section } from "./types";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type SubtitleStyle = {
  /** 字号，横版建议 34–46 */
  fontSize: number;
  /** 条底色 */
  bg: string;
  color: string;
  radius: number;
  fontFamily: string;
  /** 距底边距离 */
  bottom: number;
  maxWidth: number;
  /** 进出场淡入淡出的帧数，0 = 硬切（词边界模式推荐 0） */
  fadeFrames?: number;
};

/**
 * 字幕条 —— 按 `timing.json` 的句级实时刻硬切。
 *
 * ⚠️ 默认 `fadeFrames = 0`（硬切）。这是 2026-09-10 特别期B 起的系列做法：
 * 字幕与音频轨逐词对齐，加淡入反而会显得延迟。
 * 只有老 timing.json 没 sentences 时才需要调用方自己兜底显示整段。
 */
export const Subtitle: React.FC<{ section: Section; sec: number; s: SubtitleStyle }> = ({
  section,
  sec,
  s,
}) => {
  const sentence = pickSentence(section, sec);
  if (!sentence) return null;

  const fade = s.fadeFrames ?? 0;
  let opacity = 1;
  if (fade > 0) {
    const f = fade / 30; // 转成秒
    opacity =
      interpolate(sec, [sentence.start, sentence.start + f], [0, 1], CLAMP) *
      interpolate(sec, [sentence.end - f, sentence.end], [1, 0], CLAMP);
  }

  return (
    <AbsoluteFill
      style={{
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: s.bottom,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: s.maxWidth,
          background: s.bg,
          borderRadius: s.radius,
          padding: `${Math.round(s.fontSize * 0.34)}px ${Math.round(s.fontSize * 0.86)}px`,
          opacity,
        }}
      >
        <span
          style={{
            fontFamily: s.fontFamily,
            fontSize: s.fontSize,
            color: s.color,
            lineHeight: 1.5,
            textAlign: "center",
            display: "block",
          }}
        >
          {sentence.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
