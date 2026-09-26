import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";

/**
 * T9 · 杂志排版档（Magazine）
 * 像杂志内页：纯白底、超大衬线标题、细分割线、多栏正文、首字下沉、唯一强调色正红。
 * 适合：观点输出 / 方法论 / 系列开篇与收尾
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

const rule = (frame: number, start: number, w: number, color = INK) => ({
  width: interpolate(frame, [start, start + 26], [0, w], { ...CLAMP, easing: EASE }),
  height: 2,
  background: color,
});

export const T9Magazine: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = (start: number, dur = 20) =>
    interpolate(frame, [start, start + dur], [0, 1], { ...CLAMP, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: WHITE, fontFamily: SANS }}>
      {/* 左侧暖灰色块（唯一的非白区域） */}
      <AbsoluteFill
        style={{
          left: 0,
          width: interpolate(frame, [0, 30], [0, 118], { ...CLAMP, easing: EASE }),
          background: OFFWHITE,
        }}
      />

      {/* 页眉 —— 必须限高，否则 alignItems:center 会把内容拉到画布垂直中点 */}
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
        <div style={{ ...rule(frame, 6, 1180, INK), opacity: fade(6) }} />
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
          ISSUE 09
        </span>
      </AbsoluteFill>

      {/* 左栏：栏目名 + 大标题 + 导语 */}
      <AbsoluteFill style={{ padding: "150px 60px 140px 176px", width: 880, flexDirection: "column" }}>
        <div style={{ opacity: fade(10) }}>
          <span
            style={{
              fontFamily: SANS,
              fontSize: 21,
              fontWeight: 600,
              color: ACCENT,
              letterSpacing: 8,
            }}
          >
            方法论
          </span>
        </div>

        <div
          style={{
            marginTop: 30,
            fontFamily: SERIF,
            fontSize: 122,
            fontWeight: 900,
            color: INK,
            lineHeight: 1.1,
            letterSpacing: -3,
            opacity: fade(16),
          }}
        >
          把模型
          <br />
          讲成
          <br />
          <span style={{ color: ACCENT }}>一个故事</span>
        </div>

        <div style={{ ...rule(frame, 30, 168, ACCENT), marginTop: 44 }} />

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
          }}
        >
          评委不会因为你用了粒子群就给你分。
          <br />
          他记住的是你为什么要用。
        </div>
      </AbsoluteFill>

      {/* 右栏：两栏正文，首字下沉 —— width 必须显式给，AbsoluteFill 默认 width:100% 会溢出画布 */}
      <AbsoluteFill
        style={{
          left: 950,
          width: 970,
          padding: "150px 96px 140px 0",
          flexDirection: "row",
          gap: 44,
        }}
      >
        <div
          style={{
            flex: 1,
            fontFamily: SERIF,
            fontSize: 25,
            color: GRAY,
            lineHeight: 2,
            opacity: fade(46),
          }}
        >
          <p style={{ margin: 0 }}>
            <span
              style={{
                float: "left",
                fontFamily: SERIF,
                fontSize: 92,
                fontWeight: 900,
                lineHeight: 0.82,
                color: INK,
                marginRight: 12,
                marginTop: 6,
              }}
            >
              很
            </span>
            多人写论文的顺序是倒的。先把模型跑通，再回头补动机，最后凑一段摘要。
          </p>
          <p style={{ margin: "26px 0 0" }}>
            正确的顺序反过来：先说清楚问题为什么难，再交代你选的武器为什么合适。
          </p>
        </div>

        <div
          style={{
            flex: 1,
            fontFamily: SERIF,
            fontSize: 25,
            color: GRAY,
            lineHeight: 2,
            opacity: fade(54),
          }}
        >
          <p style={{ margin: 0 }}>
            摘要里出现的第一句话，应该是结论，不是背景。
          </p>
          <div
            style={{
              marginTop: 34,
              paddingTop: 26,
              borderTop: `1px solid rgba(17,17,17,0.14)`,
            }}
          >
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 27,
                fontStyle: "italic",
                color: INK,
                lineHeight: 1.8,
              }}
            >
              “三段缺一段，就是废段。”
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 18,
                color: FAINT,
                letterSpacing: 2,
                marginTop: 14,
              }}
            >
              结论 · 证据 · 解释
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* 右栏底部侧栏：三段公式 */}
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
          {[
            { n: "结论", d: "这一段得到了什么" },
            { n: "证据", d: "表几图几，数字多少" },
            { n: "解释", d: "说明什么，下一步靠它做什么" },
          ].map((s) => (
            <div key={s.n} style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 20,
                  fontWeight: 700,
                  color: ACCENT,
                  letterSpacing: 3,
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 21,
                  color: GRAY,
                  lineHeight: 1.7,
                  marginTop: 10,
                }}
              >
                {s.d}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>

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
          <div style={{ ...rule(frame, 62, 90, INK) }} />
          <span style={{ fontFamily: SANS, fontSize: 19, color: INK, letterSpacing: 4 }}>
            PAGE 09
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
