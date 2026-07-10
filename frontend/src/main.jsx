import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { RealtimeSessionProvider } from './context/RealtimeSessionContext.jsx'
import './styles/variables.css'
import './styles/global.css'
import './styles/components.css'
import './styles/pages.css'
import './styles/profile.css'
import './styles/positioning.css'
import './styles/height-adjustment.css'
import './styles/session.css'
import './styles/rtl.css'
import './styles/animations.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RealtimeSessionProvider>
      <App />
    </RealtimeSessionProvider>
  </StrictMode>,
)
