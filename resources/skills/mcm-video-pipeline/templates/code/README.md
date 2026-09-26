# templates/code · 可运行样式组件

T7–T10 五套样式的 **Remotion 组件源码**。每套都有两个形态：**单页演示**（看风格长什么样）和 **完整视频组件**（读 `timing.json` 真能出片）。

---

## 目录

```
templates/code/
├─ src/remotion/
│  ├─ shared/                      场景引擎（四套共用）
│  │  ├─ types.ts                  TimingData / Section / Sentence 类型
│  │  ├─ scene.ts                  useScene() 按帧定位场景 + pickSentence()
│  │  └─ Subtitle.tsx              句级实时刻硬切字幕条
│  ├─ demoData.ts                  演示内容（对应 5 个场景）
│  ├─ T4CreamPaperVideo.tsx        ★ T4 完整视频组件（奶油论文图解）
│  ├─ T4RepoTree.tsx               ★ T4 附属版式：文件树（mode: "tree"）
│  ├─ T4YearTable.tsx              ★ T4 附属版式：对比表（mode: "year"）
│  ├─ T4plan.example.ts            ★ T4 场景计划示例（复制成 plan.ts 再用）
│  ├─ T7PaperNote.tsx              单页演示
│  ├─ T7PaperNoteVideo.tsx         完整视频组件
│  ├─ T8Dashboard.tsx / T8DashboardVideo.tsx
│  ├─ T9Magazine.tsx / T9MagazineVideo.tsx
│  ├─ T10BlackGold.tsx / T10BlackGoldVideo.tsx
│  └─ Root.example.tsx             8 个 Composition 的注册示例
└─ videos/demo/timing.json         演示用时间轴（5 场景 / 32.75s / 982 帧）
```

---

## T4 组件怎么用（2026-09-21 实测跑通，280.40s 出片）

T4 不依赖 `shared/scene.ts`，自己从 `timing.json` 定位场景与句子。换期只改两处：

1. `T4CreamPaperVideo.tsx` 顶部 `import timingData from "../../videos/<你的期>/timing.json"`
2. 把 `T4plan.example.ts` 复制成 `plan.ts`，改里面的 `SECTION_PLAN`，并同步改组件里的 import

`SECTION_PLAN` 的 key **必须与 `podcast.txt` 的 `[SECTION:name]` 完全一致**（用 `_check_sync.py` 校验）。每个场景配：

```ts
{ label: "第 6–8 页", chapter: "三线表", note: "tabularx 自动列宽", imgs: ["page-06.png"], hue: "#F59E0B", mode: "split" }
```

`mode` 四选一：

| mode | 版式 | 用图 |
|---|---|---|
| `open` | 整屏大图（开场 / 收尾） | 单张 |
| `split` | 左文右图（最常用） | 按句索引轮换 |
| `tree` | 文件树列表（`T4RepoTree`） | 不用图 |
| `year` | 左右对比表（`T4YearTable`） | 不用图 |

**两个已踩的版式坑**：

- 顶部标签容器**不要**用 `AbsoluteFill + height`，会让 `justify-content: space-between` 失效 → 用 `position: absolute; top/left/right: 0` + `boxSizing: "border-box"`。
- 右侧 A4 竖版页图必须给 `img` 加**明确像素** `maxHeight`（如 690），`maxHeight: "100%"` 在 flex 链里常失效，图会撑出内容区被字幕遮住。

---

## 两种形态的区别

| | 单页演示 `T7PaperNote.tsx` | 完整视频组件 `T7PaperNoteVideo.tsx` |
|---|---|---|
| 场景 | 写死一个页面 | 由 `timing.json` 驱动，按帧自动切换 |
| 内容 | 硬编码在组件里 | 从 `demoData.ts` 按 `section.name` 取 |
| 动画 | 基于绝对帧 | 基于**场景内局部帧** `lf = frame - section.start_frame` |
| 字幕 | 无 | `Subtitle` 组件，句级实时刻硬切 |
| 用途 | 目检风格 | 实际出片 |

**关键设计**：动画全部基于 `lf`（场景内局部帧）而不是绝对帧。这样改某个场景的时长，动画节奏不用跟着改。

---

## 场景引擎怎么用

