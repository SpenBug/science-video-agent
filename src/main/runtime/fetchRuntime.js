'use strict';

/**
 * 便携运行时获取器：下载 ffmpeg（后处理两关 / 混音）与 Node 22（Remotion 渲染）
 * 的 Windows 便携版，解压到目标目录。构建期 CLI（scripts/fetch-runtime.js）与
 * APP 内「首次启动向导」共用本模块 —— 因此这里禁止 import electron。
 *
 * 目录布局（PATH 只需要prepend targetDir 与 targetDir/ffmpeg）：
 *   <target>/ffmpeg/ffmpeg.exe
 *   <target>/node/node.exe  (+ node_modules/npm —— npx 的本体)
 *
 * 源策略（国内网络实测：GitHub 直连常不通）：
 *   ffmpeg → npmmirror ffmpeg-static 静态单文件（免解压）→ gyan.dev zip → GitHub zip
 *   node   → nodejs.org 最新 v22 → npmmirror 镜像最新 v22 → 固定版本（zip 未内置
 *            npm 的新版会校验失败自动回退，见 NODE_FALLBACK_VERSION）
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCES = {
  ffmpegBinary: ['https://registry.npmmirror.com/-/binary/ffmpeg-static/b6.1.1/ffmpeg-win32-x64'],
  ffmpegZip: [
    'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    'https://github.com/GyanD/codexffmpeg/releases/latest/download/ffmpeg-release-essentials.zip',
  ],
  nodeIndex: [
    'https://nodejs.org/dist/latest-v22.x/',
    'https://npmmirror.com/mirrors/node/latest-v22.x/',
  ],
  nodePinned: [
    'https://nodejs.org/dist/v22.12.0/',
    'https://npmmirror.com/mirrors/node/v22.12.0/',
  ],
};

/** 部分新版 v22 zip 已不内置 npm —— 回退到确定内置 npm 的版本 */
const NODE_FALLBACK_VERSION = 'v22.12.0';

function hasFfmpeg(target) {
  return fs.existsSync(path.join(target, 'ffmpeg', 'ffmpeg.exe'));
}

function hasNode(target) {
  return fs.existsSync(path.join(target, 'node', 'node.exe'))
    && fs.existsSync(path.join(target, 'node', 'node_modules', 'npm', 'bin', 'npx-cli.js'));
}

/** 检查目标目录里缺什么 */
function whatIsMissing(target, want = { ffmpeg: true, node: true }) {
  return {
    ffmpeg: Boolean(want.ffmpeg) && !hasFfmpeg(target),
    node: Boolean(want.node) && !hasNode(target),
  };
}

