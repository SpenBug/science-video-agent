# 全流程技术规格

> 从 10 期以上已交付项目的实测中抽出。**参数都是实测值，不是设计值**——改之前先确认为什么。

---

## 1. 工程目录结构（标准形态）

```
<期数>_<主题>\
├─ 项目源码\mcm-video-temp\
│  ├─ package.json              remotion 4.0.517 / react 18.3.1 / @remotion/transitions 4.0.517
│  ├─ remotion.config.ts        setVideoImageFormat("jpeg") + setOverwriteOutput(true)
│  ├─ tsconfig.json             ES2020 / commonjs / jsx react-jsx / resolveJsonModule
│  ├─ _gen_tts.py               ★ 配音 + 体检 + 混音 + 时间轴（唯一要跑的脚本）
│  ├─ public\
│  │  ├─ bgm.mp3                2,783,814 B，系列通用，从任一已交付期复制
│  │  ├─ podcast_audio.wav      人声轨（mono 44100 16bit）
│  │  └─ mixed_audio.wav        人声 + BGM（stereo 44100 16bit）← 视频里播这个
│  ├─ videos\<ep名>\
│  │  ├─ podcast.txt            ★ 口播稿，[SECTION:name] 分块
│  │  ├─ timing.json            ★ _gen_tts.py 生成，场景时长的唯一真源
│  │  ├─ podcast_audio.srt
│  │  ├─ phonemes.json
│  │  ├─ _tts_tmp\              逐段 mp3/wav 中间产物
│  │  └─ landscape_with_bgm.mp4 / portrait_with_bgm.mp4
│  └─ src\remotion\
│     ├─ index.ts               registerRoot
│     ├─ consts.ts              VIDEO_NAME
│     ├─ theme.ts               设计令牌（配色 / 字体 / Tone）
│     ├─ episode_data.ts        ★ 内容配置
│     ├─ EpisodeVideo.tsx       ★ 视频主组件（版式引擎）
│     ├─ EpisodeCover.tsx       ★ 封面组件
│     └─ Root.tsx               4 个输出：2 Composition + 2 Still
├─ 成品\                        交付四件套
├─ 视频思路.md / 时间线核对表.md / publish_info.md / 发布文案.md
```

**换期只动 3 个文件**：`episode_data.ts`（内容 + 配色）、`podcast.txt`（口播稿）、`EpisodeCover.tsx`（封面文案，或数据文件里的 `COVER`）。
`EpisodeVideo.tsx` / `Root.tsx` / `theme.ts` 是骨架，换期号、改角标即可，**版式别动**。

---

## 2. 七步管线（原始版，S7–S13 对应它）

### Step 1 — 写内容配置 `episode_data.ts`
改 4 组数据：`ROUTE`（动线）、`COMPARES`（扣分 vs 加分）、`FORMULA`（三步口诀）、`CHECKLIST`（自查清单）。
再加 `HOOK_NUMS`、`VOICE_TEXTS`、`SECTION_CFG`（每场景 kicker / title / accent）。

### Step 2 — 写口播稿 `podcast.txt`
```
[SECTION:hook]
你熬了三天三夜写的三十页论文，评委只看了五分钟。……
```
- 每场景一段，`[SECTION:name]` 的 name 必须和 `VOICE_TEXTS` / `SECTION_CFG` 的 key 一致
- 数字写中文读法
- 英文缩写先跑 3 秒样本听
- 字数预算 1180–1230 字（T1 档）
- 经验口径加「大约」「通常」

### Step 3 — 生成配音 + timing.json
```powershell
# 用已装 edge-tts 的解释器跑（APP 内置环境已预装；自装环境先 pip install edge-tts）
python _gen_tts.py
```
脚本做 4 件事：
1. 逐段 `edge-tts` 合成 mp3，流式抓 `WordBoundary` 词边界
2. ffmpeg 转 mono 44100 16bit wav，做音频体检（RMS / peak / ZCR），不合格重试最多 6 次
3. 拼接成人声轨（`GAP=0` 时直接字节拼接；`GAP>0` 时用 ffmpeg concat 解复用器插静音）
4. 回写 `timing.json`（含每段 `sentences:[{text,start,end}]`）+ `podcast_audio.srt` + `phonemes.json`，打印 `DONE tts total_dur=… frames=… sections=…`

> `rate +28%` 是第十二期/第十三期实测值。系列基准是 `+20%`。
> 初稿按 +20% 合成后如果实测 221s（目标 190s）：**先精简约 7% 文案，再把 rate 提到 +28%**，别只加 rate。

