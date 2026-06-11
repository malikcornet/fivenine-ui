/**
 * Attach dropdown behavior to a `.fn-dropdown` root element containing a
 * `[data-fn-dropdown-trigger]` button and a `.fn-dropdown__menu`.
 *
 * Toggles on trigger click, closes on outside pointerdown and Escape, and
 * keeps `aria-expanded` in sync. SSR-safe: no DOM access until called.
 *
 * @param {HTMLElement} root
 * @param {{ onOpenChange?: (open: boolean) => void }} [options]
 * @returns {() => void} detach function that removes all listeners
 */
export function attachDropdown(root, options = {}) {
  if (!root) throw new Error('attachDropdown: root element is required');
  const trigger = root.querySelector('[data-fn-dropdown-trigger]');
  const menu = root.querySelector('.fn-dropdown__menu');
  if (!trigger || !menu) {
    throw new Error('attachDropdown: root must contain [data-fn-dropdown-trigger] and .fn-dropdown__menu');
  }

  const isOpen = () => root.classList.contains('fn-dropdown--open');

  function setOpen(open) {
    root.classList.toggle('fn-dropdown--open', open);
    trigger.setAttribute('aria-expanded', String(open));
    options.onOpenChange?.(open);
  }

  const onTriggerClick = () => setOpen(!isOpen());
  const onDocPointerDown = (event) => {
    if (isOpen() && !root.contains(event.target)) setOpen(false);
  };
  const onKeyDown = (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      trigger.focus();
    }
  };

  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', onTriggerClick);
  document.addEventListener('pointerdown', onDocPointerDown);
  root.addEventListener('keydown', onKeyDown);

  return function detach() {
    trigger.removeEventListener('click', onTriggerClick);
    document.removeEventListener('pointerdown', onDocPointerDown);
    root.removeEventListener('keydown', onKeyDown);
  };
}
