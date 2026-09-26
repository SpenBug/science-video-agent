# T11 · 单文件 HTML + GSAP 档（HyperFrames 后端）

> **第一档不走 Remotion 的模板。** 一个 `index.html` 装下全部场景，GSAP 绝对秒时间线驱动，
> HyperFrames 按帧 seek 渲染。视觉气质与 T1 同族（深空底 + 橙色 accent），
> 但**工程形态、时间轴模型、配音管线三样全不一样**。
> 状态：✅ 有已交付真源（第七期 185.5s / 5565 帧 / 11 场景）· ✅ 封面 4:3 + 3:4 都有 · ✅ 端到端跑通过
> 骨架：`templates/code/html-gsap/`　真源：`Downloads/数学建模国赛避坑指南_第七期_项目源码/`

---

## 1. 适用 / 不适用

| ✅ 适用 | ❌ 不适用 |
|---|---|
| 「N 个坑 / N 条清单」这类**并列结构**内容 | 需要逐帧精确对齐词边界的字幕（→ T1 词边界模式） |
| 想快速改一版画面、不装 node_modules 的场景 | 需要论文截图 / 题目原图逐句讲解（→ T4） |
| 交付源码给第三方看（对方双击就能开） | 需要 6 种以上版式的长拆解（→ T3） |
| 想用 Kokoro 离线男声（云健）而不是云希 | 需要 Tailwind / 复杂组件复用的工程（→ T1–T10） |

**判断**：内容是「列出来的」而不是「推出来的」，且你希望**工程极轻** → 用本档。

---

## 2. 规格（第七期实测）

| 项 | 值 |
|---|---|
| 分辨率 | 1920×1080（横版；竖版需重排，本档真源未适配） |
| fps | 30 |
| 总时长 | 185.5s（5565 帧） |
| 场景数 | 11（S1 钩子 + S2 评委视角 + S3–S7 五个坑 + S8 决策树 + S9 时间线 + S10 清单 + S11 Outro） |
| 口播字数 | 约 1180 字（11 段） |
| 配音 | Kokoro ONNX · `zm_yunjian`（云健，沉稳播音男声，基频≈99Hz）· speed **1.08** |
| 配音总长 | 178.8s（11 段） |
| 场景间隙 | **0.6s**（转场动画时长） |
| 音频起点 | 场景展示开始 **+ 0.3s** |
| BGM | `bgm.mp3`，`data-volume="0.18"`，1.5s 淡入 + 3s 淡出 |
| 音频轨道 | BGM 固定 `track-index=1`，配音 `2..N+1` 各占一条独立轨道 |
| 封面 | 4:3（1200×900）+ 3:4（1080×1440） |

**字数预算**：Kokoro 语速 1.08 时约 **6.4 字/秒**（含标点停顿）。
11 场景 × 平均 16.8s ≈ 185s → 约 1180 字。比 Remotion 线（云希 +28%，5.6–6.5 字/秒）略慢，**不要直接套 T1 的字数表**。

---

## 3. 风格 DNA

### 3.1 色板（CSS 变量，`--角色名`）

| 变量 | 值 | 用途 |
|---|---|---|
| `--bg` | `#0D1B2A` | 深空底（比 T1 的 `#070B18` 亮一档，偏海军蓝） |
| `--bg-card` | `#1B2A3E` | 卡片底 |
| `--accent` | `#F77F00` | 主强调（编号 / 口诀条 / CTA） |
| `--red` | `#E63946` | 错误示范 / 致命数字 / 红章 |
| `--green` | `#2A9D8F` | 正确姿势 / 勾选 |
| `--yellow` | `#FCBF49` | 正文内高亮 `.hl` |
| `--text` | `#E0E1DD` | 主文字（不是纯白，偏暖灰） |
| `--text-dim` | `#8D99AE` | 次要说明 / 副标题 |

**只有 3 个语义色**：红=错、绿=对、黄=高亮。橙是版式色（编号、口诀条），不参与对错语义。

### 3.2 字体

```css
@font-face { font-family:"Noto Sans SC"; src:url("fonts/noto-sc-400.woff2") format("woff2"); font-weight:400; }
@font-face { font-family:"Noto Sans SC"; src:url("fonts/noto-sc-700.woff2") format("woff2"); font-weight:700; }
html, body { font-family:"Noto Sans SC", sans-serif; }
```

⚠️ **本地嵌入 woff2 是「不出现方框乱码」的唯一保证**，别依赖系统字体。
真源的历史修复记录就是「乱码修复：Noto Sans SC 本地嵌入」。

**全片只有两个字重**：400（正文）+ 700（标题 / 强调）。没有 300 / 500 / 900。
数字一律加 `font-variant-numeric: tabular-nums`（等宽数字，避免动画时抖动）。

### 3.3 字号

