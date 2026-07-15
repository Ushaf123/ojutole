import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { LanguageProvider } from "@/hooks/useLanguage"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <TRPCProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </TRPCProvider>
  </BrowserRouter>,
)
