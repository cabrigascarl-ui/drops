import React,{useMemo,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {Camera,ChevronRight,FileText,TrendingDown,TrendingUp,TriangleAlert} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {dateISO} from '../../services/billingService.js'
import {routeOrder,usageOf,levelOfUsage,LOW_USAGE} from './readerShared.js'

// Reports for the reader's own route. Each card opens its list; tapping a customer opens the reading form.
export default function ReaderReports(){
  const {data,session,thresholds}=useData()
  const navigate=useNavigate()
  const [view,setView]=useState('daily')
  const mine=useMemo(()=>routeOrder(data.consumers,session?.route||[]),[data.consumers,session])
  const byId=Object.fromEntries(mine.map(c=>[c.id,c]))
  const today=dateISO()
  const todays=data.readings.filter(r=>r.date===today&&byId[r.consumerId]).map(r=>({...r,consumer:byId[r.consumerId]}))
  const high=mine.filter(c=>['HIGH','CRITICAL'].includes(levelOfUsage(c,thresholds))).map(c=>({consumer:c,usage:usageOf(c)}))
  const low=mine.filter(c=>usageOf(c)<LOW_USAGE).map(c=>({consumer:c,usage:usageOf(c)}))
  const photos=data.readings.filter(r=>r.photo&&byId[r.consumerId]).map(r=>({...r,consumer:byId[r.consumerId]}))
  const issues=data.readings.filter(r=>r.remarks&&byId[r.consumerId]).map(r=>({...r,consumer:byId[r.consumerId]}))
  const cards=[
    {key:'daily',tone:'blue',icon:FileText,title:'Daily Reading Report',text:`${todays.length} meter${todays.length===1?'':'s'} read today`},
    {key:'high',tone:'amber',icon:TrendingUp,title:'High Consumption Report',text:`${high.length} account${high.length===1?'':'s'} above the normal ceiling`},
    {key:'low',tone:'green',icon:TrendingDown,title:'Low Consumption Report',text:`${low.length} account${low.length===1?'':'s'} under ${LOW_USAGE} m³`},
    {key:'photos',tone:'violet',icon:Camera,title:'Meter Photo Gallery',text:`${photos.length} photo${photos.length===1?'':'s'} · ${issues.length} issue${issues.length===1?'':'s'} recorded`}
  ]
  const list=(rows,render)=>rows.length?<ul className="reader-list">{rows.map(row=><li key={row.id||row.consumer.id}><button onClick={()=>navigate(`/reader/read/${row.consumer.id}`)}>{render(row)}<ChevronRight size={18}/></button></li>)}</ul>:<p className="reader-empty">Nothing to show yet.</p>
  return <div className="reader-page">
    <header className="reader-hero compact"><div className="reader-hero-top"><h1>Analytics &amp; Reports</h1><span/></div><p className="reader-hero-sub">Select a report to view</p></header>
    <div className="reader-report-cards">
      {cards.map(card=><button key={card.key} className={`reader-report ${view===card.key?'active':''}`} onClick={()=>setView(card.key)}>
        <span className={`r-icon g-${card.tone}`}><card.icon size={20}/></span>
        <span><strong>{card.title}</strong><small>{card.text}</small></span>
        <ChevronRight size={18}/>
      </button>)}
    </div>
    <section className="reader-section">
      {view==='daily'&&<><h3 className="reader-label">Read today · {today}</h3>{list(todays,r=><span className="reader-row-main"><small>{r.consumer.account} · {r.date}</small><strong>{r.consumer.name}</strong><em>{r.previous} → {r.current} m³ ({r.current-r.previous} m³)</em></span>)}</>}
      {view==='high'&&<><h3 className="reader-label">High consumption</h3>{list(high,r=><span className="reader-row-main"><small>{r.consumer.account} · {r.consumer.type}</small><strong>{r.consumer.name}</strong><em><TriangleAlert size={12}/> {r.usage} m³ · Brgy. {r.consumer.barangay}</em></span>)}</>}
      {view==='low'&&<><h3 className="reader-label">Low consumption (under {LOW_USAGE} m³)</h3>{list(low,r=><span className="reader-row-main"><small>{r.consumer.account}</small><strong>{r.consumer.name}</strong><em>{r.usage} m³ · Brgy. {r.consumer.barangay}</em></span>)}</>}
      {view==='photos'&&<><h3 className="reader-label">Photos and issues</h3>{list([...photos,...issues.filter(i=>!photos.some(p=>p.id===i.id))],r=><span className="reader-row-main"><small>{r.consumer.account} · {r.date}</small><strong>{r.consumer.name}</strong><em>{r.photo?`Photo: ${r.photo}`:''}{r.remarks?` Remarks: ${r.remarks}`:''}</em></span>)}</>}
    </section>
  </div>
}
