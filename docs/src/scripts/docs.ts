// Client-side behavior for the docs: docs theme toggling, the version
// switcher, and the example frames. Each example frame has its own toolbar
// (viewport + theme) — example state is intentionally decoupled from the docs
// theme. Everything else on the page is static HTML built by Astro.

type Viewport = 'mobile' | 'tablet' | 'desktop';
type Theme = 'light' | 'dark';

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%',
};

// base is "/" in dev and "/<repo>/<version>/" on the published site; example
// pages live under it at examples/{component}/{variant}/.
const base = document.body.dataset.base ?? '/';

let docsTheme: Theme =
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

const themeToggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const versionSelect = document.querySelector<HTMLSelectElement>('[data-version-select]');
const frames = [...document.querySelectorAll<HTMLElement>('.example-frame')];

// Per-frame state lives on the element itself (dataset); frames start on the
// docs theme but are independent after.
function frameTheme(frame: HTMLElement): Theme {
  return frame.dataset.frameTheme === 'dark' ? 'dark' : 'light';
}
function frameViewport(frame: HTMLElement): Viewport {
  const viewport = frame.dataset.frameViewport;
  return viewport === 'mobile' || viewport === 'tablet' ? viewport : 'desktop';
}
function frameMinHeight(frame: HTMLElement): number {
  return Number(frame.dataset.minHeight ?? 96);
}

function exampleUrl(frame: HTMLElement): string {
  // Always trailing-slashed (every example builds to a directory index), so no
  // host redirect is involved and query params always survive.
  return `${base}examples/${frame.dataset.path}/?theme=${frameTheme(frame)}&dimensions=${frameViewport(frame)}`;
}

function renderFrame(frame: HTMLElement) {
  const path = frame.dataset.path ?? '';
  const minHeight = frameMinHeight(frame);
  const stage = frame.querySelector<HTMLElement>('.example-frame__stage')!;
  const placeholder = frame.querySelector<HTMLElement>('.example-frame__placeholder')!;
  const open = frame.querySelector<HTMLAnchorElement>('.example-frame__open')!;
  let iframe = frame.querySelector('iframe');

  const url = exampleUrl(frame);
  open.href = url;

  for (const button of frame.querySelectorAll<HTMLButtonElement>('[data-viewport]')) {
    button.classList.toggle(
      'example-frame__tool--active',
      button.dataset.viewport === frameViewport(frame),
    );
  }
  const frameThemeButton = frame.querySelector<HTMLButtonElement>('[data-frame-theme]');
  if (frameThemeButton) frameThemeButton.textContent = frameTheme(frame) === 'light' ? '☾' : '☀';

  // Lazy: only mount the iframe once the frame has scrolled into view.
  if (frame.dataset.visible !== 'true') {
    placeholder.hidden = false;
    placeholder.style.height = `${minHeight}px`;
    return;
  }

  placeholder.hidden = true;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.style.height = `${minHeight}px`;
    stage.append(iframe);
  }
  iframe.title = path;
  iframe.style.width = VIEWPORT_WIDTHS[frameViewport(frame)];
  iframe.style.minHeight = `${minHeight}px`;

  if (!iframe.src) {
    // First mount: navigate the iframe.
    iframe.src = url;
  } else {
    // New theme/viewport: restyle live via the shell's message channel — no
    // reload, so overlay state inside the example survives.
    iframe.contentWindow?.postMessage(
      { type: 'fivenine:set', theme: frameTheme(frame), dimensions: frameViewport(frame) },
      '*',
    );
  }
}

// --- frame wiring -------------------------------------------------------------

for (const frame of frames) {
  frame.dataset.frameTheme = docsTheme;
  frame.dataset.frameViewport = 'desktop';

  for (const button of frame.querySelectorAll<HTMLButtonElement>('[data-viewport]')) {
    button.addEventListener('click', () => {
      frame.dataset.frameViewport = button.dataset.viewport;
      renderFrame(frame);
    });
  }

  frame.querySelector('[data-frame-theme]')?.addEventListener('click', () => {
    frame.dataset.frameTheme = frameTheme(frame) === 'light' ? 'dark' : 'light';
    renderFrame(frame);
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const frame = entry.target as HTMLElement;
      frame.dataset.visible = 'true';
      observer.unobserve(frame);
      renderFrame(frame);
    }
  },
  { rootMargin: '200px' },
);
for (const frame of frames) observer.observe(frame);

window.addEventListener('message', (event) => {
  if (event.data?.type !== 'fivenine:height') return;
  for (const frame of frames) {
    const iframe = frame.querySelector('iframe');
    if (iframe && iframe.contentWindow === event.source) {
      iframe.style.height = `${Math.max(frameMinHeight(frame), event.data.height)}px`;
    }
  }
});

// --- header wiring ------------------------------------------------------------

// The docs theme only affects the docs chrome — example frames keep their own
// per-frame theme toggles.
themeToggle?.addEventListener('click', () => {
  docsTheme = docsTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('fn-docs-theme', docsTheme);
  document.documentElement.setAttribute('data-theme', docsTheme);
  if (themeToggle) themeToggle.textContent = docsTheme === 'light' ? '☾' : '☀';
});
if (themeToggle) themeToggle.textContent = docsTheme === 'light' ? '☾' : '☀';

// Version switcher: latest docs live at the site root next to versions.json;
// released versions live in /<version>/ subfolders. Which one this page is
// comes from data-docs-version (baked in at build time by build-site.mjs).
// In dev the fetch 404s and the switcher stays hidden.
if (versionSelect) {
  const docsVersion = document.body.dataset.docsVersion || 'latest';
  const baseUrl = new URL(base, location.origin);
  const root = docsVersion === 'latest' ? baseUrl : new URL('..', baseUrl);
  fetch(new URL('versions.json', root))
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { latest: string; versions: string[] } | null) => {
      if (!data) return;
      const latestOption = document.createElement('option');
      latestOption.value = 'latest';
      latestOption.textContent = `latest (v${data.latest})`;
      versionSelect.append(latestOption);
      for (const version of data.versions) {
        const option = document.createElement('option');
        option.value = version;
        option.textContent = `v${version}`;
        versionSelect.append(option);
      }
      versionSelect.value = data.versions.includes(docsVersion) ? docsVersion : 'latest';
      versionSelect.hidden = false;
      versionSelect.addEventListener('change', () => {
        location.href =
          versionSelect.value === 'latest'
            ? root.pathname
            : `${root.pathname}${versionSelect.value}/`;
      });
    })
    .catch(() => {});
}

for (const frame of frames) renderFrame(frame);
