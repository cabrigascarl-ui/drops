import React,{useMemo,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {Plus,Wrench,Hammer} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {REQUEST_TYPES,PRIORITIES,REQUEST_STATUSES,requestBadge} from '../../services/operationsService.js'
import {timeAgo} from '../../services/billingService.js'
import {Button,Card,CardHead,DataTable,Modal,SearchInput,FilterDropdown,StatusBadge,EmptyState} from '../../components/UI.jsx'
import PortalBanner from '../../components/PortalBanner.jsx'

const EMPTY={consumerId:'',type:'',priority:'Normal',description:''}

// Customer complaints and field issues. A request can be turned into a work order.
export default function ServiceRequests(){
  const {data,scope,session,saveServiceRequest,setRequestStatus}=useData()
  const navigate=useNavigate()
  const municipality=scope||session?.municipality
  const [search,setSearch]=useState(''),[status,setStatus]=useState(''),[priority,setPriority]=useState(''),[open,setOpen]=useState(false),[form,setForm]=useState(EMPTY),[error,setError]=useState('')
  const consumers=useMemo(()=>data.consumers,[data.consumers])
  const byId=useMemo(()=>Object.fromEntries(consumers.map(c=>[c.id,c])),[consumers])
  const orders=data.workOrders||[]
  const requests=(data.serviceRequests||[]).map(r=>({...r,consumer:byId[r.consumerId],hasOrder:orders.some(o=>o.requestId===r.id)}))
  const rows=requests.filter(r=>(!status||r.status===status)&&(!priority||r.priority===priority)&&[r.consumer?.name,r.consumer?.account,r.type,r.description].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  const openCount=requests.filter(r=>r.status!=='Resolved').length
  const set=(k,v)=>{setError('');setForm(f=>({...f,[k]:v}))}
  const save=event=>{event.preventDefault();const result=saveServiceRequest(form);if(result)setError(result);else{setOpen(false);setForm(EMPTY)}}
  const columns=[
    {key:'when',label:'LOGGED',sortable:true,render:r=>timeAgo(r.at)},
    {key:'consumer',label:'CONSUMER',render:r=><div><strong>{r.consumer?.name||'—'}</strong><small className="block muted">{r.consumer?.account} · Brgy. {r.consumer?.barangay}</small></div>},
    {key:'type',label:'ISSUE',sortable:true,render:r=><div><strong>{r.type}</strong>{r.source==='Citizen'&&<span className="prio prio-normal" style={{marginLeft:6}}>Citizen report</span>}<small className="block muted">{r.description}</small>{r.photo&&<a href={r.photo} target="_blank" rel="noreferrer"><img className="request-thumb" src={r.photo} alt={`Photo for ${r.type}`}/></a>}</div>},
    {key:'priority',label:'PRIORITY',sortable:true,render:r=><span className={`prio prio-${r.priority.toLowerCase()}`}>{r.priority}</span>},
    {key:'status',label:'STATUS',render:r=><StatusBadge status={r.status}/>},
    {key:'actions',label:'ACTIONS',render:r=><div className="report-actions">
      {r.status!=='Resolved'&&<select aria-label={`Status for ${r.type}`} className="inline-select" value={r.status} onChange={e=>setRequestStatus(r.id,e.target.value)}>{REQUEST_STATUSES.map(s=><option key={s}>{s}</option>)}</select>}
      {r.status!=='Resolved'&&!r.hasOrder&&<Button variant="secondary" icon={Hammer} onClick={()=>navigate('/work-orders',{state:{requestId:r.id}})}>Create work order</Button>}
      {r.hasOrder&&<span className="muted">Work order open</span>}
    </div>}
  ]
  return <>
    <PortalBanner eyebrow="OPERATIONS" title="Service requests" subtitle={`${openCount} open request${openCount===1?'':'s'} in ${municipality}. Log issues, track them, and turn them into work.`}
      stats={[{label:'Open',value:openCount},{label:'Urgent',value:requests.filter(r=>r.priority==='Urgent'&&r.status!=='Resolved').length}]}
      action={<Button variant="light" icon={Plus} onClick={()=>{setForm(EMPTY);setError('');setOpen(true)}}>Log request</Button>}/>
    <Card>
      <CardHead title="Requests" subtitle="Newest first"/>
      <div className="list-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search consumer, account, or issue..."/>
        <FilterDropdown value={status} onChange={setStatus} options={REQUEST_STATUSES} all="All statuses"/>
        <FilterDropdown value={priority} onChange={setPriority} options={PRIORITIES} all="All priorities"/>
      </div>
      <DataTable columns={columns} rows={rows} pageSize={10} empty={<EmptyState title="No requests match" description="Log a request when a consumer or crew reports a problem."/>}/>
    </Card>
    {open&&<Modal title="Log service request" onClose={()=>setOpen(false)} width="560px">
      <form onSubmit={save} noValidate>
        <div className="form-grid">
          <label className="form-field"><span>Consumer account</span><select value={form.consumerId} onChange={e=>set('consumerId',e.target.value)}><option value="">Choose an account</option>{consumers.map(c=><option key={c.id} value={c.id}>{c.account} · {c.name}</option>)}</select></label>
          <label className="form-field"><span>Issue</span><select value={form.type} onChange={e=>set('type',e.target.value)}><option value="">Choose an issue</option>{REQUEST_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
          <label className="form-field"><span>Priority</span><select value={form.priority} onChange={e=>set('priority',e.target.value)}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></label>
        </div>
        <label className="form-field"><span>What happened</span><textarea rows={3} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Describe the problem so the crew knows what to check."/></label>
        {error&&<p className="form-error">{error}</p>}
        <div className="modal-actions"><Button variant="secondary" type="button" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" icon={Wrench}>Log request</Button></div>
      </form>
    </Modal>}
  </>
}
