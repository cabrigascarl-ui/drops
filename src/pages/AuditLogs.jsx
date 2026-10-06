import React,{useMemo,useState} from 'react'
import {Download,History,ShieldCheck} from 'lucide-react'
import {useData} from '../context/DataContext.jsx'
import {downloadCsv} from '../utils/export.js'
import {SearchInput,FilterDropdown,Card,CardHead,DataTable,Button} from '../components/UI.jsx'
import PortalBanner from '../components/PortalBanner.jsx'

const ROLE_NAMES={LGU_ADMIN:'Municipal LGU',PROVINCE_ADMIN:'Province of Samar',TELLER:'Teller',METER_READER:'Meter reader',CITIZEN:'Citizen'}
const stamp=value=>new Date(value).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})
const dayOf=value=>value?.slice(0,10)

export default function AuditLogs(){
  const {data}=useData()
  const [search,setSearch]=useState(''),[action,setAction]=useState(''),[municipality,setMunicipality]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState('')
  const actions=useMemo(()=>[...new Set(data.audit.map(e=>e.action))].sort(),[data.audit])
  const municipalities=useMemo(()=>[...new Set(data.audit.map(e=>e.municipality).filter(Boolean))].sort(),[data.audit])
  const rows=useMemo(()=>data.audit
    .filter(entry=>(!action||entry.action===action)&&(!municipality||entry.municipality===municipality)&&(!from||dayOf(entry.at)>=from)&&(!to||dayOf(entry.at)<=to)&&[entry.user,entry.action,entry.municipality,entry.oldValue,entry.newValue].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a,b)=>b.at.localeCompare(a.at)),[data.audit,action,municipality,from,to,search])
  const today=new Date().toISOString().slice(0,10)
  const todayCount=data.audit.filter(e=>dayOf(e.at)===today).length
  const people=new Set(data.audit.map(e=>e.user)).size
  const columns=[
    {key:'at',label:'WHEN',sortable:true,render:r=>stamp(r.at)},
    {key:'user',label:'USER',sortable:true,render:r=><><strong>{r.user}</strong><small className="muted block">{ROLE_NAMES[r.role]||r.role}</small></>},
    {key:'municipality',label:'MUNICIPALITY',sortable:true,render:r=>r.municipality||'—'},
    {key:'action',label:'ACTION',sortable:true,render:r=><span className="audit-action">{r.action}</span>},
    {key:'change',label:'CHANGE',render:r=>r.oldValue||r.newValue?<span>{r.oldValue||'—'} <span className="muted">→</span> {r.newValue||'—'}</span>:<span className="muted">—</span>}
  ]
  const exportCsv=()=>downloadCsv(`drops-audit-log-${today}.csv`,[['When','User','Role','Municipality','Action','Old value','New value'],...rows.map(r=>[stamp(r.at),r.user,ROLE_NAMES[r.role]||r.role,r.municipality||'',r.action,r.oldValue,r.newValue])])
  const reset=()=>{setSearch('');setAction('');setMunicipality('');setFrom('');setTo('')}
  return <>
    <PortalBanner eyebrow="ACCOUNTABILITY" title="Audit logs" subtitle="Every important change is recorded with who made it, when, and what changed. Entries cannot be edited or deleted."
      stats={[{label:'Entries',value:data.audit.length},{label:'Today',value:todayCount}]}
      action={<Button variant="light" icon={Download} onClick={exportCsv}>Export CSV</Button>}/>
    <div className="page-kpis four">
      <div><span>Showing</span><strong>{rows.length}</strong></div>
      <div><span>People</span><strong>{people}</strong></div>
      <div><span>Municipalities</span><strong>{municipalities.length}</strong></div>
      <div><span>Action types</span><strong>{actions.length}</strong></div>
    </div>
    <Card>
      <CardHead title="Activity trail" subtitle={`${rows.length} of ${data.audit.length} entries match`} action={<ShieldCheck size={18} color="#92a4b8"/>}/>
      <div className="audit-filters">
        <SearchInput value={search} onChange={setSearch} placeholder="Search user, action, or value..."/>
        <FilterDropdown value={municipality} onChange={setMunicipality} options={municipalities} all="All municipalities"/>
        <FilterDropdown value={action} onChange={setAction} options={actions} all="All actions"/>
        <label className="audit-date"><span>From</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
        <label className="audit-date"><span>To</span><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
        <button className="audit-reset" onClick={reset}>Clear filters</button>
      </div>
      <DataTable columns={columns} rows={rows} search={search} pageSize={10} empty={<div className="empty-state"><History size={28}/><h3>No matching entries</h3><p>Try a different action, municipality or date range.</p></div>}/>
    </Card>
  </>
}
