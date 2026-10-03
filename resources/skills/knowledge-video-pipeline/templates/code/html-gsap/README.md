# `html-gsap/` · 单文件 HTML + GSAP 骨架（T11 用）

从**第七期《数模国赛避坑指南》**（已交付真源，185.5s / 5565 帧 / 11 场景）抽出来的工程骨架。
**这套不走 Remotion**，是一条独立的渲染后端：一个 `index.html` 装下全部画面，GSAP 时间线驱动，
HyperFrames 负责按帧 seek 渲染。

---

## 一、实例化：7 步

```bash
# 1) 复制骨架到新期目录
cp -r templates/code/html-gsap  "D:/自媒体/自媒体/第N期_主题/项目源码"
cd "D:/自媒体/自媒体/第N期_主题/项目源码"

# 2) 塞模型与字体（不入库的大文件）
#    tts_models/model.onnx      约 310MB，从任一期已交付源码拷
#    tts_models/voices_zf.npz   音色表
#    fonts/noto-sc-400.woff2 / -700.woff2
#    bgm.mp3                    系列通用（2,783,814 B，与 Remotion 线同一首）

# 3) 写口播：scripts/s1.txt … sN.txt（一场景一文件，纯文本）
#    约定见本文件第四节

# 4) 合成配音
python tts_models/gen_tts_html.py . zm_yunjian 1.08
#    读 scripts/s*.txt → 写 audio/s*.wav，并打印每段实测时长与 total_dur

# 5) 把实测时长回填 index.html 的音频块（data-start / data-duration）
#    同时写 TIMELINE.md 的「配音实测时长」列 —— 两处必须一致

# 6) 改画面：替换 index.html 里的 {{占位符}}，按场景补 CSS + DOM + GSAP 行

# 7) 校验与渲染
npx hyperframes lint          # 首次必跑，见第五节的两个已知违规
npx hyperframes check
npx hyperframes preview --background
npx hyperframes render --quality high --output out/output.mp4
```

---

## 二、目录约定（照抄，不要自创）

```
<期名>_项目源码/
├─ index.html              主合成。全部场景 + GSAP 时间线都在这一个文件里
├─ TIMELINE.md             唯一的技术文档：时间线核对表 + 校验清单
├─ <期名>_发布文案.md        发布物料
├─ cover43.html            封面 4:3（1200×900）
├─ cover34.html            封面 3:4（1080×1440）
├─ voice_demo.html         音色试听页（选音色用，不进交付包）
├─ bgm.mp3                 全片铺底音乐
├─ scripts/s1.txt … sN.txt 分段口播稿，与 audio 同号
├─ audio/s1.wav … sN.wav   分段配音
├─ fonts/noto-sc-400.woff2 / noto-sc-700.woff2
└─ tts_models/             引擎与音色：model.onnx / voices_zf.npz /
                           kokoro_config.json / gen_tts_html.py / ett_edge.py
```

**三条硬规则**：

1. **子目录名一律小写英文单数**（`scripts` / `audio` / `fonts` / `tts_models`），不写中文。
2. **顶层文档用中文全名**（`<期名>_发布文案.md`），子目录里的文件用**纯 ASCII**（`s1.txt`、`model.onnx`）。
3. `scripts/sN.txt` ↔ `audio/sN.wav` ↔ `<audio id="aN">` ↔ `#sceneN` —— **四处同号**，N 从 1 起、无前导零。

---

## 三、命名规范

