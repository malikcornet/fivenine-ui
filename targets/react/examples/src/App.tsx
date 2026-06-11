import { Suspense, lazy, useMemo } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';

// Convention: every example lives at src/examples/{component}/{variant}.tsx and
// default-exports a React component. The route /react/{component}/{variant}
// resolves to it by path.
const modules = import.meta.glob('./examples/*/*.tsx') as Record<
  string,
  () => Promise<{ default: React.ComponentType }>
>;

function ExamplePage() {
  const { component, variant } = useParams();
  const key = `./examples/${component}/${variant}.tsx`;
  const Example = useMemo(() => (modules[key] ? lazy(modules[key]) : null), [key]);

  if (!Example) {
    return (
      <p>
        No example at <code>{component}/{variant}</code>.
      </p>
    );
  }

  return (
    <Suspense fallback={null}>
      <Example />
    </Suspense>
  );
}

function Index() {
  const links = Object.keys(modules)
    .map((key) => key.replace('./examples/', '').replace(/\.tsx$/, ''))
    .sort();
  return (
    <main>
      <h1>fivenine ui — React examples</h1>
      <ul>
        {links.map((path) => (
          <li key={path}>
            <a href={`${import.meta.env.BASE_URL}${path}`}>{path}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/:component/:variant" element={<ExamplePage />} />
    </Routes>
  );
}
