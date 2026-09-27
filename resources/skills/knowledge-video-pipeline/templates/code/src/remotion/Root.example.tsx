import React from "react";
import { Composition } from "remotion";
import { T7PaperNote } from "./T7PaperNote";
import { T8Dashboard } from "./T8Dashboard";
import { T9Magazine } from "./T9Magazine";
import { T10BlackGold } from "./T10BlackGold";
import { T7PaperNoteVideo } from "./T7PaperNoteVideo";
import { T8DashboardVideo } from "./T8DashboardVideo";
import { T9MagazineVideo } from "./T9MagazineVideo";
import { T10BlackGoldVideo } from "./T10BlackGoldVideo";
import timingData from "../../videos/demo/timing.json";

const FPS = 30;
/** 单页演示用固定时长 */
const DEMO_DUR = 150;
/** 完整视频组件读 timing.json */
const VIDEO_DUR = timingData.total_frames;

const LANDSCAPE = { fps: FPS, width: 1920, height: 1080 } as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 单版式演示（展示一套风格的一个页面） */}
      <Composition id="T7PaperNote" component={T7PaperNote} durationInFrames={DEMO_DUR} {...LANDSCAPE} />
      <Composition id="T8Dashboard" component={T8Dashboard} durationInFrames={DEMO_DUR} {...LANDSCAPE} />
      <Composition id="T9Magazine" component={T9Magazine} durationInFrames={DEMO_DUR} {...LANDSCAPE} />
      <Composition id="T10BlackGold" component={T10BlackGold} durationInFrames={DEMO_DUR} {...LANDSCAPE} />

      {/* 完整视频组件（读 timing.json，按帧切换场景 + 句级字幕） */}
      <Composition id="T7PaperNoteVideo" component={T7PaperNoteVideo} durationInFrames={VIDEO_DUR} {...LANDSCAPE} />
      <Composition id="T8DashboardVideo" component={T8DashboardVideo} durationInFrames={VIDEO_DUR} {...LANDSCAPE} />
      <Composition id="T9MagazineVideo" component={T9MagazineVideo} durationInFrames={VIDEO_DUR} {...LANDSCAPE} />
      <Composition id="T10BlackGoldVideo" component={T10BlackGoldVideo} durationInFrames={VIDEO_DUR} {...LANDSCAPE} />
    </>
  );
};
