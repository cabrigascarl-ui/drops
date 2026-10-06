import React,{useMemo,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {ArrowDownUp,ChevronRight,Filter,Search} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {routeOrder,usageOf} from './readerShared.js'

const TABS=[['unread','Unread'],['read','Read'],['all','All']]
const SORTS=[['asc','Seq (Asc)'],['desc','Seq (Desc)'],['name','Name (A–Z)']]

// The meter reader's route: search, filter by reading status and barangay, sort, and open a customer to read.
export default function ReaderRoute(){
  const {data,session,period}=useData()
  const navigate=useNavigate()
  const [tab,setTab]=useState('unread'),[sort,setSort]=useState('asc'),[query,setQuery]=useState(''),[barangay,setBarangay]=useState(''),[showFilter,setShowFilter]=useState(false)
  const route=session?.route||[]
  const ordered=useMemo(()=>routeOrder(data.consumers,route),[data.consumers,route])
  const readIds=useMemo(()=>new Set(data.readings.filter(r=>r.date?.startsWith(period)).map(r=>r.consumerId)),[data.readings,period])
  const sequence=new Map(ordered.map((c,i)=>[c.id,i+1]))
  const read=ordered.filter(c=>readIds.has(c.id)).length
  const q=query.trim().toLowerCase()
  let rows=ordered.filter(c=>(tab==='all'||(tab==='read')===readIds.has(c.id))&&(!barangay||c.barangay===barangay)&&[c.account,c.name,c.meter,c.address,c.barangay].join(' ').toLowerCase().includes(q))
  rows=sort==='name'?[...rows].sort((a,b)=>a.name.localeCompare(b.name)):sort==='desc'?[...rows].reverse():rows
  const seq=n=>String(n).padStart(3,'0')
  return <div className="reader-page">
    <header className="reader-hero compact">
      <div className="reader-hero-top"><h1>Reading Route</h1><button className={`reader-icon-btn ${showFilter?'on':''}`} onClick={()=>setShowFilter(!showFilter)} aria-label="Filter by barangay"><Filter size={18}/></button></div>
      {showFilter&&<label className="reader-filter"><span>Barangay</span><select value={barangay} onChange={e=>setBarangay(e.target.value)}><option value="">All barangays</option>{route.map(b=><option key={b} value={b}>{b}</option>)}</select></label>}
    </header>
    <div className="reader-summary">
      <div><span>Unread</span><strong>{ordered.length-read}</strong></div>
      <div><span>Read</span><strong className="green">{read}</strong></div>
      <div><span>Total</span><strong className="blue">{ordered.length}</strong></div>
    </div>
    <label className="reader-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by seq, account, name, meter, address"/></label>
    <div className="reader-toolbar">
      <div className="reader-segment" role="tablist">{TABS.map(([key,label])=><button key={key} role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</div>
      <button className="reader-sort" onClick={()=>setSort(SORTS[(SORTS.findIndex(([k])=>k===sort)+1)%SORTS.length][0])}><ArrowDownUp size={14}/>{SORTS.find(([k])=>k===sort)[1]}</button>
    </div>
    <ul className="reader-list">
      {rows.map(c=>{const isRead=readIds.has(c.id);return <li key={c.id}><button onClick={()=>navigate(`/reader/read/${c.id}`)}>
        <span className={`reader-dot ${isRead?'read':'unread'}`}/>
        <span className="reader-row-main"><small><b>{seq(sequence.get(c.id))}</b> | {c.account}</small><strong>{c.name}</strong><em>Brgy. {c.barangay}{isRead?` · ${usageOf(c)} m³`:''}</em></span>
        <ChevronRight size={18}/>
      </button></li>})}
      {rows.length===0&&<li className="reader-empty">No customers match this view.</li>}
    </ul>
  </div>
}
