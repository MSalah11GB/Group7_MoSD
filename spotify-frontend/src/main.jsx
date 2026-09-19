import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PlayerProvider from './context/PlayerProvider.jsx'
import PlaylistProvider from './context/PlaylistProvider.jsx'
import AuthSync from './components/AuthSync'
import ErrorBoundary from './components/ErrorBoundary'
import './config/authToken'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key')
}

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl='/'>
                <QueryClientProvider client={queryClient}>
                    <BrowserRouter>
                        <PlayerProvider>
                            <PlaylistProvider>
                                <AuthSync />
                                <App />
                            </PlaylistProvider>
                        </PlayerProvider>
                    </BrowserRouter>
                </QueryClientProvider>
            </ClerkProvider>
        </ErrorBoundary>
    </StrictMode>,
)
