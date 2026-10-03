(() => {
  'use strict';
  const API = 'https://xrmemory-ismar2026-groups.banana960521.chatgpt.site/api/choices';
  const SERVICE = new URL(API).origin;
  const STORAGE = 'xrmemory-ismar2026-choice';
  const faces = ['🐱', '🐻', '🐼', '🐰', '🦊', '🐸'];
  const topics = [
    {short: 'Scope', title: 'Defining XRMemory and Its Scope', q: 'What counts as XRMemory, and for whom?'},
    {short: 'Capture', title: 'Capturing and Representing XRMemory', q: 'What should we capture, and what might we miss?'},
    {short: 'Experience', title: 'Reconstructing and Experiencing XRMemory', q: 'How should people revisit and interact with an experience?'},
    {short: 'Governance', title: 'Preserving and Governing XRMemory', q: 'Who controls access, reuse and long-term preservation?'}
  ];
  const spots = [[29,13],[71,13],[12,39],[88,39],[12,67],[88,67],[29,90],[71,90]];
  const $ = id => document.getElementById(id);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let members = [], counts = null, mine = null, selected = null;
  let refreshTimer = null, failures = 0;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    if (document.hidden || busy || pendingLoad) return;
    refreshTimer = setTimeout(load, Math.min(60000, 10000 * 2 ** failures));
  }
  let busy = false, initialized = false, requestVersion = 0, pendingLoad = false, identity = null;
  try { identity = localStorage.getItem(STORAGE); } catch (_) { /* Read-only room remains available. */ }
  if (identity && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(identity)) identity = null;
  const tables = [], options = [];

  function selectTable(number) {
    selected = number;
    $('message').textContent = '';
    renderSelection();
  }
  topics.forEach((topic, i) => {
    const zone = el('div', 'table-zone');
    const map = el('div', 'seat-map');
    const desk = el('button', 'desk');
    desk.type = 'button';
    desk.setAttribute('aria-label', `Choose Table ${i+1}: ${topic.title}`);
    desk.append(el('span', '', 'TABLE'), el('strong', '', i+1), el('span', '', topic.short), el('small', '', 'Loading…'));
    desk.addEventListener('click', () => selectTable(i+1));
    map.append(desk);
    const extra = el('div', 'extra-seats');
    extra.setAttribute('aria-label', `Additional participants at Table ${i+1}`);
    extra.hidden = true;
    zone.append(map, extra, el('h2', '', `${i+1}. ${topic.title}`));
    $('room').append(zone);
    tables.push({zone, map, desk, extra});
    const label = el('label');
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = 'table'; radio.value = i+1;
    radio.addEventListener('change', () => selectTable(i+1));
    const copy = el('div');
    copy.append(el('strong', '', `Table ${i+1}: ${topic.title}`), el('p', '', topic.q));
    label.append(radio, copy);
    $('topic-options').append(label);
    options.push({label, radio});
  });
  function renderSelection() {
    tables.forEach(({zone, desk}, i) => {
      zone.classList.toggle('chosen', selected === i+1);
      desk.setAttribute('aria-pressed', String(selected === i+1));
      desk.disabled = busy;
      options[i].label.classList.toggle('selected', selected === i+1);
      options[i].radio.checked = selected === i+1;
      options[i].radio.disabled = busy;
    });
    $('display-name').disabled = busy;
    $('save').disabled = busy || selected === null || !$('display-name').value.trim() || counts === null;
    $('save').textContent = busy ? 'Saving…' : mine ? 'Update my place' : 'Take my seat';
    $('leave').hidden = !mine;
    $('leave').disabled = $('refresh').disabled = busy;
    $('form-title').textContent = mine ? 'Your place at the table' : 'Join a table';
  }
  function makeSeat(member, seat, table, extra = false) {
    const me = member && mine?.topic === table && mine?.seat === member.seat;
    const node = el('div', `${extra ? 'extra-seat' : 'seat'} ${member ? 'occupied' : ''} ${me ? 'me' : ''}`);
    node.title = member ? member.name : 'Empty seat';
    if (!extra) { node.style.left = spots[seat][0]+'%'; node.style.top = spots[seat][1]+'%'; }
    const character = el('div', 'character');
    character.setAttribute('aria-label', member ? `${member.name}${me ? ', you' : ''}` : 'Empty seat');
    if (member) character.textContent = faces[member.avatar] || faces[0];
    else character.append(el('span', 'empty-chair'));
    node.append(character);
    if (member) {
      const tag = el('span', 'name-tag', member.name);
      if (me) tag.append(el('b', '', ' (you)'));
      node.append(tag);
    }
    return node;
  }
  function renderRoom() {
    tables.forEach(({map, desk, extra}, i) => {
      const atTable = members.filter(m => m.topic === i+1);
      map.querySelectorAll('.seat').forEach(node => node.remove());
      spots.forEach((_, seat) => map.append(makeSeat(atTable.find(m => m.seat === seat), seat, i+1)));
      extra.replaceChildren(...atTable.filter(m => m.seat >= 8).map(m => makeSeat(m, m.seat, i+1, true)));
      extra.hidden = !extra.children.length;
      const n = counts?.[i] ?? 0;
      desk.querySelector('small').textContent = counts ? n <= 8 ? `${n}/8` : `${n} people${n >= 12 ? ' (full)' : ''}` : 'Loading…';
    });
    $('room').setAttribute('aria-busy', String(counts === null));
    renderSelection();
  }
  function apply(data) {members = data.members; counts = data.counts; mine = data.mine; renderRoom();}
  function error(message = '') {
    $('error').textContent = message;
    $('error').hidden = !message;
    $('connection-status').textContent = message ? (counts === null ? 'The room could not connect. Retrying automatically…' : 'Reconnecting. The last room update is shown below.') : '';
    $('connection-status').hidden = !message;
    $('connection-help').hidden = !message;
    if (message && counts === null) {
      tables.forEach(({desk}) => {desk.querySelector('small').textContent = 'Reconnecting…';});
      $('room').setAttribute('aria-busy', 'false');
    }
  }
  function ensureIdentity() {
    if (!identity) {
      const generated = crypto.randomUUID();
      try {localStorage.setItem(STORAGE, generated);} catch (_) {
        throw Error('Your browser cannot remember your place. Enable storage for this website, or use the earlier link below.');
      }
      identity = generated;
    }
    return identity;
  }
  let transport = 'direct', bridgeReady = null, bridgeFrame = null;
  const bridgePending = new Map();
  let bridgeResolve;
  window.addEventListener('message', event => {
    if (event.origin !== SERVICE || event.source !== bridgeFrame?.contentWindow) return;
    const d = event.data;
    if (!d || d.channel !== 'xrmemory-room-v1') return;
    if (d.type === 'ready') {bridgeResolve?.(); return;}
    if (d.type !== 'response') return;
    const pending = bridgePending.get(d.id);
    if (pending) {bridgePending.delete(d.id);clearTimeout(pending.timeout);pending.resolve(d);}
  });
  function connectBridge() {
    if (bridgeReady) return bridgeReady;
    bridgeReady = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        bridgeReady = null; bridgeFrame?.remove(); bridgeFrame = null;
        reject(Error('The room connection is unavailable. Please try the direct room link below.'));
      }, 12000);
      bridgeResolve = () => {clearTimeout(timer);resolve();};
      bridgeFrame = document.createElement('iframe');
      bridgeFrame.title = 'Discussion room connection';
      bridgeFrame.hidden = true;
      bridgeFrame.src = SERVICE + '/room-bridge';
      bridgeFrame.addEventListener('load', () => {
        bridgeFrame.contentWindow.postMessage({channel:'xrmemory-room-v1',type:'hello'}, SERVICE);
      });
      document.body.append(bridgeFrame);
    });
    return bridgeReady;
  }
  async function bridgeRequest(method, body) {
    await connectBridge();
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => {bridgePending.delete(id);reject(Error('The room did not respond. Please try again.'));}, 12000);
      bridgePending.set(id, {resolve, timeout});
      bridgeFrame.contentWindow.postMessage({channel:'xrmemory-room-v1',type:'request',id,method,identity,body}, SERVICE);
    });
  }
  async function directRequest(method, body) {
    const headers = {};
    if (identity) headers.Authorization = `Bearer ${identity}`;
    if (body) headers['Content-Type'] = 'application/json';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      // The server sends no-store. Avoid Safari-specific cache/preflight headers.
      const response = await fetch(API, {method, headers, credentials: 'omit', signal: controller.signal, ...(body ? {body: JSON.stringify(body)} : {})});
      return {status: response.status, data: await response.json()};
    } finally {clearTimeout(timeout);}
  }
  async function request(method = 'GET', body) {
    let response;
    if (transport === 'bridge') response = await bridgeRequest(method, body);
    else {
      try {response = await directRequest(method, body);}
      catch (_) {
        $('connection-status').textContent = 'Connecting to the room…';
        $('connection-status').hidden = false;
        response = await bridgeRequest(method, body);
        transport = 'bridge';
      }
    }
    const data = response.data;
    if (response.status < 200 || response.status >= 300) throw Error(data?.error || 'The room is temporarily unavailable. Please try again.');
    if (!Array.isArray(data?.members) || !Array.isArray(data?.counts)) throw Error('Could not load the room. Please try again.');
    return data;
  }
  async function load() {
    if (busy || pendingLoad) return;
    pendingLoad = true;
    clearTimeout(refreshTimer);
    const version = requestVersion;
    try {
      const data = await request();
      if (version !== requestVersion || busy) return;
      if (!initialized) {
        initialized = true;
        if (data.mine) { $('display-name').value = data.mine.name; selected = data.mine.topic; }
      }
      apply(data);
      failures = 0;
      error();
    } catch (e) {if (version === requestVersion) {failures = Math.min(3, failures + 1);error(e.message || 'Could not load the room.');}}
    finally {pendingLoad = false;scheduleRefresh();}
  }
  async function save(remove = false) {
    if (busy || (!remove && (!selected || !$('display-name').value.trim()))) return;
    busy = true; clearTimeout(refreshTimer); requestVersion++; renderSelection(); error(); $('message').textContent = '';
    try {
      ensureIdentity();
      const data = await request(remove ? 'DELETE' : 'POST', remove ? undefined : {topic: selected, name: $('display-name').value});
      if (!remove && !data.mine) throw Error('Your place was not saved. Please try again.');
      apply(data); failures = 0; error();
      if (data.mine) $('display-name').value = data.mine.name;
      $('message').textContent = remove ? 'You have left the table.' : `You are at Table ${data.mine.topic}. Your character and name are now on the room map.`;
    } catch (e) {error(e.message || 'Your place was not saved. Please try again.');}
    finally {busy = false; renderSelection(); scheduleRefresh();}
  }
  $('join').addEventListener('submit', event => {event.preventDefault(); save();});
  $('display-name').addEventListener('input', renderSelection);
  $('leave').addEventListener('click', () => save(true));
  $('refresh').addEventListener('click', load);
  window.addEventListener('storage', event => {
    if (event.key === STORAGE) {identity = event.newValue; initialized = false; requestVersion++; load();}
  });
  document.addEventListener('visibilitychange', () => {clearTimeout(refreshTimer);if (!document.hidden) load();});
  renderRoom(); load();
})();
