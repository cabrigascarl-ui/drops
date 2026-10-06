import React,{useMemo,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {ArrowLeft,ChevronRight,Search} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {routeOrder} from './readerShared.js'

// Quick search across the route: account, name, meter, address or barangay.
export default function ReaderSearch(){
  const {data,session}=useData()
  const navigate=useNavigate()
  const [query,setQuery]=useState('')
  const ordered=useMemo(()=>routeOrder(data.consumers,session?.route||[]),[data.consumers,session])
  const q=query.trim().toLowerCase()
  const results=q?ordered.filter(c=>[c.account,c.name,c.meter,c.address,c.barangay].join(' ').toLowerCase().includes(q)).slice(0,30):[]
  // Sample customers from the reader's own route, so the screen has something to try before any search.
  const samples=useMemo(()=>ordered.filter(c=>!session?.route?.length||session.route.includes(c.barangay)).slice(0,5),[ordered,session])
  return <div className="reader-page">
    <header className="reader-hero compact">
      <div className="reader-hero-top"><button className="reader-icon-btn" onClick={()=>navigate('/reader/route')} aria-label="Back to route"><ArrowLeft size={18}/></button><h1>Search</h1><span/></div>
    </header>
    <label className="reader-search big"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Account, name, meter or address"/></label>
    <ul className="reader-list">
      {q===''&&<li className="reader-empty">Type to find a customer, or try one of these samples from your route.</li>}
      {q!==''&&results.length===0&&<li className="reader-empty">No customers match “{query}”.</li>}
      {(q===''?samples:results).map(c=><li key={c.id}><button onClick={()=>navigate(`/reader/read/${c.id}`)}>
        <span className="reader-row-main"><small>{c.account} · Meter {c.meter}</small><strong>{c.name}</strong><em>{c.address}, Brgy. {c.barangay}</em></span>
        <ChevronRight size={18}/>
      </button></li>)}
    </ul>
  </div>
}
