import React from 'react'
import {NavLink} from 'react-router-dom'
import {ArrowLeftRight,CheckCircle2,FileText,Home,Search,UserRound} from 'lucide-react'

// Phone-style frame for the meter reader: content scrolls, tabs stay at the bottom, search sits in the centre.
export default function ReaderShell({children,toast}){
  return <div className="reader-stage">
    <div className="reader-phone">
      <div className="reader-scroll">{children}</div>
      <nav className="reader-tabs" aria-label="Meter reader navigation">
        <NavLink to="/reader" end><Home size={21}/><span>Dashboard</span></NavLink>
        <NavLink to="/reader/reports"><FileText size={21}/><span>Reports</span></NavLink>
        <NavLink to="/reader/search" className="reader-fab" aria-label="Search accounts"><Search size={24}/></NavLink>
        <NavLink to="/reader/sync"><ArrowLeftRight size={21}/><span>Sync</span></NavLink>
        <NavLink to="/reader/profile"><UserRound size={21}/><span>Profile</span></NavLink>
      </nav>
      {toast&&<div className="reader-toast"><CheckCircle2 size={16}/><span>{toast}</span></div>}
    </div>
  </div>
}
