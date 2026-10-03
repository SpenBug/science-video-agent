/**
 * 演示内容 —— 对应 videos/demo/timing.json 的 5 个场景
 *
 * 真实使用时，这份数据由 Agent 在 S8「内容配置」阶段按 S4 批准的场景大纲表填写，
 * key 必须与 podcast.txt 的 [SECTION:name] 完全一致。
 */

// ============ T7 纸感笔记 ============
export type NotePage = {
  section: string;
  title: string;
  body: string[];
  highlight?: { text: string; paraIndex: number };
  margin?: string;
  marginTag?: string;
  points?: string[];
  page: string;
};

export const NOTE_PAGES: Record<string, NotePage> = {
  hook: {
    section: "开场",
    title: "参数动一点，\n结论会不会翻？",
    body: ["别只报一个点估计。", "评委问的不是你的模型多漂亮，而是它稳不稳。"],
    highlight: { text: "结论会不会翻", paraIndex: 0 },
    margin: "去年有队只测了一组，\n评委一问就答不上来。",
    page: "第 01 页",
  },
  s1: {
    section: "第一步",
    title: "先把关键\n参数挑出来",
    body: ["不是所有参数都值得扰动。", "挑那些量级不确定、来源存疑的。"],
    highlight: { text: "量级不确定", paraIndex: 1 },
    margin: "给所有参数都做一遍，\n时间不够，也说明你没判断力。",
    marginTag: "批注 · 取舍",
    points: ["只挑 2–3 个关键参数", "来源存疑的优先"],
    page: "第 02 页",
  },
  s2: {
    section: "第二步",
    title: "各扰动\n正负百分之二十",
    body: ["重跑一遍，看排序变不变。", "排序变了，结论就不能进摘要。"],
    highlight: { text: "正负百分之二十", paraIndex: 0 },
    margin: "扰动幅度要有依据，\n别随手写个数。",
    marginTag: "批注 · 依据",
    points: ["扰动幅度写出来源", "排序一变，结论作废"],
    page: "第 03 页",
  },
  s3: {
    section: "第三步",
    title: "它是一次\n压力测试",
    body: ["灵敏度不是换个数字再算一遍。", "如果模型扛不住，说明你对它的信心是假的。"],
    highlight: { text: "压力测试", paraIndex: 0 },
    margin: "这一段能写进论文的\n「模型评价」里。",
    marginTag: "批注 · 加分点",
    points: ["灵敏度是论证，不是补图", "结论扛得住才敢写"],
    page: "第 04 页",
  },
  outro: {
    section: "收尾",
    title: "三步走完，\n才敢写进摘要",
    body: ["挑参数 → 扰动 → 看排序。", "觉得有用点个收藏。"],
    page: "第 05 页",
  },
};

// ============ T8 数据仪表盘 ============
export type DashMetric = {
  label: string;
  value: number;
  max: number;
  unit: string;
  dec: number;
  color: string;
  note: string;
};
export type DashScene = {
  title: string;
  sub: string;
  status: string;
  metrics: DashMetric[];
  bars: { name: string; v: number; color: string }[];
  spark: number[];
  sparkNote: string;
};

const C = { cyan: "#00E5FF", green: "#39FF88", amber: "#FF9F1C", red: "#FF4D6D", faint: "#44576E" };