```tsx
import timingData from "../../videos/demo/timing.json";
import { useScene } from "./shared/scene";
import { Subtitle } from "./shared/Subtitle";

const MyVideo: React.FC = () => {
  const { frame, sec, section, p } = useScene(timingData);
  const lf = frame - section.start_frame;        // 场景内局部帧
  const content = MY_DATA[section.name];         // 按场景名取内容

  return (
    <>
      {/* 你的版式 */}
      <Subtitle section={section} sec={sec} s={{ /* 样式 */ }} />
    </>
  );
};
```

`useScene` 返回：

| 字段 | 含义 |
|---|---|
| `frame` | 当前绝对帧 |
| `sec` | 当前绝对秒（`frame / fps`） |
| `idx` | 当前场景序号 |
| `section` | 当前场景对象（含 `sentences`） |
| `p` | **场景内归一化进度 0–1** |
| `total` | 场景总数 |

### 场景判定为什么不用严格区间

用的是「**起点已过的最后一个**」而不是 `start ≤ sec < start+dur`。
理由：段间可能有 GAP 静默（T2 是 0.35s、T7 是 0.30s），严格区间会在静默期掉到场景之间的空隙里；取「最后一个已开始的」更稳，旧场景会自然淡出。

### 字幕为什么是硬切

`Subtitle` 默认 `fadeFrames = 0`（硬切），这是 2026-09-10 特别期 B 起的系列做法——字幕与音频轨逐词对齐，加淡入反而显得延迟。

老 `timing.json` 没有 `sentences` 字段时 `pickSentence` 返回 `null`，`Subtitle` 渲染 `null`（不崩），调用方自己走「整段显示」兜底。

---

## 怎么跑起来

### 1. 拷进工程

```bash
cp -r templates/code/src/remotion/* <你的工程>/src/remotion/
cp templates/code/videos/demo/timing.json <你的工程>/videos/<你的ep名>/timing.json
```

⚠️ 路径要对：`timing.json` 在工程根的 `videos/<ep名>/` 下，组件里用 `../../videos/<ep名>/timing.json` 引用（`src/remotion/` 退两级到工程根）。

### 2. 注册 Composition

参考 `Root.example.tsx`：

```tsx
<Composition id="T7PaperNoteVideo" component={T7PaperNoteVideo}
  durationInFrames={timingData.total_frames} fps={30} width={1920} height={1080} />
```

`durationInFrames` 一定要从 `timing.json` 读，别写死——重跑配音后自动同步。

### 3. 渲染

```bash
npx remotion still  src/remotion/index.ts T7PaperNoteVideo out/f490.png --frame=490
npx remotion render src/remotion/index.ts T7PaperNoteVideo out/横版.mp4 --gl=angle
```

⚠️ `still` 的参数顺序是 **入口 → 组合 ID → 输出路径**。漏了组合 ID 会报 `Could not find composition with ID out/f490.png`（它把输出路径当成了组合 ID）。

### 4. 换期改哪里

| 文件 | 改什么 |
|---|---|
| `videos/<ep名>/timing.json` | 由 `_gen_tts.py` 生成，**不要手改** |
| `demoData.ts` | 各场景的内容。key 必须与 `podcast.txt` 的 `[SECTION:name]` 完全一致 |

---

## 演示数据（`videos/demo/`）

`podcast.txt` + `timing.json` —— **由 `_gen_tts.py` 真实产出**，不是造的。
主题「灵敏度分析三步」，5 个场景：

| 场景 | 起始 | 时长 | 帧窗口 | 句数 |
|---|---|---|---|---|
| `hook` | 0.00s | 7.27s | 0 – 217 | 2 |
| `s1` | 7.57s | 6.91s | 227 – 433 | 2 |
| `s2` | 14.78s | 7.42s | 444 – 665 | 2 |
| `s3` | 22.50s | 7.56s | 675 – 901 | 2 |
| `outro` | 30.36s | 6.22s | 911 – 1096 | 2 |

总长 **36.58s / 1097 帧 / 30fps**，voice `zh-CN-YunxiNeural`，rate `+16%`，GAP 0.30s。

`_gen_tts.py` 也一并放进了本目录（`templates/code/_gen_tts.py`），改 `BASE` 指向你的 `videos/<ep名>/` 即可复用。

抽帧核对用的帧号：`120 / 300 / 490 / 700 / 900`（分别落在 5 个场景内）。

