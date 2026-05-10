import './styles.css';

const SHIFT_OPTIONS = [
  '早出１', '早出２', '早出３', '早出４', '早出５',
  '遅出１', '遅出２', '遅出３', '遅出４', '遅出５',
  '日勤', 'Q遅出', '夜勤２', '夜勤３', '深夜勤', '公休', '有給',
];

const SHIFT_STYLES = {
  early: { label: '早出', color: '#39b7a5', bg: '#dff8f4' },
  late: { label: '遅出', color: '#ff9f1c', bg: '#fff1d7' },
  day: { label: '日勤', color: '#3b82f6', bg: '#e4efff' },
  qlate: { label: 'Q遅出', color: '#f97316', bg: '#ffeadb' },
  night: { label: '夜勤', color: '#7c3aed', bg: '#eee7ff' },
  midnight: { label: '深夜勤', color: '#312e81', bg: '#e8e7ff' },
  off: { label: '休み', color: '#ef476f', bg: '#ffe2ea' },
};

const STAMPS = [
  { id: 'none', icon: '', label: 'なし' },
  { id: 'hospital', icon: '🏥', label: '通院' },
  { id: 'family', icon: '👨‍👩‍👧', label: '家族' },
  { id: 'meal', icon: '🍽️', label: '食事' },
  { id: 'shopping', icon: '🛍️', label: '買い物' },
  { id: 'travel', icon: '✈️', label: 'お出かけ' },
  { id: 'beauty', icon: '💇', label: '美容' },
  { id: 'study', icon: '📚', label: '勉強' },
  { id: 'heart', icon: '💖', label: '大事' },
];

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const STORAGE_KEY = 'shift-palette-events';
const today = new Date();
let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = formatDateKey(today);
let events = readEvents();

function getShiftType(shift) {
  if (!shift) return null;
  if (shift.startsWith('早出')) return 'early';
  if (shift.startsWith('遅出')) return 'late';
  if (shift === '日勤') return 'day';
  if (shift === 'Q遅出') return 'qlate';
  if (shift.startsWith('夜勤')) return 'night';
  if (shift === '深夜勤') return 'midnight';
  if (shift === '公休' || shift === '有給') return 'off';
  return null;
}

function getStamp(stampId) {
  return STAMPS.find((stamp) => stamp.id === stampId) ?? STAMPS[0];
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeMonthDays(year, month) {
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) cells.push({ key: `blank-${i}`, blank: true });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ key: formatDateKey(date), day, today: formatDateKey(date) === formatDateKey(new Date()) });
  }
  while (cells.length % 7 !== 0) cells.push({ key: `blank-end-${cells.length}`, blank: true });
  return cells;
}

function readEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function selectedEvent() {
  return events[selectedDate] ?? { shift: '', workMemo: '', privateMemo: '', stamp: 'none' };
}

function updateEvent(patch) {
  events = { ...events, [selectedDate]: { ...selectedEvent(), ...patch } };
  saveEvents();
  render();
}

function render() {
  document.querySelector('#app').innerHTML = `
    <main class="app-shell">
      <header class="hero">
        <p class="eyebrow">スマホで使えるシフト手帳</p>
        <h1>Shift Palette</h1>
        <p>色で勤務帯を見分け、スタンプでプライベート予定もひと目で確認できます。</p>
      </header>

      <section class="toolbar" aria-label="月の切り替え">
        <button type="button" data-move="-1">前月</button>
        <h2>${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月</h2>
        <button type="button" data-move="1">翌月</button>
      </section>

      <section class="legend" aria-label="勤務帯の色分け">
        ${Object.entries(SHIFT_STYLES).map(([key, value]) => `
          <span data-shift-type="${key}" style="--legend-color: ${value.color}">${value.label}</span>
        `).join('')}
      </section>

      <section class="calendar-card" id="calendar-card">
        <div class="calendar-title">
          <strong>${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月</strong>
          <small>仕事 / プライベート予定</small>
        </div>
        <div class="week-grid">
          ${WEEKDAYS.map((day) => `<b>${day}</b>`).join('')}
        </div>
        <div class="month-grid">
          ${makeMonthDays(currentMonth.getFullYear(), currentMonth.getMonth()).map(renderDayCell).join('')}
        </div>
      </section>

      ${renderEditor()}
      ${renderShareCard()}
    </main>
  `;
  bindEvents();
}

function renderDayCell(cell) {
  if (cell.blank) return '<div class="day-cell blank"></div>';
  const event = events[cell.key] ?? {};
  const type = getShiftType(event.shift);
  const style = type ? SHIFT_STYLES[type] : null;
  const stamp = getStamp(event.stamp);
  return `
    <button
      type="button"
      class="day-cell ${selectedDate === cell.key ? 'selected' : ''} ${cell.today ? 'today' : ''}"
      data-date="${cell.key}"
      style="--shift-color: ${style?.color ?? '#8f8aa3'}; --shift-bg: ${style?.bg ?? '#ffffff'}"
    >
      <span class="date-number">${cell.day}</span>
      ${event.shift ? `<span class="shift-pill">${event.shift}</span>` : ''}
      ${stamp.icon ? `<span class="stamp" aria-label="${stamp.label}">${stamp.icon}</span>` : ''}
      ${event.workMemo ? `<span class="memo work">仕事: ${escapeHtml(event.workMemo)}</span>` : ''}
      ${event.privateMemo ? `<span class="memo private">私用: ${escapeHtml(event.privateMemo)}</span>` : ''}
    </button>
  `;
}

