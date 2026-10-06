import React,{useMemo,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {ClipboardCheck,Eye,Send} from 'lucide-react'
import {useData} from '../context/DataContext.jsx'
import {consumptionOf,formatDate,peso} from '../services/billingService.js'
import {REPORT_STATUS,isBillable,nextStatuses,periodLabel} from '../services/reportService.js'
import {Button,Card,CardHead,DataTable,StatusBadge,Modal,FilterDropdown} from '../components/UI.jsx'
import PortalBanner from '../components/PortalBanner.jsx'
import {downloadCsv} from '../utils/export.js'
import {municipalityStats} from '../services/provinceService.js'

const LABELS={
  FOR_REVIEW:(from)=>from==='VALIDATED'?'Reopen for review':'Send for review',
  VALIDATED:()=>'Validate report',
  SUBMITTED:()=>'Submit to Province',
  DRAFT:(from)=>from==='RETURNED'?'Start correction':'Return to draft',
  APPROVED:()=>'Approve',
  RETURNED:()=>'Return for correction'
}
const LAST_CHANGE=report=>report.history.length?report.history[report.history.length-1].at:null

export default function MonthlyReports(){
  const {data,role,scope,period,reportFor,advanceReport,levelOf,sendProvincialReport}=useData()
  const isLGU=role==='LGU_ADMIN'
  const navigate=useNavigate()
  const [municipality,setMunicipality]=useState(''),[statusFilter,setStatusFilter]=useState('')
  const [returning,setReturning]=useState(null),[remarks,setRemarks]=useState(''),[remarksError,setRemarksError]=useState(''),[viewing,setViewing]=useState(null)
  const current=isLGU?reportFor(scope):null
  const stored=[...data.reports].sort((a,b)=>b.period.localeCompare(a.period)||a.municipality.localeCompare(b.municipality))
  const rows=isLGU&&!stored.some(r=>r.period===period&&r.municipality===scope)?[current,...stored]:stored

  // Current-period figures for the LGU card.
  const summary=useMemo(()=>{
    if(!isLGU)return null
    const flagged=data.consumers.filter(c=>['HIGH','CRITICAL'].includes(levelOf(c)))
    const label=periodLabel(period)
    const billed=data.bills.filter(b=>b.month===label)
    const billIds=new Set(billed.map(b=>b.id))
    return {
      consumers:data.consumers.length,
      active:data.consumers.filter(c=>c.status==='Active').length,
      consumption:data.consumers.reduce((sum,c)=>sum+consumptionOf(c.previous,c.current),0),
      billing:billed.reduce((sum,b)=>sum+b.amount,0),
      collections:data.payments.filter(p=>billIds.has(p.billId)).reduce((sum,p)=>sum+p.amount,0),
      flagged:flagged.length,
      reviewed:flagged.filter(c=>c.reviewedPeriod===period).length
    }
  },[isLGU,data,levelOf,period])

  // Province view: approved municipal reports for the current period, consolidated.
  const provincial=useMemo(()=>{
    if(isLGU)return null
    const approved=data.reports.filter(r=>r.period===period&&r.status==='APPROVED')
    const figures=approved.map(r=>municipalityStats(data,r.municipality,period))
    const sum=key=>figures.reduce((total,s)=>total+(Number(s[key])||0),0)
    return {approved,consumption:sum('consumption'),billing:sum('billing'),collections:sum('collections'),sentAt:data.provincialSent?.[period]||null}
  },[isLGU,data,period])
  const exportProvincial=()=>{
    if(!provincial?.approved.length)return
    downloadCsv(`drops-provincial-report-${period}.csv`,[['Municipality','Period','Consumers','Consumption (m3)','Billed (PHP)','Collected (PHP)','Outstanding (PHP)'],...provincial.approved.map(r=>{const s=municipalityStats(data,r.municipality,period);return [r.municipality,periodLabel(period),s.consumers,s.consumption,s.billing,s.collections,s.outstanding]})])
  }
  const sendProvincial=()=>sendProvincialReport(period)
  const exportCsv=()=>{
    const visible=rows.filter(r=>(!municipality||r.municipality===municipality)&&(!statusFilter||REPORT_STATUS[r.status]===statusFilter))
    downloadCsv(`drops-monthly-reports-${period}.csv`,[['Municipality','Period','Status','Consumers','Last change','Revisions'],...visible.map(r=>[r.municipality,periodLabel(r.period),REPORT_STATUS[r.status],data.consumers.filter(c=>c.locality===r.municipality).length,LAST_CHANGE(r)?formatDate(LAST_CHANGE(r).slice(0,10)):'',r.revisions.length])])
  }
  const act=(report,to)=>{
    if(to==='RETURNED'){setReturning(report);setRemarks('');setRemarksError('');return}
    advanceReport(report.municipality,report.period,to)
  }
  const submitReturn=()=>{
    if(!remarks.trim()){setRemarksError('Explain what the municipality must correct.');return}
    advanceReport(returning.municipality,returning.period,'RETURNED',remarks)
    setReturning(null)
  }

  const columns=[
    {key:'municipality',label:'MUNICIPALITY',sortable:true,render:r=><strong>{r.municipality}</strong>},
    {key:'period',label:'PERIOD',sortable:true,render:r=>periodLabel(r.period)},
    {key:'status',label:'STATUS',render:r=><StatusBadge status={REPORT_STATUS[r.status]}/>},
    {key:'consumers',label:'CONSUMERS',render:r=>data.consumers.filter(c=>c.locality===r.municipality).length.toLocaleString()},
    {key:'last',label:'LAST CHANGE',render:r=>LAST_CHANGE(r)?formatDate(LAST_CHANGE(r).slice(0,10)):'—'},
    {key:'revisions',label:'REVISIONS',render:r=>r.revisions.length},
    {key:'actions',label:'ACTIONS',render:r=><div className="report-actions">
      <Button variant="secondary" icon={Eye} onClick={()=>setViewing(r)}>History</Button>{stored.some(x=>x.id===r.id)&&<Button variant="secondary" onClick={()=>navigate(`/monthly-reports/${r.id}`)}>Review</Button>}
      {nextStatuses(r.status,role).map(to=><Button key={to} variant={to==='RETURNED'?'danger':'primary'} onClick={()=>act(r,to)}>{LABELS[to](r.status)}</Button>)}
    </div>}
  ]

  return <>
    <PortalBanner eyebrow="REPORTING" title="Monthly reports" subtitle={isLGU?'Review, validate and submit the municipality’s monthly report to the Province.':'Municipal reports submitted for provincial review. Approve or return each one with remarks.'}
      stats={[{label:'Awaiting province',value:stored.filter(r=>r.status==='SUBMITTED').length},{label:'Approved',value:stored.filter(r=>r.status==='APPROVED').length}]}
      action={<Button variant="light" onClick={exportCsv}>Export CSV</Button>}/>
    {isLGU&&summary&&<Card className="report-current">
      <CardHead title={`${periodLabel(period)} · ${scope}`} subtitle="Current reporting period" action={<StatusBadge status={REPORT_STATUS[current.status]}/>}/>
      {['SUBMITTED','APPROVED'].includes(current.status)&&<div className="note-box">This report is {REPORT_STATUS[current.status].toLowerCase()} and locked. Readings, consumers and bills for {scope} cannot change until the Province returns it.</div>}
      <div className="page-kpis">
        <div><span>Consumers</span><strong>{summary.consumers.toLocaleString()}</strong></div>
        <div><span>Consumption</span><strong>{summary.consumption.toLocaleString()} m³</strong></div>
        <div><span>Billed</span><strong>{peso(summary.billing)}</strong></div>
        <div><span>Collected</span><strong>{peso(summary.collections)}</strong></div>
        <div><span>High-consumption reviewed</span><strong>{summary.reviewed} / {summary.flagged}</strong></div>
      </div>
      {!isBillable(current.status)&&<p className="muted">Bills for this period unlock once the report is validated.</p>}
      {current.status==='FOR_REVIEW'&&summary.reviewed<summary.flagged&&<div className="note-box">Validation is blocked: {summary.flagged-summary.reviewed} high-consumption account{summary.flagged-summary.reviewed===1?'':'s'} still need{summary.flagged-summary.reviewed===1?'s':''} review. <button className="pop-link" onClick={()=>navigate('/high-consumption')}>Open high consumption →</button></div>}
    </Card>}
    {!isLGU&&provincial&&<Card className="report-current">
      <CardHead title={`Provincial report · ${periodLabel(period)}`} subtitle={`${provincial.approved.length} approved municipal report${provincial.approved.length===1?'':'s'} · Samar Province`} action={provincial.sentAt?<StatusBadge status="Sent"/>:<StatusBadge status="Not sent"/>}/>
      <div className="page-kpis">
        <div><span>Municipalities approved</span><strong>{provincial.approved.length}</strong></div>
        <div><span>Consumption</span><strong>{provincial.consumption.toLocaleString()} m³</strong></div>
        <div><span>Billed</span><strong>{peso(provincial.billing)}</strong></div>
        <div><span>Collected</span><strong>{peso(provincial.collections)}</strong></div>
      </div>
      {!provincial.approved.length&&<p className="muted">The provincial report can be sent once at least one municipal report is approved.</p>}
      <div className="modal-actions">
        <Button variant="secondary" onClick={exportProvincial} disabled={!provincial.approved.length}>Download CSV</Button>
        <Button icon={Send} onClick={sendProvincial} disabled={!provincial.approved.length}>{provincial.sentAt?'Send again':'Send provincial report'}</Button>
      </div>
      {provincial.sentAt&&<p className="muted">Last sent {new Date(provincial.sentAt).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})}</p>}
    </Card>}
    <Card>
      <CardHead title="Reports" subtitle={isLGU?`Reports for ${scope}`:'All participating municipalities'} action={<ClipboardCheck size={18} color="#92a4b8"/>}/>
      <div className="list-toolbar"><FilterDropdown value={municipality} onChange={setMunicipality} options={[...new Set(rows.map(r=>r.municipality))].sort()} all="All municipalities"/><FilterDropdown value={statusFilter} onChange={setStatusFilter} options={Object.values(REPORT_STATUS)} all="All statuses"/></div>
      <DataTable columns={columns} rows={rows.filter(r=>(!municipality||r.municipality===municipality)&&(!statusFilter||REPORT_STATUS[r.status]===statusFilter))} empty={<div className="empty-state"><ClipboardCheck size={28}/><h3>No reports yet</h3><p>Reports appear here once a municipality starts a monthly review.</p></div>}/>
    </Card>
    {viewing&&<Modal title={`${viewing.municipality} · ${periodLabel(viewing.period)}`} onClose={()=>setViewing(null)} width="620px">
      <h3 className="history-heading">Workflow history</h3>
      {viewing.history.length?<ol className="timeline">{viewing.history.map((h,i)=><li key={i}><strong>{REPORT_STATUS[h.from]} → {REPORT_STATUS[h.to]}</strong><small>{h.by} · {new Date(h.at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})}</small>{h.remarks&&<p>{h.remarks}</p>}</li>)}</ol>:<p className="muted">No changes recorded yet.</p>}
      {viewing.revisions.length>0&&<><h3 className="history-heading">Revisions</h3><ol className="timeline">{viewing.revisions.map((rev,i)=><li key={i}><strong>{rev.note}</strong><small>{rev.by} · {new Date(rev.at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})}</small>{rev.remarks&&<p>Province remarks: {rev.remarks}</p>}</li>)}</ol></>}
    </Modal>}
    {returning&&<Modal title="Return report for correction" onClose={()=>setReturning(null)} width="520px">
      <form onSubmit={e=>{e.preventDefault();submitReturn()}} noValidate>
        <label className="form-field"><span>Remarks for {returning.municipality}</span><textarea rows={4} value={remarks} onChange={e=>{setRemarks(e.target.value);setRemarksError('')}} placeholder="Which figures or accounts need correction?"/></label>
        {remarksError&&<p className="form-error">{remarksError}</p>}
        <div className="modal-actions"><Button variant="secondary" type="button" onClick={()=>setReturning(null)}>Cancel</Button><Button variant="danger" type="submit" icon={Send}>Return for correction</Button></div>
      </form>
    </Modal>}
  </>
}
