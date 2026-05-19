import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useAuthStore } from './stores/authStore'

// Legacy context providers
import { LanguageProvider } from './contexts/LanguageContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { UserMemoryProvider } from './contexts/UserMemoryContext'

// Initialize auth listener before render
useAuthStore.getState().initialize()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <SidebarProvider>
        <UserMemoryProvider>
          <App />
        </UserMemoryProvider>
      </SidebarProvider>
    </LanguageProvider>
  </StrictMode>,
)