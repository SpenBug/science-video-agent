import asyncio, os, sys
import aiohttp

# edge-tts 走 websocket，必须手动把代理注入到 aiohttp 的 ws_connect / request，
# 否则在挂代理的机器上会直接超时。这是备选管线（主用 Kokoro 离线合成）。
proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or os.environ.get("HTTP_PROXY")

_orig_ws = aiohttp.ClientSession.ws_connect
def _ws_proxy(self, url, *args, **kw):
    kw.setdefault("proxy", proxy)
    return _orig_ws(self, url, *args, **kw)
aiohttp.ClientSession.ws_connect = _ws_proxy

_orig_req = aiohttp.ClientSession._request
async def _req_proxy(self, *a, **kw):
    kw.setdefault("proxy", proxy)
    return await _orig_req(self, *a, **kw)
aiohttp.ClientSession._request = _req_proxy

from edge_tts import Communicate

async def main():
    text = sys.argv[1]
    out = sys.argv[2]
    voice = sys.argv[3] if len(sys.argv) > 3 else "zh-CN-YunxiNeural"
    comm = Communicate(text, voice)
    with open(out, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
    print("OK", out)

# 用法：python ett_edge.py "文本" out.wav zh-CN-YunxiNeural
asyncio.run(main())
