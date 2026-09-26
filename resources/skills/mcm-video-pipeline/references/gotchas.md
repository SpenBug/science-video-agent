# 环境前置与已知坑（报错时先读这份）

**这份文件是流水线里唯一会「越跑越准」的部分**——每次踩新坑就往里加一条，并写清楚是真源哪一期踩的。

---

## 0. 环境前置（每次开工先确认，5 秒）

```powershell
# ① Python：必须用「已装 edge-tts」的解释器（APP 内置环境已预装）
#    手动环境：pip install edge-tts 后用同一个解释器跑，无需设 PYTHONPATH
python -c "import edge_tts; print('edge_tts OK')"

# ② 系统 ffmpeg（后处理两关用，Remotion 自带的那个不行）
ffmpeg -version

# ③ Node / Remotion（需 22+）
node -v ; npm -v
```

| 工具 | 说明 |
|---|---|
| Python | 必须是装了 edge-tts 的那个解释器。机器上有多个 Python 时逐个 `python -c "import edge_tts"` 确认，别假设 PATH 里第一个就是 |
| edge-tts | T1–T10 配音引擎；APP 用户在「运行环境」里一键安装 |
| ffmpeg（系统） | 后处理两关、`-i` 探测、精确 LUFS 复测 |
| ffmpeg（Remotion 自带） | `node_modules\@remotion\compositor-win32-x64-msvc\ffmpeg.exe`；`_gen_tts.py` 优先用这个；但**能力受限**，见坑 9 / 10 |
| Remotion | `--gl=angle` 走独显（已验证）；无独显或报错就去掉该参数退回软件渲染 |

> ⚠️ **多个 Python 共存的机器上，别直接 `python _gen_tts.py`**——PATH 里第一个可能没装 edge-tts，会直接 `ModuleNotFoundError`。先探测确认；APP 内用 `run_python`（已配置好解释器）。

---

## 1. `interpolate` 不加 clamp / 不封顶 → 动画越界

**症状**：清单 / 图例条目一多，末尾元素永远不动；场景边界画出动画外。

**根因**：固定步进累加不封顶。第 11 期 CHECKLIST 的 `segStart` 越界事故就是这个。

**修法（三条铁律）**：
```ts
// ① 所有 interpolate 必须带 clamp
{extrapolateLeft:"clamp", extrapolateRight:"clamp"}
// ② 起点必须封顶 0.9
const st = 0.06 + i * 0.10;
interpolate(p, [st, Math.min(st + 0.14, 0.9)], [0, 1], CLAMP)
// ③ 场景进度用归一化 p，不用绝对时间
p = clamp((sec - start_sec) / duration_sec, 0, 1)
```

---

## 2. TTS 读破数字和英文缩写

**症状**：`4.3%` 读成「四、三、百分号」；`2026` 读成「两千零二十六」；`ARIMA` 读成怪音。

**修法**：
- 数字全部改中文读法（对照表见 `script-and-compliance.md`）
- 英文缩写先跑 3 秒样本听：`MD5` → 「M D 五」；`Robin` → 「罗宾边界」
- 写稿时就改干净，别指望后期修——改一个数字要重跑整条 TTS

---

## 3. 只加 rate 救时长

**症状**：文案不动只把 `RATE` 从 +20% 提到 +28% 甚至 +40%，声音挤到听不清。

**修法顺序（不能颠倒）**：
1. 先压稿约 7%
2. 再提 rate 到 +28%
3. 还不够就回 S4 砍场景

实测：第十二期初稿 +20% 实测 221s（目标 190s）→ 精简约 7% + rate 提到 +28% → 189.65s。
第十三期初稿 1410 字实测 217.80s → 压到约 1040 字 → 185.28s。

---

## 4. 忘做 loudnorm

**症状**：同一系列里音量水位跳来跳去。

**修法**：交付前必过第一关（见 SKILL.md S12）。第 12 期就漏了 —— 产物是 `yuvj420p` 且未做 loudnorm。

---

## 5. 产物是 `yuvj420p`，规格不干净

**症状**：B 站能播，但 `ffmpeg -i` 显示 `yuvj420p`，没有 bt709 标签。

