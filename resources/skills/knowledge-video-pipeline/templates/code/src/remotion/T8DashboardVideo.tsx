import React from "react";
import { AbsoluteFill, Audio, interpolate, Easing, staticFile } from "remotion";
import timingData from "../../videos/demo/timing.json";
import { useScene } from "./shared/scene";
import { Subtitle } from "./shared/Subtitle";
import { DASH_SCENES, type DashMetric, type DashScene } from "./demoData";
import type { TimingData } from "./shared/types";

/**
 * T8 · 数据仪表盘档 —— 完整视频组件
 *
 * 与 T8Dashboard.tsx（单页演示）的区别：场景由 timing.json 驱动，
 * 每场景的指标 / 条形 / 趋势线从 DASH_SCENES[section.name] 取，动画基于场景内局部帧。
 */

const BG0 = "#0A1628";
const BG1 = "#061020";
const CYAN = "#00E5FF";
const GREEN = "#39FF88";
const TEXT = "#E6F4FF";
const DIM = "#7A93B0";
const FAINT = "#44576E";
const PANEL = "rgba(0,229,255,0.045)";
const LINE = "rgba(0,229,255,0.16)";

const SANS = "'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif";
const MONO = "'JetBrains Mono','Cascadia Mono','Consolas','Courier New',monospace";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

const FALLBACK: DashScene = {
  title: "缺内容配置",
  sub: "NO DATA",
  status: "—",
  metrics: [],
  bars: [],
  spark: [0.5, 0.5],
  sparkNote: "",
};

const Ring: React.FC<{ m: DashMetric; lf: number; delay: number }> = ({ m, lf, delay }) => {
  const R = 62;
  const C = 2 * Math.PI * R;
  const v = interpolate(lf, [delay, delay + 40], [0, m.value / m.max], { ...CLAMP, easing: EASE });
  const shown = interpolate(lf, [delay, delay + 40], [0, m.value], { ...CLAMP, easing: EASE });
  const ticks = 40;

  return (
    <div
      style={{
        flex: 1,
        background: PANEL,
        border: `1px solid ${LINE}`,
        borderRadius: 14,
        padding: "26px 24px 22px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: interpolate(lf, [delay - 6, delay + 10], [0, 1], CLAMP),
      }}
    >
      <div style={{ position: "relative", width: 168, height: 168 }}>
        <svg width="168" height="168" style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: ticks }).map((_, i) => {
            const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
            const r1 = 78;
            const r2 = i % 5 === 0 ? 84 : 81;
            const on = i / ticks <= v;
            return (
              <line
                key={i}
                x1={84 + Math.cos(a) * r1}
                y1={84 + Math.sin(a) * r1}
                x2={84 + Math.cos(a) * r2}
                y2={84 + Math.sin(a) * r2}
                stroke={on ? m.color : FAINT}
                strokeWidth={i % 5 === 0 ? 2 : 1}
                opacity={on ? 0.9 : 0.35}
              />
            );
          })}
          <circle cx="84" cy="84" r={R} fill="none" stroke="rgba(0,229,255,0.10)" strokeWidth="7" />
          <circle
            cx="84"
            cy="84"
            r={R}
            fill="none"
            stroke={m.color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - v)}
            transform="rotate(-90 84 84)"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700, color: TEXT, letterSpacing: -1 }}>
            {shown.toFixed(m.dec)}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 16, color: m.color, marginTop: 4, letterSpacing: 1 }}>
            {m.unit}
          </div>
        </div>
      </div>
      <div style={{ fontFamily: SANS, fontSize: 23, color: TEXT, marginTop: 16, fontWeight: 500 }}>
        {m.label}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 18, color: DIM, marginTop: 6, letterSpacing: 1 }}>
        {m.note}
      </div>
    </div>
  );
};