function renderEditor() {
  const event = selectedEvent();
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'short',
  });
  return `
    <section class="editor-card" aria-label="予定の編集">
      <div>
        <p class="eyebrow">選択中</p>
        <h2>${selectedDateLabel}</h2>
      </div>

      <label>
        シフト
        <select id="shift-select">
          <option value="">未設定</option>
          ${SHIFT_OPTIONS.map((shift) => `<option value="${shift}" ${event.shift === shift ? 'selected' : ''}>${shift}</option>`).join('')}
        </select>
      </label>

      <label>
        仕事の予定
        <input id="work-memo" value="${escapeHtml(event.workMemo)}" placeholder="会議、研修、申し送りなど" />
      </label>

      <label>
        プライベートの予定
        <input id="private-memo" value="${escapeHtml(event.privateMemo)}" placeholder="通院、買い物、食事など" />
      </label>

      <div class="stamp-picker" aria-label="スタンプを選択">
        ${STAMPS.map((stamp) => `
          <button type="button" data-stamp="${stamp.id}" class="${event.stamp === stamp.id ? 'active' : ''}">
            <span>${stamp.icon || '×'}</span>
            <small>${stamp.label}</small>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function renderShareCard() {
  return `
    <section class="share-card">
      <div>
        <h2>LINEに送る</h2>
        <p>月間カレンダーをスクショ風の画像にして、スマホの共有メニューやLINEで送れます。</p>
      </div>
      <button type="button" class="share-button" id="share-button">スクショを共有</button>
      <p class="status" id="share-status" hidden></p>
    </section>
  `;
}

function bindEvents() {
  document.querySelectorAll('[data-move]').forEach((button) => {
    button.addEventListener('click', () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + Number(button.dataset.move), 1);
      render();
    });
  });

  document.querySelectorAll('[data-date]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedDate = button.dataset.date;
      render();
    });
  });

  document.querySelector('#shift-select').addEventListener('change', (event) => updateEvent({ shift: event.target.value }));
  document.querySelector('#work-memo').addEventListener('change', (event) => updateEvent({ workMemo: event.target.value }));
  document.querySelector('#private-memo').addEventListener('change', (event) => updateEvent({ privateMemo: event.target.value }));
  document.querySelectorAll('[data-stamp]').forEach((button) => {
    button.addEventListener('click', () => updateEvent({ stamp: button.dataset.stamp }));
  });
  document.querySelector('#share-button').addEventListener('click', shareToLine);
}

async function shareToLine() {
  const status = document.querySelector('#share-status');
  status.hidden = false;
  status.textContent = '共有用のスクショ画像を作成中です…';

  const svg = buildCalendarSvg();
  const file = new File([svg], `shift-${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}.svg`, { type: 'image/svg+xml' });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: '今月のシフト',
      text: 'シフト表のスクショ画像です。LINEを選んで送信してください。',
      files: [file],
    });
    status.textContent = '共有メニューからLINEへ送信できます。';
    return;
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
  status.textContent = 'スクショ画像を保存しました。LINEで画像を選んで送信してください。';
}

function buildCalendarSvg() {
  const width = 1080;
  const padding = 44;
  const gap = 10;
  const cellWidth = (width - padding * 2 - gap * 6) / 7;
  const cellHeight = 142;
  const headerHeight = 150;
  const days = makeMonthDays(currentMonth.getFullYear(), currentMonth.getMonth());
  const rows = days.length / 7;
  const height = headerHeight + rows * (cellHeight + gap) + padding;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" rx="42" fill="#fff7fb"/>',
    `<text x="${padding}" y="72" font-size="42" font-weight="800" fill="#28243d">${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月 Shift Palette</text>`,
    `<text x="${padding}" y="118" font-size="24" fill="#6b6680">仕事 / プライベート予定</text>`,
  ];

  WEEKDAYS.forEach((day, index) => {
    parts.push(`<text x="${padding + index * (cellWidth + gap) + cellWidth / 2}" y="${headerHeight - 8}" text-anchor="middle" font-size="24" font-weight="700" fill="#9a92aa">${day}</text>`);
  });

  days.forEach((cell, index) => {
    if (cell.blank) return;
    const event = events[cell.key] ?? {};
    const type = getShiftType(event.shift);
    const style = type ? SHIFT_STYLES[type] : { color: '#8f8aa3', bg: '#ffffff' };
    const stamp = getStamp(event.stamp);
    const column = index % 7;
    const row = Math.floor(index / 7);
    const x = padding + column * (cellWidth + gap);
    const y = headerHeight + row * (cellHeight + gap);
    parts.push(`<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" rx="18" fill="${style.bg}" stroke="#ffffff" stroke-width="3"/>`);
    parts.push(`<text x="${x + 14}" y="${y + 34}" font-size="28" font-weight="800" fill="#2f2b43">${cell.day}</text>`);
    if (event.shift) {
      parts.push(`<rect x="${x + 12}" y="${y + 48}" width="${Math.min(cellWidth - 24, 92)}" height="30" rx="10" fill="${style.color}"/>`);
      parts.push(`<text x="${x + 20}" y="${y + 70}" font-size="18" font-weight="800" fill="#ffffff">${escapeXml(event.shift)}</text>`);
    }
    if (stamp.icon) parts.push(`<text x="${x + cellWidth - 38}" y="${y + 36}" font-size="28">${stamp.icon}</text>`);
    if (event.workMemo) parts.push(`<text x="${x + 12}" y="${y + 104}" font-size="17" fill="#4f4a63">仕事: ${escapeXml(event.workMemo).slice(0, 10)}</text>`);
    if (event.privateMemo) parts.push(`<text x="${x + 12}" y="${y + 130}" font-size="17" fill="#d9467d">私用: ${escapeXml(event.privateMemo).slice(0, 10)}</text>`);
  });

  parts.push('</svg>');
  return parts.join('');
}

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

render();
