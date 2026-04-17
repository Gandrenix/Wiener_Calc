import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// 👇 AQUÍ IMPORTAMOS EL PODER ABSOLUTO 👇
import './styles.scss'

// This finds the <div id="root"> in the index.html and injects WienerCalc into it!
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)