export const T8DashboardVideo: React.FC = () => {
  const timing = timingData as TimingData;
  const { frame, sec, section } = useScene(timing);
  const scene = DASH_SCENES[section.name] ?? FALLBACK;
  const lf = frame - section.start_frame;

  const sparkP = interpolate(lf, [70, 118], [0, 1], { ...CLAMP, easing: EASE });

  const W = 760;
  const H = 132;
  const pts = scene.spark
    .map((v, i) => {
      const x = (i / Math.max(1, scene.spark.length - 1)) * W;
      // ⚠️ v=1 必须在顶部（y 小）。写成 H - (1-v)*… 会把曲线画反。
      const y = 12 + (1 - v) * (H - 24);
      return `${x},${y}`;
    })
    .join(" ");

  const statusColor =
    scene.status === "PASS" || scene.status === "DONE"
      ? GREEN
      : scene.status === "WARN"
      ? "#FF9F1C"
      : CYAN;

  return (
    <AbsoluteFill style={{ backgroundColor: BG0, fontFamily: SANS }}>
      <AbsoluteFill style={{ background: `linear-gradient(160deg, ${BG0} 0%, ${BG1} 100%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(rgba(0,229,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.045) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />
      <AbsoluteFill
        style={{ background: "radial-gradient(1100px 700px at 78% 6%, rgba(0,229,255,0.10), transparent 62%)" }}
      />

      {/* 顶栏 —— 必须限高 */}
      <AbsoluteFill
        style={{
          top: 0,
          height: 150,
          padding: "0 84px",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 5, height: 42, background: CYAN, borderRadius: 3 }} />
          <div>
            <div style={{ fontSize: 42, fontWeight: 800, color: TEXT, letterSpacing: 1 }}>{scene.title}</div>
            <div style={{ fontFamily: MONO, fontSize: 19, color: DIM, letterSpacing: 2, marginTop: 6 }}>
              {scene.sub}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: `1px solid ${LINE}`,
            borderRadius: 999,
            padding: "9px 22px",
            background: PANEL,
          }}
        >
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: statusColor,
              opacity: 0.55 + 0.45 * Math.abs(Math.sin(frame / 16)),
            }}
          />
          <span style={{ fontFamily: MONO, fontSize: 18, color: statusColor, letterSpacing: 1 }}>
            {scene.status}
          </span>
        </div>
      </AbsoluteFill>

      {/* 环形指标 */}
      <AbsoluteFill style={{ padding: "186px 84px 0", flexDirection: "row", gap: 26, height: 470 }}>
        {scene.metrics.map((m, i) => (
          <Ring key={m.label} m={m} lf={lf} delay={14 + i * 10} />
        ))}
      </AbsoluteFill>

      {/* 底部双面板 —— top 必须配 height */}
      <AbsoluteFill
        style={{
          top: 500,
          height: 540,
          padding: "0 84px",
          flexDirection: "row",
          gap: 30,
          alignItems: "center",
        }}
      >
        <div
          style={{
            flex: 1.05,
            background: PANEL,
            border: `1px solid ${LINE}`,
            borderRadius: 14,
            padding: "24px 28px",
            opacity: interpolate(lf, [52, 70], [0, 1], CLAMP),
          }}
        >
          <div style={{ fontFamily: SANS, fontSize: 21, color: DIM, letterSpacing: 2, marginBottom: 18 }}>
            对比条
          </div>
          {scene.bars.map((b, i) => {
            const w = interpolate(lf, [58 + i * 7, 84 + i * 7], [0, b.v], { ...CLAMP, easing: EASE });
            return (
              <div key={b.name} style={{ display: "flex", alignItems: "center", marginBottom: 13 }}>
                <span style={{ fontFamily: SANS, fontSize: 19, color: DIM, width: 168 }}>{b.name}</span>
                <div
                  style={{
                    flex: 1,
                    height: 12,
                    background: "rgba(0,229,255,0.07)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ width: `${w * 100}%`, height: "100%", background: b.color, borderRadius: 6 }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 19, color: TEXT, width: 74, textAlign: "right" }}>
                  {(w * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            flex: 0.95,
            background: PANEL,
            border: `1px solid ${LINE}`,
            borderRadius: 14,
            padding: "24px 28px",
            opacity: interpolate(lf, [66, 84], [0, 1], CLAMP),
          }}
        >
          <div style={{ fontFamily: SANS, fontSize: 21, color: DIM, letterSpacing: 2 }}>趋势曲线</div>
          <svg width="100%" height="132" viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 14 }}>
            <line x1="0" y1={H - 12} x2={W} y2={H - 12} stroke={LINE} strokeWidth="1" />
            <polyline
              points={pts}
              fill="none"
              stroke={CYAN}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - sparkP}
            />
            {scene.spark.map((v, i) => {
              const x = (i / Math.max(1, scene.spark.length - 1)) * W;
              const y = 12 + (1 - v) * (H - 24);
              const on = sparkP >= i / Math.max(1, scene.spark.length - 1);
              return <circle key={i} cx={x} cy={y} r="4" fill={on ? CYAN : "transparent"} />;
            })}
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: MONO,
              fontSize: 17,
              color: FAINT,
              marginTop: 4,
            }}
          >
            <span>1</span>
            <span>{scene.sparkNote}</span>
            <span>{scene.spark.length}</span>
          </div>
        </div>
      </AbsoluteFill>

      <Subtitle
        section={section}
        sec={sec}
        s={{
          fontSize: 34,
          bg: "rgba(6,16,32,0.88)",
          color: "#E6F4FF",
          radius: 10,
          fontFamily: SANS,
          bottom: 34,
          maxWidth: 1180,
        }}
      />
      {/* 音轨：人声 + BGM 混音（_gen_tts.py 产出；系列惯例播 mixed_audio.wav 而不是 podcast_audio.wav） */}
      <Audio src={staticFile("mixed_audio.wav")} />

    </AbsoluteFill>
  );
};
