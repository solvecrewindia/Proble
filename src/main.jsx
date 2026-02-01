import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './faculty/lib/queryClient'
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