### Step 4 — 混音出 `mixed_audio.wav`
```powershell
ffmpeg -y -i public\podcast_audio.wav -stream_loop -1 -i public\bgm.mp3 `
  -filter_complex "[1:a]volume=0.10[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=0[a]" `
  -map "[a]" -ac 2 -ar 44100 public\mixed_audio.wav
```
- BGM 音量 `0.10`（系列标准），`duration=first` 保证总长等于人声
- 输出实测：立体声 44100 16bit，时长与 `timing.json` 的 `total_duration` 一致
- 单独重跑混音：`python _gen_tts.py --mix`

### Step 5 — 渲染 4 个输出
```powershell
npx remotion render src\remotion\index.ts <LandscapeId> videos\<ep>\landscape_with_bgm.mp4 --gl=angle
npx remotion render src\remotion\index.ts <PortraitId>  videos\<ep>\portrait_with_bgm.mp4  --gl=angle
npx remotion still  src\remotion\index.ts Cover34       videos\<ep>\cover34.png --gl=angle
npx remotion still  src\remotion\index.ts Cover43       videos\<ep>\cover43.png --gl=angle
```
`Root.tsx` 里 4 个输出的 `durationInFrames` 全部从 `timing.json` 读，重跑 Step 3 后自动同步，不用手改。
渲染前先 `npx remotion studio src\remotion\index.ts` 起预览逐场景目检。

### Step 6 — 编码后处理
见 SKILL.md S12 的两关命令。

### Step 7 — 交付
见 SKILL.md S13 与 `delivery.md`。

---

## 3. 关键参数速查

| 项 | 值 |
|---|---|
| Remotion | 4.0.517 |
| React | 18.3.1 |
| TTS 音色 | `zh-CN-YunxiNeural`（云希男声）；奶油风档用过 `zh-CN-YunjianNeural`（云健） |
| rate | `+20%` 基准 / `+28%` 救急 / `+8%` 慢速讲解档 |
| 音频 | mono 44100 16bit 拼接 → stereo 44100 混音 |
| BGM 音量 | 0.10 |
| 段间静默 GAP | 0（T1 场景即配音）/ 0.18s（T4 逐句）/ 0.35s（T2 大字清单） |
| fps | 30 |
| 输出 | H.264 `yuv420p(tv/bt709)` 30fps + AAC 192kbps |
| 响度 | `loudnorm I=-14:TP=-1.5:LRA=11` |
| 时长目标 | 短平快 110–120s / 标准 185–195s / 长拆解 240–320s |
| 口播字数 | 短平快 620–700 / 标准 1180–1230 / 长拆解 1500–2000 |
| 字速预算 | 5.6 字/秒（长句、中文数字多）～ 6.5 字/秒（短句） |
| 封面尺寸 | 4:3 = 1200×900；3:4 = 1080×1440 |
| 字幕字号 | 横版 38 / 竖版 46（T1）；横版 44 / 竖版 40（T2） |
| 标题字号 | `60 * fontK`，`fontK = isPortrait ? (width/1080)*0.94 : width/1920` |
| 元素交错步长 | 0.09 ~ 0.16；入场时长 0.10 ~ 0.16；**封顶 0.9** |
| 渲染加速 | `--gl=angle`（RTX 3050 Laptop 已验证） |

---

## 4. 动效语法（最重要的可复制部分）

### 场景级进出场
```ts
slideIn  = interpolate(p, [0,    0.12], [-50, 0], {extrapolateRight:"clamp"})
fade     = interpolate(p, [0,    0.09], [0, 1])
slideOut = interpolate(p, [0.9,  1],    [0, 40])
fadeOut  = interpolate(p, [0.94, 1],    [1, 0])
isEnding = p > 0.88
// 应用：transform: translateY(slideIn - slideOut)
//       opacity: fade * (isEnding ? fadeOut : 1)
```

### 元素级交错入场
```ts
const st = 0.06 + i * 0.10;               // 起点：基线 + 序号 × 步长
const o  = interpolate(p, [st, Math.min(st + 0.14, 0.9)], [0, 1], CLAMP);
const x  = interpolate(p, [st, Math.min(st + 0.14, 0.9)], [-26, 0], CLAMP);  // 位移型
```

### 三条铁律
1. **所有 `interpolate` 必须带 `clamp`**，否则场景边界会画出动画外。
2. **`Math.min(st + dur, 0.9)` 必须封顶**——清单/图例条目多时，不加封顶会让后面条目永远动不起来。（第 11 期 CHECKLIST `segStart` 越界 bug 的根因）
3. **场景归一化进度 `p = clamp((sec - start_sec) / duration_sec, 0, 1)`**，所有元素动画只用 `p`，不要用绝对时间，这样改时长不用改动画。