### 四套共用同一份音频与时间轴

这是刻意的设计——**一份脚本，四种视觉处理**。所以 `demoData.ts` 里 T7/T8/T9/T10 的内容都围绕同一个叙事（灵敏度分析三步），换风格不换内容。

---

## 已验证 / 未验证

### ✅ 已端到端跑通（2026-09-20）

四套全部**真配了 TTS 音频、真跑了完整渲染、真过了后处理两关**。

**配音（`_gen_tts.py`，RATE +16% / GAP 0.30）**

| 项 | 结果 |
|---|---|
| 段数 / 总长 | 5 段 / 36.58s / 1097 帧 |
| 音频体检 | ✅ 全过（RMS 0.053–0.058，阈值 0.20） |
| 词边界 | ✅ 每段 2 句，句级时刻齐全 |
| 异常恢复 | ✅ 中途 4 次 `ClientConnectorError`，重试自动恢复 |

**渲染与后处理（四套各一份成品）**

| 套 | 帧数 | 像素格式 | 色彩标签 | 体积 |
|---|---|---|---|---|
| T7PaperNoteVideo | 1097 | `yuv420p` | `bt709 ×3` | 1.76 MB |
| T8DashboardVideo | 1097 | `yuv420p` | `bt709 ×3` | 2.43 MB |
| T9MagazineVideo | 1097 | `yuv420p` | `bt709 ×3` | 1.69 MB |
| T10BlackGoldVideo | 1097 | `yuv420p` | `bt709 ×3` | 2.31 MB |

验收标准 `yuv420p(tv, bt709, progressive)` + AAC 192k/48kHz/stereo **四套全部达标**。
渲染耗时：T7 1m13s / T8 1m39s / T9 ~2min / T10 ~2min（`--gl=angle`，RTX 3050 Laptop）。

**场景切换与字幕同步**

从成品 mp4 抽 26.0s 的帧核对：`timing.json` 里 s3 第 2 句是 `[25.15–29.30]`，26.0s 抽帧显示的正是那句。
→ 词边界 → timing.json → 场景引擎 → 字幕 整条链路对齐。

样片：`../../assets/sample/样片-T7纸感笔记-36秒.mp4`

### 修过的 bug（都是渲染出来才发现的）

| 问题 | 修法 |
|---|---|
| T8 趋势线画反了（值递增，线却下降） | y 轴映射 `H-(1-v)*(H-24)-12` 是反的，改成 `12+(1-v)*(H-24)` |
| T10 字幕压在第三条条款上 | 条款区 `padding-bottom` 120 → 176 |
| T9 首字下沉过大（92px vs 25px 正文） | 降到 72px |
| T7 字幕与页脚重叠 | 字幕 `bottom` 40 → 86 |

### ⚠️ 仍未验证

| 项 | 状态 |
|---|---|
| 竖版适配 | ❌ 四套都没有 |
| 中间帧动画逐帧检查 | ⚠️ 只抽了 5 个关键帧 |
| 字体回退（非 Windows） | ⚠️ 仅本机验证（T7 楷体 / T8 等宽数字） |
| 真实一期长度（185s+） | ⚠️ 样片只有 36s，长片未压测 |
| 封面 | ❌ 四套都没有设计封面 |

### 一个交付验收的坑（已写进 `references/delivery.md`）

**核对时长要量视频流，不要量容器**——容器时长永远比视频流长约 0.1–0.2s（AAC 编码器填充）。
样片实测：视频流 36.5667s（= 1097/30，与 `timing.json` 精确一致），容器 36.70s，多出的 0.13s 是填充。

```bash
# ✓ 量视频流
ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames,duration \
  -of default=noprint_wrappers=1 成品.mp4
```

---

## 改样式前必读

**`references/gotchas.md` 第 19 / 20 条**：

1. `AbsoluteFill` 自带 `width: 100%` / `height: 100%` → 设了 `left` 必须给 `width`，设了 `top` 必须给 `height`，否则溢出画布
2. `AbsoluteFill` + `flexDirection: row` + `alignItems: center` → 内容被拉到画布垂直中点（要配 `top: N, height: M` 限高）

这两条在 T7–T10 的开发过程中，**4 张图踩了 3 张**。都是代码看着完全正常、渲染出来才发现的那种。
