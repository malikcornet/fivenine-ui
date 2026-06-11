// JS interop bridge between Blazor components and the core behavior modules.
// The core library is synced into ./fivenine/ by scripts/sync-blazor-assets.mjs.
//
// Detachers are keyed by an id (not by element): when a component is disposed,
// Blazor has often already removed its DOM node, so the ElementReference would
// marshal to null and an element-keyed lookup could never clean up.

import { attachDropdown } from './fivenine/js/index.js';

let nextId = 0;
const detachers = new Map();

export function attach(element) {
  if (!element) return 0;
  const id = ++nextId;
  detachers.set(id, attachDropdown(element));
  return id;
}

export function detach(id) {
  const detachFn = detachers.get(id);
  if (detachFn) detachFn();
  detachers.delete(id);
}
