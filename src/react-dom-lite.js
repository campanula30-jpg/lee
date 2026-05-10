import { Fragment, resetHooks, setRerender } from './react-lite.js';

function appendChild(parent, child) {
  if (child === null || child === undefined || child === false || child === true) return;
  if (Array.isArray(child)) {
    child.forEach((nestedChild) => appendChild(parent, nestedChild));
    return;
  }
  if (typeof child === 'string' || typeof child === 'number') {
    parent.appendChild(document.createTextNode(String(child)));
    return;
  }
  parent.appendChild(renderNode(child));
}

function setProp(element, key, value) {
  if (key === 'children' || key === 'key' || value === false || value === null || value === undefined) return;
  if (key === 'className') {
    element.setAttribute('class', value);
    return;
  }
  if (key === 'htmlFor') {
    element.setAttribute('for', value);
    return;
  }
  if (key === 'style' && typeof value === 'object') {
    Object.entries(value).forEach(([name, styleValue]) => element.style.setProperty(name, styleValue));
    return;
  }
  if (key.startsWith('on') && typeof value === 'function') {
    element.addEventListener(key.slice(2).toLowerCase(), value);
    return;
  }
  if (key === 'value' || key === 'checked' || key === 'selected') {
    element[key] = value;
    if (value === true) element.setAttribute(key, '');
    return;
  }
  if (value === true) {
    element.setAttribute(key, '');
    return;
  }
  element.setAttribute(key, String(value));
}

function renderNode(vnode) {
  if (typeof vnode.type === 'function') return renderNode(vnode.type({ ...vnode.props, children: vnode.children }));
  if (vnode.type === Fragment) {
    const fragment = document.createDocumentFragment();
    vnode.children.forEach((child) => appendChild(fragment, child));
    return fragment;
  }
  const element = document.createElement(vnode.type);
  const props = Object.entries(vnode.props ?? {});
  props.filter(([key]) => key !== 'value' && key !== 'checked').forEach(([key, value]) => setProp(element, key, value));
  vnode.children.forEach((child) => appendChild(element, child));
  props.filter(([key]) => key === 'value' || key === 'checked').forEach(([key, value]) => setProp(element, key, value));
  return element;
}

export function createRoot(container) {
  let component = null;
  const draw = () => {
    if (!component) return;
    resetHooks();
    container.replaceChildren(renderNode(component()));
  };
  setRerender(draw);
  return {
    render(nextComponent) {
      component = typeof nextComponent === 'function' ? nextComponent : () => nextComponent;
      draw();
    },
  };
}