export const DASH_SCENES: Record<string, DashScene> = {
  hook: {
    title: "模型体检报告",
    sub: "MODEL DIAGNOSTICS · CUMCM 2026 A",
    status: "PASS",
    metrics: [
      { label: "拟合优度 R²", value: 0.964, max: 1, unit: "0 – 1", dec: 3, color: C.green, note: "训练集" },
      { label: "平均相对误差", value: 3.6, max: 20, unit: "%", dec: 1, color: C.cyan, note: "留出验证" },
      { label: "最差单点误差", value: 11.8, max: 20, unit: "%", dec: 1, color: C.amber, note: "端面位置" },
    ],
    bars: [
      { name: "基准模型", v: 1.0, color: C.faint },
      { name: "加物性修正", v: 0.62, color: C.cyan },
      { name: "加边界判据", v: 0.41, color: C.green },
      { name: "加几何耦合", v: 0.29, color: C.green },
    ],
    spark: [0.92, 0.86, 0.71, 0.62, 0.48, 0.41, 0.36, 0.31, 0.29],
    sparkNote: "收敛于第 9 次迭代",
  },
  s1: {
    title: "参数敏感度排序",
    sub: "SENSITIVITY RANKING",
    status: "CHECK",
    metrics: [
      { label: "扩散系数 D", value: 22, max: 30, unit: "% 影响", dec: 0, color: C.amber, note: "主导因素" },
      { label: "对流系数 h", value: 6.4, max: 30, unit: "% 影响", dec: 1, color: C.cyan, note: "次要" },
      { label: "初始含水率", value: 1.2, max: 30, unit: "% 影响", dec: 1, color: C.green, note: "几乎无关" },
    ],
    bars: [
      { name: "扩散系数 D", v: 0.73, color: C.amber },
      { name: "对流系数 h", v: 0.21, color: C.cyan },
      { name: "初始含水率", v: 0.04, color: C.green },
      { name: "环境温度", v: 0.02, color: C.faint },
    ],
    spark: [0.30, 0.52, 0.68, 0.78, 0.83, 0.86, 0.88, 0.89, 0.90],
    sparkNote: "影响度累积曲线",
  },
  s2: {
    title: "正负百分之二十扰动",
    sub: "PERTURBATION ±20%",
    status: "PASS",
    metrics: [
      { label: "结论排序保持", value: 1, max: 1, unit: "布尔", dec: 0, color: C.green, note: "关键判据" },
      { label: "最优解偏移", value: 14, max: 50, unit: "%", dec: 0, color: C.cyan, note: "在容忍内" },
      { label: "最坏情况误差", value: 22, max: 50, unit: "%", dec: 0, color: C.amber, note: "端面位置" },
    ],
    bars: [
      { name: "D −20%", v: 0.86, color: C.cyan },
      { name: "D 基准", v: 1.0, color: C.faint },
      { name: "D +20%", v: 0.78, color: C.cyan },
      { name: "h +20%", v: 0.94, color: C.green },
    ],
    spark: [0.55, 0.58, 0.62, 0.66, 0.70, 0.74, 0.78, 0.82, 0.86],
    sparkNote: "扰动幅度递增",
  },
  s3: {
    title: "压力测试结果",
    sub: "STRESS TEST",
    status: "WARN",
    metrics: [
      { label: "结论鲁棒性", value: 0.82, max: 1, unit: "0 – 1", dec: 2, color: C.amber, note: "可接受" },
      { label: "失效阈值", value: 38, max: 100, unit: "% 扰动", dec: 0, color: C.cyan, note: "超出即翻" },
      { label: "建议扰动上限", value: 20, max: 100, unit: "%", dec: 0, color: C.green, note: "写进假设" },
    ],
    bars: [
      { name: "5% 扰动", v: 0.08, color: C.green },
      { name: "10% 扰动", v: 0.16, color: C.green },
      { name: "20% 扰动", v: 0.34, color: C.cyan },
      { name: "40% 扰动", v: 0.72, color: C.red },
    ],
    spark: [0.08, 0.16, 0.24, 0.34, 0.48, 0.62, 0.72, 0.81, 0.88],
    sparkNote: "扰动幅度 → 结论偏移",
  },
  outro: {
    title: "这三步走完",
    sub: "CHECKLIST",
    status: "DONE",
    metrics: [
      { label: "挑参数", value: 1, max: 1, unit: "完成", dec: 0, color: C.green, note: "2–3 个" },
      { label: "做扰动", value: 1, max: 1, unit: "完成", dec: 0, color: C.green, note: "±20%" },
      { label: "看排序", value: 1, max: 1, unit: "完成", dec: 0, color: C.green, note: "不变" },
    ],
    bars: [
      { name: "挑参数", v: 1.0, color: C.green },
      { name: "做扰动", v: 1.0, color: C.green },
      { name: "看排序", v: 1.0, color: C.green },
      { name: "写进摘要", v: 1.0, color: C.cyan },
    ],
    spark: [0.2, 0.4, 0.6, 0.75, 0.85, 0.92, 0.96, 0.99, 1.0],
    sparkNote: "全流程完成度",
  },
};

// ============ T9 杂志排版 ============
export type Spread = {
  section: string;
  title: string;
  accentWord?: string;
  lead: string;
  columns: string[][];
  quote?: { text: string; source: string };
  sidebar?: { n: string; d: string }[];
  page: string;
};