### 场景判定
- 严格区间 `start ≤ sec < start+dur`（第十二期）
- 或取「最后一个 `start_sec ≤ sec`」的场景（更稳，静默期内容自然淡出）

### 帧级进出场（T2 大字清单档用，不是归一化 p）
```ts
enter = interpolate(frame, [sf, sf+9],         [0,1], clamp)
exit  = interpolate(frame, [sf+dfr-6, sf+dfr], [1,0], clamp)
op    = enter * exit
// 位移：translateY(26 * (1 - slide))，slide = interpolate(p, [0,0.25], [1,0])
```

---

## 5. 字幕机制（两代做法，选一种）

### 5.1 第一代：字数权重估算（已淘汰，仅老 `timing.json` 兜底）
```ts
weight = s.replace(/\s/g,"").length
spans[i] = weight[i] / totalWeight * 0.86   // 0.86 = 字幕在场景内的可用宽度
segStart[i] = 累加                            // 天然单调，不会越界
```

### 5.2 第二代：edge-tts 词边界实时刻（**2026-09-10 特别期B 起，推荐**）
- `_gen_tts.py` 流式抓词边界，句级时刻（按 `。！？` 切分 + 字符偏移映射）写进 `timing.json` 每段 `sentences:[{text,start,end}]`
- `SubtitleBar` / `TextView` 按实时刻**硬切**显示，不做淡入动画，与音频轨逐词对齐
- ⚠️ **新版 edge-tts 默认 `boundary="SentenceBoundary"`，必须显式 `Communicate(..., boundary="WordBoundary")`**，否则 audio 正常但 0 个词事件 → 字幕失去实时刻
- 重新配音后必须重跑 `_gen_tts.py`；渲染前抽一段核对：每段首句 `start ≈ 段 start_sec`，末句 `end ≈ start_sec + duration_sec`
- 老 `timing.json` 没有 `sentences` 时组件走字数权重兜底（静态显示），不会崩

### 5.3 整段字幕模式（T2 大字清单档）
底部一块 `VOICE_TEXTS[name]` 全文，不做句级分段。
**判断**：清单类内容用整段（一条 ≤ 2 句，读得快）；长内容用句级分段（防止一条字幕超 3 行）。

---

## 6. 背景四层（固定堆叠顺序，别乱）

```
① backgroundColor: bg0
② linear-gradient(155deg, bg0 0%, bg1 60%, bg0 100%)      ← 150/155/160 都行
③ 双径向光晕（本章 accent 染色）
     radial-gradient(900px 620px at 82% 8%,  accent26 0%, transparent 62%)
     radial-gradient(700px 520px at 12% 92%, accent1A 0%, transparent 60%)
④ 细网格：双 linear-gradient 1px 线，backgroundSize: 52px 52px
⑤ 顶部 8px + 底部 8px 的 accent 渐变条（章节标识）
```

`accent26` = hex 后加透明度后缀（`26`≈15%，`1A`≈10%）。
**每换一个场景 accent 变化，整片背景光晕跟着变色**——这是这套风格最省事的层次来源。

T2 档差异：`160°` 三色渐变 + **单一**径向光晕（`at 30% 32%`，竖版 `at 50% 30%`）+ 64px 网格（opacity 0.35）+ **顶部单条 6px**（不是顶底双条）+ 光晕呼吸 `opacity = 0.55 + 0.35 * pulse`，`pulse = 0.5 + 0.5*sin(frame/22)`。

---

## 7. 内容一致性门禁

三处 `name` 必须完全一致：

```
podcast.txt 的 [SECTION:name]  ==  episode_data.ts 的 SECTIONS[].name  ==  VOICE_TEXTS 的 key
```

校验脚本（从特别期A 源码 `_check_sync.py` 取，或自己写 5 行）：
```python
import re, json, pathlib
txt = pathlib.Path("videos/<ep>/podcast.txt").read_text(encoding="utf-8")
sections = re.findall(r"\[SECTION:(\w+)\]", txt)
data = pathlib.Path("src/remotion/episode_data.ts").read_text(encoding="utf-8")
names = re.findall(r'name:\s*"(\w+)"', data)
print("txt:", sections)
print("data:", names)
print("MATCH" if sections == names else "MISMATCH")
```

另外校验 `timing.json` 的 section 名集合与 `podcast.txt` 一致，且每段首句 `start` ≈ 段 `start_sec`。
