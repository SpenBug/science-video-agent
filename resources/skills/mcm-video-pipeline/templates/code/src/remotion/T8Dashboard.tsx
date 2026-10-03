import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";

/**
 * T8 · 数据仪表盘档（Dashboard）
 * 像实验室监控大屏：深海军蓝、青色精密网格、环形仪表、等宽数字、逐段绘制的趋势线。
 * 适合：结果检验 / 灵敏度分析 / 误差对比 / 模型性能
 */

const BG0 = "#0A1628";
const BG1 = "#061020";
const CYAN = "#00E5FF";
const GREEN = "#39FF88";
const AMBER = "#FF9F1C";
const RED = "#FF4D6D";
const TEXT = "#E6F4FF";
const DIM = "#7A93B0";
const FAINT = "#44576E";
const PANEL = "rgba(0,229,255,0.045)";
const LINE = "rgba(0,229,255,0.16)";

const SANS = "'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif";
const MONO = "'JetBrains Mono','Cascadia Mono','Consolas','Courier New',monospace";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

type Metric = {
  label: string;
  value: number;
  max: number;
  unit: string;
  dec: number;
  color: string;
  note: string;
};

const METRICS: Metric[] = [
  { label: "拟合优度 R²", value: 0.964, max: 1, unit: "0 – 1", dec: 3, color: GREEN, note: "训练集" },
  { label: "平均相对误差", value: 3.6, max: 20, unit: "%", dec: 1, color: CYAN, note: "留出验证" },
  { label: "最差单点误差", value: 11.8, max: 20, unit: "%", dec: 1, color: AMBER, note: "端面位置" },
];

const BARS = [
  { name: "基准模型", v: 1.0, color: FAINT },
  { name: "加物性修正", v: 0.62, color: CYAN },
  { name: "加边界判据", v: 0.41, color: GREEN },
  { name: "加几何耦合", v: 0.29, color: GREEN },
];

const SPARK = [0.92, 0.86, 0.71, 0.62, 0.48, 0.41, 0.36, 0.31, 0.29];

const Ring: React.FC<{ m: Metric; frame: number; delay: number }> = ({ m, frame, delay }) => {
  const R = 62;
  const C = 2 * Math.PI * R;
  const v = interpolate(frame, [delay, delay + 40], [0, m.value / m.max], {
    ...CLAMP,
    easing: EASE,
  });
  const shown = interpolate(frame, [delay, delay + 40], [0, m.value], { ...CLAMP, easing: EASE });
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
        opacity: interpolate(frame, [delay - 6, delay + 10], [0, 1], CLAMP),
      }}
    >
      <div style={{ position: "relative", width: 168, height: 168 }}>
        <svg width="168" height="168" style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: ticks }).map((_, i) => {
            const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
            const r1 = 78;
            const r2 = i % 5 === 0 ? 84 : 81;
            return (
              <line
                key={i}
                x1={84 + Math.cos(a) * r1}
                y1={84 + Math.sin(a) * r1}
                x2={84 + Math.cos(a) * r2}
                y2={84 + Math.sin(a) * r2}
                stroke={i / ticks <= v ? m.color : FAINT}
                strokeWidth={i % 5 === 0 ? 2 : 1}
                opacity={i / ticks <= v ? 0.9 : 0.35}
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
          <div
            style={{
              fontFamily: MONO,
              fontSize: 40,
              fontWeight: 700,
              color: TEXT,
              letterSpacing: -1,
            }}
          >
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

export const T8Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const sparkP = interpolate(frame, [70, 118], [0, 1], { ...CLAMP, easing: EASE });

  const W = 760;
  const H = 132;
  const pts = SPARK.map((v, i) => {
    const x = (i / (SPARK.length - 1)) * W;
    const y = 12 + (1 - v) * (H - 24);
    return `${x},${y}`;
  }).join(" ");

  return (
    <AbsoluteFill style={{ backgroundColor: BG0, fontFamily: SANS }}>
      <AbsoluteFill
        style={{ background: `linear-gradient(160deg, ${BG0} 0%, ${BG1} 100%)` }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(rgba(0,229,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.045) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(1100px 700px at 78% 6%, rgba(0,229,255,0.10), transparent 62%)`,
        }}
      />

      {/* 顶栏 —— 必须限高：AbsoluteFill 全高 + alignItems:center 会把内容垂直居中 */}
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
            <div style={{ fontSize: 42, fontWeight: 800, color: TEXT, letterSpacing: 1 }}>
              模型体检报告
            </div>
            <div style={{ fontFamily: MONO, fontSize: 19, color: DIM, letterSpacing: 2, marginTop: 6 }}>
              MODEL DIAGNOSTICS · CUMCM 2026 A
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
              background: GREEN,
              opacity: 0.55 + 0.45 * Math.abs(Math.sin(frame / 16)),
            }}
          />
          <span style={{ fontFamily: MONO, fontSize: 18, color: GREEN, letterSpacing: 1 }}>
            PASS
          </span>
        </div>
      </AbsoluteFill>

      {/* 三个环形指标 */}
      <AbsoluteFill
        style={{
          padding: "186px 84px 0",
          flexDirection: "row",
          gap: 26,
          height: 470,
        }}
      >
        {METRICS.map((m, i) => (
          <Ring key={m.label} m={m} frame={frame} delay={14 + i * 10} />
        ))}
      </AbsoluteFill>

      {/* 底部：条形对比 + 趋势线 —— top 必须配 height，AbsoluteFill 自带 height:100% 会溢出画布 */}
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
            opacity: interpolate(frame, [52, 70], [0, 1], CLAMP),
          }}
        >
          <div style={{ fontFamily: SANS, fontSize: 21, color: DIM, letterSpacing: 2, marginBottom: 18 }}>
            逐步改进后的残差下降
          </div>
          {BARS.map((b, i) => {
            const w = interpolate(frame, [58 + i * 7, 84 + i * 7], [0, b.v], {
              ...CLAMP,
              easing: EASE,
            });
            return (
              <div key={b.name} style={{ display: "flex", alignItems: "center", marginBottom: 13 }}>
                <span style={{ fontFamily: SANS, fontSize: 19, color: DIM, width: 168 }}>
                  {b.name}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 12,
                    background: "rgba(0,229,255,0.07)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${w * 100}%`,
                      height: "100%",
                      background: b.color,
                      borderRadius: 6,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 19,
                    color: TEXT,
                    width: 74,
                    textAlign: "right",
                  }}
                >
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
            opacity: interpolate(frame, [66, 84], [0, 1], CLAMP),
          }}
        >
          <div style={{ fontFamily: SANS, fontSize: 21, color: DIM, letterSpacing: 2 }}>
            迭代收敛曲线
          </div>
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
            {SPARK.map((v, i) => {
              const x = (i / (SPARK.length - 1)) * W;
              const y = 12 + (1 - v) * (H - 24);
              const on = sparkP >= i / (SPARK.length - 1);
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
            <span>ITER 1</span>
            <span>收敛于第 9 次迭代</span>
            <span>ITER 9</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
