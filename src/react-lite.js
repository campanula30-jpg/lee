const hookState = [];
let hookIndex = 0;
let rerender = () => {};

export const Fragment = Symbol('Fragment');

export function createElement(type, props, ...children) {
  return { type, props: props ?? {}, children: children.flat(Infinity) };
}

export function useState(initialValue) {
  const index = hookIndex;
  if (hookState[index] === undefined) {
    hookState[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
  }
  const setState = (nextValue) => {
    hookState[index] = typeof nextValue === 'function' ? nextValue(hookState[index]) : nextValue;
    rerender();
  };
  hookIndex += 1;
  return [hookState[index], setState];
}

export function useMemo(factory, _dependencies) {
  return factory();
}

export function resetHooks() {
  hookIndex = 0;
}

export function setRerender(callback) {
  rerender = callback;
}

const React = { createElement, Fragment, useMemo, useState };
export default React;
