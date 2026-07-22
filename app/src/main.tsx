import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router'
import './i18n'
import App from '@app-surface'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { HashRouteBridge } from './components/patterns/HashRouteBridge'
import { normalizeInitialHashRoute } from './lib/hashRoute'

const useHashRouter = import.meta.env.VITE_ROUTER_MODE === 'hash'
const routerBaseName =
  import.meta.env.BASE_URL && import.meta.env.BASE_URL !== './' && import.meta.env.BASE_URL !== '/'
    ? import.meta.env.BASE_URL.replace(/\/$/, '')
    : undefined

if (!useHashRouter) {
  normalizeInitialHashRoute(routerBaseName)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {useHashRouter ? (
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    ) : (
      <BrowserRouter basename={routerBaseName}>
        <AuthProvider>
          <HashRouteBridge />
          <App />
        </AuthProvider>
      </BrowserRouter>
    )}
  </React.StrictMode>
)
