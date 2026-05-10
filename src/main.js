import React, { useMemo, useState } from './react-lite.js';
import { createRoot } from './react-dom-lite.js';

const h = React.createElement;

const DEFAULT_SHIFTS = [
  { id: 'early', label: '早番', color: '#14b8a6' },
  { id: 'day', label: '日勤', color: '#3b82f6' },
  { id: 'late', label: '遅番', color: '#f97316' },
  { id: 'night', label: '夜勤', color: '#7c3aed' },
  { id: 'after-night', label: '明け', color: '#8b5cf6' },
  { id: 'off', label: '休み', color: '#ef476f' },
];

const STAMPS = [
  { id: 'hospital', icon: '🏥', label: '病院' },
  { id: 'bank', icon: '🏦', label: '銀行' },
  { id: 'beer', icon: '🍺', label: 'ビール' },
  { id: 'yoga', icon: '🧘', label: 'ヨガ' },
  { id: 'boxing', icon: '🥊', label: 'ボクシング' },
  { id: 'meeting', icon: '💼', label: '会議' },
  { id: 'closing', icon: '📌', label: '締め日' },
  { id: 'car', icon: '🚗', label: '車' },
];

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const EVENTS_KEY = 'shift-palette-events-v2';
const SETTINGS_KEY = 'shift-palette-settings-v2';
const LEGACY_EVENTS_KEY = 'shift-palette-events';
const MAX_MEMO_LENGTH = 120;
const MAX_STAMPS_PER_DAY = 2;

function App() {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(today));
  const [settings, setSettingsState] = useState(readSettings);
  const [events, setEventsState] = useState(() => readEvents(readSettings().shifts));

  const shiftMap = useMemo(() => new Map(settings.shifts.map((shift) => [shift.id, shift])), [settings.shifts]);
  const selectedEvent = events[selectedDate] ?? emptyEvent();
  const monthDays = makeMonthDays(currentMonth.getFullYear(), currentMonth.getMonth());

  const setSettings = (nextSettings) => {
    setSettingsState(nextSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
  };

  const setEvents = (nextEvents) => {
    setEventsState(nextEvents);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(nextEvents));
  };

  const updateEvent = (dateKey, patch) => {
    const updated = sanitizeEvents({
      ...events,
      [dateKey]: { ...(events[dateKey] ?? emptyEvent()), ...patch },
    }, settings.shifts);
    setEvents(updated);
  };

  const addShift = () => {
    const id = `shift-${Date.now()}`;
    setSettings({
      ...settings,
      shifts: [...settings.shifts, { id, label: '新しい勤務', color: '#06b6d4' }],
    });
  };

  const updateShift = (id, patch) => {
    const shifts = settings.shifts.map((shift) => (
      shift.id === id ? sanitizeShift({ ...shift, ...patch }) : shift
    ));
    setSettings({ ...settings, shifts });
  };

  const removeShift = (id) => {
    const shifts = settings.shifts.filter((shift) => shift.id !== id);
    if (shifts.length === 0) return;
    setSettings({ ...settings, shifts });
    setEvents(Object.fromEntries(
      Object.entries(events).map(([dateKey, event]) => [
        dateKey,
        event.shiftId === id ? { ...event, shiftId: '' } : event,
      ]),
    ));
  };

  const moveMonth = (amount) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1));
  };

  return h('main', { className: 'app-shell' },
    h('header', { className: 'hero' },
      h('p', { className: 'eyebrow' }, 'スマホ優先の個人シフト管理'),
      h('h1', null, 'Shift Palette'),
      h('p', null, '勤務区分の名前と色、予定スタンプ、メモをまとめて月表示で確認できます。データはこのブラウザだけに保存されます。'),
    ),
    h('section', { className: 'toolbar', 'aria-label': '月の切り替え' },
      h('button', { type: 'button', onClick: () => moveMonth(-1) }, '前月'),
      h('h2', null, `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`),
      h('button', { type: 'button', onClick: () => moveMonth(1) }, '翌月'),
    ),
    h(ShiftLegend, { shifts: settings.shifts }),
    h(Calendar, {
      currentMonth,
      days: monthDays,
      events,
      selectedDate,
      shiftMap,
      onSelectDate: setSelectedDate,
    }),
    h(DayEditor, {
      event: selectedEvent,
      selectedDate,
      shifts: settings.shifts,
      onChange: (patch) => updateEvent(selectedDate, patch),
    }),
    h(ShiftSettings, { shifts: settings.shifts, onAdd: addShift, onRemove: removeShift, onUpdate: updateShift }),
    h(PrivacyNotice),
  );
}

