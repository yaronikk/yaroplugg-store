import React from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import {App} from './App'
import {AdminApp} from './admin/AdminApp'
import {I18nProvider} from './i18n'
const root=document.getElementById('root')!
createRoot(root).render(<I18nProvider>{window.location.pathname.startsWith('/admin')?<AdminApp/>:<App/>}</I18nProvider>)
