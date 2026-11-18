import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { watchSystemTheme } from './lib/theme'

watchSystemTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// PWA: el service worker solo en producción, para no estorbar la recarga en caliente de Vite
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sin service worker la app funciona igual, solo no se puede instalar ni abrir sin conexión
    });
  });
}