function ShiftLegend({ shifts }) {
  return h('section', { className: 'legend', 'aria-label': '勤務区分の色分け' },
    shifts.map((shift) => h('span', { key: shift.id, style: { '--legend-color': shift.color } }, shift.label)),
  );
}

function Calendar({ currentMonth, days, events, selectedDate, shiftMap, onSelectDate }) {
  return h('section', { className: 'calendar-card' },
    h('div', { className: 'calendar-title' },
      h('strong', null, `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`),
      h('small', null, '土曜は青 / 日曜・祝日は赤'),
    ),
    h('div', { className: 'week-grid' }, WEEKDAYS.map((day, index) => h('b', { className: weekdayClass(index) }, day))),
    h('div', { className: 'month-grid' },
      days.map((cell) => h(DayCell, { cell, event: events[cell.key], selectedDate, shiftMap, onSelectDate })),
    ),
  );
}

function DayCell({ cell, event = emptyEvent(), selectedDate, shiftMap, onSelectDate }) {
  if (cell.blank) return h('div', { className: 'day-cell blank' });
  const shift = shiftMap.get(event.shiftId);
  const stampDetails = event.stamps.map(getStamp).filter(Boolean);
  const className = [
    'day-cell',
    selectedDate === cell.key ? 'selected' : '',
    cell.today ? 'today' : '',
    cell.weekday === 0 || cell.holiday ? 'holiday' : '',
    cell.weekday === 6 ? 'saturday' : '',
  ].filter(Boolean).join(' ');

  return h('button', {
    type: 'button',
    className,
    onClick: () => onSelectDate(cell.key),
    style: {
      '--shift-color': shift?.color ?? '#8f8aa3',
      '--shift-bg': shift ? `${shift.color}1a` : '#ffffff',
    },
  },
    h('span', { className: 'date-row' },
      h('span', { className: 'date-number' }, cell.day),
      stampDetails.length > 0 && h('span', { className: 'stamp-row', 'aria-label': stampDetails.map((stamp) => stamp.label).join('、') },
        stampDetails.map((stamp) => h('span', null, stamp.icon)),
      ),
    ),
    cell.holiday && h('span', { className: 'holiday-name' }, cell.holiday),
    shift && h('span', { className: 'shift-pill' }, shift.label),
    event.memo && h('span', { className: 'memo' }, event.memo),
  );
}

function DayEditor({ event, selectedDate, shifts, onChange }) {
  const date = new Date(`${selectedDate}T00:00:00`);
  const selectedDateLabel = date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  const toggleStamp = (stampId) => {
    const current = event.stamps.includes(stampId)
      ? event.stamps.filter((id) => id !== stampId)
      : [...event.stamps, stampId].slice(-MAX_STAMPS_PER_DAY);
    onChange({ stamps: current });
  };

  return h('section', { className: 'editor-card', 'aria-label': '選択日の編集' },
    h('div', null,
      h('p', { className: 'eyebrow' }, '選択中の日付'),
      h('h2', null, selectedDateLabel),
    ),
    h('label', null,
      '勤務区分',
      h('select', { value: event.shiftId, onChange: (changeEvent) => onChange({ shiftId: changeEvent.target.value }) },
        h('option', { value: '' }, '未設定'),
        shifts.map((shift) => h('option', { value: shift.id }, shift.label)),
      ),
    ),
    h('div', { className: 'field-group' },
      h('div', { className: 'field-heading' },
        h('strong', null, '予定スタンプ'),
        h('small', null, `2個まで選択できます（${event.stamps.length}/${MAX_STAMPS_PER_DAY}）`),
      ),
      h('div', { className: 'stamp-picker' },
        STAMPS.map((stamp) => h('button', {
          type: 'button',
          className: event.stamps.includes(stamp.id) ? 'active' : '',
          onClick: () => toggleStamp(stamp.id),
        }, h('span', null, stamp.icon), h('small', null, stamp.label))),
      ),
    ),
    h('label', null,
      'メモ',
      h('textarea', {
        value: event.memo,
        maxLength: MAX_MEMO_LENGTH,
        placeholder: '通院、給料日、会議、持ち物など自由に入力',
        onChange: (changeEvent) => onChange({ memo: changeEvent.target.value }),
      }),
    ),
  );
}

