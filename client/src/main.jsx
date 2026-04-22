import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { extendFabricPrototype } from './lib/fabricExtensions.js'

// Initialize custom Fabric properties once
extendFabricPrototype()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