**修法**：第二关重编码（见 SKILL.md S12）。验收标准：`yuv420p(tv, bt709, progressive)`。

---

## 6. 封面尺寸写错（文档与实物的老账）

**症状**：交付包 README 写的是 1600×900 / 1080×1920，实际一直是 **1200×900 / 1080×1440**。

**修法**：以实物为准，文档跟着实测值改。
- 4:3 = **1200×900**（B 站 / YouTube）
- 3:4 = **1080×1440**（小红书 / 抖音 / 快手）

---

## 7. `podcast.txt` 编码显示成乱码

**症状**：PowerShell `Get-Content` 看是乱码，以为文件坏了。

**真相**：控制台编码问题，不是文件坏了。文件必须是 **UTF-8**。

**修法**：用 Read 工具或直接 `open(encoding="utf-8")` 确认，别用 `Get-Content` 判断。

---

## 8. 规则类表述强于官方原文

**症状**：把「需要注意」写成「必须做」，或把往年统计口径当成硬性及格线。

**实例**：
- 特别期 t7「漏了直接取消评奖资格」——官方触发条件其实是「**故意隐瞒** AI 使用情况、**作出虚假声明**，或**未经必要人工审查与核实**的 AI 生成内容直接作为核心成果提交」
- 第十三期相似度 60% —— 是「2025 年通报的统计口径」，不是及格线

**修法**：规则类内容一律先对 `mcm_rules_extracted.txt` / 官方原文，再写进口播稿。见 `script-and-compliance.md` 第三节的口径分级。

---

## 9. Remotion 自带 ffmpeg 的 `-color_trc` / `-colorspace` 不生效

**症状**：加了 CLI 参数但 VUI 里没有颜色标签。

**修法**：VUI 只能靠 x264-params 写：
```
-x264-params colorprim=bt709:transfer=bt709:colormatrix=bt709
```
⚠️ `range=limited` **不是 x264-params 的合法项**（会报错），范围用 `-color_range tv`。

---

## 10. Remotion 自带 ffmpeg 不支持 loudnorm 复测

**症状**：想跑 `loudnorm print_mode=summary` 或 `volumedetect` 看精确 LUFS，报 filter 不存在。

**真相**：Remotion 自带的是 filter 白名单构建。

**修法**：编码步照常应用 `loudnorm I=-14:TP=-1.5:LRA=11`；要精确复测（第 11 期实测 -14.29 LUFS 可作基准）就用**系统 ffmpeg**。

---

## 11. `-ar 48000` 必须写

**症状**：loudnorm 那一步不加 `-ar 48000`，Remotion 的 ffmpeg 会把 aac 推到 **96kHz**。

**修法**：后处理两关的每一步都显式写 `-ar 48000`。

---

## 12. edge-tts 新版默认不给词边界

**症状**：audio 正常，但 `WordBoundary` 事件 0 个 → 字幕失去实时刻。

**根因**：新版 edge-tts 默认 `boundary="SentenceBoundary"`。

**修法**：必须显式传参：
```python
comm = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
```
第一次跑特别期B 就踩到，已修进模板。

---

## 13. `make_silence` 少乘位宽和声道数

**症状**：`GAP > 0` 时插的静音长度不对，时间轴整体漂移。

**修法**：`wave.writeframes` 收的是**字节数**，必须乘 `采样位宽 × 声道数`：
```python
w.writeframes(b"\x00" * int(fr * seconds) * sw * nch)   # sw=2, nch=1
```

---

## 14. 拼接后没做总长校验

**症状**：`timing.json` 的场景窗口和实际音频对不上，字幕整体偏移。

**修法**：`_gen_tts.py` 末尾的门禁——
```python
if abs(actual - expected) > 0.15:
    raise RuntimeError("拼接总长与预期不符，时间轴会错位")
```
顺带做**音频体检**（`RMS<0.20 / peak<0.99 / ZCR<6000 / 时长>0.5s`，最多重试 6 次）——edge-tts 是**间歇性**返回损坏数据的，不体检一次抖动就毁整条音轨。这套门禁应该回填到所有期。

---

## 15. 模板尚未渲染验证（历史注记，已过期）