| 对象 | 规则 | 例子 |
|---|---|---|
| 场景容器 | `#scene<N>` | `scene1`、`scene11` |
| 场景内元素 | `#s<N>-<角色>` | `s1-num`、`s2-bar-fill`、`s3-card-bad`、`s7-stamp` |
| 清单项 | `#chk<N>` | `chk1` … `chk5` |
| 音频 | `#a<N>`，BGM 固定 `#bgm` | `a1`、`a11`、`bgm` |
| CSS class | 语义化短横线 | `.hook-content`、`.pitfall-header`、`.compare-card`、`.tl-seg` |
| 状态修饰 | **双 class**，不用伪类 | `class="compare-card bad"` → `.compare-card.bad` |
| CSS 变量 | **角色名**，不是色名 | `--bg` / `--accent` / `--text-dim`（✗ `--blue-900`） |
| Python | 全小写下划线；常量全大写 | `synth_text` / `split_seg`；`BASE` / `VOICE` / `PAUSE` / `SR` |

`--red` / `--green` / `--yellow` 是语义例外：它们就是「错误色 / 正确色 / 高亮色」，
换配色时整体替换色值即可，变量名不动。

---

## 四、注释习惯（照抄，这是这套风格的辨识度所在）

**HTML 场景分隔**——粗线包裹，必须带起止秒数：

```html
<!-- ══════ S3 坑1 摘要空洞 (30.6–52.8s) ══════ -->
```

**JS 场景分隔**——同样的粗线，额外带配音时长：

```js
/* ═══════ S3 坑1 摘要 (24.3–47.8s, 配音 22.9s) ═══════ */
```

**CSS 区块分隔**——细线：

```css
/* ── S1 钩子 ── */
```

**转场**——写在交界处，两行一对，上方注明类型与时刻：

```js
// S1→S2 push（12.9s）
// S6→S7 zoom（96.7s）高潮
// S10→S11 blur（174.4s）
```

**常驻动画**——单独一行并注明用途：

```js
// S1 常驻呼吸动画
// 红章砸落（配音讲到"取消评奖资格"附近）
```

---

## 五、口播文本约定（`scripts/sN.txt`）

1. **纯文本，不要任何标记**。没有 `[SECTION:name]`，一段就是一个场景。场景顺序 = 文件号顺序。
2. **数字一律中文读法**：`六万八千三百一十一` / `百分之零点四八` / `七十二小时`。
   不写 `68311` / `0.48%` / `72` —— Kokoro 对阿拉伯数字读法不稳定。
3. **标点就是断句指令**。合成脚本按标点切句并插停顿（句号 0.45s / 冒号 0.30s / 逗号 0.18s / 顿号 0.15s）。
   想要更长的呼吸就把句子拆成两个句号，**不要加空格**（空格会被 tokenize 掉）。
4. 每段长度对齐该场景的展示窗口。段太长 → 改稿或提 `SPEED`，别只提 `SPEED`（会挤到听不清）。

---

## 六、已知违规（从真源移植到正式流程时必须改）

第七期真源能渲染成功，但按 HyperFrames 的 `lint` 契约有**两处会报错**，骨架里已经改掉了：

| 真源写法 | 问题 | 骨架改法 |
|---|---|---|
| `repeat: -1`（呼吸 / 浮动动画） | `lint` 禁止无限重复（渲染不确定性） | `repeat: 6` 等有限次数，次数 = 覆盖场景时长 / 单周期 |
| `<br>` 写在正文里（`.tl-seg`、`.outro-cta`） | 正文禁 `<br>` | 拆成多个 block 元素，或用 flex 分行 |

另外真源**没有** `class="clip"`，是自己用 `#sceneN` 的 `z-index` + `opacity` 做场景显隐。
骨架沿用了这个写法（它更直观），但要知道这绕开了框架的 clip 可见性契约 ——
**不要**再用 GSAP 去 tween `display` / `visibility`，需要切换时用 `autoAlpha`。

---

## 七、素材缺口

骨架**不含**以下大文件（体积原因，需从已交付期拷）：

- `tts_models/model.onnx`（约 310MB）
- `tts_models/voices_zf.npz`、`*.bin` 音色
- `fonts/noto-sc-*.woff2`（各约 1.1MB）
- `bgm.mp3`

字体是**乱码的根因**：不嵌本地 woff2，中文会掉成方框。**每期都要确认 `fonts/` 里有这两个文件。**
