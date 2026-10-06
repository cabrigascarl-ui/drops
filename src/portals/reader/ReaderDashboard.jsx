import React,{useMemo} from 'react'
import {Link} from 'react-router-dom'
import {ChevronRight,CloudOff,Gauge,TrendingDown,TrendingUp,Users,CheckCircle2,Clock} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {routeOrder,usageOf,LOW_USAGE,greeting,todayLabel,timeLabel,displayName} from './readerShared.js'

function Donut({read,total}){
  const radius=46,circumference=2*Math.PI*radius
  const percent=total?read/total:0
  return <svg viewBox="0 0 120 120" className="reader-donut" role="img" aria-label={`${Math.round(percent*100)} percent read`}>
    <circle cx="60" cy="60" r={radius} className="donut-track"/>
    <circle cx="60" cy="60" r={radius} className="donut-value" strokeDasharray={`${circumference*percent} ${circumference}`} transform="rotate(-90 60 60)"/>
    <text x="60" y="66" textAnchor="middle" className="donut-text">{Math.round(percent*100)}%</text>
  </svg>
}

function Tile({tone,icon:Icon,value,label}){
  return <div className="r-tile"><span className={`r-icon g-${tone}`}><Icon size={20}/></span><strong>{value}</strong><small>{label}</small></div>
}

export default function ReaderDashboard(){
  const {data,session,period,online,levelOf,thresholds,lastSync}=useData()
  const route=session?.route||[]
  const assigned=useMemo(()=>routeOrder(data.consumers,route),[data.consumers,route])
  const readIds=new Set(data.readings.filter(r=>r.date?.startsWith(period)).map(r=>r.consumerId))
  const read=assigned.filter(c=>readIds.has(c.id)).length
  const unread=assigned.length-read
  const high=assigned.filter(c=>['HIGH','CRITICAL'].includes(levelOf(c))).length
  const low=assigned.filter(c=>usageOf(c)<LOW_USAGE).length
  const average=assigned.length?(assigned.reduce((sum,c)=>sum+usageOf(c),0)/assigned.length).toFixed(1):'0.0'
  const pending=data.readings.filter(r=>r.sync==='Pending Sync').length
  return <div className="reader-page">
    <header className="reader-hero">
      <div className="reader-hero-top"><span className="reader-brand"><span className="reader-logo">D</span>DROPS</span><span className={`reader-net ${online?'on':'off'}`}>{online?'Online':'Offline'}</span></div>
      <p className="reader-greet">{greeting()}</p>
      <h1>{displayName(session?.name)}!</h1>
      <div className="reader-chips"><span><Clock size={13}/>{todayLabel()}</span><span>{timeLabel()}</span></div>
      <div className="reader-progress">
        <div className="reader-progress-head"><span>Reading progress</span><span><strong>{read}</strong>/{assigned.length} read</span></div>
        <div className="reader-progress-bar"><span style={{width:`${assigned.length?read/assigned.length*100:0}%`}}/></div>
      </div>
    </header>
    {!online&&<div className="reader-offline"><CloudOff size={16}/> Offline. Readings are saved on this device and sync when you reconnect.</div>}
    <section className="reader-section">
      <h3 className="reader-label">Overview</h3>
      <div className="reader-tiles">
        <Tile tone="blue" icon={Users} value={assigned.length} label="Customers"/>
        <Tile tone="green" icon={CheckCircle2} value={read} label="Read"/>
        <Tile tone="red" icon={Clock} value={unread} label="Unread"/>
        <Tile tone="amber" icon={TrendingUp} value={high} label="High cons."/>
        <Tile tone="teal" icon={TrendingDown} value={low} label="Low cons."/>
        <Tile tone="violet" icon={Gauge} value={`${average} m³`} label="Avg cons."/>
      </div>
    </section>
    <section className="reader-section">
      <h3 className="reader-label">Breakdown</h3>
      <div className="reader-card reader-breakdown">
        <Donut read={read} total={assigned.length}/>
        <ul>
          <li><i className="dot blue"/>Read<b>{read}</b></li>
          <li><i className="dot red"/>Unread<b>{unread}</b></li>
          <li><i className="dot amber"/>High cons.<b>{high}</b></li>
          <li><i className="dot teal"/>Low cons.<b>{low}</b></li>
        </ul>
      </div>
    </section>
    <section className="reader-section">
      <p className="reader-foot">{pending?`${pending} reading${pending===1?'':'s'} waiting to sync. `:''}{lastSync?`Last synced ${new Date(lastSync).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})}.`:'Not synced yet on this device.'}</p>
    </section>
  </div>
}