function ShiftSettings({ shifts, onAdd, onRemove, onUpdate }) {
  return h('section', { className: 'settings-card', 'aria-label': '勤務区分の設定' },
    h('div', { className: 'settings-title' },
      h('div', null,
        h('p', { className: 'eyebrow' }, 'カスタマイズ'),
        h('h2', null, '勤務区分と色'),
      ),
      h('button', { type: 'button', className: 'add-button', onClick: onAdd }, '追加'),
    ),
    h('div', { className: 'shift-settings-list' },
      shifts.map((shift) => h('div', { className: 'shift-setting' },
        h('input', {
          className: 'color-input',
          type: 'color',
          value: shift.color,
          'aria-label': `${shift.label}の色`,
          onChange: (event) => onUpdate(shift.id, { color: event.target.value }),
        }),
        h('input', {
          value: shift.label,
          maxLength: 12,
          'aria-label': '勤務区分名',
          onChange: (event) => onUpdate(shift.id, { label: event.target.value }),
        }),
        h('button', {
          type: 'button',
          className: 'remove-button',
          disabled: shifts.length === 1,
          onClick: () => onRemove(shift.id),
        }, '削除'),
      )),
    ),
  );
}

function PrivacyNotice() {
  return h('section', { className: 'privacy-card', 'aria-label': '保存先' },
    h('h2', null, '保存について'),
    h('p', null, '勤務区分、色、スタンプ、メモはブラウザのlocalStorageに保存されます。外部サーバーには送信しません。'),
  );
}

function emptyEvent() {
  return { shiftId: '', stamps: [], memo: '' };
}

function readSettings() {
  const fallback = { shifts: DEFAULT_SHIFTS };
  try {
    return sanitizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? fallback);
  } catch {
    return fallback;
  }
}

function readEvents(shifts) {
  try {
    const current = JSON.parse(localStorage.getItem(EVENTS_KEY));
    if (current) return sanitizeEvents(current, shifts);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_EVENTS_KEY));
    return sanitizeEvents(migrateLegacyEvents(legacy, shifts), shifts);
  } catch {
    return {};
  }
}

function sanitizeSettings(settings) {
  const shifts = Array.isArray(settings?.shifts) ? settings.shifts.map(sanitizeShift).filter(Boolean) : DEFAULT_SHIFTS;
  return { shifts: shifts.length ? shifts : DEFAULT_SHIFTS };
}

function sanitizeShift(shift) {
  if (!shift || typeof shift !== 'object') return null;
  const id = String(shift.id || `shift-${Date.now()}`).replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 40);
  const label = String(shift.label || '勤務').slice(0, 12);
  const color = /^#[0-9a-fA-F]{6}$/.test(shift.color) ? shift.color : '#3b82f6';
  return { id, label, color };
}

function sanitizeEvents(rawEvents, shifts) {
  if (!rawEvents || typeof rawEvents !== 'object' || Array.isArray(rawEvents)) return {};
  const allowedShiftIds = new Set(shifts.map((shift) => shift.id));
  return Object.fromEntries(
    Object.entries(rawEvents)
      .filter(([dateKey]) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey))
      .map(([dateKey, event]) => [dateKey, sanitizeEvent(event, allowedShiftIds)]),
  );
}

function sanitizeEvent(event, allowedShiftIds) {
  const safeEvent = event && typeof event === 'object' && !Array.isArray(event) ? event : emptyEvent();
  const shiftId = allowedShiftIds.has(safeEvent.shiftId) ? safeEvent.shiftId : '';
  const allowedStamps = new Set(STAMPS.map((stamp) => stamp.id));
  const stamps = Array.isArray(safeEvent.stamps)
    ? safeEvent.stamps.filter((stampId) => allowedStamps.has(stampId)).slice(0, MAX_STAMPS_PER_DAY)
    : [];
  return { shiftId, stamps, memo: String(safeEvent.memo ?? '').slice(0, MAX_MEMO_LENGTH) };
}