async function download(url, destFile, onProgress) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}：${url}`);
  const total = Number(res.headers.get('content-length') || 0);
  const out = fs.createWriteStream(destFile);
  // finish/error 监听必须在写入开始前挂好 —— 否则最后一次 write 落盘与
  // 最后一次 reader.read() 的 await 交错时，finish 可能先行触发，
  // promise 永不 resolve，进程随事件循环清空而静默退出（exit 0，无文件）。
  const finished = new Promise((resolve, reject) => {
    out.on('finish', resolve);
    out.on('error', reject);
  });
  let done = 0;
  let lastEmit = 0;

  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done: fin, value } = await reader.read();
      if (fin) break;
      done += value.length;
      out.write(Buffer.from(value));
      if (onProgress && total && done - lastEmit > 2 * 1024 * 1024) {
        lastEmit = done;
        onProgress({ downloaded: done, total, pct: Math.round((done / total) * 100) });
      }
    }
  } catch (err) {
    out.destroy();
    throw err;
  }
  out.end();
  await finished;
  return done;
}

async function downloadFromAny(urls, destFile, onProgress) {
  let lastErr = null;
  for (const url of urls) {
    try {
      return await download(url, destFile, onProgress);
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`所有下载源均失败：${lastErr?.message || '未知错误'}`);
}

function extractZip(zipFile, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  // Windows 10+ 自带 bsdtar，能解 zip；失败再退回 PowerShell
  let r = spawnSync('tar', ['-xf', zipFile, '-C', destDir], { windowsHide: true, timeout: 300000 });
  if (r.status !== 0) {
    r = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-Command', `Expand-Archive -LiteralPath "${zipFile}" -DestinationPath "${destDir}" -Force`],
      { windowsHide: true, timeout: 300000 }
    );
  }
  if (r.status !== 0) {
    throw new Error(`解压失败：${String(r.stderr || r.stdout || '').slice(0, 300)}`);
  }
}

/** 在解压树里找指定文件名（广度优先，第一层命中优先） */
function findFile(root, name) {
  const queue = [root];
  while (queue.length) {
    const dir = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isFile() && e.name.toLowerCase() === name) return full;
      if (e.isDirectory()) queue.push(full);
    }
  }
  return null;
}

async function fetchFfmpeg(target, onProgress) {
  if (hasFfmpeg(target)) return '已存在';
  const dest = path.join(target, 'ffmpeg', 'ffmpeg.exe');
  fs.mkdirSync(path.join(target, 'ffmpeg'), { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcm-rt-'));

  try {
    // ① 静态单文件直链（免解压）
    try {
      onProgress?.({ step: 'ffmpeg', status: 'downloading' });
      const raw = path.join(tmp, 'ffmpeg.exe');
      await downloadFromAny(SOURCES.ffmpegBinary, raw, (p) =>
        onProgress?.({ step: 'ffmpeg', status: 'progress', ...p })
      );
      if (fs.statSync(raw).size < 10 * 1024 * 1024) throw new Error('下载的 ffmpeg.exe 过小，内容异常');
      fs.copyFileSync(raw, dest);
      return '已下载（ffmpeg-static）';
    } catch (binErr) {
      // ② zip 源兜底
      onProgress?.({ step: 'ffmpeg', status: 'downloading', fallback: binErr.message });
      const zip = path.join(tmp, 'ffmpeg.zip');
      await downloadFromAny(SOURCES.ffmpegZip, zip, (p) =>
        onProgress?.({ step: 'ffmpeg', status: 'progress', ...p })
      );
      onProgress?.({ step: 'ffmpeg', status: 'extracting' });
      const ex = path.join(tmp, 'ex');
      extractZip(zip, ex);
      const exe = findFile(ex, 'ffmpeg.exe');
      if (!exe) throw new Error('压缩包里没找到 ffmpeg.exe');
      fs.copyFileSync(exe, dest);
      return '已下载（gyan.dev）';
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * 跨盘拷目录。实测 Node 22 的 fs.cpSync 对 node_modules 这类海量小文件目录
 * 会静默失败甚至崩进程 —— 用 Windows 原生 robocopy（退出码 < 8 都是成功，
 * 1 = 有文件复制），非 Windows 回退 cpSync。
 */
function copyDirRobust(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  if (process.platform === 'win32') {
    const r = spawnSync('robocopy', [src, dest, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP'], {
      windowsHide: true,
      timeout: 600000,
    });
    if (r.status !== null && r.status < 8) return;
    throw new Error(`robocopy 失败（${r.status}）：${String(r.stderr || r.stdout || '').slice(0, 200)}`);
  }
  fs.cpSync(src, dest, { recursive: true, force: true });
}

/** 下载并安装一个具体的 node zip。失败抛错（调用方换下一个源/版本）。 */
async function installNodeZip(base, file, target, onProgress) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcm-rt-'));
  try {
    const zip = path.join(tmp, file);
    await download(base + file, zip, (p) => onProgress?.({ step: 'node', status: 'progress', ...p }));
    onProgress?.({ step: 'node', status: 'extracting' });
    const ex = path.join(tmp, 'ex');
    extractZip(zip, ex);
    const inner = path.join(ex, file.replace(/\.zip$/, ''));
    const srcDir = fs.existsSync(inner) ? inner : ex;
    if (!fs.existsSync(path.join(srcDir, 'node_modules', 'npm', 'bin', 'npx-cli.js'))) {
      throw new Error('该版本 zip 未内置 npm（npx 不可用）');
    }
    const destDir = path.join(target, 'node');
    fs.rmSync(destDir, { recursive: true, force: true });
    fs.mkdirSync(destDir, { recursive: true });
    for (const e of fs.readdirSync(srcDir, { withFileTypes: true })) {
      const s = path.join(srcDir, e.name);
      const d = path.join(destDir, e.name);
      try {
        fs.renameSync(s, d);
      } catch {
        // 临时目录与目标常跨盘（C: → D:），rename 不支持 —— 回退稳健拷贝
        if (e.isDirectory()) copyDirRobust(s, d);
        else fs.copyFileSync(s, d);
      }
    }
    return file.replace(/^node-|-win-x64\.zip$/g, '');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function fetchNode(target, onProgress) {
  if (hasNode(target)) return '已存在';
  onProgress?.({ step: 'node', status: 'resolving' });

  // 候选按序尝试：最新 v22（两个源）→ 固定版本（两个源）
  const candidates = [];
  for (const base of SOURCES.nodeIndex) {
    try {
      const idx = await (await fetch(base)).text();
      const m = idx.match(/node-v(\d+\.\d+\.\d+)-win-x64\.zip/);
      if (m) candidates.push({ base, file: `node-v${m[1]}-win-x64.zip` });
    } catch {
      /* 源不可达，试下一个 */
    }
  }
  for (const base of SOURCES.nodePinned) {
    candidates.push({ base, file: `node-${NODE_FALLBACK_VERSION}-win-x64.zip` });
  }
  if (!candidates.length) throw new Error('无法解析 Node 版本号：所有源均不可达');

  let lastErr = null;
  for (const c of candidates) {
    try {
      onProgress?.({ step: 'node', status: `trying ${c.base}${c.file}` });
      const ver = await installNodeZip(c.base, c.file, target, onProgress);
      return `已下载 node ${ver}`;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Node 安装失败：${lastErr?.message || '未知错误'}`);
}

/**
 * 主入口：确保 targetDir 里有所需的运行时。
 * @returns {Promise<{ffmpeg:string, node:string, missing:object}>} 各项动作结果
 */
async function ensureRuntime({ targetDir, want = { ffmpeg: true, node: true }, onProgress } = {}) {
  const target = targetDir;
  fs.mkdirSync(target, { recursive: true });
  const result = { ffmpeg: '', node: '', missing: {} };

  if (want.ffmpeg) {
    if (hasFfmpeg(target)) result.ffmpeg = '已存在';
    else result.ffmpeg = await fetchFfmpeg(target, onProgress);
  }
  if (want.node) {
    if (hasNode(target)) result.node = '已存在';
    else result.node = await fetchNode(target, onProgress);
  }
  result.missing = whatIsMissing(target, want);
  return result;
}

module.exports = { ensureRuntime, whatIsMissing, hasFfmpeg, hasNode, SOURCES };
