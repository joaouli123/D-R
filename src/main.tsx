import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from '@/store/AppStore'
import { ToastProvider } from '@/components/ui'
import { AvisoNovaVersao } from '@/components/AvisoNovaVersao'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          <App />
          {/* Fora do App de propósito: o aviso precisa aparecer também na
              tela de login e enquanto a API ainda está carregando. */}
          <AvisoNovaVersao />
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
