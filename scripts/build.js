'use strict';

/**
 * 打包入口：默认补上国内可达的 electron-builder 二进制镜像
 * （winCodeSign / nsis 等托管在 GitHub，国内直连常超时），
 * 用户显式设置的镜像环境变量优先。之后调 electron-builder。
 *
 * 用法：node scripts/build.js [--dir]   （--dir 只输出解包目录，不打安装包）
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

if (!process.env.ELECTRON_BUILDER_BINARIES_MIRROR) {
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR =
    'https://registry.npmmirror.com/-/binary/electron-builder-binaries/';
}
// electron 主包的 zip / SHASUMS256.txt 默认走 GitHub —— zip 常有 npm 缓存，
// SHASUMS 没有缓存就会卡 600s 超时，这里指向国内可达的镜像。
if (!process.env.ELECTRON_MIRROR) {
  process.env.ELECTRON_MIRROR = 'https://registry.npmmirror.com/-/binary/electron/';
}

const extra = process.argv.includes('--dir') ? ['--dir'] : [];
const cli = path.join(__dirname, '..', 'node_modules', 'electron-builder', 'cli.js');

console.log(`[build] ELECTRON_BUILDER_BINARIES_MIRROR=${process.env.ELECTRON_BUILDER_BINARIES_MIRROR}`);
const proc = spawn(process.execPath, [cli, '--win', ...extra], {
  stdio: 'inherit',
  env: process.env,
});
proc.on('exit', (code) => process.exit(code ?? 1));
proc.on('error', (err) => {
  console.error('[build] 启动 electron-builder 失败：', err.message);
  process.exit(1);
});
