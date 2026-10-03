'use strict';

/**
 * 构建期运行时准备：下载便携版 ffmpeg + Node 22 到 resources/runtime/，
 * electron-builder 经 extraResources 打进安装包。已存在则跳过（--force 重下）。
 *
 * 用法：npm run fetch-runtime [-- --force] [-- --only ffmpeg|node]
 */

const path = require('node:path');
const { ensureRuntime } = require('../src/main/runtime/fetchRuntime');

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyIdx = args.indexOf('--only');
const want = {
  ffmpeg: onlyIdx === -1 ? true : args[onlyIdx + 1] === 'ffmpeg',
  node: onlyIdx === -1 ? true : args[onlyIdx + 1] === 'node',
};

const target = path.join(__dirname, '..', 'resources', 'runtime');

console.log(`[fetch-runtime] 目标目录：${target}`);
if (force) {
  const fs = require('node:fs');
  fs.rmSync(target, { recursive: true, force: true });
  console.log('[fetch-runtime] --force：已清空旧运行时');
}

ensureRuntime({
  targetDir: target,
  want,
  onProgress: (p) => {
    if (p.status === 'progress') {
      process.stdout.write(`\r[fetch-runtime] ${p.step} ${p.pct}%  `);
      if (p.pct >= 100) process.stdout.write('\n');
    } else {
      console.log(`[fetch-runtime] ${p.step}: ${p.status}`);
    }
  },
})
  .then((r) => {
    console.log(`[fetch-runtime] ffmpeg: ${r.ffmpeg || '(跳过)'} · node: ${r.node || '(跳过)'}`);
    if (r.missing.ffmpeg || r.missing.node) {
      console.error('[fetch-runtime] 仍有缺失！', r.missing);
      process.exit(1);
    }
    console.log('[fetch-runtime] 完成 ✓');
  })
  .catch((err) => {
    console.error('[fetch-runtime] 失败：', err.message);
    process.exit(1);
  });