export const SPREADS: Record<string, Spread> = {
  hook: {
    section: "开场",
    title: "结论\n稳不稳\n更要紧",
    accentWord: "稳不稳",
    lead: "评委不只看你的数准不准。\n他更关心参数动一点，你的结论还站不站得住。",
    columns: [
      ["很多人只报一个点估计，模型跑通就交卷。"],
      ["真正的分水岭是：换个参数再算一遍，你的排序会不会变。"],
    ],
    quote: { text: "“准，只是及格；稳，才敢写进摘要。”", source: "灵敏度分析的意义" },
    sidebar: [
      { n: "准", d: "误差在容忍内" },
      { n: "稳", d: "扰动后排序不变" },
      { n: "结论", d: "两个都过才敢写" },
    ],
    page: "PAGE 01",
  },
  s1: {
    section: "第一步",
    title: "只挑\n两三个\n参数",
    accentWord: "两三个",
    lead: "不是所有参数都值得扰动。\n给全部参数做一遍，等于没做判断。",
    columns: [
      ["挑那些量级不确定的、来源存疑的、对结论影响最大的。两到三个就够。"],
      ["剩下的在论文里说明「经预实验确认不敏感」即可，这也是论证。"],
    ],
    sidebar: [
      { n: "量级", d: "不确定的优先" },
      { n: "来源", d: "存疑的优先" },
      { n: "数量", d: "两到三个" },
    ],
    page: "PAGE 02",
  },
  s2: {
    section: "第二步",
    title: "扰动\n要有\n依据",
    accentWord: "依据",
    lead: "扰动幅度不是随手写的数。\n评委一定会问，为什么是百分之二十。",
    columns: [
      ["依据可以来自文献范围、实验精度、或者题目给的数据波动区间。"],
      ["重跑之后先看排序。排序变了，这个结论就不能写进摘要——这是硬判据。"],
    ],
    quote: { text: "“依据写不出来，这个数就是编的。”", source: "扰动幅度的来源" },
    page: "PAGE 03",
  },
  s3: {
    section: "第三步",
    title: "排序一变\n结论\n作废",
    accentWord: "作废",
    lead: "这是硬判据，不是建议。\n排序变了，说明你对模型的信心是假的。",
    columns: [
      ["把失效阈值也写出来：超过多少扰动结论会翻。这句话本身就是加分点。"],
      ["然后把它挪到「模型评价」一节，别只留在附录里。"],
    ],
    sidebar: [
      { n: "抗得住", d: "结论可以进摘要" },
      { n: "扛不住", d: "降级成讨论" },
      { n: "阈值", d: "写出来，是加分点" },
    ],
    page: "PAGE 04",
  },
  outro: {
    section: "收尾",
    title: "三步\n走完",
    lead: "挑参数 → 扰动 → 看排序。\n走完这三步，你的结论才敢写进摘要。",
    columns: [
      ["这套流程不需要额外的时间成本，但它决定了你的结论站不站得住。"],
      ["觉得有用点个收藏。下期我们讲怎么把灵敏度写成一段能拿分的论文。"],
    ],
    page: "PAGE 05",
  },
};

// ============ T10 黑金权威 ============
export type Clause = { no: string; title: string; desc: string };
export type AuthScene = {
  header: string;
  headerRight: string;
  title: string;
  titleAccent?: string;
  sealChar?: string;
  clauses: Clause[];
};

export const AUTH_SCENES: Record<string, AuthScene> = {
  hook: {
    header: "灵敏度分析",
    headerRight: "评委必看",
    title: "这三条\n评委一定会看",
    titleAccent: "评委一定会看",
    sealChar: "敏",
    clauses: [
      { no: "01", title: "有排序变化", desc: "参数扰动后结论排序是否改变，要明说" },
      { no: "02", title: "有失效阈值", desc: "超过多少扰动结论会翻，这个数字是加分点" },
      { no: "03", title: "写进模型评价", desc: "别只把图放附录，结论要挪到正文" },
    ],
  },
  s1: {
    header: "第一条 · 挑参数",
    headerRight: "硬性要求",
    title: "不是所有\n参数都值得\n扰动",
    titleAccent: "都值得",
    sealChar: "挑",
    clauses: [
      { no: "01", title: "两到三个就够", desc: "给全部参数做一遍，等于没做判断" },
      { no: "02", title: "挑不确定的", desc: "量级存疑、来源存疑的优先" },
    ],
  },
  s2: {
    header: "第二条 · 扰动",
    headerRight: "幅度要有依据",
    title: "扰动幅度\n不能随手写",
    titleAccent: "不能随手写",
    sealChar: "据",
    clauses: [
      { no: "01", title: "依据要写出来", desc: "文献范围、实验精度、或数据的波动区间" },
      { no: "02", title: "重跑后先看排序", desc: "排序变了，结论就不能进摘要" },
      { no: "03", title: "正负百分之二十", desc: "这是常见口径，但要说明为什么用它" },
    ],
  },
  s3: {
    header: "第三条 · 结论",
    headerRight: "加分项",
    title: "排序一变\n结论作废",
    titleAccent: "作废",
    sealChar: "废",
    clauses: [
      { no: "01", title: "给出失效阈值", desc: "超过多少扰动结论会翻，写出来" },
      { no: "02", title: "挪进模型评价", desc: "别只留在附录，正文里要有判断句" },
      { no: "03", title: "扛不住就降级", desc: "改成讨论，不要硬当结论" },
    ],
  },
  outro: {
    header: "收尾",
    headerRight: "下期预告",
    title: "三条都对过\n再交卷",
    titleAccent: "再交卷",
    sealChar: "准",
    clauses: [
      { no: "01", title: "挑两三个参数", desc: "挑不确定的，别全挑" },
      { no: "02", title: "扰动有依据", desc: "幅度来源要能说清" },
      { no: "03", title: "排序有判断", desc: "变了就作废，没变才敢写" },
    ],
  },
};
