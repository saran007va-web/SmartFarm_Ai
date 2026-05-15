import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App'
import { LanguageProvider } from './contexts/LanguageContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { UserMemoryProvider } from './contexts/UserMemoryContext'
import { ThemeProvider } from './contexts/ThemeContext'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <LanguageProvider>
        <SidebarProvider>
          <UserMemoryProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </UserMemoryProvider>
        </SidebarProvider>
      </LanguageProvider>
    </StrictMode>
  )
}
