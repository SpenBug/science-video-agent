'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { app } = require('electron');

/**
 * 技能资源根目录。
 * 开发态：<project>/resources/skills
 * 打包后：<resources>/skills
 */
function getSkillsRoot() {
  const candidates = [
    process.resourcesPath ? path.join(process.resourcesPath, 'skills') : null,
    path.join(__dirname, '..', '..', 'resources', 'skills'),
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[candidates.length - 1];
}

/** 用户配置目录 */
function getUserDataDir() {
  return app.getPath('userData');
}

function getConfigPath() {
  return path.join(getUserDataDir(), 'config.json');
}

/** 应用私有 Python 环境目录 */
function getPythonEnvDir() {
  return path.join(getUserDataDir(), 'python-env');
}

/**
 * 便携运行时（ffmpeg / node）查找顺序：
 * 1. <userData>/runtime      —— APP 内向导下载的（装到 Program Files 后可写）
 * 2. 打包后的 <resources>/runtime —— 安装包内置的（构建期 npm run fetch-runtime 产物）
 * 3. 开发态 <project>/resources/runtime
 */
function getRuntimeDirs() {
  const list = [];
  try {
    list.push(path.join(getUserDataDir(), 'runtime'));
  } catch {
    /* app 未就绪时忽略 */
  }
  if (process.resourcesPath) list.push(path.join(process.resourcesPath, 'runtime'));
  list.push(path.join(__dirname, '..', '..', 'resources', 'runtime'));
  return [...new Set(list)];
}

function getWritableRuntimeDir() {
  return path.join(getUserDataDir(), 'runtime');
}

/** 把内置/下载的运行时目录前置到 PATH（子进程全部自动继承） */
function prependRuntimeToPath() {
  const additions = [];
  for (const dir of getRuntimeDirs()) {
    additions.push(path.join(dir, 'node'));
    additions.push(path.join(dir, 'ffmpeg'));
  }
  const present = additions.filter((p) => fs.existsSync(p));
  if (present.length) {
    process.env.PATH = `${present.join(path.delimiter)}${path.delimiter}${process.env.PATH || ''}`;
  }
  return present;
}

/** 默认工作区：文档/数模视频工厂工作区 */
function getDefaultWorkspace() {
  return path.join(app.getPath('documents'), '数模视频工厂工作区');
}

function isDev() {
  return !app.isPackaged;
}

module.exports = {
  getSkillsRoot,
  getUserDataDir,
  getConfigPath,
  getPythonEnvDir,
  getRuntimeDirs,
  getWritableRuntimeDir,
  prependRuntimeToPath,
  getDefaultWorkspace,
  isDev,
};
