/**
 * 场景引擎 · 类型定义
 *
 * 这几个类型与 `_gen_tts.py` 产出的 `timing.json` 结构一一对应。
 * 不要改字段名——改了就和 TTS 管线对不上了。
 */

/** 句级时刻，来自 edge-tts WordBoundary 词边界（`_gen_tts.py` 回写） */
export type Sentence = {
  text: string;
  /** 绝对秒，相对整条音轨起点 */
  start: number;
  end: number;
};

/** 一个场景 = 口播稿里的一个 [SECTION:name] 块 */
export type Section = {
  /** 与 podcast.txt 的 [SECTION:name] 一致 */
  name: string;
  start_sec: number;
  duration_sec: number;
  start_frame: number;
  duration_frames: number;
  /** 老 timing.json 可能没有这个字段，组件要走兜底 */
  sentences?: Sentence[];
};

/** timing.json 顶层结构 */
export type TimingData = {
  total_duration: number;
  total_frames: number;
  fps: number;
  sections: Section[];
};
