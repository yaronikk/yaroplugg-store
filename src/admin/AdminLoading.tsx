import React from 'react'
import {LoaderCircle} from 'lucide-react'
import {AdminFrame} from './AdminFrame'
export function AdminLoading(){return <div className="admin-loading"><LoaderCircle size={26} className="spin"/><span>LOADING ADMIN</span></div>}
