import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fivenine-collective/ui/all.css';
import { App } from './App';

// The example shell (theme/dimensions URL params + height reporting) lives
// once in the core library.
import '@fivenine-collective/ui/example-frame';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
