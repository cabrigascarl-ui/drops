import React,{useMemo,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {Landmark} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {provinceTotals,STATUS_LABELS} from '../../services/provinceService.js'
import {peso} from '../../services/billingService.js'
import {LEVELS} from '../../services/consumptionService.js'
import {periodLabel} from '../../services/reportService.js'
import {PageHeader,Card,CardHead,DataTable,StatusBadge,SearchInput,Modal,Button} from '../../components/UI.jsx'

export default function Municipalities(){
  const {data,period,levelOf}=useData()
  const navigate=useNavigate()
  const [search,setSearch]=useState(''),[open,setOpen]=useState(null)
  const totals=useMemo(()=>provinceTotals(data,period),[data,period])
  const rows=totals.stats.filter(s=>s.municipality.toLowerCase().includes(search.trim().toLowerCase()))
  const detail=open?totals.stats.find(s=>s.municipality===open):null
  const columns=[
    {key:'municipality',label:'MUNICIPALITY',sortable:true,render:r=><button className="link-button" onClick={()=>setOpen(r.municipality)}><strong>{r.municipality}</strong></button>},
    {key:'consumers',label:'CONSUMERS',sortable:true,render:r=>r.consumers.toLocaleString()},
    {key:'consumption',label:'CONSUMPTION',sortable:true,render:r=>`${r.consumption.toLocaleString()} m³`},
    {key:'billing',label:'BILLING',sortable:true,render:r=>peso(r.billing)},
    {key:'collections',label:'COLLECTIONS',sortable:true,render:r=>peso(r.collections)},
    {key:'efficiency',label:'EFFICIENCY',sortable:true,render:r=>r.efficiency===null?'—':`${r.efficiency}%`},
    {key:'outstanding',label:'OUTSTANDING',sortable:true,render:r=>peso(r.outstanding)},
    {key:'high',label:'HIGH USE',sortable:true,render:r=>`${r.high}${r.critical?` (${r.critical} critical)`:''}`},
    {key:'status',label:'REPORT',render:r=><StatusBadge status={STATUS_LABELS[r.status]}/>}
  ]
  return <>
    <PageHeader eyebrow="PROVINCE OF SAMAR" title="Municipalities" description={`${totals.connected} connected municipalities. Select one for its profile and flagged accounts.`}/>
    <Card>
      <CardHead title="Directory" subtitle={`${periodLabel(period)} figures from each municipality's records`} action={<Landmark size={18} color="#92a4b8"/>}/>
      <div className="list-toolbar"><SearchInput value={search} onChange={setSearch} placeholder="Search municipality..."/></div>
      <DataTable columns={columns} rows={rows} search={search} pageSize={12} empty={<p className="muted">No municipality matches.</p>}/>
    </Card>
    {detail&&<Modal title={detail.municipality} onClose={()=>setOpen(null)} width="680px">
      <div className="page-kpis">
        <div><span>Consumers</span><strong>{detail.consumers.toLocaleString()}</strong></div>
        <div><span>Consumption</span><strong>{detail.consumption.toLocaleString()} m³</strong></div>
        <div><span>Billing</span><strong>{peso(detail.billing)}</strong></div>
        <div><span>Collections</span><strong>{peso(detail.collections)}</strong></div>
        <div><span>Outstanding</span><strong>{peso(detail.outstanding)}</strong></div>
      </div>
      <p className="muted">Report: <StatusBadge status={STATUS_LABELS[detail.status]}/> · Efficiency {detail.efficiency===null?'—':`${detail.efficiency}%`}</p>
      <h3 className="history-heading">Flagged accounts ({detail.flagged.length})</h3>
      {detail.flagged.length===0?<p className="muted">No high-consumption accounts this period.</p>:
        <div className="route-list">{detail.flagged.slice(0,10).map(c=><div key={c.id} className="route-row"><div><strong>{c.name}</strong><small>{c.account} · {c.barangay}</small></div><span>{c.type}</span><StatusBadge status={LEVELS[levelOf(c)].label}/></div>)}</div>}
      {detail.report&&<div className="modal-actions"><Button onClick={()=>navigate(`/monthly-reports/${detail.report.id}`)}>Open report</Button></div>}
    </Modal>}
  </>
}
