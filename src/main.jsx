import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './faculty/lib/queryClient'
import './index.css'
import App from './App.jsx'

async function enableMocking() {
  if (import.meta.env.PROD) {
    return
  }

  // Import the worker from the admin mocks
  const { worker } = await import('./admin/mocks/browser')

  // Start the worker
  return worker.start({
    onUnhandledRequest: 'bypass', // Don't warn about unhandled requests (like real API calls)
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
})
