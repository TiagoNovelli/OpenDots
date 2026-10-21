import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './style.css';
import './editor.css';
import { watchSystemTheme } from './theme';
watchSystemTheme();
// Installs the app and receives notifications; failure only loses those.
if ('serviceWorker' in navigator)
  void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
