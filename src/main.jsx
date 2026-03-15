import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './faculty/lib/queryClient'
const APP_VERSION = '1.0.1'; // Increment this whenever a hard cache clear is needed

// Aggressive Cache Busting
(() => {
  const currentVersion = localStorage.getItem('app_version');
  if (currentVersion !== APP_VERSION) {
    console.log(`Updating app from version ${currentVersion || 'none'} to ${APP_VERSION}`);
    localStorage.clear(); // Option 1: Clear everything (aggressive)
    // OR just set the new version: localStorage.setItem('app_version', APP_VERSION);
    localStorage.setItem('app_version', APP_VERSION);
    
    // Clear Service Worker Caches
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }

    // Force a hard reload from the server (bypassing browser cache)
    window.location.reload(true);
  }
})();

// Global error handler for chunk load failures
window.addEventListener('error', (event) => {
  const error = event.error || event.reason;
  if (/Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(error?.message || '')) {
    console.error('Chunk load error detected, reloading...', error);
    const storageKey = 'retry-chunk-error';
    const lastReload = sessionStorage.getItem(storageKey);
    const now = Date.now();

    // Limit to 1 reload per 10 seconds to avoid infinite loops
    if (!lastReload || now - parseInt(lastReload) > 10000) {
      sessionStorage.setItem(storageKey, now.toString());
      window.location.reload();
    }
  }
});

import './index.css'
import App from './App.jsx'

import ErrorBoundary from './shared/components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)

// Automatically check for SW updates and reload if necessary
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(swUrl, r) {
    // Check for updates every 60 minutes
    r && setInterval(() => {
      r.update();
    }, 60 * 60 * 1000);
  },
  onOfflineReady() {
    console.log('App is ready to work offline.')
  },
});

// Detect when the new service worker takes over and reload the page
let refreshing = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