function migrateLegacyEvents(legacyEvents, shifts) {
  if (!legacyEvents || typeof legacyEvents !== 'object') return {};
  const labelToShift = new Map(shifts.map((shift) => [shift.label, shift.id]));
  const legacyShiftMap = new Map([
    ['早出１', 'early'], ['早出２', 'early'], ['早出３', 'early'], ['早出４', 'early'], ['早出５', 'early'],
    ['遅出１', 'late'], ['遅出２', 'late'], ['遅出３', 'late'], ['遅出４', 'late'], ['遅出５', 'late'],
    ['日勤', 'day'], ['Q遅出', 'late'], ['夜勤２', 'night'], ['夜勤３', 'night'], ['深夜勤', 'night'], ['公休', 'off'], ['有給', 'off'],
  ]);
  return Object.fromEntries(Object.entries(legacyEvents).map(([dateKey, event]) => {
    const shiftId = labelToShift.get(event?.shift) ?? legacyShiftMap.get(event?.shift) ?? '';
    const stamp = event?.stamp === 'hospital' ? ['hospital'] : [];
    const memo = [event?.workMemo, event?.privateMemo].filter(Boolean).join(' / ');
    return [dateKey, { shiftId, stamps: stamp, memo }];
  }));
}

function getStamp(stampId) {
  return STAMPS.find((stamp) => stamp.id === stampId);
}

function makeMonthDays(year, month) {
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push({ key: `blank-${i}`, blank: true });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    cells.push({
      key: dateKey,
      day,
      weekday: date.getDay(),
      holiday: getJapaneseHolidayName(date),
      today: dateKey === formatDateKey(new Date()),
    });
  }
  while (cells.length % 7 !== 0) cells.push({ key: `blank-end-${cells.length}`, blank: true });
  return cells;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function weekdayClass(index) {
  if (index === 0) return 'holiday-text';
  if (index === 6) return 'saturday-text';
  return '';
}

const holidayCache = new Map();

function getJapaneseHolidayName(date) {
  return buildJapaneseHolidayMap(date.getFullYear()).get(formatDateKey(date)) ?? '';
}

function buildJapaneseHolidayMap(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const holidays = new Map();
  const add = (month, day, name) => holidays.set(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, name);

  add(1, 1, '元日');
  addNthMonday(year, 1, 2, '成人の日', holidays);
  add(2, 11, '建国記念の日');
  add(2, 23, '天皇誕生日');
  add(3, springEquinoxDay(year), '春分の日');
  add(4, 29, '昭和の日');
  add(5, 3, '憲法記念日');
  add(5, 4, 'みどりの日');
  add(5, 5, 'こどもの日');
  addNthMonday(year, 7, 3, '海の日', holidays);
  add(8, 11, '山の日');
  addNthMonday(year, 9, 3, '敬老の日', holidays);
  add(9, autumnEquinoxDay(year), '秋分の日');
  addNthMonday(year, 10, 2, 'スポーツの日', holidays);
  add(11, 3, '文化の日');
  add(11, 23, '勤労感謝の日');

  const baseKeys = [...holidays.keys()].sort();
  addCitizenHolidays(year, holidays);
  addSubstituteHolidays(baseKeys, holidays);
  holidayCache.set(year, holidays);
  return holidays;
}

function addNthMonday(year, month, weekNumber, name, holidays) {
  const firstDay = new Date(year, month - 1, 1);
  const firstMonday = 1 + ((8 - firstDay.getDay()) % 7);
  const day = firstMonday + (weekNumber - 1) * 7;
  holidays.set(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, name);
}

function addCitizenHolidays(year, holidays) {
  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 2; day < daysInMonth; day += 1) {
      const date = new Date(year, month - 1, day);
      const key = formatDateKey(date);
      if (holidays.has(key) || date.getDay() === 0) continue;
      const previous = new Date(date);
      previous.setDate(day - 1);
      const next = new Date(date);
      next.setDate(day + 1);
      if (holidays.has(formatDateKey(previous)) && holidays.has(formatDateKey(next))) {
        holidays.set(key, '国民の休日');
      }
    }
  }
}

function addSubstituteHolidays(baseKeys, holidays) {
  baseKeys.forEach((holidayKey) => {
    const holidayDate = new Date(`${holidayKey}T00:00:00`);
    if (holidayDate.getDay() !== 0) return;
    const substitute = new Date(holidayDate);
    do {
      substitute.setDate(substitute.getDate() + 1);
    } while (holidays.has(formatDateKey(substitute)));
    holidays.set(formatDateKey(substitute), '振替休日');
  });
}

function springEquinoxDay(year) {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function autumnEquinoxDay(year) {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

createRoot(document.querySelector('#app')).render(App);
