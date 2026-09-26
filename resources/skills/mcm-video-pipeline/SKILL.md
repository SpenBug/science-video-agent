---
name: mcm-video-pipeline
description: 数模自媒体视频生产线（13 步 + 10 套模板 + 强制确认门）。覆盖素材准备、事实核对、内容蓝图、口播稿、配音与时间轴、Remotion 渲染、后处理、交付文档全流程，每一步执行前强制向用户确认或索取输入。当用户提到「做一期视频 / 出片 / 这一期 / 第 N 期 / 数模国赛视频 / 数模AI冲国奖 / 配音 / 重跑 TTS / 字幕 / Remotion / 封面 / 发布文案 / 横版竖版 / 时长多少 / 用 T2 / 大字清单档 / 纸感笔记 / 数据仪表盘 / 杂志排版 / 黑金权威」等视频制作事项时使用。
agent_created: true
---

# 数模自媒体视频生产线

> 工作区：`D:\自媒体\自媒体`
> 真源：`风格规范\第十二期_封面与视频生成全流程.md`、`风格规范\特别期_大字清单风格_生成流程.md`、`风格规范\template\`
> 已跑通 10 期以上（第十二期 189.65s / 特别期A 286.37s / 特别期B 319.10s / 第十三期 185.40s / 华为杯 186s / 奶油风真题 242.15s / 华为杯模板 280.40s）

---

## 0. 什么时候用它

用户说「做一期视频」「这期的片子出一下」「配音重跑」「封面改一版」「发布文案写一下」「接着做第 N 期」——都走这条线。

**不要在用户只想聊选题、改文案、查资料时启动整条流水线**：那种情况只跑 S1–S5，别碰工程。

---

## 1. 铁律：确认门协议（Gate Protocol）

**每一步开始前，先输出一张「本步确认卡」，等用户答复后才执行。没答复就不动任何文件。**

确认卡固定四行：

```
【S<N> · <步骤名>】
要做什么：<一句话，含会动到哪些文件/目录>
需要你给：<① ② ③ 编号列出必填输入；没有必填就写「无」>
我的建议：<默认方案 + 一句理由，让用户回「1」就能过>
可选分叉：<A / B / C，只在真的有选择时写>
```

三条附加规则：

1. **一次只推进一步。** 不要把 S4–S9 连着跑完再回头问，也不要在同一张卡里塞两个步骤。
2. **给默认值，别开放式提问。** 「要不要压稿到 1040 字？」优于「你想怎么处理时长？」。用户回一个字就能推进。
3. **写文件 / 渲染 / 覆盖产物前，必须在卡里点名路径。** 渲染和 loudnorm 是重编码，会覆盖同名文件，先说清楚。

**例外（可跳过确认）**：只读操作——读文件、`ffmpeg -i` 探测、`npx remotion compositions` 列表、抽帧到临时目录——不用确认，直接做。

---

## 2. 13 步总览

| 步 | 名称 | 关键产物 | 硬门禁 |
|---|---|---|---|
| S1 | 立项卡 | 立项结论（8 个字段） | 用户点头才开工 |
| S2 | 素材清点 | 素材清单 + 缺口清单 | 缺关键素材必须问，不许假设 |
| S3 | 事实核对与合规 | 事实出处表 + 合规结论 | **规则类内容必须对官方原文** |
| S4 | 视频思路蓝图 | `视频思路.md` 场景大纲表 | **蓝图未批准不许写稿** |
| S5 | 口播稿 | `podcast.txt`（`[SECTION:name]` 分块） | 字数预算算过、用户看过稿 |
| S6 | 模板选型 | 选定的 `templates/T*.md` | 用户明确点档 |
| S7 | 工程初始化 | 可跑的 Remotion 工程骨架 | 依赖装好、`index.ts` 能编译 |
| S8 | 内容配置 | `episode_data.ts` + 封面文案 | name 与 `podcast.txt` 一致 |
| S9 | 配音 + 混音 + 时间轴 | `timing.json` / `mixed_audio.wav` | **总长校验过；音频体检过** |
| S10 | 目检与抽帧 | probe 帧 PNG + 目检结论 | 无 overflow、字幕不溢出 |
| S11 | 渲染 | 横版 mp4（+ 竖版/封面） | 退出码 0 |
| S12 | 后处理两关 | 归一化成品 mp4 | 探测到 `yuv420p(tv, bt709)` |
| S13 | 交付与文档 | `成品\` + 4 份文档 + 进交付包 | 文档如实填实测值 |

---

## 3. 逐步详述

### S1 · 立项卡

**要问用户 8 个字段**（能给默认值就给，让用户改而不是从头填）：

1. 期数 / 主题名（目录命名：`第N期_主题` 或 `特别期_X`）
2. 定位一句话（这期解决观众什么问题）
3. 系列承接（上期讲了什么、本期接哪句、下期预告什么）
4. 时长目标（见下表）
5. 输出规格（横版必出；**竖版默认不出**——见 `MEMORY.md` 用户偏好；封面要不要）
6. 配音音色与语速（默认 `zh-CN-YunxiNeural` +28%）
7. 是否赛期内紧急发布（紧急 → 走 T2/T5 短平快；不紧急 → 走 T1/T3）
8. 素材从哪来（题目 PDF / 论文 / 代码 / 规则原文 / 网搜）

**时长档位参考（实测）**：

| 档 | 时长 | 口播字数 | 场景数 | 模板 |
|---|---|---|---|---|
| 短平快 | 110–120s | 620–700 字 | 8–10 | T2 |
| 系列标准 | 185–195s | 1180–1230 字 | 9–11 | T1 / T5 |
| 长拆解 | 240–320s | 1500–2000 字 | 6–10 | T3 / T4 |

字数预算公式：**中文长句多按 5.6 字/秒，短句多按 6.5 字/秒**，再按 `RATE` 修正（+20% 时按上表；+28% 时字数上限再乘 1.06）。

---

### S2 · 素材清点

**动作**：扫工作区 + 用户给的路径，产出一张「有 / 缺」清单。

固定检查这几类：

| 类别 | 去哪找 | 落到哪 |
|---|---|---|
| 题目原文 | `*.pdf` → `pdftotext` 或 Read 工具 | `support\problem_brief.md` |
| 论文正文 | `*.docx` → python-docx | 口播稿取材 |
| 论文图 / 截图 | 截图工具、论文导出图 | 工程 `public\` 或 `videos\<ep>\` |
| 规则原文 | `mcm_rules_extracted.txt`、官网 | 必须逐条对 |
| BGM | 任一已交付期的 `public\bgm.mp3`（2,783,814 B，系列通用） | `public\bgm.mp3` |
| 代码 / 结果 | 求解脚本 + 结果 JSON | 数字口径来源 |
| 参考风格 | `风格规范\template\`、真源期源码 | 复制骨架用 |

**问用户**：缺的素材要不要现在补？还是先按「题面事实 + 合理假设」推进（假设必须写进视频/文案里）？

---

### S3 · 事实核对与合规

**这一步不能省。** 规则类、官方口径类内容错一个字就可能被杠或被下架。

**动作**：
1. 把所有要进口播稿的事实列成表：`结论 | 出处 | 原文摘录`。
2. 逐条对官方原文（`mcm_rules_extracted.txt`、官方 PDF、官网）。
3. 标注三类口径：
   - **题面事实**（写死，可直接说）
   - **本队实算结果**（口播必须带「大约 / 实算出来」，不承诺普适）
   - **经验口径**（必须带「通常 / 大概」，不当硬规定讲）
4. 合规红线自查：不代写代做、不承诺获奖、不编造官方没有的处罚条款。

**问用户**：把「出处表 + 有风险的 3 条表述」摆出来，让用户拍板用哪种口径。

> 历史事故：特别期 t7「漏了直接取消评奖资格」比官方原文强（官方触发条件是「故意隐瞒 / 虚假声明 / 未必要人工审查」）；第十三期相似度 60% 是「2025 年通报的统计口径」，不是及格线。**规则类一律先对原文再写。**

---

### S4 · 视频思路蓝图（关键卡点）

**动作**：写 `视频思路.md`，含 6 节：

1. 一句话结论
2. 系列承接与时效性
3. 核心主张（Hero 句，一句能被引用的）
4. 钩子设计（前 15 秒，三连数字优先——数字用**硬约束**不用经验口径）
5. **场景大纲表**：`# | name | 版式 type | accent | 内容一句话`
6. 事实核对表 + 制作注意事项

