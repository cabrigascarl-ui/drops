import React,{useMemo,useState} from 'react'
import {Camera,Send,Wrench} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {REQUEST_TYPES} from '../../services/operationsService.js'
import {timeAgo} from '../../services/billingService.js'
import {PageHeader,Card,CardHead,Button,StatusBadge} from '../../components/UI.jsx'

const EMPTY={type:'',description:'',photo:''}
// Browser storage holds the photo with the request, so keep uploads small.
const MAX_PHOTO_BYTES=1024*1024

// A citizen reports a problem with their own connection. The LGU sees it under Service Requests.
export default function CitizenRequests(){
  const {data,saveCitizenRequest}=useData()
  const account=data.consumers[0]
  const [form,setForm]=useState(EMPTY),[error,setError]=useState('')
  const mine=useMemo(()=>(data.serviceRequests||[]).filter(r=>r.consumerId===account?.id).sort((a,b)=>String(b.at).localeCompare(String(a.at))),[data.serviceRequests,account?.id])
  if(!account)return null
  const set=(key,value)=>{setError('');setForm(current=>({...current,[key]:value}))}
  const choosePhoto=event=>{
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file)return
    if(!file.type.startsWith('image/')){setError('Choose an image file (JPG, PNG or WEBP).');return}
    if(file.size>MAX_PHOTO_BYTES){setError('Choose an image under 1 MB.');return}
    const reader=new FileReader()
    reader.onload=()=>{setError('');setForm(current=>({...current,photo:String(reader.result)}))}
    reader.onerror=()=>setError('The image could not be read. Try another file.')
    reader.readAsDataURL(file)
  }
  const submit=event=>{
    event.preventDefault()
    const result=saveCitizenRequest(form)
    if(result)setError(result)
    else setForm(EMPTY)
  }
  return <>
    <PageHeader eyebrow="MY WATER SERVICE" title="Service requests" description={`Report a problem with your water connection. Your request goes straight to the ${account.locality} LGU.`}/>
    <div className="dashboard-grid main-grid">
      <Card>
        <CardHead title="Report a problem" subtitle={`Account ${account.account} · Meter ${account.meter}`}/>
        <form onSubmit={submit} noValidate className="calc-form">
          <label className="form-field"><span>What is the problem?</span>
            <select value={form.type} onChange={e=>set('type',e.target.value)}>
              <option value="">Choose a problem</option>
              {REQUEST_TYPES.map(type=><option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="form-field"><span>Describe what happened</span>
            <textarea rows={4} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="For example: no water since this morning, or a leak near the gate."/>
          </label>
          <div className="form-field">
            <span>Photo (optional)</span>
            {form.photo
              ?<div className="request-photo-preview"><img src={form.photo} alt="Photo of the problem"/><button type="button" className="table-icon-button" onClick={()=>set('photo','')}>Remove photo</button></div>
              :<label className="request-photo-drop"><Camera size={18}/> Upload a photo of the problem<input type="file" accept="image/*" onChange={choosePhoto}/></label>}
          </div>
          {error&&<p className="form-error">{error}</p>}
          <Button type="submit" icon={Send}>Send to LGU</Button>
        </form>
        <div className="citizen-note"><Wrench size={16}/> The LGU crew checks the problem and updates the status here.</div>
      </Card>
      <Card>
        <CardHead title="My requests" subtitle={mine.length?`${mine.length} sent from this account`:'Requests you send appear here'}/>
        {mine.length===0
          ?<p className="muted">You have not sent any service requests yet.</p>
          :<div className="activity-list padded">{mine.map(r=><div className="activity-row" key={r.id}>
            <span className="activity-icon"><Wrench size={16}/></span>
            <div><strong>{r.type}</strong><small>{r.description}</small>{r.photo&&<img className="request-thumb" src={r.photo} alt={`Photo for ${r.type}`}/>}</div>
            <div className="request-status"><StatusBadge status={r.status}/><time>{timeAgo(r.at)}</time></div>
          </div>)}</div>}
      </Card>
    </div>
  </>
}
