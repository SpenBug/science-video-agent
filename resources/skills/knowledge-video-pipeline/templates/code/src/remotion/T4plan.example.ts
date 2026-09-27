// ===== 场景计划：section name 必须与 podcast.txt 的 [SECTION:name] 完全一致 =====
export type PlanMode = "open" | "split" | "tree" | "year";

export type SectionPlan = {
  label: string; // 顶部章节标签
  chapter: string; // 左侧大标题
  note: string; // 本句要点卡
  imgs: string[]; // 该场景用图（按句索引轮换）
  hue: string; // 主题色
  mode: PlanMode;
};

export const SECTION_PLAN: Record<string, SectionPlan> = {
  hook: {
    label: "开场",
    chapter: "华为杯论文模板",
    note: "官方只给 4 页，这里补满 12 页",
    imgs: ["page-01.png"],
    hue: "#0E9F9E",
    mode: "open",
  },
  repo: {
    label: "仓库结构",
    chapter: "一个仓库，六个部分",
    note: "cls 管规则 / tex 是你改的文件 / bst 管引用",
    imgs: [],
    hue: "#0E9F9E",
    mode: "tree",
  },
  cover: {
    label: "第 1–2 页",
    chapter: "封面与摘要",
    note: "源码开头改六行：标题、队号、学校、三个队员",
    imgs: ["page-01.png", "page-02.png"],
    hue: "#3B82F6",
    mode: "split",
  },
  body: {
    label: "第 3–5 页",
    chapter: "正文骨架",
    note: "假设一条条列 / 符号一字母一义 / 公式编号自动",
    imgs: ["page-03.png", "page-04.png", "page-05.png"],
    hue: "#3B82F6",
    mode: "split",
  },
  table: {
    label: "第 6–8 页",
    chapter: "三线表",
    note: "tabularx 自动列宽，跨页不断线",
    imgs: ["page-06.png", "page-07.png", "page-08.png"],
    hue: "#F59E0B",
    mode: "split",
  },
  figure: {
    label: "第 9–10 页",
    chapter: "图与算法",
    note: "四个子图编号 a / b / c / d，伪代码在第五页",
    imgs: ["page-09.png", "page-10.png"],
    hue: "#8B5CF6",
    mode: "split",
  },
  appendix: {
    label: "第 11–12 页",
    chapter: "附录代码",
    note: "附录 A 是 MATLAB，附录 B 是 Python",
    imgs: ["page-11.png", "page-12.png"],
    hue: "#8B5CF6",
    mode: "split",
  },
  official: {
    label: "官方对比",
    chapter: "官方 Word 模板",
    note: "实测 4 页：封面 + 摘要 + 两页空白",
    imgs: ["official-1.png", "official-2.png", "official-3.png", "official-4.png"],
    hue: "#EF4444",
    mode: "split",
  },
  year: {
    label: "改年份",
    chapter: "该改的 vs 碰不得的",
    note: "赛事标识可以改，历史事实不能动",
    imgs: [],
    hue: "#3B82F6",
    mode: "year",
  },
  end: {
    label: "收尾",
    chapter: "克隆 → 编译 → 写模型",
    note: "仓库地址在简介，开源免费",
    imgs: ["page-01.png"],
    hue: "#1E3A8A",
    mode: "open",
  },
};

// ===== 仓库文件树（repo 场景用）=====
export const REPO_TREE: { icon: string; name: string; desc: string; accent: string }[] = [
  { icon: "■", name: "gmcmthesis.cls", desc: "模板类文件 · 排版规则全在里面", accent: "#0E9F9E" },
  { icon: "■", name: "example.tex", desc: "示例论文源码 · 579 行，你要改的就是它", accent: "#3B82F6" },
  { icon: "■", name: "gmcm.bst", desc: "参考文献样式 · 国标 7714", accent: "#8B5CF6" },
  { icon: "■", name: "figures/", desc: "10 个矢量图 · logo、封面标题、配图", accent: "#F59E0B" },
  { icon: "■", name: "reference.bib", desc: "参考文献数据库 · 引用条目往里加", accent: "#EF4444" },
  { icon: "■", name: "附件3 · 官方模板", desc: "官方 Word 版原件 · 用来对照", accent: "#7A7A8C" },
];

// ===== 年份改动对比（year 场景用）=====
export const YEAR_ROWS: { kind: "ok" | "no"; file: string; old: string; now: string }[] = [
  { kind: "ok", file: "封面届数（title.pdf）", old: "第二十一届", now: "第二十三届" },
  { kind: "ok", file: "example.tex 格式说明", old: "2024 年", now: "2026 年" },
  { kind: "ok", file: "example.tex 示例数据", old: "2019 年", now: "2026 年" },
  { kind: "no", file: "gmcm.bst 版本号", old: "2018/08/05", now: "不动" },
  { kind: "no", file: "gmcmthesis.cls 版本", old: "v2.4 2023/09/19", now: "不动" },
  { kind: "no", file: "reference.bib 文献年份", old: "2004 / 2009 …", now: "不动" },
];