**场景大纲表是这份文档的心脏**，`name` 后面会同时成为 `podcast.txt` 的 `[SECTION:name]` 和 `episode_data.ts` 的 key，三处必须完全一致。

**问用户**：把大纲表整张贴出来，问三件事——
- 场景数 / 顺序要不要调？
- 哪几个场景是「必须有」的，删不掉？
- 有没有想加的自拟观点（用户明确要求过「要有自己的想法，不模板化」）？

> **蓝图没批准，绝对不写口播稿。** 改大纲的成本是 5 分钟，改稿 + 重跑 TTS + 重渲的成本是 1 小时。

---

### S5 · 口播稿

**动作**：按 S4 批准的大纲写 `videos\<ep>\podcast.txt`，格式：

```
[SECTION:hook]
你写了三十页论文，评委只给五分钟。这五分钟里，他逐字读的只有七段。

[SECTION:t1]
第一点……
```

**三条硬约定**（违反必返工）：

1. **数字一律中文读法**：「百分之四点三」「二零二六年」「二十兆」，不写 `4.3%` / `2026 年` / `20MB`，否则 TTS 读破。
2. **英文缩写先试听 3 秒样本**：MD5 / PDF / AI / ARIMA / XGBoost 在云希男声下各有读法，不行就改中文说法（MD5 → 「M D 五」）。
3. **经验口径加软化词**（「大约」「通常」），规则类已过 S3。

