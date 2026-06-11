// Shared shell for standalone example pages, used by every target (the html
// and react examples import it from @fivenine/ui; the Blazor host loads the
// copy synced into _content/FiveNine.UI/fivenine/js/).
//
// URL contract (also used by tests):
//   ?theme=light|dark                   sets the design-token theme
//   ?dimensions=mobile|tablet|desktop   constrains content width (375/768/full)
//
// Docs integration:
//   - reports content height as {type:'fivenine:height', height} postMessage;
//     measured from element rects, not scrollHeight, so it shrinks again after
//     overlays close (scrollHeight is floored at the viewport height).
//   - accepts {type:'fivenine:set', theme?, dimensions?} to restyle live,
//     without an iframe reload.

const WIDTHS = { mobile: '375px', tablet: '768px', desktop: '' };

export function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function applyDimensions(dimensions) {
  if (dimensions in WIDTHS) document.body.style.maxWidth = WIDTHS[dimensions];
}

// Viewport-independent content height: the bottom-most border edge of the body
// and all its descendants (absolutely positioned overlays included; hidden
// elements report 0). Example documents are small, so the full scan is cheap.
function contentHeight() {
  let bottom = document.body.getBoundingClientRect().bottom;
  for (const element of document.body.querySelectorAll('*')) {
    const rect = element.getBoundingClientRect();
    if (rect.bottom > bottom) bottom = rect.bottom;
  }
  return Math.ceil(bottom + window.scrollY);
}

let reportQueued = false;
function reportHeight() {
  if (reportQueued || window.parent === window) return;
  reportQueued = true;
  requestAnimationFrame(() => {
    reportQueued = false;
    window.parent.postMessage({ type: 'fivenine:height', height: contentHeight() }, '*');
  });
}

const params = new URLSearchParams(location.search);
applyTheme(params.get('theme'));
applyDimensions(params.get('dimensions'));

document.body.style.margin = '0';
document.body.style.padding = '1rem';
document.body.style.boxSizing = 'border-box';

new ResizeObserver(reportHeight).observe(document.documentElement);
// Catches overlays opening/closing (class toggles) that don't resize any element.
new MutationObserver(reportHeight).observe(document.body, {
  attributes: true,
  childList: true,
  subtree: true,
});
window.addEventListener('load', reportHeight);

window.addEventListener('message', (event) => {
  if (event.data?.type !== 'fivenine:set') return;
  applyTheme(event.data.theme);
  applyDimensions(event.data.dimensions);
  reportHeight();
});

reportHeight();
