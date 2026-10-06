import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { DataProvider } from './context/DataContext.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import './styles.css'
import 'leaflet/dist/leaflet.css'

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AppErrorBoundary><DataProvider><App /></DataProvider></AppErrorBoundary></BrowserRouter></React.StrictMode>)