**问用户**：贴出全稿 + 实测字数 + 预估时长，让用户确认。超时长先**压稿 7%**，再考虑提 `RATE`——**别只加 rate**，会挤到听不清。

---

### S6 · 模板选型

**动作**：读 `templates/README.md` 的选用决策树，给用户 2–3 个候选档 + 推荐一个，说明理由。

**问用户**：用哪一档？要不要在选定档上做局部改动（换配色 / 加版式 / 改字幕模式）？

选定后**加载对应的 `templates/T*.md`**，按它的规格执行，不要凭记忆。

**什么时候主动提 T11**：用户说「不想装 node_modules」「想要能双击打开的源码」「交付源码给别人看」「这期想快点出」——
或内容本身是**并列清单**（N 个坑 / N 条规则）而不是推导链。T11 工程极轻，代价是没有字幕组件、没有自动同步门禁。

---

### S7 · 工程初始化

**动作**（以 T1 为例，其他档见各自模板）：

1. 复制骨架：`风格规范\template\` → `<期数>_<主题>\项目源码\mcm-video-temp\`
   （没有模板时，复制最近一期已跑通的源码，如 `第十三期_交卷之后\项目源码\mcm-video-temp\`）
2. 删掉 `videos\episode\` 里的旧产物，新建 `videos\<新ep名>\`
3. 改三处路径：
   - `src\remotion\consts.ts` → `VIDEO_NAME`
   - `src\remotion\Root.tsx` → `import timingData from "../../videos/<新ep名>/timing.json"`
   - `_gen_tts.py` → `BASE = os.path.join(HERE, "videos", "<新ep名>")`
4. 装依赖：`npm install`（首次约 3–5 分钟）。`node_modules` 想省时间可以做 junction 指向已装好的期。
5. 冒烟：`npx remotion compositions src/remotion/index.ts` —— 能列出 4 个 Composition 就算通。

**问用户**：确认新期目录名（会写进所有产物路径），以及要不要复用哪一期的 `node_modules`。

---

### S8 · 内容配置

**动作**：改 `src\remotion\episode_data.ts`（T1 档）或对应数据文件：

- `SECTIONS[]`：每场景一条，字段按 `type` 取（见模板的版式表）
- `VOICE_TEXTS`：与 `SECTIONS[].name` 同名对应
- `BRAND.corner`：右上角标
- `COVER`：封面文案（**必须复用视频里的 hook 数字 / 清单条目**，缩略图和片头要对得上）

**门禁**：写个 5 行脚本比对 `podcast.txt` 的 `[SECTION:x]` 集合与 `episode_data.ts` 的 key 集合，必须完全相等。历史事故：`_check_sync.py` 就是干这个的，从特别期A源码里拿。

**问用户**：把场景 × 版式 × 文案对照表贴出来确认，特别是封面主标题。

---

### S9 · 配音 + 混音 + 时间轴

**动作**：

```powershell
# 环境前置（本机实测，别跳过）
# 用已装 edge-tts 的解释器跑（APP 内置环境已预装；自装环境先 pip install edge-tts）
python _gen_tts.py
```

脚本一条命令做完 4 件事：逐段 TTS（含音频体检 + 重试）→ 拼接人声轨 → 混 BGM → 回写 `timing.json` / `.srt` / `phonemes.json`。

**门禁三条，缺一不可**：
1. 打印的 `total_dur=` 落在目标区间（超出 → 回 S5 压稿）
2. 音频体检全过（`RMS<0.20 / peak<0.99 / ZCR<6000 / 时长>0.5s`）
3. 拼接总长与预期差 `<0.15s`（否则时间轴错位，脚本会自己 raise）

**问用户**：报 `total_dur` 与目标差值，超了就摆两个方案（压稿 / 提 rate），让用户选。

---

### S10 · 目检与抽帧

**动作**：
1. `npx remotion studio src\remotion\index.ts` 起预览，逐场景看动画有没有越界、字幕有没有溢出。
2. 用 `npx remotion still ... --frame=N` 抽 4–5 帧关键位：10% 片头、密集中段 2–3 帧、片尾。

**检查清单**：字幕不超 3 行、大数字不撞边、清单条目最后一条能动、竖版正文区不底部留白。

**问用户**：把抽帧图贴给用户目检（模型无图像输入时，如实说明并请用户自己看）。

---

### S11 · 渲染

```powershell
npx remotion render src\remotion\index.ts <CompositionId> out\横版.mp4 --gl=angle
npx remotion render src\remotion\index.ts <PortraitId>   out\竖版.mp4 --gl=angle   # 仅在用户要竖版时
npx remotion still  src\remotion\index.ts Cover43        out\封面4比3.png --gl=angle
npx remotion still  src\remotion\index.ts Cover34        out\封面3比4.png --gl=angle
```

- `--gl=angle` 走独显（本机 RTX 3050 Laptop 已验证）；无独显或报错就去掉退回 swangle。
- 渲染日志里 `overflow` 必须为 0。

**问用户**：渲染前确认要不要出竖版（默认不出）。

---

### S12 · 后处理两关

```powershell
# 第一关：响度归一（-ar 48000 必须写，否则 aac 会被推到 96kHz）
ffmpeg -y -i out\横版.mp4 -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -c:v copy -c:a aac -b:a 192k out\_1.mp4
# 第二关：重编码 + 写 bt709 色彩标签（VUI 只能靠 x264-params）
ffmpeg -y -i out\_1.mp4 -c:v libx264 -pix_fmt yuv420p -x264-params colorprim=bt709:transfer=bt709:colormatrix=bt709 -color_range tv -c:a aac -b:a 192k -ar 48000 -map 0:v -map 0:a out\横版.mp4
```

**验收**：`ffmpeg -i out\横版.mp4` 的 video 行必须是 `yuv420p(tv, bt709, progressive)`。
系列标准：H.264 + `yuv420p(tv/bt709)` + 30fps + AAC 192kbps + loudnorm I=-14 LUFS。

**问用户**：把探测输出贴出来给用户看（这是「如实记录」的证据）。

---

### S13 · 交付与文档

**目录**：

```
<期数>_<主题>\
├─ 成品\            横版_1920x1080.mp4 / 竖版_1080x1920.mp4 / 封面_4比3.png / 封面_3比4.png
├─ 项目源码\        工程骨架（含 podcast.txt / timing.json）
├─ 视频思路.md
├─ 时间线核对表.md
├─ publish_info.md  ← 必须如实填实测值
└─ 发布文案.md       ← 标题3选1 + 正文 + 章节时间戳 + 标签 + 置顶评论
```

再进统一交付包 `数模AI冲国奖_视频交付包\第N期_<主题>\`：横版 mp4 + 封面4比3.png + 封面3比4.png + 发布文案.md（**封面只出 4:3 与 3:4，不出 16:9**）。

四份文档的骨架见 `references/delivery.md`。

**问用户**：标题三选一让用户挑；发布文案里的风险提示过一遍；确认后才算交付完成。

---

## 4. 模板索引

**10 套模板**：T1–T5 有已交付的真源项目（参数是实测值）；T7–T10 是新设计的样式，**已端到端验证**（真配 TTS 音频 + 真渲染 + 过后处理两关，成品全部达标 `yuv420p(tv, bt709)`），但**未适配竖版、无封面、未做长片压测**。

| 档 | 文件 | 适用 | 时长 | 实测参考 |
|---|---|---|---|---|
| T1 | `templates/T1-深空学术-信息密度.md` | 方法对比 / 对错辨析 / 评分细则 / 系列正片 | 185–195s | 第十二期 189.65s、第十三期 185.40s |
| T2 | `templates/T2-大字清单-紧迫.md` | N 条清单 / 考前急救 / 紧迫 CTA | 110–120s | 特别期_开赛前8小时 111.51s |
| T3 | `templates/T3-真题长拆解.md` | 一道真题四问从头拆到尾 | 240–320s | 特别期A 286.37s、B 319.10s |
| T4 | `templates/T4-奶油论文图解.md` | 论文截图 / 题目原图逐句讲解，轻量 | 220–280s | `_tools_pipeline` 真题 242.15s、华为杯模板 280.40s |
| T5 | `templates/T5-赛事资讯快报.md` | 赛程 / 报名 / 奖金 / 资格 资讯速报 | 180–200s | 华为杯 186s |
| T6 | `templates/T6-封面与竖版适配.md` | **叠加档**，给任意一档补封面 / 竖版 | — | 全期通用 |
| T7 | `templates/T7-纸感笔记.md` | 知识点讲解 / 公式推导 / 复盘笔记，像学习笔记 | 150–240s | ✅ 端到端已验证 |
| T8 | `templates/T8-数据仪表盘.md` | 结果检验 / 灵敏度 / 性能对比，数字为主 | 120–200s | ✅ 端到端已验证 |
| T9 | `templates/T9-杂志排版.md` | 观点输出 / 方法论 / 系列开篇收尾 | 150–220s | ✅ 端到端已验证 |
| T10 | `templates/T10-黑金权威.md` | 评审细则 / 处罚条款 / 奖项公布 / 红线 | 120–200s | ✅ 端到端已验证 |
| **T11** | `templates/T11-单文件HTML-GSAP.md` | **跨后端**：单文件 HTML + GSAP，工程极轻 | 180–200s | 第七期 185.5s（已交付真源） |

### ⚠️ T11 是唯一不走 Remotion 的档

T1–T10 全部基于 Remotion（`src/remotion/*.tsx` + `timing.json` + 帧驱动）。
**T11 走单文件 HTML + GSAP 绝对秒时间轴 + HyperFrames 渲染**，两者工程形态、时间轴模型、配音管线全不一样：

| | T1–T10 | T11 |
|---|---|---|
| 工程 | `src/remotion/` + `node_modules` | 单个 `index.html`，零依赖 |
| 时间轴 | `timing.json` 帧驱动 | GSAP 绝对秒，秒数手填 |
| 口播稿 | `podcast.txt`（`[SECTION:name]`） | `scripts/sN.txt`（一场景一文件） |
| 配音 | edge-tts 云希/云健 | Kokoro ONNX 离线（云健） |
| 渲染 | `npx remotion render` | `npx hyperframes render` |

**选 T11 后，S7–S12 按下面的变体走**（骨架与实例化步骤见 `templates/code/html-gsap/README.md`）：

| 步 | Remotion 线 | T11 变体 |
|---|---|---|
| S7 工程初始化 | 复制骨架 + `npm install` | 复制 `templates/code/html-gsap/` + 拷 `model.onnx`/字体/bgm，**无依赖安装** |
| S8 内容配置 | 改 `episode_data.ts` | 改 `index.html` 的 DOM + CSS + GSAP 段；写 `scripts/sN.txt` |
| S9 配音 | `_gen_tts.py`（edge-tts） | `python tts_models/gen_tts_html.py . zm_yunjian 1.08`（**分段合成，见 T11 文档 7.1**） |
| S9 门禁 | 三条（时长/体检/拼接） | 回填实测时长到 `index.html` 音频块 + `TIMELINE.md`，**两处必须一致** |
| S10 目检 | studio + `remotion still` | `npx hyperframes lint` → `check` → `preview` |
| S11 渲染 | `npx remotion render` | `npx hyperframes render --quality high` |
| S12 后处理 | 两关（loudnorm + bt709） | **同样两关，不能省** —— 真源没记录，接入时必须补做并回填实测值 |
| S13 交付 | 4 份文档 | `TIMELINE.md` 替代「时间线核对表」；发布文案要补**章节时间戳 + 置顶评论** |

⚠️ **T11 骨架的三个已知缺口**（首次使用时必须补，详见 T11 文档第 9 节）：
1. 真源**未过 HyperFrames lint**（`repeat: -1` + 正文 `<br>`），骨架已改，但骨架本身**没跑过完整渲染**。
2. **没有数据同步门禁** —— 段数 = 场景数 = 音频数 = GSAP 段数，四处必须相等，写个 5 行脚本核。
3. 后处理两关在真源里**没有记录**。

**T4 / T7–T10 的组件源码在 `templates/code/`**。T7–T10 每套有**两个形态**：单页演示（`T7PaperNote.tsx`，看风格长什么样）和**完整视频组件**（`T7PaperNoteVideo.tsx`，读 `timing.json` 按帧切场景 + 句级字幕，能直接出片）。**T4 只有完整视频组件**：`T4CreamPaperVideo.tsx` + `T4plan.example.ts`（复制成 `plan.ts` 用）+ 两个附属版式 `T4RepoTree.tsx`（文件树）/ `T4YearTable.tsx`（对比表）—— 原 `_tools_pipeline/EpisodeScene.tsx` 是单页版，且依赖 `./cues` 和 `./displayPlan` 两个在该目录里并不存在的文件。

四套共用一个场景引擎 `templates/code/src/remotion/shared/`：
- `useScene(timing)` 返回 `{ frame, sec, idx, section, p }`，`p` 是场景内归一化进度
- **动画一律基于场景内局部帧 `lf = frame - section.start_frame`，不用绝对帧**——改场景时长不用改动画
- `Subtitle` 组件做句级实时刻**硬切**字幕（不加淡入）

换期只改 `demoData.ts` 的场景内容，key 与 `podcast.txt` 的 `[SECTION:name]` 一致；`timing.json` 由 `_gen_tts.py` 生成，不要手改。

**调用方式**：用户说「用 T2」或「走大字清单档」，就 `Read templates/T2-大字清单-紧迫.md` 再执行；也可以说「T1 的配色 + T5 的版式」做混搭，但要先跟用户确认混搭后的时长与场景数。

⚠️ **浅色档（T4 / T7 / T9）和深色档（其余）不要混**，中途换底色会让观众觉得换了个视频。

---

## 5. 参考文件索引

| 文件 | 什么时候读 |
|---|---|
| `references/pipeline.md` | S6–S12，全流程技术规格、参数速查表 |
| `references/gotchas.md` | 任何一步报错时；环境前置；21 条实测坑 |
| `references/script-and-compliance.md` | S3 / S5，口播稿规则与合规红线 |
| `references/delivery.md` | S13，四份交付文档模板 |
| `templates/README.md` | S6，模板选用决策树 |
| `templates/T11-单文件HTML-GSAP.md` + `templates/code/html-gsap/README.md` | 选了 T11（HTML+GSAP 后端）时，S7–S13 全流程改走这套 |

### 流程图（讲给用户看时用）

本技能包**不自带图片**。8 张流程图（总体流程、确认门协议、模板决策树、配音管线、后处理两关、交付汇聚、时长超标回退、风格 DNA 继承）在这个仓库里：

**https://github.com/SpenBug/mcm-video-pipeline**

- `docs/flowcharts.md` — 8 张图 + 可复制的 Mermaid 源码
- `assets/*.svg` — 3 张独立矢量图，可直接放进 PPT / 视频

**什么时候用**：S1 立项时给用户看总体流程、S4 讲蓝图结构、S6 讲模板选型、S9 超时解释回退路径、以及任何用户问「这条线是怎么跑的」的时候。

如果用户机器上没克隆仓库，直接在对话里用可视化工具重画一张即可——图的语义以本文件和 `references/pipeline.md` 为准。

---

## 6. 收尾动作（每次跑完流水线必做）

1. 追加一条工作日志到 `D:\自媒体\自媒体\.workbuddy-ai\memory\YYYY-MM-DD.md`：期数、时长、帧数、模板档、踩到的坑。
2. 如果本次发现了新的坑或更好的参数，**更新 `references/gotchas.md`**——这份文件是流水线唯一会「越跑越准」的部分。
3. 如果本次做了模板级的改动（新配色 / 新版式 / 新字幕模式），**更新对应的 `templates/T*.md`**，别只留在代码里。
