import React,{useState} from 'react'
import {Bell,Save,ShieldCheck} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {formatDate,peso} from '../../services/billingService.js'
import {PageHeader,Card,CardHead,Button,StatusBadge} from '../../components/UI.jsx'

export default function CitizenAccount(){
  const {data,saveOwnLimits}=useData()
  const account=data.consumers[0]
  const tariff=data.tariffs.find(t=>t.name===account?.tier)
  const [limit,setLimit]=useState(account?.limit??''),[warning,setWarning]=useState(account?.warning??''),[error,setError]=useState('')
  if(!account)return null
  const save=event=>{event.preventDefault();setError(saveOwnLimits(limit,warning)||'')}
  const rows=[['Account number',account.account],['Full name',account.name],['Address',account.address],['Barangay',account.barangay],['Municipality',account.locality],['Province',account.province],['Meter number',account.meter],['Consumer classification',account.type],['Tariff classification',`${account.tier}${tariff?` · ${peso(tariff.rate)} / m³`:''}`],['Account status',account.status]]
  return <>
    <PageHeader eyebrow="MY ACCOUNT" title="Account and profile" description="Your registered details. To change them, contact your municipal water office."/>
    <div className="dashboard-grid main-grid">
      <Card>
        <CardHead title="Registered details" action={<StatusBadge status={account.status}/>}/>
        <div className="info-list">{rows.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      </Card>
      <Card>
        <CardHead title="My consumption limits" subtitle="The warning point and monthly maximum for your account"/>
        <form onSubmit={save} noValidate className="calc-form">
          <label className="form-field"><span>Warning point (m³)</span><input type="number" min="1" step="1" value={warning} onChange={e=>setWarning(e.target.value)}/></label>
          <label className="form-field"><span>Monthly maximum (m³)</span><input type="number" min="1" step="1" value={limit} onChange={e=>setLimit(e.target.value)}/></label>
          {error&&<p className="form-error">{error}</p>}
          <Button type="submit" icon={Save}>Save limits</Button>
        </form>
        <div className="citizen-note"><ShieldCheck size={16}/> Limits only change your own alerts. Your bill is not affected.</div>
      </Card>
    </div>
    <Card>
      <CardHead title="Notifications" subtitle="Messages about your account" action={<Bell size={18} color="#92a4b8"/>}/>
      {data.alerts.length===0?<p className="muted">No notifications yet.</p>:<div className="activity-list padded">{data.alerts.map(a=><div className="activity-row" key={a.id}><span className="activity-icon"><Bell size={16}/></span><div><strong>{a.type}</strong><small>{a.message}</small></div><time>{formatDate(a.date)}</time></div>)}</div>}
    </Card>
    <Card>
      <CardHead title="Contact on file" subtitle="Used for bill and payment notices"/>
      <div className="info-list"><div><span>Phone</span><strong>{account.phone||'—'}</strong></div><div><span>Email</span><strong>{account.email||'—'}</strong></div></div>
    </Card>
  </>
}