> 2026-09-11 记：`风格规范\template\` 是照第十二期源码抽的，当时还没跑过渲染验证。
> **特别期 B 首验已通过**（编译 OK、10 场景中间帧无 overflow 警告）。像素级目检仍建议发布前人工过一遍缩略图。

---

## 16. GPU 加速参数

渲染 / still 命令加 **`--gl=angle`** 走 ANGLE 硬件后端（独显）。本机 NVIDIA RTX 3050 Laptop 已 3 帧冒烟验证。
无独显或报错 → 去掉该参数退回软件 `swangle`。
`--gl` 只对视频渲染有意义，封面 still 不带也行。

---

## 17. node_modules 重复安装的成本

每期工程复制一份会带几 GB 的 `node_modules`。
**做法**：新建期时用 junction 指向已装好的期（特别期A 就 junction 了第十二期），避免每次 `npm install` 3–5 分钟。

---

## 18. 竖版版式不适配

**症状**：竖版底部大片留白、左右分栏挤成一团、大数字撞边。

**修法**：见 `templates/T6-封面与竖版适配.md`。第十三期新增的 `redline` / `cards` 版式就是靠「正文区改垂直居中」解决的。

---

## 19. `AbsoluteFill` 自带 `width: 100%` / `height: 100%` → 设了 `left` 或 `top` 就溢出画布

**症状**：分栏布局的右栏整个跑到画布外被裁掉；设了 `top` 的面板被推到画布下方看不见。代码里看着完全正常。

**根因**：Remotion 的 `AbsoluteFill` 基础样式是

```js
{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
  width: "100%", height: "100%", display: "flex", flexDirection: "column", ...style }
```

`width` / `height` 都是**百分比**，不是 `auto`。所以：

```tsx
// ✗ 右栏从 x=950 开始，但宽度仍是 1920 → 溢出到 x=2870
<AbsoluteFill style={{ left: 950, padding: "150px 96px 140px 0" }}>

// ✗ 面板从 y=500 开始，但高度仍是 1080 → 溢出到 y=1580
<AbsoluteFill style={{ top: 500, padding: "0 84px" }}>
```

**修法**：**设了 `left` 必须同时给 `width`；设了 `top` 必须同时给 `height`。**

```tsx
<AbsoluteFill style={{ left: 950, width: 970, padding: "150px 96px 140px 0" }}>
<AbsoluteFill style={{ top: 500, height: 540, padding: "0 84px" }}>
```

（`top: 0, height: 150` 这种写法是对的——`top` 和 `height` 同时给了。）

**排查手法**：分栏或分区布局渲染出来「有一块内容不见了 / 被切掉」，第一反应就查这个。

---

## 20. `AbsoluteFill` + `flexDirection: row` + `alignItems: center` → 内容被垂直居中到画布中点

**症状**：页眉 / 顶栏跑到画布垂直正中（y≈540），压在正文上面，看着像层级错乱。

**根因**：`AbsoluteFill` 是全高容器（见第 19 条）。`flexDirection: row` 时交叉轴是垂直方向，`alignItems: center` 于是在**整块画布高度**里居中。

```tsx
// ✗ 内容会被拉到 y≈540
<AbsoluteFill style={{ padding: "52px 84px 0", flexDirection: "row", alignItems: "center" }}>

// ✓ 限高之后，center 只在 0~150 内居中
<AbsoluteFill style={{ top: 0, height: 150, padding: "0 84px", flexDirection: "row", alignItems: "center" }}>
```

**两种修法，看意图选**：

| 意图 | 写法 |
|---|---|
| 想要顶部对齐的顶栏 | `top: 0, height: N` + `alignItems: "center"`（条内垂直居中） |
| 想在**剩余空间**里垂直居中（如底部面板） | `top: N, height: M` + `alignItems: "center"`（`M` 是剩余高度） |

⚠️ 不要靠「去掉 `alignItems`」来修——那会让子元素 `stretch` 拉伸变形，顶栏里的小图标会被撑开。

**这两条（19 / 20）在 T7–T10 四套新样式的首轮渲染里，4 张图踩了 3 张**。属于 `AbsoluteFill` 的高频陷阱，写新样式时先按这两条自查一遍。

---

## 21. Python 脚本写文件会把 LF 转成 CRLF（Windows）

**症状**：`timing.json` / `.srt` / `.md` 在 Windows 上被写成 CRLF，仓库里换行符不统一。
如果这个文件是 Markdown 且含 Mermaid 块，还会**静默搞崩图表校验**（见 `doc-diagram-qa` 技能的同类条目）。

**根因**：Python 在 Windows 上 text 模式默认 `newline=None`，写入时 `\n` 全部转成 `\r\n`。

**受影响的位置**（`_gen_tts.py` 里三处，2026-09-20 已修）：

```python
# ✗ 之前
with open(os.path.join(BASE, "timing.json"), "w", encoding="utf-8") as f:
    json.dump(timing, f, ensure_ascii=False, indent=2)