| 元素 | 值 |
|---|---|
| 超大数字（`.hook-number`） | 210px / 700 |
| 超大百分比（`.hook-pct`） | 120px / 700 / 红 |
| 计时数字（`.timer-clock`） | 130px / 700 / 橙 |
| Outro 主标题 | 76px / 700 |
| 坑编号（`.pitfall-num`） | 66px / 700 / 橙 |
| 场景标题（`.pitfall-title`） | 56px / 700 |
| 卡片正文（`.card-text`） | 30px / lineHeight 1.7 |
| 口诀条（`.tip-bar`） | 28px / 700 / 橙 |
| 卡片标签（`.card-label`） | 26px / 700 / letterSpacing 2 |
| 顶部小标（`.hook-label`） | 34px / letterSpacing 4 / `--text-dim` |

---

## 4. 版式（真源用了 6 种）

```
① 钩子 hook          居中竖排：短横线 → 小标 → 超大数字 → 小标 → 超大百分比 → 副句
② 计时 timer         标题 + 超大计时数字 + 900px 进度条（渐变绿→黄→红，从满到空）+ 副句
③ 对比 pitfall       header(编号+标题) + 左右两卡(bad/good) + 底部口诀条   ← 本档主力，复用于 5 个场景
④ 决策树 tree        header(badge+标题) + 三列卡（每列：步骤名 + 说明）
⑤ 时间线 tl          横向色块条（30%/40%/30%）+ 底部说明句
⑥ 清单 check         标题 + 1200px 宽 5 条勾选项
⑦ Outro              主标题 + 副句 + 橙色 CTA（两行）
```

**③ 对比版式是本档的心脏**（5/11 个场景都用它）：

```
┌──────────────────────────────────────────────────────┐
│  坑 1   摘要全是废话                                  │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │ 错误示范          │  │ 正确姿势 · 四要素 │          │
│  │ “建立了合理的数学  │  │ 整数规划 + 分支定界│          │
│  │  模型……”         │  │ 总成本 1842 万元  │          │
│  └──────────────────┘  └──────────────────┘          │
│  ▌口诀：模型名 + 算法 + 关键数字 + 结论                │
└──────────────────────────────────────────────────────┘
```

左卡 `x:-60` 入、右卡 `x:+60` 入，底部口诀条用 `back.out` 弹入 —— 左→右→下，视线自然。

**内容区 padding 统一 `55px 100px`，gap `32px`**（`.pitfall-content` / `.tree-content` / `.timeline-content`）。
居中版式用 `80px 120px`、gap `26–40px`。

---

## 5. 动效语法

### 5.1 时间轴模型：**绝对秒**，不是相对帧

这是本档和 Remotion 线最根本的差别：

```js
tl.from("#s3-num", { x: -40, opacity: 0, duration: 0.4, ease: "expo.out" }, 24.5);
//                                                                          ↑
//                              从片子开始算的绝对秒数，不是相对上一行的偏移
```

**好处**：改某段配音时长，只需改这一段的所有秒数，前后场景互不影响，也不用换算帧。
**代价**：秒数是手填的，必须和 `TIMELINE.md` 的「口播实际区间」逐行对齐 —— **两处不一致就会错位**。

### 5.2 入场缓动分工（固定，别乱换）

| 缓动 | 给谁 | 参数 |
|---|---|---|
| `expo.out` | 场景编号、标题的**横移** | `x:-40 → 0`，duration 0.4 |
| `back.out(1.2~1.4)` | 数字、口诀条、CTA 的**弹入** | duration 0.4–0.7 |
| `power2.out` | 标签、正文的**小幅上浮** | `y:20~30 → 0`，duration 0.3–0.5 |
| `power3.out` | 卡片、整块的**较大位移** | `x/y:±40~60 → 0`，duration 0.5 |

### 5.3 转场只有三种，成对出现

```js
// ① push —— 横向推走（最常用，7 次）
tl.to("#sceneN", { x: -1920, duration: 0.6, ease: "power3.inOut" }, T);
tl.fromTo("#sceneN1", { x: 1920, opacity: 1 }, { x: 0, opacity: 1, duration: 0.6, ease: "power3.inOut" }, T);

// ② blur —— 模糊淡出淡入（3 次）
tl.to("#sceneN", { filter: "blur(12px)", scale: 1.03, opacity: 0, duration: 0.6, ease: "power2.inOut" }, T);
tl.fromTo("#sceneN1", { filter: "blur(12px)", scale: 0.97, opacity: 0 }, { filter: "blur(0px)", scale: 1, opacity: 1, duration: 0.6, ease: "power2.inOut" }, T);

// ③ zoom —— 冲出 + 冲入（1 次，只给高潮点：坑 5 格式违规）
tl.to("#sceneN", { scale: 2.5, opacity: 0, filter: "blur(10px)", duration: 0.5, ease: "power3.in" }, T);
tl.fromTo("#sceneN1", { scale: 0.5, opacity: 0, filter: "blur(10px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.5, ease: "power3.out" }, T);
```

