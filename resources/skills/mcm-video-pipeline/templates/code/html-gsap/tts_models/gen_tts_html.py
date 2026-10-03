#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
分段合成 TTS —— HTML 单文件档（T11）专用

为什么不用 kokoro.create() 一把梭：
  Kokoro 的 ONNX tokenizer 不认识中文全角标点（。，、：！），
  misaki 输出的停顿标记会被 tokenize 成空，模型只保留句尾收束声调产生的停顿，
  听感就是「整段连读」。所以必须按标点切句 → 逐句合成 → 段间手动插停顿。

用法：
  python gen_tts_html.py <项目根> [音色] [语速]
  python gen_tts_html.py "D:/自媒体/自媒体/第七期_xxx/项目源码" zm_yunjian 1.08

产物：
  <项目根>/audio/s1.wav … sN.wav   （N = scripts/ 下 txt 文件的个数）
  每行打印实测时长，末尾打印 ALL_DONE + 总时长

依赖（首次装）：
  pip install kokoro-onnx misaki[zh] onnxruntime soundfile numpy
  模型文件放 <项目根>/tts_models/：
    model.onnx（约 310MB）、voices_zf.npz、kokoro_config.json
"""
import os
import re
import sys

import numpy as np
import soundfile as sf
import onnxruntime as ort
from misaki.zh import ZHG2P
from kokoro_onnx import Kokoro

# ── 参数 ──
BASE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
VOICE = sys.argv[2] if len(sys.argv) > 2 else "zm_yunjian"   # 云健：沉稳播音男声，基频≈99Hz
SPEED = float(sys.argv[3]) if len(sys.argv) > 3 else 1.08

MODEL = os.path.join(BASE, "tts_models", "model.onnx")
NPZ = os.path.join(BASE, "tts_models", "voices_zf.npz")
SCRIPTS = os.path.join(BASE, "scripts")
AUDIO = os.path.join(BASE, "audio")
SR = 24000

# 段间受控停顿（秒）。改这张表就是改断句呼吸感，别在文本里写空格代替。
PAUSE = {"。": 0.45, "！": 0.45, "？": 0.45, "；": 0.45, "：": 0.30, "，": 0.18, "、": 0.15}

# ── 引擎 ──
k = Kokoro(MODEL, NPZ)
sess = ort.InferenceSession(MODEL, providers=["CPUExecutionProvider"])
voices = np.load(NPZ)
g2p = ZHG2P()


def synth_ph(ph, speed=SPEED):
    """音素串 → 波形。style 向量按 token 数查表，这是 Kokoro 的硬要求。"""
    tokens = [0, *k.tokenizer.tokenize(ph), 0]
    style = voices[VOICE][len(tokens)]
    a = sess.run(None, {
        "input_ids": np.array([tokens], dtype=np.int64),
        "style": np.array(style, dtype=np.float32),
        "speed": np.array([speed], dtype=np.float32),
    })[0]
    return a.reshape(-1)


def trim(a, thr=0.006, pad=0.03):
    """裁剪首尾静音，只保留语音主体。不裁的话段间停顿会叠加成空拍。"""
    frame, hop = 512, 256
    rms = np.array([np.sqrt(np.mean(a[i:i + frame] ** 2))
                    for i in range(0, len(a) - frame, hop)])
    idx = np.where(rms >= thr)[0]
    if len(idx) == 0:
        return np.zeros(int(0.1 * SR))
    s = max(0, (idx[0] - int(pad * SR / hop)) * hop)
    e = min(len(a), (idx[-1] + int(pad * SR / hop)) * hop)
    return a[s:e]


def split_seg(text):
    """按中文标点切分为短句（保留标点，停顿靠标点查表）。"""
    segs = re.split(r"(?<=[。！？；：])|(?<=[，、])", text)
    return [s for s in segs if s.strip()]


def synth_text(text):
    """分段合成：每段单独生成、裁掉尾音、段间插入受控停顿。"""
    parts = []
    for seg in split_seg(text):
        ph = "".join(g2p(seg))
        parts.append(trim(synth_ph(ph)))
        parts.append(np.zeros(int(SR * PAUSE.get(seg[-1], 0.22))))
    return np.concatenate(parts)


# ── 主流程 ──
os.makedirs(AUDIO, exist_ok=True)
files = sorted((f for f in os.listdir(SCRIPTS) if re.fullmatch(r"s\d+\.txt", f)),
               key=lambda f: int(f[1:-4]))

total = 0.0
for f in files:
    i = int(f[1:-4])
    with open(os.path.join(SCRIPTS, f), encoding="utf-8") as fh:
        text = fh.read().strip()
    audio = synth_text(text)
    out = os.path.join(AUDIO, f"s{i}.wav")
    sf.write(out, audio, SR)
    dur = len(audio) / SR
    total += dur
    print(f"s{i}: {dur:.3f}s  {out}")

print(f"total_dur={total:.3f}s  voice={VOICE}  speed={SPEED}")
print("ALL_DONE")