# ✓ 现在
with open(os.path.join(BASE, "timing.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(timing, f, ensure_ascii=False, indent=2)
```

三处都要改：`timing.json`、`podcast_audio.srt`、`phonemes.json`。

**其他场景的修法**：

| 写法 | 处理 |
|---|---|
| `open(..., "w", encoding="utf-8")` | 加 `newline="\n"` |
| `pathlib.Path(...).write_text(t, encoding="utf-8")` | 加 `newline="\n"` |
| 任何写法 | 或改用 `write_bytes(t.encode("utf-8"))` |

**批量修正已有文件**：

```python
import pathlib
for p in pathlib.Path(".").rglob("*"):
    if p.is_file() and ".git" not in p.parts:
        raw = p.read_bytes()
        if b"\r\n" in raw:
            p.write_bytes(raw.replace(b"\r\n", b"\n"))
```

**根治**：仓库根放 `.gitattributes` 写 `* text=auto eol=lf`——git 会在提交时归一化，
但**工作区仍是 CRLF**，所以本地校验脚本还是会报，最好从写入端就修掉。

**自查命令**：`node tools/check-eol.mjs <仓库根目录>`（本仓库已带）

---

## 47. 封面标题是矢量图时，改年份要重制 PDF 而不是改字（2026-09-21 实测）

**场景**：华为杯模板 `figures/title.pdf` 里的届数要改（第二十一届 → 第二十三届）。

**先探明结构再动手**：

- `pdfinfo -box` 显示 MediaBox 是**整页 A4**（595.32×841.92），靠 CropBox `149.48 547.62 468.12 634.42` 裁到标题区（318.64×86.80pt）。所以它既是「标题条」又是「整页封面截图」。
- `pdffonts` 看到 `STXinwei`（华文新魏）→ 字形是文本不是路径。
- `pdftotext -bbox` 拿逐字坐标 → 反推三行基线 y = 618.34 / 586.06 / 554.83，字号 18 / 21.96pt。

**为什么不能「替换字节」**：`pdffonts` 的前缀（如 `BCDFEE+STXinwei`）说明是**子集字体**。用 fontTools 解析嵌入的字体流验证：cmap 只有 34 条，`一 U+4E00 -> uni4E00` 有，`三 U+4E09 -> None` **没有** → 就算把 CID 字节换成「三」的 GID，字形也不存在。

**修法（LaTeX 重制）**：用 `geometry` 指定 A4 + TikZ `overlay` 绝对定位 + `\special{pdf:put @thispage <</CropBox [...]>>}` 复刻原 box 结构：

```latex
\documentclass{article}
\usepackage[paperwidth=595.32pt,paperheight=841.92pt,margin=0pt]{geometry}
\usepackage{xeCJK}
\setCJKmainfont{STXinwei}
\usepackage{tikz}
\usetikzlibrary{calc}
\pagestyle{empty}
\begin{document}
\special{pdf:put @thispage <</CropBox [149.48 547.62 468.12 634.42]>>}
\begin{tikzpicture}[remember picture, overlay]
\node[anchor=base west, inner sep=0, outer sep=0]
  at ($(current page.south west)+(151.595pt,586.06pt)$)
  {\fontsize{21.96pt}{21.96pt}\selectfont “华为杯”第二十三届中国研究生};
\end{tikzpicture}
\end{document}
```

**两个必须知道的点**：

1. **TikZ `current page` 要编译两遍**，单遍会把节点丢到页面外（第一次编译时 `current page` 未定义）。
2. **xeCJK 对行首引号做标点压缩**：`anchor=base west` 对齐的是 bbox 左缘，压缩后引号字形左移，实测**偏移 13.575pt**。`\mbox{}` / `\hbox{}` / `\null` / `\leavevmode` **四种前缀全部无效**（实测 xMin 都是 124.445，与纯引号行完全一致）→ 只能数值补偿：目标 xMin=138.02，就把节点 x 设成 `138.02 + 13.575 = 151.595`。

**验收**：`pdftotext -bbox` 比对三行 xMin，与原版差 < 0.05pt 即为对位成功。

**顺带**：改年份要分清「赛事标识」和「历史事实」——封面届数、格式说明年份该改；`gmcm.bst` 版本号、`cls` 版本号、`reference.bib` 文献年份**一律不动**（改了等于伪造引用）。

## 48. `cp -r SRC DST` 在 DST 已存在时会嵌套（2026-09-21）

`cp -r "src_dir" "$BASE/模板源码/GMCMthesis"` 若目标已存在，会生成 `$BASE/模板源码/GMCMthesis/src_dir名/` 的重复副本。

**清理**：`rm -rf` 中文路径会被安全删除机制拦下，改用 PowerShell：

```powershell
[System.IO.Directory]::Delete($nested, $true)
```

## 49. edge-tts 网络中断后如何「只重做改过的段」（2026-09-21）

**症状**：`ClientConnectorError: Cannot connect to host speech.platform.bing.com:443`，脚本内置 15 次重试仍失败（代理不稳，间歇性）。

**为什么不能直接重跑**：`step_tts()` 的缓存失效条件是「无指纹 / md5 变了 / 有 wav 比稿子旧」，命中就 `shutil.rmtree(TMP)` **全部重做**。

**续跑姿势**（本次省下约 2 分钟）：

```bash
cd videos/<ep>/_tts_tmp
rm -f 02_cover.*                      # 删掉「改过的那一段」
touch *.wav                           # 让未改段 mtime 新于稿子，避开 _stale 判定
python -c "import hashlib; h=hashlib.md5(open('../podcast.txt','rb').read()).hexdigest(); open('_src.md5','w').write(h)"
```

再重跑 `_gen_tts.py` 即可：已存在且未改的段会被 `tts_one()` 的断点续传直接复用。

**验证英文词读法**：`_tts_tmp/NN_name.words.json` 是词级时间戳（`{t, d, text}`），比听音频更快 —— `LaTeX 0.39s` / `xelatex 0.50s` / `logo 0.45s` 都说明是**单次发音**而非逐字母。

## 50. T4 档没有现成的完整视频组件（2026-09-21）

`templates/code/` 里只有 T7–T10 的 `*Video.tsx`（读 timing.json 按帧切场景 + 句级字幕）。**T4 只有 `_tools_pipeline/EpisodeScene.tsx` 单页演示版**，且它依赖 `./cues` 和 `./displayPlan` 两个在该目录里**并不存在**的数据文件。

**自建姿势**：保留 T4 的视觉语言（奶油底 `#FDFBF4` + 44px 网格 + 顶底渐变彩条 + 顶部章节标签 + 左文右图 + 底部深色字幕条），把数据源换成 `timing.json` 的 `sections[].sentences[]`，另建 `plan.ts` 定义每个 section 的 `{label, chapter, note, imgs[], hue, mode}`。`mode` 支持 `open`（整屏图）/ `split`（左文右图）/ 自定义版式（如文件树、对比表）。

**版式两个必踩的坑**：

- 顶部标签容器用 `AbsoluteFill + height` 会让 `justify-content: space-between` **失效**（标签和品牌挤在一起）→ 改用 `position: absolute; top/left/right: 0` + `boxSizing: "border-box"`。
- 右侧 A4 竖版页图在 36% 宽卡片里高度会到 943px，**超出 750px 内容区被字幕遮住** → 给 `img` 加 `maxHeight: 690` 这样的**明确像素值**（`maxHeight: "100%"` 在 flex 链里常失效）。

**工程骨架复用**：复制最近一期已跑通的 `项目源码/mcm-video-temp/`，`node_modules` 用 junction 指向旧期（`New-Item -ItemType Junction`），省掉 npm install。

## 51. T2 真源脚本只出人声轨，组件播的是混音轨（2026-09-22 实测，会导致渲染 404）

**症状**：T2 档（`特别期_开赛前8小时` 骨架）跑完 `_gen_tts.py` 后渲染报：

```
{"statusCode":404,"message":"The requested path (.../public/mixed_audio.wav) could not be found"}
```

**根因**：两处不一致——

- `_gen_tts.py` 只生成 **`public/podcast_audio.wav`**（纯人声，8KB 脚本里**没有 `step_mix()`**）
- 组件 `EpisodeExtraVideo.tsx` 播放的是 **`staticFile("mixed_audio.wav")`**（人声 + BGM）

对比：第十三期（T1）的 `_gen_tts.py` 有 `step_mix()`，所以不踩这个坑。**T2 的混音是当初手工做的，脚本里没留。**

**修法一（手动混音，最快）**：

```bash
ffmpeg -y -i public/podcast_audio.wav -stream_loop -1 -i public/bgm.mp3 \
  -filter_complex "[1:a]volume=0.10[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=0[a]" \
  -map "[a]" -ac 2 -ar 44100 public/mixed_audio.wav
```

关键参数：`-stream_loop -1`（BGM 循环铺满）、`volume=0.10`（系列标准 BGM 音量）、`amix=duration=first`（总长跟随人声）、`-ac 2 -ar 44100`（立体声 44100，系列标准）。

**修法二（一劳永逸）**：从第十三期的 `_gen_tts.py` 复制 `step_mix()` 到 T2 脚本，并在 `__main__` 里串上 `step_tts(); step_mix()`。

## 52. T2 真源脚本的 `MAX_TRY = 4` 太激进（2026-09-22）

T2 的 `_gen_tts.py` 里 `MAX_TRY = 4`，重试间隔固定 `sleep(2.0)`。实测在代理不稳时，**第 2 段就连续 4 次 `ClientConnectorError` 然后整条中止**。

**改成**：

```python
MAX_TRY = 12
# 两处重试的 sleep 改为递增退避
await asyncio.sleep(min(2.0 + attempt * 1.5, 10))
```

改完后同一网络环境下 10 段全部通过（各段重试 1–5 次）。第十三期的 `MAX_RETRY = 15` 就是对的，T2 这份是早期版本。

**但光改 `MAX_TRY` 还不够**：T2 脚本 `main()` 里是**无条件** `shutil.rmtree(TMP)`，**没有断点续传** —— 网络差时每次重跑都要全量重做，反复失败。

**实测（2026-09-22）**：改完 `MAX_TRY` 后二跑，t8 段**连续 12 次失败**仍中止（网络当时极差）。加断点续传后三跑 **1 分 29 秒完成**（复用 8 段，只重做 2 段）。

**加断点续传的两处改动**：

```python
# ① main() 里：稿子没变就保留缓存
import hashlib
_h = hashlib.md5(open(TXT, "rb").read()).hexdigest()
_hf = os.path.join(TMP, "_src.md5")
_txt_m = os.path.getmtime(TXT)
_stale = any(
    f.endswith(".wav") and os.path.getmtime(os.path.join(TMP, f)) < _txt_m
    for f in (os.listdir(TMP) if os.path.isdir(TMP) else [])
)
if os.path.isdir(TMP) and (_stale or not os.path.exists(_hf)
                           or open(_hf, encoding="utf-8").read().strip() != _h):
    shutil.rmtree(TMP)
os.makedirs(TMP, exist_ok=True)
with open(_hf, "w", encoding="utf-8") as _f:
    _f.write(_h)

# ② build_sections() 循环开头：已有合格 wav 直接复用，不重复联网
if os.path.exists(wav):
    _d, _rms, _peak, _zcr = measure(wav)
    if _d > 0.5 and _rms < MAX_RMS and _peak < MAX_PEAK and _zcr < MAX_ZCR:
        print("  [%s] 复用 %.2fs（跳过联网）" % (name, _d))
        result.append((name, wav, _d))
        continue
```

**这两段就是第十三期 `_gen_tts.py` 本来就有的能力**，T2 这份早期版本缺。补上后网络再差也能"跑一次退一点"。

## 53. 字幕文本和 TTS 文本可以（也应该）分离（2026-09-22）

**背景**：为让 TTS 读对，稿子里要写 `M D 五 码`（空格分隔）、`P D F`；但**字幕显示成这样很难看**。

**好消息**：T2/T1 组件的字幕文本来自**组件里的 `VOICE_TEXTS`**，而 TTS 读的是 **`podcast.txt`** —— 两者本来就分离。

**做法**：`podcast.txt` 保持 `M D 五 码`（服务读法），把 `VOICE_TEXTS` 里改成 `MD5 码`（服务观感）。

**验证**：`timing.json` 里**没有 `text` 字段**（只有 `name/start_sec/duration_sec/start_frame/duration_frames/is_silent`），确认字幕确实不读 timing.json。

**别改反了**：如果改了 `podcast.txt`，TTS 就会读破；要改的是 `VOICE_TEXTS`。



## 51. Kokoro 合成中文「整段连读」——tokenizer 不认全角标点（2026-09-21，来自 T11 真源）

**症状**：Kokoro ONNX 合成的中文配音听不出句读，整段一口气念完，只有句尾有停顿。

**根因**：Kokoro 的 ONNX tokenizer **不认识中文全角标点**（`。` `，` `、` `：` `！` 全部 tokenize 为空），misaki 输出的停顿标记被丢弃，模型只保留句尾收束声调产生的停顿。

**修法**（`templates/code/html-gsap/tts_models/gen_tts_html.py`）：

```
按标点切句（re.split 保留标点） → 每句单独 g2p + ONNX 合成
                              → trim() 裁掉每段首尾静音
                              → 段间插入受控停顿
```

```python
PAUSE = {"。": 0.45, "！": 0.45, "？": 0.45, "；": 0.45, "：": 0.30, "，": 0.18, "、": 0.15}
```

⚠️ **`trim()` 不能省**。模型每段自带尾音，不裁掉就会和手插的停顿叠成空拍（听起来像卡顿）。

**验证方法**：合成「今天，天气很好。评委看了摘要，决定生死。」，应听到 **4 处**自然停顿，而不是仅首尾 2 处。

**别用空格代替标点**：空格会被 tokenize 掉，等于没加。

## 52. 移植第七期（T11）到正式流水线要补的三个门禁（2026-09-21）

第七期真源能渲染成功，但**没有过 HyperFrames 的 `lint`**，也没有 Remotion 线那样的自动门禁。照抄源码前先补：

| 缺口 | 真源写法 | 正确做法 |
|---|---|---|
| 无限动画 | `repeat: -1`（呼吸 / 浮动） | `lint` 禁无限重复（破坏渲染确定性）→ 改有限次数：`repeat = ceil(场景剩余秒数 / 周期) - 1` |
| 正文换行 | `<br>` 写在 `.tl-seg` / `.outro-cta` 里 | 正文禁 `<br>` → 拆多个 block 元素或用 flex 分行 |
| 数据同步 | 无脚本 | 段数（`scripts/` 文件数）= 场景数 = `<audio>` 数 = GSAP 段数，**四处必须相等**，写 5 行脚本核 |

**另外两处如实记录的缺失**：

- 真源 `TIMELINE.md` 只写「渲染 output.mp4（h264+aac）」，**没有 loudnorm / bt709 记录** → 接入 S12 时按流水线标准补做两关，并回填实测值。
- 真源发布文案**缺「章节时间戳」和「置顶评论」**，S13 门禁要求 → 模板已加占位。

**其他契约提醒**：`<audio>` / `<video>` 必须带 `id`（否则 mixer 收不到 → 渲染静音）；**禁 `crossorigin`**；别给元素写 CSS 初始 `transform` 再对它做 GSAP tween（`gsap_css_transform_conflict`），初始态写进 `fromTo`。
