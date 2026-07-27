import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress non-critical ResizeObserver loop notifications in canvas layout engine
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e: ErrorEvent) => {
    if (e.message && (e.message.includes('ResizeObserver loop') || e.message.includes('undelivered notifications'))) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

