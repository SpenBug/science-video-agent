/* global window, document */
'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const api = window.mcm;

  const state = {
    config: null,
    providers: [],
    skillsRoot: '',
    workspace: '',
    messages: [],      // OpenAI 格式历史
    sessionId: null,
    sessionTitle: '',
    streaming: false,
    currentAssistantEl: null,
    currentAssistant: null,
    toolNodes: new Map(),
    reasoningBuffer: '',
    lastPreview: '',
  };

  /* ================= 工具函数 ================= */

  const esc = (s) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function fmtSize(n) {
    if (!n) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
  }

  function timeStr(ts) {
    const d = new Date(ts || Date.now());
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  /* ---------- 轻量 Markdown 渲染 ---------- */

  function inline(text) {
    let s = esc(text);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    return s;
  }

  function mdToHtml(src) {
    const lines = String(src || '').split(/\r?\n/);
    const out = [];
    let i = 0;

    const flushList = (ordered) => {
      const items = [];
      const re = ordered ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*+]\s+(.*)$/;
      while (i < lines.length && re.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(re, '$1'))}</li>`);
        i += 1;
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
    };

    while (i < lines.length) {
      const line = lines[i];

      // 代码块
      if (/^\s*```/.test(line)) {
        const lang = line.replace(/^\s*```/, '').trim();
        i += 1;
        const buf = [];
        while (i < lines.length && !/^\s*```/.test(lines[i])) {
          buf.push(lines[i]);
          i += 1;
        }
        i += 1;
        out.push(`<pre data-lang="${esc(lang)}"><code>${esc(buf.join('\n'))}</code></pre>`);
        continue;
      }

      // 表格
      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const head = cells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          rows.push(cells(lines[i]));
          i += 1;
        }
        out.push(
          `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`
        );
        continue;
      }

      // 标题
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const lv = Math.min(h[1].length + 1, 4);
        out.push(`<h${lv}>${inline(h[2])}</h${lv}>`);
        i += 1;
        continue;
      }

      // 引用
      if (/^\s*>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*>\s?/, ''));
          i += 1;
        }
        out.push(`<blockquote>${buf.map(inline).join('<br>')}</blockquote>`);
        continue;
      }

      // 分隔线
      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
        out.push('<hr>');
        i += 1;
        continue;
      }

      // 列表
      if (/^\s*[-*+]\s+/.test(line)) { flushList(false); continue; }
      if (/^\s*\d+\.\s+/.test(line)) { flushList(true); continue; }

      // 空行
      if (!line.trim()) { i += 1; continue; }

      // 段落
      const buf = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^\s*(```|#{1,6}\s|>|\||[-*+]\s|\d+\.\s)/.test(lines[i])
      ) {
        buf.push(lines[i]);
        i += 1;
      }
      if (buf.length) out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
      else i += 1;
    }

    return out.join('');
  }

  /* ================= 消息渲染 ================= */

  function scrollBottom(force) {
    const el = $('messages');
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (force || near) el.scrollTop = el.scrollHeight;
  }

  function makeMsgEl(role) {
    const wrap = document.createElement('div');
    wrap.className = `msg ${role}`;
    const av = document.createElement('div');
    av.className = 'avatar';
    av.textContent = role === 'user' ? '你' : '▶';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    wrap.append(av, bubble);
    return { wrap, bubble };
  }

  /** 识别确认门卡片：【S<N> · 步骤名】 */
  function parseGateCard(text) {
    const m = /【S(\d+)\s*·\s*([^】\n]{1,24})】/.exec(String(text || ''));
    if (!m) return null;
    return { step: m[1], name: m[2].trim() };
  }

  /** 确认门快捷操作条：一键回「1」（按建议执行），调整意见走输入框 */
  function buildGateBar(gate) {
    const bar = document.createElement('div');
    bar.className = 'gate-bar';
    bar.innerHTML = `
      <span class="gate-tag">S${esc(gate.step)} · ${esc(gate.name)}</span>
      <span class="gate-hint">确认门 —— 回「1」按建议执行；要调整直接在输入框说</span>
      <button class="btn sm primary" type="button">按建议执行</button>`;
    bar.querySelector('button').addEventListener('click', () => {
      if (!state.streaming) send('1');
    });
    return bar;
  }

  function renderMessages() {
    const host = $('messages');
    host.innerHTML = '';
    state.toolNodes.clear();
    state.currentAssistantEl = null;

    const visible = state.messages.filter((m) => m.role !== 'system');
    if (!visible.length) {
      host.appendChild(buildEmptyState());
      return;
    }

    let lastAssistant = null;
    for (const m of visible) {
      if (m.role === 'user') {
        const { wrap, bubble } = makeMsgEl('user');
        bubble.innerHTML = mdToHtml(m.content);
        host.appendChild(wrap);
        lastAssistant = null;
      } else if (m.role === 'assistant') {
        const { wrap, bubble } = makeMsgEl('assistant');
        bubble.innerHTML = mdToHtml(m.content || '');
        if (m.reasoning) {
          const r = document.createElement('div');
          r.className = 'reasoning';
          r.textContent = m.reasoning;
          bubble.prepend(r);
        }
        host.appendChild(wrap);
        lastAssistant = { bubble, wrap };
        if (Array.isArray(m.tool_calls)) {
          for (const tc of m.tool_calls) {
            const node = buildToolCard(tc.id, tc.function?.name || 'tool', safeParse(tc.function?.arguments));
            node.classList.add('pending');
            wrap.appendChild(node);
            state.toolNodes.set(tc.id, node);
          }
        }
      } else if (m.role === 'tool' && lastAssistant) {
        const node = state.toolNodes.get(m.tool_call_id);
        if (node) {
          node.classList.remove('pending');
          node.classList.add('ok');
          node.querySelector('.tool-body').innerHTML = `<pre>${esc(m.content)}</pre>`;
        }
      }
    }

    // 确认门：当轮最后一条消息就是【S<N>】确认卡时，给出快捷操作
    const lastVisible = visible[visible.length - 1];
    if (lastVisible && lastVisible.role === 'assistant' && lastAssistant) {
      const gate = parseGateCard(lastVisible.content);
      if (gate) lastAssistant.wrap.appendChild(buildGateBar(gate));
    }
    scrollBottom(true);
  }

  function safeParse(s) {
    try {
      return typeof s === 'string' ? JSON.parse(s) : s || {};
    } catch {
      return { _raw: s };
    }
  }

  function buildToolCard(id, name, args) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.dataset.toolId = id;
    const argStr = JSON.stringify(args, null, 2);
    card.innerHTML = `
      <div class="tool-head">
        <span class="dot"></span>
        <span class="nm">${esc(name)}</span>
        <span class="meta">执行中…</span>
      </div>
      <div class="tool-body">
        <div class="tool-args"><span class="k">参数</span><pre>${esc(argStr)}</pre></div>
        <div class="tool-out"><pre>等待结果…</pre></div>
      </div>`;
    card.querySelector('.tool-head').addEventListener('click', () => card.classList.toggle('open'));
    return card;
  }

  function buildEmptyState() {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
      <div class="empty-logo">▶</div>
      <h2>数模视频工厂</h2>
      <p>13 步流程 · 11 套模板 · 强制确认门 · 可自填 API 与模型</p>
      <div class="quick-cards" id="quickCards"></div>`;
    const cards = [
      { t: '出一期视频', d: '从选题到成品 mp4，走完整 13 步（含蓝图确认与后处理两关）' },
      { t: 'N 条清单快出', d: '并列清单内容用大字清单档，110–120 秒短平快' },
      { t: '只跑配音+时间轴', d: '稿子已有，跑 TTS、混音并回写 timing.json' },
      { t: '检查成品规格', d: '用 ffmpeg 探测 mp4，看是不是 yuv420p(tv, bt709)' },
    ];
    setTimeout(() => {
      const host = div.querySelector('#quickCards');
      cards.forEach((c) => {
        const el = document.createElement('div');
        el.className = 'quick-card';
        el.innerHTML = `<div class="t">${esc(c.t)}</div><div class="d">${esc(c.d)}</div>`;
        el.addEventListener('click', () => {
          $('input').value = c.d;
          $('input').focus();
        });
        host.appendChild(el);
      });
    }, 0);
    return div;
  }

  /* ================= 对话流程 ================= */

  function setStreaming(on) {
    state.streaming = on;
    $('btnSend').classList.toggle('hidden', on);
    $('btnStop').classList.toggle('hidden', !on);
    $('input').disabled = on;
  }

  async function send(text) {
    const content = String(text || '').trim();
    if (!content || state.streaming) return;

    if (!state.config?.hasApiKey) {
      openSettings();
      return;
    }

    $('input').value = '';
    const empty = $('messages').querySelector('.empty-state');
    if (empty) empty.remove();

    state.messages.push({ role: 'user', content });
    const { wrap, bubble } = makeMsgEl('user');
    bubble.innerHTML = mdToHtml(content);
    $('messages').appendChild(wrap);

    // assistant 占位
    const a = makeMsgEl('assistant');
    a.bubble.innerHTML = '<p class="typing">思考中…</p>';
    $('messages').appendChild(a.wrap);
    state.currentAssistantEl = a;
    state.currentAssistant = { role: 'assistant', content: '', reasoning: '', tool_calls: [] };
    state.reasoningBuffer = '';
    state.toolNodes.clear();
    scrollBottom(true);

    setStreaming(true);
    $('statusHint').textContent = '正在处理…';

    try {
      const res = await api.chat.send({
        // 传完整历史（含 assistant / tool 消息），让模型能看到工具调用链。
        // 注意：这里曾经写成 slice(0, -0) —— 因为 -0 === 0，它等价于 slice(0, 0)，
        // 会返回空数组，导致用户消息根本传不到主进程。
        messages: state.messages.slice(),
        sessionId: state.sessionId,
        title: state.sessionTitle,
      });
      if (res && res.ok && Array.isArray(res.messages)) {
        state.messages = res.messages;
        renderMessages();
      } else if (res && res.error) {
        a.bubble.innerHTML = `<p style="color:var(--danger)">${esc(res.error)}</p>`;
      }
    } catch (err) {
      a.bubble.innerHTML = `<p style="color:var(--danger)">发送失败：${esc(err.message)}</p>`;
    } finally {
      setStreaming(false);
      state.currentAssistantEl = null;
      state.currentAssistant = null;
      $('statusHint').textContent = '';
      loadSessions();
      refreshFiles();
    }
  }

  function onChatEvent(ev) {
    const a = state.currentAssistantEl;
    switch (ev.type) {
      case 'turn_start':
        $('statusHint').textContent = `第 ${ev.iteration} 轮`;
        break;

      case 'reasoning':
        state.reasoningBuffer += ev.text;
        if (a) {
          let r = a.bubble.querySelector('.reasoning');
          if (!r) {
            r = document.createElement('div');
            r.className = 'reasoning';
            a.bubble.prepend(r);
          }
          r.textContent = state.reasoningBuffer;
        }
        break;

      case 'delta':
        if (!a) break;
        if (!state.currentAssistant) state.currentAssistant = { role: 'assistant', content: '', tool_calls: [] };
        state.currentAssistant.content += ev.text;
        a.bubble.innerHTML = mdToHtml(state.currentAssistant.content);
        scrollBottom();
        break;

      case 'tool_start': {
        if (!a) break;
        const node = buildToolCard(ev.id, ev.name, ev.args);
        node.classList.add('open', 'running');
        a.wrap.appendChild(node);
        state.toolNodes.set(ev.id, node);
        if (state.currentAssistant) {
          state.currentAssistant.tool_calls.push({
            id: ev.id,
            type: 'function',
            function: { name: ev.name, arguments: JSON.stringify(ev.args) },
          });
        }
        $('statusHint').textContent = `执行 ${ev.name}…`;
        scrollBottom();
        break;
      }

      case 'tool_stream': {
        const node = state.toolNodes.get(ev.id);
        if (!node) break;
        const out = node.querySelector('.tool-out pre');
        if (out) {
          if (out.textContent === '等待结果…') out.textContent = '';
          out.textContent += ev.text;
          out.scrollTop = out.scrollHeight;
        }
        break;
      }

      case 'tool_result': {
        const node = state.toolNodes.get(ev.id);
        if (!node) break;
        node.classList.remove('running', 'pending');
        node.classList.add(ev.ok ? 'ok' : 'fail');
        const meta = node.querySelector('.meta');
        if (meta) meta.textContent = ev.ok ? `${ev.elapsed || 0} ms` : '失败';
        node.querySelector('.tool-out').innerHTML = `<pre>${esc(ev.output)}</pre>`;
        if (state.currentAssistant) {
          state.messages.push(state.currentAssistant);
          state.currentAssistant = null;
        }
        state.messages.push({ role: 'tool', tool_call_id: ev.id, content: ev.output });
        break;
      }

      case 'turn_end':
        if (state.currentAssistant) {
          state.messages.push(state.currentAssistant);
          state.currentAssistant = null;
        }
        state.reasoningBuffer = '';
        break;

      case 'error':
        $('statusHint').textContent = ev.message;
        break;

      default:
        break;
    }
  }

  /* ================= 会话 ================= */

  async function loadSessions() {
    const list = await api.session.list();
    const host = $('sessionList');
    host.innerHTML = '';
    if (!list.length) {
      host.innerHTML = '<li style="padding:8px 9px;font-size:12px;color:var(--text-faint)">暂无历史会话</li>';
      return;
    }
    for (const s of list) {
      const li = document.createElement('li');
      li.className = `session-item${s.id === state.sessionId ? ' active' : ''}`;
      li.innerHTML = `<span class="name" title="${esc(s.title)}">${esc(s.title)}</span><span class="del" title="删除">✕</span>`;
      li.addEventListener('click', async (e) => {
        if (e.target.classList.contains('del')) {
          e.stopPropagation();
          await api.session.remove(s.id);
          if (state.sessionId === s.id) newSession();
          loadSessions();
          return;
        }
        const data = await api.session.load(s.id);
        if (data) {
          state.sessionId = data.id;
          state.sessionTitle = data.title;
          state.messages = data.messages || [];
          renderMessages();
          loadSessions();
        }
      });
      host.appendChild(li);
    }
  }

  function newSession() {
    state.sessionId = `session-${Date.now()}`;
    state.sessionTitle = '新会话';
    state.messages = [];
    renderMessages();
    $('statusHint').textContent = '';
    loadSessions();
  }

  /* ================= 文件树 ================= */

  async function refreshFiles() {
    const items = await api.workspace.list('');
    const host = $('fileTree');
    host.innerHTML = '';
    if (!items.length) {
      host.innerHTML = '<li style="padding:8px 9px;font-size:12px;color:var(--text-faint)">工作区为空</li>';
      return;
    }
    for (const it of items) {
      host.appendChild(makeTreeRow(it, 0));
    }
  }

  function iconFor(name, isDir) {
    if (isDir) return '▸';
    const ext = (name.split('.').pop() || '').toLowerCase();
    const map = {
      py: '🐍', m: 'Ⓜ', md: '📝', json: '⚙', csv: '▦', xlsx: '▦', docx: '📄',
      pdf: '📕', png: '🖼', jpg: '🖼', svg: '🖼', drawio: '◇', tex: '𝑇', txt: '📃',
    };
    return map[ext] || '·';
  }

  function makeTreeRow(item, depth) {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = `tree-row${item.isDir ? ' dir' : ''}`;
    row.style.paddingLeft = `${9 + depth * 12}px`;
    row.innerHTML = `<span class="ic">${iconFor(item.name, item.isDir)}</span><span class="nm" title="${esc(item.rel)}">${esc(item.name)}</span>`;
    li.appendChild(row);

    if (item.isDir) {
      let expanded = false;
      const sub = document.createElement('ul');
      sub.style.listStyle = 'none';
      sub.style.margin = '0';
      sub.style.padding = '0';
      li.appendChild(sub);
      row.addEventListener('click', async () => {
        expanded = !expanded;
        row.querySelector('.ic').textContent = expanded ? '▾' : '▸';
        sub.innerHTML = '';
        if (expanded) {
          const children = await api.workspace.list(item.rel);
          for (const c of children) sub.appendChild(makeTreeRow(c, depth + 1));
        }
      });
    } else {
      row.addEventListener('click', () => openPreview(item));
    }
    return li;
  }

  /* ================= 预览 ================= */

  const IMG_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
  const VIDEO_EXT = ['mp4', 'webm'];
  const TEXT_EXT = ['md', 'txt', 'json', 'py', 'm', 'tex', 'csv', 'js', 'ts', 'html', 'css', 'drawio', 'xml', 'yml', 'yaml', 'log'];

  async function openPreview(item) {
    const ext = (item.name.split('.').pop() || '').toLowerCase();
    const body = $('previewBody');
    $('previewTitle').textContent = item.rel;
    state.lastPreview = item.rel;
    document.querySelector('.app').classList.add('with-preview');
    $('previewPane').classList.remove('hidden');
    body.innerHTML = '<p style="color:var(--text-faint);font-size:12.5px">加载中…</p>';

    if (IMG_EXT.includes(ext)) {
      const url = await readAsDataUrl(item.rel);
      body.innerHTML = `<img src="${url}" alt="${esc(item.name)}">`;
    } else if (VIDEO_EXT.includes(ext)) {
      const url = await readAsDataUrl(item.rel);
      body.innerHTML = url
        ? `<video src="${url}" controls style="max-width:100%;background:#000"></video>`
        : '<p style="color:var(--text-faint);font-size:12.5px">视频读取失败。</p>';
    } else if (TEXT_EXT.includes(ext)) {
      const text = await readText(item.rel);
      if (ext === 'md') body.innerHTML = `<div class="md">${mdToHtml(text)}</div>`;
      else body.innerHTML = `<pre>${esc(text)}</pre>`;
    } else if (ext === 'pdf') {
      const url = await readAsDataUrl(item.rel);
      body.innerHTML = `<iframe src="${url}"></iframe>`;
    } else {
      body.innerHTML = `<p style="color:var(--text-faint);font-size:12.5px">该类型不支持内嵌预览，请用系统程序打开。</p>`;
    }
  }

  async function readText(rel) {
    const r = await api.workspace.read?.(rel);
    return r ?? '（无法读取）';
  }

  async function readAsDataUrl(rel) {
    const r = await api.workspace.dataUrl?.(rel);
    return r || '';
  }

  /* ================= 设置抽屉 ================= */

  function openDrawer(title, html, after) {
    $('drawerTitle').textContent = title;
    $('drawerBody').innerHTML = html;
    $('drawer').classList.remove('hidden');
    $('mask').classList.remove('hidden');
    if (after) after();
  }

  function closeDrawer() {
    $('drawer').classList.add('hidden');
    $('mask').classList.add('hidden');
    // 向导进行中从设置里保存/修改了配置，回来刷新体检
    if (onboard.active) refreshOnboard();
  }

  function openSettings() {
    const c = state.config || {};
    const opts = state.providers
      .map((p) => `<option value="${p.id}"${p.id === c.provider ? ' selected' : ''}>${esc(p.label)}</option>`)
      .join('');

    openDrawer(
      '设置',
      `
      <div class="field">
        <label>服务商</label>
        <div class="desc">选择预设会自动填入 API 地址与候选模型；任何 OpenAI 兼容网关都可用「自定义」。</div>
        <select id="fProvider">${opts}</select>
      </div>

      <div class="field">
        <label>API 地址（Base URL）</label>
        <input type="text" id="fBaseUrl" value="${esc(c.baseUrl || '')}" placeholder="https://api.deepseek.com/v1">
      </div>

      <div class="field">
        <label>API Key</label>
        <div class="desc" id="keyHint">${
          c.hasApiKey ? `已配置（尾号 ${esc(c.apiKeyTail)}），留空表示不修改` : '尚未配置，请填入你的 API Key'
        }</div>
        <input type="password" id="fApiKey" placeholder="${c.hasApiKey ? '留空则保持不变' : 'sk-...'}">
      </div>

      <div class="field">
        <label>模型</label>
        <input type="text" id="fModel" value="${esc(c.model || '')}" placeholder="deepseek-chat">
        <div class="chip-row" id="modelChips"></div>
      </div>

      <div class="field">
        <label>采样温度 <span id="tempVal" style="color:var(--brand)">${c.temperature ?? 0.3}</span></label>
        <input type="range" id="fTemp" min="0" max="1.5" step="0.05" value="${c.temperature ?? 0.3}" style="width:100%">
      </div>

      <div class="field">
        <label>单次最大输出 Token</label>
        <input type="number" id="fMaxTokens" value="${c.maxTokens || 8192}" min="256" step="256">
      </div>

      <div class="field">
        <label>最大工具迭代轮数</label>
        <div class="desc">复杂建模任务建议 80–150。</div>
        <input type="number" id="fMaxIter" value="${c.maxIterations || 80}" min="5" step="5">
      </div>

      <div id="testResult"></div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="btn" id="btnTest">测试连通性</button>
        <button class="btn primary" id="btnSaveCfg">保存</button>
      </div>
      `,
      () => {
        const providerSel = $('fProvider');
        const syncChips = () => {
          const p = state.providers.find((x) => x.id === providerSel.value);
          const host = $('modelChips');
          host.innerHTML = '';
          (p?.models || []).forEach((m) => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.textContent = m;
            chip.addEventListener('click', () => {
              $('fModel').value = m;
            });
            host.appendChild(chip);
          });
        };
        providerSel.addEventListener('change', () => {
          const p = state.providers.find((x) => x.id === providerSel.value);
          if (p && p.baseUrl) $('fBaseUrl').value = p.baseUrl;
          if (p && p.models?.length) $('fModel').value = p.models[0];
          syncChips();
        });
        syncChips();
        $('fTemp').addEventListener('input', (e) => {
          $('tempVal').textContent = e.target.value;
        });

        $('btnTest').addEventListener('click', async () => {
          const box = $('testResult');
          box.innerHTML = '<div class="status-box info">正在测试…</div>';
          const override = {
            baseUrl: $('fBaseUrl').value.trim(),
            model: $('fModel').value.trim(),
          };
          const key = $('fApiKey').value.trim();
          if (key) override.apiKey = key;
          const r = await api.config.test(override);
          box.innerHTML = r.ok
            ? `<div class="status-box ok">连接成功 ✓ 模型：${esc(r.model)}<br>回复：${esc(r.reply || '(空)')}</div>`
            : `<div class="status-box err">连接失败：${esc(r.error || '未知错误')}</div>`;
        });

        $('btnSaveCfg').addEventListener('click', async () => {
          const patch = {
            provider: $('fProvider').value,
            baseUrl: $('fBaseUrl').value.trim(),
            model: $('fModel').value.trim(),
            temperature: Number($('fTemp').value),
            maxTokens: Number($('fMaxTokens').value),
            maxIterations: Number($('fMaxIter').value),
          };
          const key = $('fApiKey').value.trim();
          if (key) patch.apiKey = key;
          state.config = await api.config.save(patch);
          updateHeader();
          $('testResult').innerHTML = '<div class="status-box ok">已保存 ✓</div>';
          setTimeout(closeDrawer, 500);
        });
      }
    );
  }

  function openEnv() {
    openDrawer('运行环境', '<p style="color:var(--text-faint);font-size:12.5px">正在检测…</p>', null);

    Promise.all([api.python.status(), api.toolchain.status()]).then(([st, dw]) => {
      const deps = st.deps;
      const missing = (deps?.missing || []).map((m) => `${m.label}（${m.pip}）`).join('、') || '无';
      const okList = (deps?.installed || []).map((m) => m.label).join('、') || '无';
      const interpreters = st.interpreters
        .map((i) => `<option value="${esc(i.exe)}"${i.exe === st.active ? ' selected' : ''}>${esc(i.exe)}${i.version ? ` (${i.version})` : ' [应用环境]'}</option>`)
        .join('');

      openDrawer(
        '运行环境',
        `
        <h3 style="margin:0 0 10px;font-size:13.5px;font-weight:600">Python 运行时</h3>
        <div class="status-box ${deps?.ok ? 'ok' : 'err'}">
          ${deps?.ok ? '依赖齐备 ✓ 配音（edge-tts）/ PDF 解析 / 论文检索均可用' : '缺少依赖，配音与素材解析功能不可用 —— 点下方按钮创建独立环境'}
        </div>

        <div class="field">
          <label>解释器</label>
          <div class="desc">应用会优先使用自己创建的独立环境，避免污染系统 Python。</div>
          <select id="fPy">${interpreters || '<option value="">未检测到 Python</option>'}</select>
        </div>

        <div class="kv"><span class="k">独立环境目录</span><span class="v">${esc(st.venvDir || '')}</span></div>
        <div class="kv"><span class="k">已安装</span><span class="v">${esc(okList)}</span></div>
        <div class="kv"><span class="k">缺失</span><span class="v">${esc(missing)}</span></div>

        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
          <button class="btn primary" id="btnPySetup">创建独立环境并安装依赖</button>
          <button class="btn" id="btnPyUse">使用所选解释器</button>
        </div>
        <div id="pyLog"></div>

        <hr style="border:none;border-top:1px solid var(--line);margin:22px 0 18px">

        <h3 style="margin:0 0 10px;font-size:13.5px;font-weight:600">视频工具链</h3>
        <div class="status-box ${dw.ready ? 'ok' : 'err'}">
          ${dw.ready
            ? '必需项齐备 ✓ 可以跑完整条线（渲染 + 后处理两关）'
            : `缺少必需项：${esc((dw.missingRequired || []).join('、'))} —— 渲染或后处理会失败`}
        </div>
        ${(dw.items || []).map((it) => `
          <div class="kv">
            <span class="k">${esc(it.label)}</span>
            <span class="v">${it.available ? `✓ ${esc(it.version || '可用')}` : (it.required ? '✗ 必需' : '— 可选')}${it.detail ? ` · ${esc(it.detail)}` : ''}</span>
          </div>`).join('')}
        <div class="desc" style="margin-top:12px;line-height:1.65">
          ffmpeg 负责后处理两关与混音；node + npx 负责 Remotion / HyperFrames 渲染；
          Python 负责 TTS 脚本。<b>两条配音路线有一条能跑就行</b>：
          edge-tts 走 T1–T10，Kokoro ONNX 走 T11。
          应用启动时自动探测，不需要手动配路径。
        </div>
        ${(dw.projects || []).length ? `
        <div class="desc" style="margin-top:10px;line-height:1.65">
          工作区已识别到的工程：${dw.projects.map((p) => `${esc(p.name)}（${esc(p.kind)}）`).join('、')}
        </div>` : ''}

        ${(() => {
          const k = (dw.items || []).find((it) => it.id === 'tts-kokoro');
          return k && !k.available ? `
        <div style="margin-top:14px;padding:12px;border:1px dashed var(--line);border-radius:8px">
          <div class="desc" style="margin:0 0 8px">只做 T11（单文件 HTML + GSAP）档才需要 Kokoro 离线配音栈，体积较大（含 onnxruntime）。</div>
          <button class="btn" id="btnKokoro">安装 Kokoro 配音栈（T11 档）</button>
        </div>` : '';
        })()}

        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn" id="btnRecheck">重新检测</button>
        </div>
        `,
        () => {
          const kokoroBtn = $('btnKokoro');
          if (kokoroBtn) {
            kokoroBtn.addEventListener('click', async () => {
              kokoroBtn.disabled = true;
              let logBox = $('pyLogBox');
              if (!logBox) {
                $('pyLog').innerHTML = '<div class="log-box" id="pyLogBox"></div>';
                logBox = $('pyLogBox');
              }
              logBox.textContent += '开始安装 Kokoro 配音栈…（onnxruntime 较大，约需几分钟）\n';
              const off = api.chat.onEvent((ev) => {
                if (ev.type === 'python:output') {
                  const box = $('pyLogBox');
                  if (box) {
                    box.textContent += ev.text;
                    box.scrollTop = box.scrollHeight;
                  }
                }
              });
              const r = await api.python.installGroups(['kokoro']);
              off();
              kokoroBtn.disabled = false;
              const box = $('pyLogBox');
              if (box) box.textContent += r.ok ? '\n\n完成 ✓ Kokoro 已就绪。' : `\n\n失败：${r.error || '安装未成功'}`;
            });
          }

          $('btnPySetup').addEventListener('click', async () => {
            $('pyLog').innerHTML = '<div class="log-box" id="pyLogBox">开始创建环境…（首次安装约需几分钟）</div>';
            $('btnPySetup').disabled = true;
            const off = api.chat.onEvent((ev) => {
              if (ev.type === 'python:output') {
                const box = $('pyLogBox');
                if (box) {
                  box.textContent += ev.text;
                  box.scrollTop = box.scrollHeight;
                }
              }
            });
            const r = await api.python.setup($('fPy').value);
            off();
            $('btnPySetup').disabled = false;
            const box = $('pyLogBox');
            if (box) box.textContent += r.ok ? '\n\n完成 ✓ 依赖已就绪。' : `\n\n失败：${r.error || '安装未成功，请检查网络'}`;
            state.config = (await api.config.get()).config;
          });

          $('btnPyUse').addEventListener('click', async () => {
            await api.python.setPath($('fPy').value);
            state.config = (await api.config.get()).config;
            openEnv();
          });

          $('btnRecheck').addEventListener('click', openEnv);
        }
      );
    });
  }

  /* ================= 首次启动环境向导 ================= */

  const onboard = { active: false, rt: null, tc: null };

  /** 拉取最新状态并判断要不要弹向导 */
  async function maybeOnboard() {
    const [cfgInfo, rt, tc] = await Promise.all([api.config.get(), api.runtime.status(), api.toolchain.status()]);
    state.config = cfgInfo.config;
    onboard.rt = rt;
    onboard.tc = tc;

    const keyOk = state.config.hasApiKey;
    const find = (id) => (tc.items || []).find((i) => i.id === id);
    const pyOk = find('python')?.available && find('tts-edge')?.available;
    const ffOk = find('ffmpeg')?.available || rt.hasFfmpeg;
    const nodeOk = find('node')?.available || rt.hasNode;

    if (keyOk && pyOk && ffOk && nodeOk) return; // 全绿，不打扰
    onboard.active = true;
    renderOnboard();
    $('onboard').classList.remove('hidden');
  }

  function renderOnboard() {
    const rt = onboard.rt || {};
    const tc = onboard.tc || {};
    const find = (id) => (tc.items || []).find((i) => i.id === id);
    const keyOk = state.config.hasApiKey;
    const pyItem = find('python');
    const edge = find('tts-edge');
    const ffItem = find('ffmpeg');
    const nodeItem = find('node');
    const pyOk = pyItem?.available && edge?.available;
    const ffOk = ffItem?.available || rt.hasFfmpeg;
    const nodeOk = nodeItem?.available || rt.hasNode;

    const items = [
      {
        id: 'key', ok: keyOk, title: 'AI 服务 API Key',
        desc: keyOk
          ? `已配置（${state.config.model || '未选模型'}）`
          : '口播稿、蓝图、发布文案由大模型生成，需要一个 API Key（DeepSeek / Kimi / 智谱等均可，在设置里自填）',
        action: keyOk ? null : { label: '去设置', fn: openSettings },
      },
      {
        id: 'python', ok: Boolean(pyOk), title: 'Python 环境 + edge-tts 配音',
        desc: pyOk
          ? `${pyItem?.version || ''} · edge-tts 就绪`
          : pyItem?.available
            ? 'Python 可用但缺 edge-tts —— 创建应用独立环境即可（首次约 2-5 分钟）'
            : '未检测到系统 Python（需 3.10+），请先到 python.org 安装后点「重新体检」',
        action: pyItem?.available && !pyOk ? { label: '创建独立环境', fn: onboardSetupPython } : null,
      },
      {
        id: 'ffmpeg', ok: Boolean(ffOk), title: 'FFmpeg（后处理两关 / 混音）',
        desc: ffOk
          ? `可用${ffItem?.available ? `（系统 ${ffItem.version || ''}）` : '（应用内置）'}`
          : '未检测到 —— 下载便携版（约 90MB，一次即可，自动接入）',
        action: ffOk ? null : { label: '下载便携版', fn: () => onboardFetchRuntime({ ffmpeg: true, node: false }) },
      },
      {
        id: 'node', ok: Boolean(nodeOk), title: 'Node.js 22+（Remotion 渲染）',
        desc: nodeOk
          ? `可用${nodeItem?.available ? `（系统 ${nodeItem.version || ''}）` : '（应用内置）'}`
          : '未检测到 —— 下载便携版（约 30MB，自动接入）',
        action: nodeOk ? null : { label: '下载便携版', fn: () => onboardFetchRuntime({ ffmpeg: false, node: true }) },
      },
    ];

    const host = $('onboardItems');
    host.innerHTML = items
      .map(
        (it) => `
      <div class="onboard-item ${it.ok ? 'ok' : ''}">
        <div class="st">${it.ok ? '✓' : '○'}</div>
        <div class="tx">
          <div class="t">${esc(it.title)}</div>
          <div class="d">${esc(it.desc)}</div>
        </div>
        ${it.action ? `<button class="btn sm" data-act="${it.id}">${esc(it.action.label)}</button>` : ''}
      </div>`
      )
      .join('');
    for (const it of items) {
      if (!it.action) continue;
      host.querySelector(`[data-act="${it.id}"]`)?.addEventListener('click', it.action.fn);
    }

    // API Key + Python 是硬前置；ffmpeg / node 可进主界面后再补
    $('btnOnboardDone').disabled = !(keyOk && pyOk);
  }

  function refreshOnboard() {
    return Promise.all([api.config.get(), api.runtime.status(), api.toolchain.status()]).then(
      ([cfgInfo, rt, tc]) => {
        state.config = cfgInfo.config;
        onboard.rt = rt;
        onboard.tc = tc;
        renderOnboard();
      }
    );
  }

  async function onboardSetupPython() {
    const log = $('onboardLog');
    log.classList.remove('hidden');
    log.textContent = '创建独立环境并安装依赖…（首次约 2-5 分钟，别关窗口）\n';
    const off = api.chat.onEvent((ev) => {
      if (ev.type === 'python:output') {
        log.textContent += ev.text;
        log.scrollTop = log.scrollHeight;
      }
    });
    const r = await api.python.setup();
    off();
    log.textContent += r.ok ? '\n\n完成 ✓ edge-tts 已就绪。' : `\n\n失败：${r.error || '安装未成功'}`;
    log.scrollTop = log.scrollHeight;
    await refreshOnboard();
  }

  async function onboardFetchRuntime(want) {
    const log = $('onboardLog');
    log.classList.remove('hidden');
    const off = api.runtime.onProgress((p) => {
      if (p.status === 'progress') log.textContent = `${p.step === 'ffmpeg' ? 'FFmpeg' : 'Node.js'} 下载中 ${p.pct}%`;
      else log.textContent = `${p.step}: ${p.status}`;
    });
    const r = await api.runtime.ensure(want);
    off();
    log.textContent = r.ok ? '运行时就绪 ✓（已自动接入，无需重启）' : `下载失败：${r.error || '请检查网络后重试'}`;
    await refreshOnboard();
  }

  /* ================= 顶栏与初始化 ================= */

  function updateHeader() {
    const c = state.config || {};
    const badge = $('modelBadge');
    if (c.hasApiKey && c.model) {
      badge.textContent = c.model;
      badge.classList.add('on');
    } else {
      badge.textContent = c.hasApiKey ? '未选模型' : '未配置 API';
      badge.classList.remove('on');
    }
    $('wsPath').textContent = state.workspace || '未设置工作区';
    $('wsPath').title = state.workspace || '';
  }

  async function init() {
    const info = await api.config.get();
    state.config = info.config;
    state.providers = info.providers || [];
    state.skillsRoot = info.skillsRoot || '';
    state.workspace = await api.workspace.ensure();

    updateHeader();
    newSession();
    await loadSessions();
    await refreshFiles();

    api.chat.onEvent(onChatEvent);

    $('btnSend').addEventListener('click', () => send($('input').value));
    $('btnStop').addEventListener('click', () => api.chat.abort());
    $('input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        send($('input').value);
      }
    });

    $('btnSettings').addEventListener('click', openSettings);
    $('btnEnv').addEventListener('click', openEnv);
    $('btnWorkspace').addEventListener('click', async () => {
      const ws = await api.workspace.choose();
      if (ws) {
        state.workspace = ws;
        state.messages = [];
        updateHeader();
        newSession();
        await refreshFiles();
      }
    });
    $('btnNewSession').addEventListener('click', newSession);
    $('btnRefreshFiles').addEventListener('click', refreshFiles);

    $('btnDrawerClose').addEventListener('click', closeDrawer);
    $('mask').addEventListener('click', closeDrawer);

    $('btnOnboardSkip').addEventListener('click', () => {
      onboard.active = false;
      $('onboard').classList.add('hidden');
    });
    $('btnOnboardDone').addEventListener('click', () => {
      onboard.active = false;
      $('onboard').classList.add('hidden');
    });

    $('btnPreviewClose').addEventListener('click', () => {
      document.querySelector('.app').classList.remove('with-preview');
      $('previewPane').classList.add('hidden');
    });
    $('btnPreviewOpen').addEventListener('click', () => {
      if (state.lastPreview) api.workspace.openPath(state.lastPreview);
    });

    // 首次启动：环境体检，缺什么弹什么
    maybeOnboard();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
