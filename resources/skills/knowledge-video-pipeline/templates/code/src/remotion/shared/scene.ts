import { useCurrentFrame } from "remotion";
import type { Section, TimingData } from "./types";

export const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

/**
 * 按当前帧定位场景，并给出场景内的归一化进度 p（0–1）。
 *
 * 场景判定用「起点已过的最后一个」，而不是严格区间 `start ≤ sec < start+dur`。
 * 理由：段间可能有 GAP 静默（T2 是 0.35s、T7 是 0.30s），静默期严格区间会掉到
 * 场景之间的空隙里，取「最后一个已开始的」更稳，旧场景会自然淡出。
 *
 * ⚠️ 所有元素动画都只用 p，不要用绝对帧。这样改场景时长不用改动画。
 */
export const useScene = (timing: TimingData) => {
  const frame = useCurrentFrame();
  const { sections } = timing;

  let idx = 0;
  for (let i = sections.length - 1; i >= 0; i--) {
    if (frame >= sections[i].start_frame) {
      idx = i;
      break;
    }
  }

  const section: Section = sections[idx] ?? sections[0];
  const p = clamp01((frame - section.start_frame) / Math.max(1, section.duration_frames));
  const sec = frame / timing.fps;

  return { frame, sec, idx, section, p, total: sections.length };
};

/**
 * 找当前应显示的句子。
 *
 * 有 `sentences` 时按实时刻硬切（与音频轨逐词对齐）；没有时返回 null，
 * 调用方走「整段显示」兜底——老 timing.json 不会崩。
 */
export const pickSentence = (section: Section, sec: number) => {
  const list = section.sentences;
  if (!list || list.length === 0) return null;
  // 取最后一个 start <= sec 的句子
  let found = list[0];
  for (const s of list) {
    if (sec >= s.start) found = s;
    else break;
  }
  // 句子还没开始（段首空白）时也显示第一句，避免字幕闪空
  if (sec < list[0].start) return list[0];
  return found;
};
