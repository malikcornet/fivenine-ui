// Client-side behavior for the docs: target switching, docs theme toggling,
// the version switcher, and the example frames. Each example frame has its own
// toolbar (viewport + theme) — example state is intentionally decoupled from
// the docs theme. Everything else on the page is static HTML built by Astro.

type TargetId = 'html' | 'react' | 'blazor';
type Viewport = 'mobile' | 'tablet' | 'desktop';
type Theme = 'light' | 'dark';

const TARGETS: TargetId[] = ['html', 'react', 'blazor'];
const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%',
};

const base = document.body.dataset.base ?? '/';
// base ends in "docs/"; examples live in sibling folders per target.
const siteRoot = base.replace(/docs\/$/, '');
// In dev the layout provides per-target dev-server origins; empty in prod.
const exampleOrigins = JSON.parse(document.body.dataset.exampleOrigins ?? '{}') as Partial<
  Record<TargetId, string>
>;

let target: TargetId = (() => {
  const stored = localStorage.getItem('fn-docs-target') as TargetId | null;
  return stored && TARGETS.includes(stored) ? stored : 'html';
})();
let docsTheme: Theme =
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

const targetSelect = document.querySelector<HTMLSelectElement>('[data-target-select]');
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

function exampleUrl(frame: HTMLElement, route: string): string {
  const origin = exampleOrigins[target] ?? '';
  const prefix = origin ? `${origin}/` : siteRoot;
  return `${prefix}${route}?theme=${frameTheme(frame)}&dimensions=${frameViewport(frame)}`;
}

function renderFrame(frame: HTMLElement) {
  const { component = '', variant = '' } = frame.dataset;
  const statuses = JSON.parse(frame.dataset.targets ?? '{}') as Record<TargetId, string>;
  const minHeight = frameMinHeight(frame);
  const stage = frame.querySelector<HTMLElement>('.example-frame__stage')!;
  const planned = frame.querySelector<HTMLElement>('.docs-planned')!;
  const placeholder = frame.querySelector<HTMLElement>('.example-frame__placeholder')!;
  const open = frame.querySelector<HTMLAnchorElement>('.example-frame__open')!;
  let iframe = frame.querySelector('iframe');

  const isPlanned = statuses[target] === 'planned';
  frame.classList.toggle('example-frame--planned', isPlanned);
  if (isPlanned) {
    planned.hidden = false;
    placeholder.hidden = true;
    iframe?.remove();
    return;
  }
  planned.hidden = true;

  // URL convention: always trailing-slashed (every target serves a directory
  // index), so no host redirect is involved and query params always survive.
  const route = `${target}/${component}/${variant}/`;
  const url = exampleUrl(frame, route);
  open.href = url;

  for (const button of frame.querySelectorAll<HTMLButtonElement>('[data-viewport]')) {
    button.classList.toggle(
      'example-frame__tool--active',
      button.dataset.viewport === frameViewport(frame),
    );
  }
  const frameThemeButton = frame.querySelector<HTMLButtonElement>('[data-frame-theme]');
  if (frameThemeButton) frameThemeButton.textContent = frameTheme(frame) === 'light' ? '☾' : '☀';

  // Lazy: only mount the iframe once the frame has scrolled into view
  // (Blazor examples boot the .NET runtime).
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
  iframe.title = `${component} / ${variant} (${target})`;
  iframe.style.width = VIEWPORT_WIDTHS[frameViewport(frame)];
  iframe.style.minHeight = `${minHeight}px`;

  if (iframe.dataset.route !== route) {
    // Different example (target switch or first load): navigate the iframe.
    iframe.dataset.route = route;
    iframe.src = url;
  } else {
    // Same example, new theme/viewport: restyle live via the shell's message
    // channel — no reload (a reload would re-boot Blazor's WASM runtime).
    iframe.contentWindow?.postMessage(
      { type: 'fivenine:set', theme: frameTheme(frame), dimensions: frameViewport(frame) },
      '*',
    );
  }
}

function render() {
  for (const frame of frames) renderFrame(frame);
  for (const block of document.querySelectorAll<HTMLElement>('[data-code-target]')) {
    block.hidden = block.dataset.codeTarget !== target;
  }
  if (targetSelect) targetSelect.value = target;
  if (themeToggle) themeToggle.textContent = docsTheme === 'light' ? '☾' : '☀';
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

targetSelect?.addEventListener('change', () => {
  target = targetSelect.value as TargetId;
  localStorage.setItem('fn-docs-target', target);
  render();
});

// The docs theme only affects the docs chrome — example frames keep their own
// per-frame theme toggles.
themeToggle?.addEventListener('click', () => {
  docsTheme = docsTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('fn-docs-theme', docsTheme);
  document.documentElement.setAttribute('data-theme', docsTheme);
  if (themeToggle) themeToggle.textContent = docsTheme === 'light' ? '☾' : '☀';
});

// Version switcher: versions.json sits at the site root, two levels above
// BASE_URL ("/<repo>/<version>/docs/"). In dev the fetch 404s and it stays hidden.
if (versionSelect) {
  const root = new URL('../../', new URL(base, location.origin));
  fetch(new URL('versions.json', root))
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { latest: string; versions: string[] } | null) => {
      if (!data) return;
      const segments = new URL(base, location.origin).pathname.split('/').filter(Boolean);
      const docsIndex = segments.lastIndexOf('docs');
      const current = docsIndex > 0 ? segments[docsIndex - 1] : data.latest;
      for (const version of data.versions) {
        const option = document.createElement('option');
        option.value = version;
        option.textContent = `v${version}`;
        versionSelect.append(option);
      }
      versionSelect.value = data.versions.includes(current) ? current : data.latest;
      versionSelect.hidden = false;
      versionSelect.addEventListener('change', () => {
        location.href = `${root.pathname}${versionSelect.value}/docs/`;
      });
    })
    .catch(() => {});
}

render();
