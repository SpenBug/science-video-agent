'use strict';

/**
 * 生成应用图标：用 Electron 渲染矢量图标再截图，避免依赖 Pillow / ImageMagick。
 * 产物为 256×256 PNG（带透明圆角），electron-builder 会自动转成多尺寸 .ico。
 */

const path = require('node:path');
const fs = require('node:fs');
const { BrowserWindow } = require('electron');

/**
 * 配色取自 mcm-video-pipeline 的风格 token：
 * --bg #0D1B2A（深空底）· --bg-card #1B2A3E · --accent #F77F00（主强调）
 */
const ICON_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  html, body { margin:0; padding:0; background:transparent; overflow:hidden; }
  .icon {
    width:256px; height:256px; border-radius:58px;
    background:linear-gradient(150deg, #1B2A3E 0%, #132340 52%, #0D1B2A 100%);
    display:flex; align-items:center; justify-content:center;
    box-shadow: inset 0 1.5px 0 rgba(255,255,255,.16);
    position:relative;
  }
  /* 橙色播放键：这条线就是出视频的 */
  .sym {
    font-family:"Segoe UI Symbol","Segoe UI",Arial,sans-serif;
    font-size:132px; font-weight:600; color:#F77F00; line-height:1;
    transform:translate(-4px,-4px);
    text-shadow:0 3px 10px rgba(0,0,0,.38);
  }
  /* 底部橙色进度条，呼应 T9 的时间线版式 */
  .icon::after {
    content:""; position:absolute; left:52px; right:52px; bottom:44px;
    height:12px; border-radius:6px;
    background:#F77F00; opacity:.9;
  }
  .icon::before {
    content:""; position:absolute; left:52px; right:118px; bottom:44px;
    height:12px; border-radius:6px 0 0 6px;
    background:#E0E1DD; opacity:.85; z-index:1;
  }
</style></head>
<body><div class="icon"><span class="sym">&#9654;</span></div></body></html>`;

async function generateIcon(outPath) {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: true,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    x: 40,
    y: 40,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(ICON_HTML)}`);
    await new Promise((r) => setTimeout(r, 1400));
    const raw = await win.webContents.capturePage();
    const s = raw.getSize();
    const side = Math.min(s.width, s.height);
    const img = s.width === s.height ? raw : raw.crop({ x: 0, y: 0, width: side, height: side });
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, img.toPNG());
    return { path: outPath, size: img.getSize(), raw: `${s.width}x${s.height}` };
  } finally {
    win.destroy();
  }
}

module.exports = { generateIcon };