**转场节奏**：全片 push / blur 交替用，让视觉不单调；zoom 全片只用 1 次，留给情绪最高点。

### 5.4 常驻微动（每个场景一条）

```js
tl.to("#s1-num", { scale: 1.04, duration: 1.5, yoyo: true, repeat: 6, ease: "sine.inOut" }, T);
```

位移/缩放幅度**不超过 8px / 4%**，周期 1.3–1.6s，`sine.inOut`。
场景里「最该被看的那一个元素」才给常驻动，别每个元素都动。

⚠️ **真源用了 `repeat: -1`，HyperFrames 的 `lint` 会报错**（禁止无限重复，破坏渲染确定性）。
骨架已改成有限次数：`repeat = ceil(场景剩余秒数 / 周期) - 1`。呼吸 1.5s、场景还剩 12s → `repeat: 7`。

### 5.5 结尾

```js
tl.to("#scene11", { opacity: 0, duration: 0.8, ease: "power2.inOut" }, 总时长 - 1.3);
```

提前 1.3s 起淡出，不要掐在最后一帧。

---

## 6. 数据层

### 6.1 合成根

```html
<div id="root"
     data-composition-id="main"    <!-- 必须与 window.__timelines["main"] 的 key 一致 -->
     data-width="1920" data-height="1080"
     data-start="0" data-duration="185.5">   <!-- 全片长度，改片长只改这里 -->
```

### 6.2 音频块（平铺在 root 外）

```html
<audio id="bgm" data-start="0"    data-duration="185.5" data-track-index="1"  src="bgm.mp3"      data-volume="0.18"></audio>
<audio id="a1"  data-start="0.3"  data-duration="12.308" data-track-index="2" src="audio/s1.wav" data-volume="1"></audio>
<audio id="a2"  data-start="13.2" data-duration="10.753" data-track-index="3" src="audio/s2.wav" data-volume="1"></audio>
```

- `data-duration` **必须是 wav 实测值**（`gen_tts_html.py` 打印的那个数），不许估。
- `<audio>` 必须带 `id`，否则 mixer 收不到 → 渲染静音。
- 一个场景一个 `<audio>`、一条独立轨道；不要把所有配音拼成一条大 wav（那样改一句要重拼全片）。

### 6.3 场景显隐（本档写法）

```css
#scene1 { z-index: 1;  background:#0D1B2A; }
#scene2 { z-index: 2;  background:#0D1B2A; opacity: 0; }
```

首场景不设 `opacity`（默认可见），后续场景 `opacity: 0` 靠转场拉进来。`z-index` 递增。
**注意**：真源没用框架的 `class="clip"`。沿用这个写法时，**绝不要**再 tween `display` / `visibility`（用 `autoAlpha`）。

---

## 7. 配音管线（Kokoro，离线）

### 7.1 为什么必须分段合成

Kokoro 的 ONNX tokenizer **不认识中文全角标点**（`。` `，` `、` `：` `！` 全部 tokenize 为空），
misaki 输出的停顿标记被丢弃，模型只保留句尾收束声调产生的停顿 —— 听感就是「整段连读」。
真源 v5 踩了这个坑，v6 才修掉。

### 7.2 修法（`gen_tts_html.py`）

```
按标点切句 → 每句单独 g2p + ONNX 合成（speed 1.08）
          → trim() 裁掉每段首尾静音
          → 段间插入受控停顿
```

```python
PAUSE = {"。": 0.45, "！": 0.45, "？": 0.45, "；": 0.45, "：": 0.30, "，": 0.18, "、": 0.15}
```

**`trim()` 不能省**：不裁尾音，段间停顿会叠加成空拍（模型自带尾音 + 你插的停顿）。

验证方法：合成「今天，天气很好。评委看了摘要，决定生死。」，应听到 4 处自然停顿（而非仅首尾 2 处）。

### 7.3 音色

| 音色 | 描述 | 基频 |
|---|---|---|
| `zm_yunjian` | 沉稳播音男声 | ≈99Hz |
| `zm_yunxi` | 青年男声 | ≈164Hz |
| `zf_xiaobei` | 温柔女声 | ≈231Hz |
| `zf_xiaoxiao` | 标准普通话女声 | ≈200Hz |

**本档推荐 `zm_yunjian`**（比 Remotion 线的云希更低更稳，配「避坑/权威」语感）。
换音色只需 `python gen_tts_html.py . <音色> <语速>` 重跑配音，**不用动画面**。

### 7.4 备选：edge-tts

`tts_models/ett_edge.py`。走 websocket，**必须手动给 aiohttp 注入代理**（脚本里已写好 monkey patch），
否则挂代理的机器上直接超时。只在 Kokoro 环境装不起来时用。

