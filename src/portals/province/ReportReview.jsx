import React,{useState} from 'react'
import {useNavigate,useParams} from 'react-router-dom'
import {Check,Download,Printer,Undo2} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {municipalityStats,STATUS_LABELS} from '../../services/provinceService.js'
import {peso,formatDate} from '../../services/billingService.js'
import {REPORT_STATUS,periodLabel} from '../../services/reportService.js'
import {LEVELS} from '../../services/consumptionService.js'
import {PageHeader,Card,CardHead,DataTable,StatusBadge,EmptyState,Button,Modal} from '../../components/UI.jsx'

const stamp=iso=>iso?new Date(iso).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'}):'—'
const csvCell=value=>`"${String(value??'').replaceAll('"','""')}"`

// Builds a CSV of the figures and flagged accounts, for the province's records.
function reportCsv(stats,report){
  const rows=[
    ['Municipality',stats.municipality],['Period',periodLabel(stats.period)],['Status',REPORT_STATUS[report.status]],
    [],['Measure','Value'],
    ['Consumers',stats.consumers],['Consumption (m3)',stats.consumption],['Billing (PHP)',stats.billing],['Collections (PHP)',stats.collections],['Outstanding (PHP)',stats.outstanding],['High consumption accounts',stats.high],['Critical accounts',stats.critical],['Reviewed high-consumption accounts',stats.reviewed],['Collection efficiency (%)',stats.efficiency??''],
    [],['Account','Consumer','Barangay','Classification','Consumption (m3)'],
    ...stats.flagged.map(c=>[c.account,c.name,c.barangay,c.type,c.current-c.previous])
  ]
  return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')
}

export default function ReportReview(){
  const {id}=useParams()
  const navigate=useNavigate()
  const {data,role,period,levelOf,advanceReport}=useData()
  const [returning,setReturning]=useState(false),[remarks,setRemarks]=useState(''),[remarksError,setRemarksError]=useState('')
  const report=data.reports.find(r=>r.id===id)
  if(!report)return <>
    <PageHeader eyebrow="MONTHLY REPORT" title="Report not found" description="This report may have been removed or is not visible to your account."/>
    <EmptyState title="No report here" description="Go back to the monthly reports list and choose a report."/>
    <Button variant="secondary" onClick={()=>navigate('/monthly-reports')}>Back to monthly reports</Button>
  </>
  const stats=municipalityStats(data,report.municipality,report.period)
  const canReview=role==='PROVINCE_ADMIN'&&report.status==='SUBMITTED'
  const download=()=>{
    const blob=new Blob(['﻿'+reportCsv(stats,report)],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob),a=document.createElement('a')
    a.href=url;a.download=`drops-${report.municipality.toLowerCase().replaceAll(' ','-')}-${report.period}.csv`;a.click();URL.revokeObjectURL(url)
  }
  const approve=()=>advanceReport(report.municipality,report.period,'APPROVED')
  const submitReturn=()=>{
    if(!remarks.trim()){setRemarksError('Explain what the municipality must correct.');return}
    advanceReport(report.municipality,report.period,'RETURNED',remarks)
    setReturning(false)
  }
  const flaggedColumns=[
    {key:'account',label:'ACCOUNT NO.',render:r=><span className="mono-cell">{r.account}</span>},
    {key:'name',label:'CONSUMER',render:r=><strong>{r.name}</strong>},
    {key:'barangay',label:'BARANGAY'},
    {key:'type',label:'CLASSIFICATION'},
    {key:'usage',label:'USAGE',render:r=>`${r.current-r.previous} m³`},
    {key:'level',label:'STATUS',render:r=><StatusBadge status={LEVELS[levelOf(r)].label}/>},
    {key:'review',label:'REVIEW',render:r=>r.reviewedPeriod===report.period?<StatusBadge status="Reviewed"/>:<StatusBadge status="Pending review"/>}
  ]
  return <>
    <PageHeader eyebrow="MONTHLY REPORT" title={`${report.municipality} · ${periodLabel(report.period)}`} description={`Current status: ${REPORT_STATUS[report.status]}. Every figure below comes from this municipality's records.`} actions={<>
      <Button variant="secondary" icon={Printer} onClick={()=>window.print()}>Print</Button>
      <Button variant="secondary" icon={Download} onClick={download}>Download CSV</Button>
      {canReview&&<Button variant="danger" icon={Undo2} onClick={()=>{setReturning(true);setRemarks('');setRemarksError('')}}>Return for correction</Button>}
      {canReview&&<Button icon={Check} onClick={approve}>Approve</Button>}
    </>}/>
    <Card>
      <CardHead title="Figures" action={<StatusBadge status={STATUS_LABELS[report.status]}/>}/>
      <div className="page-kpis">
        <div><span>Consumers</span><strong>{stats.consumers.toLocaleString()}</strong></div>
        <div><span>Consumption</span><strong>{stats.consumption.toLocaleString()} m³</strong></div>
        <div><span>Billing</span><strong>{peso(stats.billing)}</strong></div>
        <div><span>Collections</span><strong>{peso(stats.collections)}</strong></div>
        <div><span>Outstanding</span><strong>{peso(stats.outstanding)}</strong></div>
      </div>
      <div className="page-kpis four">
        <div><span>High consumption</span><strong>{stats.high}</strong></div>
        <div><span>Critical</span><strong>{stats.critical}</strong></div>
        <div><span>Reviewed</span><strong>{stats.reviewed} / {stats.high}</strong></div>
        <div><span>Efficiency</span><strong>{stats.efficiency===null?'—':`${stats.efficiency}%`}</strong></div>
      </div>
    </Card>
    <Card>
      <CardHead title="Flagged accounts" subtitle="Accounts above their classification's normal ceiling"/>
      <DataTable columns={flaggedColumns} rows={stats.flagged} pageSize={10} empty={<p className="muted">No flagged accounts this period.</p>}/>
    </Card>
    <div className="dashboard-grid main-grid">
      <Card>
        <CardHead title="Workflow history" subtitle="Every status change, with who made it"/>
        {report.history.length===0?<p className="muted">No changes recorded yet.</p>:
          <ol className="timeline">{report.history.map((h,i)=><li key={i}><strong>{REPORT_STATUS[h.from]} → {REPORT_STATUS[h.to]}</strong><small>{h.by} · {stamp(h.at)}</small>{h.remarks&&<p>{h.remarks}</p>}</li>)}</ol>}
      </Card>
      <Card>
        <CardHead title="Revisions" subtitle="Corrections made after a province return"/>
        {report.revisions.length===0?<p className="muted">No revisions. This report has not been returned.</p>:
          <ol className="timeline">{report.revisions.map((rev,i)=><li key={i}><strong>{rev.note}</strong><small>{rev.by} · {stamp(rev.at)}</small>{rev.remarks&&<p>Province remarks: {rev.remarks}</p>}</li>)}</ol>}
      </Card>
    </div>
    {returning&&<Modal title="Return report for correction" onClose={()=>setReturning(false)} width="520px">
      <form onSubmit={e=>{e.preventDefault();submitReturn()}} noValidate>
        <label className="form-field"><span>Remarks for {report.municipality}</span><textarea rows={4} value={remarks} onChange={e=>{setRemarks(e.target.value);setRemarksError('')}} placeholder="Which figures or accounts need correction?"/></label>
        {remarksError&&<p className="form-error">{remarksError}</p>}
        <div className="modal-actions"><Button variant="secondary" type="button" onClick={()=>setReturning(false)}>Cancel</Button><Button variant="danger" type="submit">Return for correction</Button></div>
      </form>
    </Modal>}
  </>
}
