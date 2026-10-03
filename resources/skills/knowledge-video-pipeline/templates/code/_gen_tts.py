r"""
第十二期风格 · 配音合成 + 混音 + 时间轴生成

用法：
    python _gen_tts.py            # 合成配音 + 混音 + 回写 timing.json / srt
    python _gen_tts.py --tts      # 只做 TTS（保留已有 mixed_audio.wav）
    python _gen_tts.py --mix      # 只重做混音（保留已有 podcast_audio.wav）

输出（全部落在 public\）：
    podcast_audio.wav   人声轨（单声道 44100 16bit）
    mixed_audio.wav     人声 + BGM（立体声 44100 16bit）← 视频里播这个
输出（落在 videos\episode\）：
    timing.json / podcast_audio.srt / phonemes.json

关键约定：
    - podcast.txt 用 [SECTION:name] 分块，name 必须和 episode_data.ts 的 key 一致
    - 数字写成中文读法（「百分之四点三」而不是「4.3%」），否则 TTS 读破
    - 合成后先看打印的 total_dur，目标 185~195s；超时先压稿 7% 再把 RATE 提到 +28%
"""

import asyncio
import contextlib
import json
import os
import re
import shutil
import subprocess
import sys
import wave

import edge_tts

# ================= 按需改这里 =================
VOICE = "zh-CN-YunxiNeural"   # edge-tts 云希男声
RATE = "+16%"                 # T7 纸感笔记档的推荐语速（讲解感，比系列基准慢）
FPS = 30
GAP = 0.30                    # 段间静默（秒）。T7 用 0.30，留翻页感
BGM_VOL = 0.10                # BGM 相对音量，系列标准
# =============================================

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, "videos", "demo")
PUBLIC_DIR = os.path.join(HERE, "public")
TXT = os.path.join(BASE, "podcast.txt")
TMP = os.path.join(BASE, "_tts_tmp")