---

## 8. 实现注意（本档专属坑）

### 8.1 三条 HyperFrames 契约（违反即 lint 报错）

| 项 | 规则 |
|---|---|
| 无限动画 | 禁 `repeat: -1` → 用有限次数（见 5.4） |
| 正文换行 | 禁 `<br>` → 拆多个 block 或 flex 分行 |
| 媒体属性 | `<audio>` / `<video>` **禁 `crossorigin`**；必须带 `id` |

### 8.2 CSS transform 冲突

不要给元素写 CSS 初始 `transform` 再对它做 GSAP tween —— 两者会打架，lint 报
`gsap_css_transform_conflict`。初始态写进 tween：`tl.fromTo(el, { x: -40 }, { x: 0 }, T)`。

### 8.3 字体缺了就全是方框

`fonts/` 里没 woff2 → 中文掉成方框，且**渲染不会报错**，只有目检才发现。
**每期渲染前先确认 `fonts/noto-sc-400.woff2` 和 `-700.woff2` 存在。**

### 8.4 封面单独渲染

`cover43.html` / `cover34.html` 是**独立文件**，不进 `index.html`。
走本地服务截图时字体路径要写绝对：`http://localhost:PORT/<项目名>/fonts/...`；
直接双击打开则用相对路径 `fonts/...`。两种都试不通就先本地起服务。

### 8.5 场景数与 z-index 要同步加

加第 12 个场景时，三处一起改：`#scene12` 的 z-index、`<div id="scene12">`、GSAP 段的转场对。
漏掉 z-index 会让新场景被压在旧场景下面（表现为「没显示」）。

---

## 9. 与 Remotion 线（T1–T10）的差异对照

| 维度 | T1–T10（Remotion） | **T11（HTML+GSAP）** |
|---|---|---|
| 工程形态 | `src/remotion/*.tsx` + `node_modules` | **单个 `index.html`**，无构建 |
| 时间轴 | `timing.json` + 帧驱动（`start_frame`） | **GSAP 绝对秒**，秒数手填 |
| 场景切换 | React 组件按帧判定 | CSS `z-index` + `opacity` + 转场 tween |
| 字幕 | `Subtitle.tsx` 句级硬切 / 词边界 | **无字幕组件**（真源没做字幕） |
| 口播稿 | `podcast.txt`，`[SECTION:name]` 分块 | **`scripts/sN.txt`**，一场景一文件 |
| 配音 | edge-tts（云希 / 云健）+ `_gen_tts.py` | **Kokoro ONNX 离线**（云健） |
| 数据同步门禁 | `_check_sync.py` 比对 SECTION 与 key | **无自动门禁**，靠 `TIMELINE.md` 人工对齐 |
| 渲染 | `npx remotion render` | `npx hyperframes render` |
| 后处理 | 必须两关（loudnorm + bt709） | 真源未记录后处理，**接入 S12 时补做** |
| 交付文档 | 4 份（思路 / 时间线 / publish_info / 发布文案） | 2 份（**TIMELINE.md** + 发布文案） |
| 依赖 | node_modules 约 3–5 分钟装 | **零依赖**（Python 侧需 kokoro-onnx 等） |

### 门禁差异（接入流水线时必须补的）

1. **数据同步门禁缺失**：Remotion 线有 `_check_sync.py` 比对 `podcast.txt` 与 `episode_data.ts`。
   T11 没有对应脚本 —— 段数（`scripts/` 文件数）必须 = 场景数 = 音频数 = GSAP 段数。**写个 5 行脚本核。**
2. **后处理未记录**：真源 `TIMELINE.md` 只写「渲染 output.mp4（h264+aac）」，没有 loudnorm / bt709 记录。
   接入 S12 时按流水线标准补做，并回填实测值。
3. **发布文案缺两项**：真源没有「章节时间戳」和「置顶评论」，S13 门禁要求。模板里已加占位。

---

## 10. 已验证 / 未验证

| 项 | 状态 |
|---|---|
| 真源交付 | ✅ 第七期 185.5s / 5565 帧 / 11 场景 |
| 配音 | ✅ Kokoro `zm_yunjian`，11 段共 178.8s，断句修正已验证 |
| 封面 | ✅ 4:3（1200×900）+ 3:4（1080×1440） |
| 中文渲染 | ✅ 本地 woff2 嵌入，无乱码 |
| HyperFrames lint | ⚠️ **真源未过 lint**（`repeat:-1` + `<br>`），骨架已改 |
| 竖版正片 | ❌ 未适配 |
| 后处理两关 | ❌ 真源未记录，需补 |
| 骨架本身 | ⚠️ 从真源抽取，**未跑过一次完整渲染** —— 首次使用时按第 9 节的 3 个门禁补齐 |
