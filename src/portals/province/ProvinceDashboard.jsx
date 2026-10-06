import React,{useMemo,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {Building2,ClipboardCheck,Gauge,Landmark,ReceiptText,TriangleAlert,Users,Wallet,ChartNoAxesCombined} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {provinceTotals,waitingReports,municipalityStats,STATUS_LABELS} from '../../services/provinceService.js'
import {peso} from '../../services/billingService.js'
import {periodLabel} from '../../services/reportService.js'
import {TrendingDown} from 'lucide-react'
import {Card,CardHead,StatCard,StatusBadge,EmptyState,Button} from '../../components/UI.jsx'
import PortalBanner from '../../components/PortalBanner.jsx'
import ProvinceMap from '../../components/ProvinceMap.jsx'

const daysSince=iso=>iso?Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/86400000)):null

export default function ProvinceDashboard(){
  const {data,period,session}=useData()
  const navigate=useNavigate()
  const [selected,setSelected]=useState(null)
  const totals=useMemo(()=>provinceTotals(data,period),[data,period])
  const waiting=useMemo(()=>waitingReports(data),[data])
  const selectedStats=selected?municipalityStats(data,selected,period):null
  return <>
    <PortalBanner eyebrow="PROVINCE OF SAMAR" title={`Provincial overview, ${periodLabel(period)}`} subtitle={`Monitoring validated municipal data. Welcome, ${session?.name?.split(' ')[0]}.`}>
      <div className="banner-stats">
        <StatCard label="MUNICIPALITIES CONNECTED" value={totals.connected} change={`${totals.submitted} submitted`} detail="This period" icon={Landmark} tone="blue"/>
        <StatCard label="PENDING REPORTS" value={totals.pending} change={totals.pending?'Action needed':'All clear'} detail="Awaiting approval" icon={ClipboardCheck} tone="rose"/>
        <StatCard label="PROVINCE-WIDE CONSUMERS" value={totals.consumers.toLocaleString()} change="Registered" detail="All municipalities" icon={Users} tone="teal"/>
        <StatCard label="TOTAL CONSUMPTION" value={`${totals.consumption.toLocaleString()} m³`} change="Measured" detail="From latest readings" icon={Gauge} tone="cyan"/>
        <StatCard label="HIGH CONSUMPTION" value={totals.high} change={`${totals.critical} critical`} detail="Flagged accounts" icon={TriangleAlert} tone="cyan"/>
        <StatCard label="LOW CONSUMPTION" value={totals.low} change={'Under 10 m³'} detail="Accounts using least water" icon={TrendingDown} tone="teal"/>
      </div>
    </PortalBanner>
    <div className="dashboard-grid main-grid">
      <Card>
        <CardHead title="Municipal map" subtitle="Colored by report status for this period. Search or select a municipality for its figures." action={<Button variant="secondary" icon={Building2} onClick={()=>navigate('/municipalities')}>All municipalities</Button>}/>
        <ProvinceMap stats={totals.stats} selected={selected} onSelect={setSelected}/>
        {selectedStats&&<div className="province-detail">
          <div className="province-detail-head"><div><span className="eyebrow">{periodLabel(period)}</span><h3>{selectedStats.municipality}</h3></div><StatusBadge status={STATUS_LABELS[selectedStats.status]}/></div>
          <div className="page-kpis">
            <div><span>Consumers</span><strong>{selectedStats.consumers.toLocaleString()}</strong></div>
            <div><span>Consumption</span><strong>{selectedStats.consumption.toLocaleString()} m³</strong></div>
            <div><span>Billing</span><strong>{peso(selectedStats.billing)}</strong></div>
            <div><span>Collections</span><strong>{peso(selectedStats.collections)}</strong></div>
            <div><span>High usage</span><strong>{selectedStats.high}</strong></div>
          </div>
          {selectedStats.report&&<Button variant="secondary" onClick={()=>navigate(`/monthly-reports/${selectedStats.report.id}`)}>Open report</Button>}
        </div>}
      </Card>
      <Card>
        <CardHead title="Action needed" subtitle="Submitted reports waiting for approval, oldest first"/>
        {waiting.length===0?<EmptyState title="Nothing waiting" description="Every submitted municipal report has been reviewed."/>:
          <div className="route-list">{waiting.map(r=>{
            const days=daysSince(r.waitingSince)
            return <div key={r.id} className="route-row action-row">
              <div><strong>{r.municipality}</strong><small>{periodLabel(r.period)} · {days===null?'Submitted':`waiting ${days} day${days===1?'':'s'}`}</small></div>
              <StatusBadge status={STATUS_LABELS.SUBMITTED}/>
              <Button onClick={()=>navigate(`/monthly-reports/${r.id}`)}>Review</Button>
            </div>
          })}</div>}
        <div className="action-note"><ChartNoAxesCombined size={15}/> <span>Analytics for approved periods are on the Comparison page.</span></div>
      </Card>
    </div>
    <Card>
      <CardHead title="Municipal status" subtitle="Every connected municipality for this period"/>
      <div className="status-grid">{totals.stats.map(s=><button key={s.municipality} className={s.municipality===selected?'active':''} onClick={()=>setSelected(s.municipality)}>
        <strong>{s.municipality}</strong><small>{s.consumers} consumers · {s.high} high</small><StatusBadge status={STATUS_LABELS[s.status]}/>
      </button>)}</div>
    </Card>
  </>
}