# 优先用 Remotion 自带 ffmpeg，避免依赖系统 PATH
_FFMPEG_CANDIDATES = [
    os.path.join(HERE, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe"),
    "ffmpeg",
]
FFMPEG = next((p for p in _FFMPEG_CANDIDATES if os.path.exists(p) or p == "ffmpeg"), "ffmpeg")

MAX_RMS, MAX_PEAK, MAX_ZCR = 0.20, 0.99, 6000   # 音频体检阈值
MAX_RETRY = 6


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def parse_sections(txt):
    raw = open(txt, encoding="utf-8").read()
    blocks = re.split(r"\[SECTION:(\w+)\]", raw)
    out = []
    for i in range(1, len(blocks), 2):
        body = blocks[i + 1].strip()
        if body:
            out.append((blocks[i].strip(), body))
    return out


def clean_text(s):
    return s.replace("\u200b", "").replace("\u200d", "")


def measure(path):
    """返回 (时长, RMS, 峰值, 过零率)。损坏的 TTS 段 RMS 会飙到 0.4+ 且削波。"""
    with wave.open(path, "rb") as w:
        fr = w.getframerate()
        nch = w.getnchannels()
        import array
        a = array.array("h")
        a.frombytes(w.readframes(w.getnframes()))
    if nch == 2:
        a = a[0::2]
    if not a:
        return 0.0, 0.0, 0.0, 0.0
    import math
    rms = math.sqrt(sum((x / 32768.0) ** 2 for x in a) / len(a))
    peak = max(abs(x) for x in a) / 32768.0
    zc = sum(1 for j in range(1, len(a)) if (a[j] >= 0) != (a[j - 1] >= 0))
    return len(a) / fr, rms, peak, zc / fr


def healthy(path):
    d, rms, peak, zcr = measure(path)
    return d > 0.5 and rms < MAX_RMS and peak < MAX_PEAK and zcr < MAX_ZCR


async def tts_one(text, mp3):
    """edge-tts 会间歇性返回空文件或损坏数据，两种都要重试。流式合成，同时抓 WordBoundary 词边界。"""
    last = None
    for attempt in range(MAX_RETRY):
        try:
            # 新版 edge-tts 默认 boundary="SentenceBoundary"，必须显式要 WordBoundary 才有词级时间戳
            comm = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
            buf = b""
            words = []
            async for ch in comm.stream():
                if ch["type"] == "audio":
                    buf += ch["data"]
                elif ch["type"] == "WordBoundary":
                    # offset/duration 单位 100ns，相对本段开头
                    words.append({"t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7, "text": ch["text"]})
            with open(mp3, "wb") as f:
                f.write(buf)
            if os.path.getsize(mp3) > 200 and len(words) > 5:
                return words
            last = Exception("bad tts mp3=%dB words=%d" % (os.path.getsize(mp3), len(words)))
        except Exception as e:
            last = e
        print("  [重试 %d/%d] %s" % (attempt + 1, MAX_RETRY, type(last).__name__))
        await asyncio.sleep(1.5)
    raise last


def build_sentences(body, words, start_abs, dur):
    """显示句 = 按 。！？ 切分；时间 = edge-tts 词边界按字符偏移映射（绝对秒，与音频轨严格对齐）。
    词边界缺失或覆盖不全时退化为按字数权重分配。"""
    flat = re.sub(r"\s+", "", body)
    sents = [s.strip() for s in re.split(r"(?<=[。！？])", flat)]
    sents = [s for s in sents if s]
    out = []
    wranges = []
    wcum = 0
    for w in words or []:
        wt = re.sub(r"\s+", "", w["text"])
        wranges.append((wcum, wcum + len(wt), w["t"], w["d"]))
        wcum += len(wt)
    covered = bool(wranges) and wcum >= 0.9 * len(flat)
    scum = 0
    for s in sents:
        a, b = scum, scum + len(s)
        scum = b
        if covered:
            first = min(k for k, r in enumerate(wranges) if r[1] > a)
            last = max(k for k, r in enumerate(wranges) if r[0] < b)
            start = start_abs + wranges[first][2]
            end = min(start_abs + wranges[last][2] + wranges[last][3], start_abs + dur)
            out.append({"text": s, "start": round(start, 2), "end": round(end, 2)})
        else:
            total = sum(len(x) for x in sents) or 1
            acc = scum - len(s)
            wfrac = len(s) / total
            out.append({
                "text": s,
                "start": round(start_abs + (acc / total) * dur, 2),
                "end": round(start_abs + ((acc + len(s)) / total) * dur, 2),
            })
    return out


def mp3_to_wav(mp3, wav):
    run([FFMPEG, "-y", "-i", mp3, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", wav])


def make_silence(path, seconds):
    """writeframes 收的是字节数，必须乘 采样位宽 × 声道数。"""
    fr, sw, nch = 44100, 2, 1
    with wave.open(path, "wb") as w:
        w.setnchannels(nch)
        w.setsampwidth(sw)
        w.setframerate(fr)
        w.writeframes(b"\x00" * int(fr * seconds) * sw * nch)


def concat(items, out_wav):
    """items = [(name, wav, body, words, ...)]，只取 [1]=wav。GAP>0 时插静音。用 ffmpeg concat 解复用器，别手拼字节。"""
    if GAP <= 0:
        with contextlib.closing(wave.open(items[0][1], "r")) as w0:
            params = (w0.getnchannels(), w0.getsampwidth(), w0.getframerate(),
                      0, w0.getcomptype(), w0.getcompname())
        with contextlib.closing(wave.open(out_wav, "w")) as out:
            out.setnchannels(params[0])
            out.setsampwidth(params[1])
            out.setframerate(params[2])
            out.setcomptype(params[4], params[5])
            for it in items:
                wav = it[1]
                with contextlib.closing(wave.open(wav, "r")) as w:
                    out.writeframes(w.readframes(w.getnframes()))
        return
    lst = os.path.join(TMP, "concat_list.txt")
    sil = os.path.join(TMP, "_silence.wav")
    make_silence(sil, GAP)
    with open(lst, "w", encoding="utf-8") as f:
        for i, it in enumerate(items):
            wav = it[1]
            if i > 0:
                f.write("file '%s'\n" % sil.replace("\\", "/"))
            f.write("file '%s'\n" % wav.replace("\\", "/"))
    run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", lst,
         "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", out_wav])


def fmt_srt(x):
    h = int(x // 3600)
    m = int((x % 3600) // 60)
    s = int(x % 60)
    ms = int((x * 1000) % 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def step_tts():
    sections = parse_sections(TXT)
    if os.path.isdir(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)

    print("① 逐段 TTS 合成 + 体检")
    segs = []

    async def gen_all():
        for idx, (name, body) in enumerate(sections):
            mp3 = os.path.join(TMP, f"{idx:02d}_{name}.mp3")
            words = await tts_one(clean_text(body), mp3)
            wav = mp3[:-4] + ".wav"
            mp3_to_wav(mp3, wav)
            d, rms, peak, zcr = measure(wav)
            if not healthy(wav):
                raise RuntimeError("段落 %s 音频体检不通过 rms=%.3f peak=%.2f zcr=%.0f" % (name, rms, peak, zcr))
            print("   [%s] %.2fs rms=%.3f words=%d" % (name, d, rms, len(words)))
            segs.append((name, wav, body, words))

    asyncio.run(gen_all())

    print("② 拼接人声轨")
    out_wav = os.path.join(PUBLIC_DIR, "podcast_audio.wav")
    concat(segs, out_wav)

    print("③ 回写 timing.json / srt / phonemes.json")
    t = 0.0
    timing_sections = []
    srt_entries = []
    for i, (name, wav, body, words) in enumerate(segs):
        with contextlib.closing(wave.open(wav, "r")) as w:
            d = w.getnframes() / w.getframerate()
        if i > 0:
            t += GAP
        sf = round(t * FPS)
        dfr = max(1, round(d * FPS))
        timing_sections.append({
            "name": name, "start_sec": round(t, 2), "duration_sec": round(d, 2),
            "start_frame": sf, "duration_frames": dfr, "is_silent": False,
            "sentences": build_sentences(body, words, t, d),
        })
        srt_entries.append("%d\n%s --> %s\n%s\n" % (i + 1, fmt_srt(t), fmt_srt(t + d), body))
        t += d

    total_dur = round(t, 2)
    timing = {
        "total_duration": total_dur, "total_frames": round(total_dur * FPS),
        "fps": FPS, "voice": VOICE, "rate": RATE, "sections": timing_sections,
    }
    with open(os.path.join(BASE, "timing.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(timing, f, ensure_ascii=False, indent=2)
    with open(os.path.join(BASE, "podcast_audio.srt"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(srt_entries))
    with open(os.path.join(BASE, "phonemes.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump({"voice": VOICE, "sections": [{"name": n, "text": b, "words": w} for (n, _, b, w) in segs]},
                  f, ensure_ascii=False, indent=2)

    # 总长校验：防止时间轴错位
    with contextlib.closing(wave.open(out_wav, "r")) as w:
        actual = w.getnframes() / w.getframerate()
    expected = sum(s["duration_sec"] for s in timing_sections) + GAP * max(0, len(segs) - 1)
    if abs(actual - expected) > 0.15:
        raise RuntimeError("拼接总长与预期不符（差 %.2fs），时间轴会错位" % (actual - expected))

    print("DONE tts total_dur=%.2fs frames=%d sections=%d" % (total_dur, timing["total_frames"], len(segs)))
    print("   ⚠️ 目标 185~195s；超出就压稿 7% 或把 RATE 提到 +28%")
    return total_dur


def step_mix():
    """人声 + BGM -> mixed_audio.wav。视频里播的是这个文件。"""
    voice = os.path.join(PUBLIC_DIR, "podcast_audio.wav")
    bgm = os.path.join(PUBLIC_DIR, "bgm.mp3")
    out = os.path.join(PUBLIC_DIR, "mixed_audio.wav")
    if not os.path.exists(voice):
        raise SystemExit("缺 podcast_audio.wav，先跑 python _gen_tts.py --tts")
    if not os.path.exists(bgm):
        raise SystemExit("缺 public\\bgm.mp3，从任一已交付期复制（约 2,783,814 B）")

    print("④ 混音（BGM volume=%.2f，总长跟随人声）" % BGM_VOL)
    fc = ("[1:a]volume=%.2f[bg];"
          "[0:a][bg]amix=inputs=2:duration=first:dropout_transition=0[a]" % BGM_VOL)
    run([FFMPEG, "-y", "-i", voice, "-stream_loop", "-1", "-i", bgm,
         "-filter_complex", fc, "-map", "[a]", "-ac", "2", "-ar", "44100", out])
    with contextlib.closing(wave.open(out, "r")) as w:
        d = w.getnframes() / w.getframerate()
        print("DONE mix %.2fs channels=%d rate=%d" % (d, w.getnchannels(), w.getframerate()))
    return d


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode == "--tts":
        step_tts()
    elif mode == "--mix":
        step_mix()
    else:
        step_tts()
        step_mix()
