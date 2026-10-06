import React,{useMemo,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {Users,ScanLine,Wallet,ReceiptText,ArrowUpRight,ArrowRight,Droplets,Bell,MapPin,Activity,ShieldCheck,Landmark,Building2,ChevronRight,Gauge,History} from 'lucide-react'
import {Bar,Line,ComposedChart,CartesianGrid,XAxis,YAxis,Tooltip,ResponsiveContainer} from 'recharts'
import {useData} from '../context/DataContext.jsx'
import {peso,billStatus,formatDate,consumptionOf,dateISO,timeAgo} from '../services/billingService.js'
import {periodLabel} from '../services/reportService.js'
import {Card,CardHead,StatCard,StatusBadge,AlertCard} from '../components/UI.jsx'
import SamarCoverageMap from '../components/SamarCoverageMap.jsx'

const sum=(list,pick)=>list.reduce((total,item)=>total+pick(item),0)
const pct=(now,before)=>before?Math.round((now-before)/before*100):null
const greetingNow=()=>{const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening'}
const firstName=name=>(name||'').split(' ').find(part=>part.length>1&&!part.endsWith('.'))||name||''
const AUDIT_ICONS={'Meter Reading Created':ScanLine,'Payment Recorded':Wallet,'Bill Generated':ReceiptText,'Consumer Registered':Users}
const iconFor=action=>AUDIT_ICONS[action]||History

// Every figure on this page comes from the records visible to the signed-in user (the municipality's own).
export default function Dashboard(){
  const {data,session,saveSettings,period:reportPeriod}=useData()
  const navigate=useNavigate()
  const [months,setMonths]=useState(12),[type,setType]=useState('All Consumer Types')
  const today=dateISO()
  const yesterday=dateISO(new Date(Date.now()-86400000))
  const byId=useMemo(()=>Object.fromEntries(data.consumers.map(c=>[c.id,c])),[data.consumers])

  const stats=useMemo(()=>{
    const readingsToday=data.readings.filter(r=>r.date===today).length
    const readingsYesterday=data.readings.filter(r=>r.date===yesterday).length
    const collectedToday=sum(data.payments.filter(p=>p.date===today),p=>p.amount)
    const collectedYesterday=sum(data.payments.filter(p=>p.date===yesterday),p=>p.amount)
    const unpaid=data.bills.filter(b=>billStatus(b)!=='Paid')
    return {
      consumers:data.consumers.length,
      active:data.consumers.filter(c=>c.status==='Active').length,
      readingsToday,readingsChange:pct(readingsToday,readingsYesterday),
      collectedToday,collectedChange:pct(collectedToday,collectedYesterday),
      unpaidCount:unpaid.length,
      unpaidAmount:sum(unpaid,b=>b.amount)
    }
  },[data,today,yesterday])

  // Last N months, oldest first, ending with the current month.
  const trend=useMemo(()=>{
    const now=new Date()
    const keys=Array.from({length:months},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-(months-1-i),1);return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:periodLabel(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`),short:d.toLocaleString('en-US',{month:'short'})}})
    const matchType=id=>type==='All Consumer Types'||byId[id]?.type===type
    return keys.map(({key,label,short})=>({
      month:short,
      consumption:sum(data.readings.filter(r=>r.date?.startsWith(key)&&matchType(r.consumerId)),r=>consumptionOf(r.previous,r.current)),
      billing:sum(data.bills.filter(b=>b.month===label&&matchType(b.consumerId)),b=>b.amount)
    }))
  },[data,months,type,byId])
  const trendEmpty=trend.every(t=>t.consumption===0&&t.billing===0)

  const activity=useMemo(()=>[...data.audit].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,4),[data.audit])
  const alerts=[['lowUsage','Low Usage Alert','Notify when consumption is below expected level.',Activity],['billReady','Bill Ready Notification','Send SMS / app alert when a new bill is generated.',ReceiptText],['usageLimit','Usage Limit Alert','Alert when consumption reaches a user-set limit.',Bell]]
  const recentBills=data.bills.slice(0,5)
  const now=new Date()

  return <div className="dashboard">
    <div className="hero-panel">
      <div className="dashboard-intro">
        <div>
          <span className="eyebrow">{now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).toUpperCase()}</span>
          <h2>{greetingNow()}, {firstName(session?.name)} <span>👋</span></h2>
          <p>Here’s what’s happening across {session?.municipality} today.</p>
        </div>
        <div className="live-status"><span/> {session?.municipality} operations</div>
      </div>
      <div className="hero-overview">
        <div className="section-title"><div><span className="eyebrow">OVERVIEW</span><h2>At a glance</h2></div><span>Updated {now.toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit'})}</span></div>
        <div className="stats-grid">
          <StatCard label="TOTAL CONSUMERS" value={stats.consumers.toLocaleString()} change={`${stats.active} active`} detail="Registered accounts" icon={Users} tone="blue"/>
          <StatCard label="READINGS TODAY" value={stats.readingsToday.toLocaleString()} change={stats.readingsChange===null?'New today':`${stats.readingsChange>=0?'↗':'↘'} ${Math.abs(stats.readingsChange)}%`} detail="vs yesterday" icon={ScanLine} tone="cyan"/>
          <StatCard label="COLLECTIONS TODAY" value={peso(stats.collectedToday)} change={stats.collectedChange===null?'New today':`${stats.collectedChange>=0?'↗':'↘'} ${Math.abs(stats.collectedChange)}%`} detail="vs yesterday" icon={Wallet} tone="teal"/>
          <StatCard label="UNPAID BILLS" value={stats.unpaidCount.toLocaleString()} change={peso(stats.unpaidAmount)} detail="Outstanding balance" icon={ReceiptText} tone="rose"/>
        </div>
      </div>
    </div>

    <div className="dashboard-grid main-grid">
      <Card className="analytics-card">
        <CardHead title="Water consumption & billing" subtitle={`Monthly trends for ${session?.municipality}`} action={<div className="chart-controls">
          <select aria-label="Period" value={months} onChange={e=>setMonths(Number(e.target.value))}><option value={12}>Last 12 Months</option><option value={6}>Last 6 Months</option></select>
          <select aria-label="Consumer type" value={type} onChange={e=>setType(e.target.value)}><option>All Consumer Types</option><option>Residential</option><option>Commercial</option><option>Government</option><option>Institutional</option></select>
        </div>}/>
        <div className="chart-legend"><span><i className="legend-bar"/> Water Consumption (m³)</span><span><i className="legend-line"/> Billing Amount (₱)</span></div>
        <div className="chart-area">
          {trendEmpty?<div className="chart-empty"><Gauge size={26}/><p>No readings or bills for this period yet.</p></div>:
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend} margin={{top:12,right:12,left:0,bottom:0}}>
              <defs><linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0878ee"/><stop offset="100%" stopColor="#77c9ff"/></linearGradient></defs>
              <CartesianGrid stroke="#eaf0f7" vertical={false}/>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:'#8da0b8',fontSize:11}} dy={12}/>
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill:'#9aabc0',fontSize:11}} tickFormatter={v=>`${Number(v).toLocaleString()}`}/>
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill:'#9aabc0',fontSize:11}} tickFormatter={v=>`₱${Number(v).toLocaleString()}`}/>
              <Tooltip contentStyle={{border:'1px solid #e5eef8',borderRadius:14,boxShadow:'0 15px 35px #16345b17'}} formatter={(v,n)=>[n==='Consumption'?`${Number(v).toLocaleString()} m³`:peso(v),n]}/>
              <Bar yAxisId="left" dataKey="consumption" name="Consumption" fill="url(#barGradient)" radius={[6,6,0,0]} barSize={22}/>
              <Line yAxisId="right" type="monotone" dataKey="billing" name="Billing" stroke="#00bbaa" strokeWidth={3} dot={{r:3,fill:'#fff',stroke:'#00bbaa',strokeWidth:2}} activeDot={{r:5}}/>
            </ComposedChart>
          </ResponsiveContainer>}
        </div>
      </Card>
      <Card className="rate-card">
        <CardHead title="Socialized rate tiers" subtitle="Fair water pricing for everyone" action={<button className="text-link" onClick={()=>navigate('/tariff-tiers')}>View details <ArrowUpRight size={15}/></button>}/>
        <div className="tier-list">{data.tariffs.slice(0,3).map((t,i)=>{const Icon=[ShieldCheck,Droplets,Building2][i];return <div className="tier-row" key={t.id}><span className={`tier-icon tier-${i}`}><Icon size={21}/></span><div><strong>{t.name}</strong><small>{t.category}</small></div><b>{peso(t.rate)}<small> / m³</small></b></div>})}</div>
        <div className="rate-note"><span><Landmark size={18}/></span><p>Rates designed to make clean water accessible across all communities.</p></div>
      </Card>
    </div>

    <div className="dashboard-grid mid-grid">
      <Card className="map-card">
        <CardHead title="Service area" subtitle={`Coverage across ${session?.municipality||'Samar Island'}`} action={<button className="text-link" onClick={()=>navigate('/service-area')}>View map <ArrowUpRight size={15}/></button>}/>
        <SamarCoverageMap compact/>
      </Card>
      <Card className="alerts-card">
        <CardHead title="App & SMS alerts" subtitle="Keep communities informed" action={<button className="text-link" onClick={()=>navigate('/alerts')}>Manage <ChevronRight size={15}/></button>}/>
        <div className="alert-options">{alerts.map(([key,title,description,Icon])=><AlertCard key={key} icon={Icon} title={title} description={description} checked={data.settings[key]} onChange={value=>saveSettings({[key]:value})}/>)}</div>
      </Card>
    </div>

    <div className="dashboard-grid bottom-grid">
      <Card className="billing-card">
        <CardHead title="Recent billing records" subtitle="Latest accounts and their payment status" action={<button className="text-link" onClick={()=>navigate('/billing')}>View all bills <ArrowUpRight size={15}/></button>}/>
        <div className="table-scroll">
          {recentBills.length===0?<p className="muted chart-empty-line">No bills have been generated yet.</p>:
          <table><thead><tr><th>ACCOUNT NO.</th><th>CONSUMER</th><th>BARANGAY</th><th>USAGE</th><th>AMOUNT</th><th>STATUS</th><th>DUE DATE</th><th></th></tr></thead><tbody>{recentBills.map(b=>{const c=byId[b.consumerId];return <tr key={b.id}><td className="mono-cell">{c?.account}</td><td><strong>{c?.name}</strong></td><td>{c?.barangay}</td><td>{consumptionOf(b.previous,b.current)} m³</td><td><strong>{peso(b.amount)}</strong></td><td><StatusBadge status={billStatus(b)}/></td><td>{formatDate(b.dueDate)}</td><td><button className="row-arrow" onClick={()=>navigate('/billing')} aria-label="View bill"><ChevronRight size={17}/></button></td></tr>})}</tbody></table>}
        </div>
      </Card>
      <Card className="activity-card">
        <CardHead title="Recent activity" subtitle="Latest recorded changes in your municipality" action={<Activity size={18} color="#92a4b8"/>}/>
        <div className="activity-list">{activity.length===0?<p className="muted">No activity recorded yet.</p>:activity.map(entry=>{const Icon=iconFor(entry.action);return <div className="activity-row" key={entry.id}><span className="activity-icon"><Icon size={16}/></span><div><strong>{entry.action}</strong><small>{entry.newValue||entry.oldValue||entry.municipality}</small></div><time>{timeAgo(entry.at)}</time></div>})}</div>
        <button className="activity-more" onClick={()=>navigate('/audit-logs')}>View all activity <ArrowRight size={15}/></button>
      </Card>
    </div>
  </div>
}
