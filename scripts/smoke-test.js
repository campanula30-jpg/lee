import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

class TestNode {
  constructor() {
    this.parentNode = null;
    this.childNodes = [];
  }

  appendChild(child) {
    if (child.nodeType === 11) {
      [...child.childNodes].forEach((fragmentChild) => this.appendChild(fragmentChild));
      child.childNodes = [];
      return child;
    }
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.childNodes.forEach((child) => { child.parentNode = null; });
    this.childNodes = [];
    children.forEach((child) => this.appendChild(child));
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent).join('');
  }
}

class TestText extends TestNode {
  constructor(text) {
    super();
    this.nodeType = 3;
    this.text = text;
  }

  get textContent() {
    return this.text;
  }
}

class TestElement extends TestNode {
  constructor(tagName) {
    super();
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = { setProperty: (name, value) => { this.style[name] = value; } };
    this.value = '';
    this.disabled = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.id = String(value);
    if (name === 'class') this.className = String(value);
    if (name === 'value') this.value = String(value);
    if (name === 'disabled') this.disabled = true;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatchEvent(event) {
    event.target = this;
    (this.listeners.get(event.type) ?? []).forEach((listener) => listener(event));
  }

  click() {
    this.dispatchEvent({ type: 'click' });
  }

  matches(selector) {
    if (selector.startsWith('#')) return this.getAttribute('id') === selector.slice(1);
    if (selector.startsWith('.')) return (this.getAttribute('class') ?? '').split(/\s+/).includes(selector.slice(1));
    if (selector.startsWith('[') && selector.endsWith(']')) {
      const [name, rawValue] = selector.slice(1, -1).split('=');
      if (!rawValue) return this.attributes.has(name);
      return this.getAttribute(name) === rawValue.replace(/^"|"$/g, '');
    }
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  querySelector(selector) {
    return queryAll(this, selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    return queryAll(this, selector);
  }
}

class TestDocument extends TestElement {
  constructor() {
    super('#document');
    this.app = new TestElement('div');
    this.app.setAttribute('id', 'app');
    this.appendChild(this.app);
  }

  createElement(tagName) {
    return new TestElement(tagName);
  }

  createTextNode(text) {
    return new TestText(String(text));
  }

  createDocumentFragment() {
    const fragment = new TestNode();
    fragment.nodeType = 11;
    return fragment;
  }
}

function queryAll(root, selector) {
  const parts = selector.trim().split(/\s+/);
  return parts.reduce((nodes, part) => nodes.flatMap((node) => querySimple(node, part)), [root]);
}

function querySimple(root, selector) {
  const matches = [];
  const visit = (node) => {
    if (node.nodeType === 1 && node.matches(selector)) matches.push(node);
    node.childNodes?.forEach(visit);
  };
  root.childNodes.forEach(visit);
  return matches;
}

const storage = new Map();
globalThis.document = new TestDocument();
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

await import('../src/main.js');

const app = document.querySelector('#app');
assert.match(app.textContent, /Shift Palette/);
assert.match(app.textContent, /勤務区分と色/);
assert.equal(app.querySelectorAll('.day-cell').length >= 28, true);
assert.equal(app.querySelectorAll('.stamp-picker button').length, 8);

const firstDate = app.querySelectorAll('.day-cell').find((cell) => !cell.matches('.blank'));
firstDate.click();

const shiftSelect = app.querySelector('select');
shiftSelect.value = 'early';
shiftSelect.dispatchEvent({ type: 'change' });
assert.match(localStorage.getItem('shift-palette-events-v2'), /"shiftId":"early"/);

app.querySelectorAll('.stamp-picker button')[0].click();
app.querySelectorAll('.stamp-picker button')[1].click();
app.querySelectorAll('.stamp-picker button')[2].click();
const savedAfterStamps = JSON.parse(localStorage.getItem('shift-palette-events-v2'));
const selectedDay = Object.values(savedAfterStamps)[0];
assert.deepEqual(selectedDay.stamps, ['bank', 'beer']);

const memo = app.querySelector('textarea');
memo.value = '病院と会議の予定';
memo.dispatchEvent({ type: 'change' });
assert.match(localStorage.getItem('shift-palette-events-v2'), /病院と会議の予定/);

const addButton = app.querySelector('.add-button');
addButton.click();
assert.match(localStorage.getItem('shift-palette-settings-v2'), /新しい勤務/);

const css = await readFile('src/styles.css', 'utf8');
assert.match(css, /width: min\(100%, 560px\)/);
assert.match(css, /@media \(max-width: 390px\)/);
assert.match(css, /\.day-cell\.saturday \.date-number/);
assert.match(css, /\.day-cell\.holiday \.date-number/);

console.log('Smoke test passed: render, mobile CSS markers, interactions, and localStorage persistence verified.');
