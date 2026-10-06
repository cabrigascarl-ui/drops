import React,{useMemo,useState,useEffect} from 'react'
import {useLocation} from 'react-router-dom'
import {CalendarClock,ClipboardList,Pencil,Plus} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {WORK_STATUSES,CREW_OPTIONS} from '../../services/operationsService.js'
import {formatDate} from '../../services/billingService.js'
import {Button,Card,CardHead,DataTable,Modal,SearchInput,FilterDropdown,StatusBadge,EmptyState} from '../../components/UI.jsx'
import PortalBanner from '../../components/PortalBanner.jsx'

const NEXT={'Scheduled':'In progress','In progress':'Completed'}

// Work orders carry out service requests: scheduled to a crew, then in progress, then completed.
export default function WorkOrders(){
  const {data,scope,session,saveWorkOrder,setWorkStatus}=useData()
  const location=useLocation()
  const municipality=scope||session?.municipality
  const requestOf=id=>(data.serviceRequests||[]).find(r=>r.id===id)
  const [search,setSearch]=useState(''),[status,setStatus]=useState(''),[editing,setEditing]=useState(null),[form,setForm]=useState({title:'',crew:'',due:'',requestId:''}),[error,setError]=useState('')
  const orders=(data.workOrders||[]).map(o=>({...o,request:requestOf(o.requestId),overdue:o.status!=='Completed'&&o.due<new Date().toISOString().slice(0,10)}))
  const rows=orders.filter(o=>(!status||o.status===status)&&[o.title,o.crew,o.request?.type].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  const openOrders=orders.filter(o=>o.status!=='Completed').length
  const openedFor=location.state?.requestId
  // Coming from a service request: open the form already linked to it.
  useEffect(()=>{if(openedFor){const req=requestOf(openedFor);setEditing({});setForm({title:req?`Fix: ${req.type}`:'',crew:'',due:new Date(Date.now()+2*86400e3).toISOString().slice(0,10),requestId:openedFor});setError('')}},[openedFor]) // eslint-disable-line react-hooks/exhaustive-deps
  const open=order=>{setEditing(order||{});setForm({title:order?.title||'',crew:order?.crew||'',due:order?.due||'',requestId:order?.requestId||''});setError('')}
  const set=(k,v)=>{setError('');setForm(f=>({...f,[k]:v}))}
  const save=event=>{event.preventDefault();const result=saveWorkOrder({id:editing.id,...form});if(result)setError(result);else setEditing(null)}
  const columns=[
    {key:'title',label:'WORK ORDER',sortable:true,render:r=><div><strong>{r.title}</strong><small className="block muted">{r.request?`From: ${r.request.type}`:'Not linked to a request'}</small></div>},
    {key:'crew',label:'CREW',sortable:true},
    {key:'due',label:'DUE',sortable:true,render:r=><span className={r.overdue?'overdue':''}>{formatDate(r.due)}{r.overdue&&' · overdue'}</span>},
    {key:'status',label:'STATUS',render:r=><StatusBadge status={r.status}/>},
    {key:'actions',label:'',render:r=><div className="report-actions">
      {NEXT[r.status]&&<Button variant="secondary" onClick={()=>setWorkStatus(r.id,NEXT[r.status])}>Mark {NEXT[r.status].toLowerCase()}</Button>}
      <button className="table-icon-button" aria-label={`Edit ${r.title}`} onClick={()=>open(r)}><Pencil size={16}/></button>
    </div>}
  ]
  return <>
    <PortalBanner eyebrow="OPERATIONS" title="Work orders" subtitle={`${openOrders} open work order${openOrders===1?'':'s'} in ${municipality}. Each one is assigned to a crew with a due date.`}
      stats={[{label:'Open',value:openOrders},{label:'Completed',value:orders.length-openOrders}]}
      action={<Button variant="light" icon={Plus} onClick={()=>open(null)}>New work order</Button>}/>
    <Card>
      <CardHead title="Work orders" subtitle="Soonest due first"/>
      <div className="list-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search work, crew or request..."/>
        <FilterDropdown value={status} onChange={setStatus} options={WORK_STATUSES} all="All statuses"/>
      </div>
      <DataTable columns={columns} rows={rows.sort((a,b)=>a.due.localeCompare(b.due))} pageSize={10} empty={<EmptyState title="No work orders" description="Create one from a service request, or start a new one."/>}/>
    </Card>
    {editing&&<Modal title={editing.id?'Edit work order':'New work order'} onClose={()=>setEditing(null)} width="540px">
      <form onSubmit={save} noValidate>
        <label className="form-field"><span>Title</span><input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Replace damaged meter"/></label>
        <div className="form-grid">
          <label className="form-field"><span>Crew</span><select value={form.crew} onChange={e=>set('crew',e.target.value)}><option value="">Assign a crew</option>{CREW_OPTIONS.map(c=><option key={c}>{c}</option>)}</select></label>
          <label className="form-field"><span>Due date</span><input type="date" value={form.due} onChange={e=>set('due',e.target.value)}/></label>
        </div>
        <label className="form-field"><span>Linked service request</span><select value={form.requestId} onChange={e=>set('requestId',e.target.value)}><option value="">Not linked</option>{(data.serviceRequests||[]).filter(r=>r.status!=='Resolved'||r.id===form.requestId).map(r=><option key={r.id} value={r.id}>{r.type} · {r.description.slice(0,40)}</option>)}</select></label>
        {error&&<p className="form-error">{error}</p>}
        <div className="modal-actions"><Button variant="secondary" type="button" onClick={()=>setEditing(null)}>Cancel</Button><Button type="submit" icon={CalendarClock}>Save work order</Button></div>
      </form>
    </Modal>}
  </>
}
