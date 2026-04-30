import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DialRoot } from 'dialkit'
import 'dialkit/styles.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <DialRoot position="top-right" defaultOpen theme="dark" />
  </StrictMode>,
)
