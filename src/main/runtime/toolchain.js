'use strict';

/**
 * 视频流水线工具链探测。
 *
 * 这条线真正依赖的外部程序只有四个：ffmpeg（后处理两关 / 混音）、
 * node+npx（Remotion 与 HyperFrames 渲染）、Python（TTS 脚本）、
 * 以及 Python 侧的 TTS 包（edge-tts 或 Kokoro）。
 *
 * 探测原则：只看「能不能跑起来」，不装任何东西。装依赖是 python.js 的活。
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function run(cmd, args, timeout = 8000, opts = {}) {
  try {
    const r = spawnSync(cmd, args, {
      timeout,
      windowsHide: true,
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
      ...opts,
    });
    if (r.error) return { ok: false, output: String(r.error.message || '') };
    return { ok: r.status === 0, output: `${r.stdout || ''}${r.stderr || ''}`.trim() };
  } catch (err) {
    return { ok: false, output: String(err.message || '') };
  }
}

/** 从 `ffmpeg -version` 之类输出里抓版本号 */
function firstVersion(text) {
  const m = String(text).match(/(\d+\.\d+(?:\.\d+)?)/);
  return m ? m[1] : '';
}

function detectFfmpeg() {
  const r = run('ffmpeg', ['-version']);
  return { id: 'ffmpeg', label: 'FFmpeg', required: true,
           desc: '后处理两关（loudnorm + bt709）与混音',
           available: r.ok, version: r.ok ? firstVersion(r.output) : '', detail: r.output.split('\n')[0] || '' };
}

function detectNode() {
  const r = run('node', ['-v']);
  // npx 在 Windows 上是 npx.cmd：spawnSync 不带 shell 无法执行（EINVAL），
  // 必须 shell:true —— 否则有 Node 的机器也会被误报「npx 不可用」。
  const n = run('npx', ['--version'], 8000, { shell: true });
  return { id: 'node', label: 'Node.js + npx', required: true,
           desc: 'Remotion / HyperFrames 渲染（需 22+）',
           available: r.ok && n.ok, version: r.ok ? r.output.replace(/^v/, '') : '',
           detail: r.ok ? `node ${r.output}${n.ok ? ` · npx ${n.output}` : ' · npx 不可用'}` : '' };
}

function detectPython(pythonPath) {
  const exe = pythonPath || 'python';
  if (!pythonPath) {
    // 没配就先探一下常见名字
    for (const cand of ['python', 'py -3', 'python3']) {
      const t = run(cand, ['-V']);
      if (t.ok) {
        return { id: 'python', label: 'Python', required: true,
                 desc: '跑 _gen_tts.py / gen_tts_html.py',
                 available: true, version: firstVersion(t.output), detail: `${cand} → ${t.output}` };
      }
    }
    return { id: 'python', label: 'Python', required: true, desc: '跑 TTS 脚本',
             available: false, version: '', detail: '未检测到 python' };
  }
  const r = run(exe, ['-V']);
  return { id: 'python', label: 'Python', required: true, desc: '跑 TTS 脚本',
           available: r.ok, version: r.ok ? firstVersion(r.output) : '', detail: r.ok ? r.output : exe };
}

/**
 * Python 侧 TTS 包探测。
 * 用 find_spec 而不是 import：更快，也不触发副作用。
 * ⚠️ Windows 下 `python -c "多行脚本"` 会静默失败，所以这里写成单行并用分号拼接。
 */
function detectTtsPackages(pythonPath) {
  const names = ['edge_tts', 'onnxruntime', 'kokoro_onnx', 'misaki', 'soundfile', 'numpy'];
  const script = 'import importlib.util as u, json; '
    + `n=${JSON.stringify(names)}; `
    + 'print(json.dumps({k: u.find_spec(k) is not None for k in n}))';
  const exe = pythonPath || 'python';
  const r = run(exe, ['-c', script]);
  const empty = { edge_tts: false, onnxruntime: false, kokoro_onnx: false, misaki: false, soundfile: false, numpy: false };
  if (!r.ok) return empty;
  try {
    const m = r.output.match(/\{.*\}/s);
    return m ? { ...empty, ...JSON.parse(m[0]) } : empty;
  } catch {
    return empty;
  }
}

/**
 * 全量探测。pythonPath 可省略（省略时自动找系统 Python）。
 */
function detectToolchain(pythonPath) {
  const items = [detectFfmpeg(), detectNode(), detectPython(pythonPath)];
  const py = items.find((i) => i.id === 'python');
  const pkgs = py && py.available ? detectTtsPackages(pythonPath) : null;

  // 两条配音路线：edge-tts（Remotion 线）与 Kokoro（T11 线），有一条能跑就行
  const edgeReady = Boolean(pkgs && pkgs.edge_tts);
  const kokoroReady = Boolean(pkgs && pkgs.onnxruntime && pkgs.kokoro_onnx && pkgs.misaki && pkgs.soundfile);

  items.push({
    id: 'tts-edge', label: 'edge-tts（T1–T10 配音）', required: false,
    desc: 'Remotion 线的配音引擎',
    available: edgeReady, version: '',
    detail: pkgs == null ? 'Python 不可用，未检测' : (edgeReady ? '已安装' : '未安装 —— 在「运行环境」里创建独立环境即可自动安装'),
  });
  items.push({
    id: 'tts-kokoro', label: 'Kokoro ONNX（T11 配音）', required: false,
    desc: 'T11 单文件 HTML 档的离线配音',
    available: kokoroReady, version: '',
    detail: pkgs == null ? 'Python 不可用，未检测'
      : (kokoroReady ? '已安装（onnxruntime + kokoro_onnx + misaki + soundfile）'
        : '未装齐 —— 仅做 T11 档时需要，在「运行环境」里点「安装 Kokoro 配音栈」'),
  });

  const missingRequired = items.filter((i) => i.required && !i.available).map((i) => i.label);
  return { items, missingRequired, ready: missingRequired.length === 0 };
}

/** 顺带看看工作区里有没有已存在的渲染工程，方便界面提示 */
function scanProjects(workspace) {
  if (!workspace || !fs.existsSync(workspace)) return [];
  const out = [];
  for (const name of fs.readdirSync(workspace)) {
    if (name.startsWith('.')) continue;
    const full = path.join(workspace, name);
    if (!fs.statSync(full).isDirectory()) continue;
    let kind = '';
    if (fs.existsSync(path.join(full, 'src', 'remotion', 'index.ts'))) kind = 'Remotion';
    else if (fs.existsSync(path.join(full, 'index.html'))) kind = 'HTML+GSAP';
    if (kind) out.push({ name, kind });
  }
  return out;
}

module.exports = { detectToolchain, detectFfmpeg, detectNode, detectPython, detectTtsPackages, scanProjects };
