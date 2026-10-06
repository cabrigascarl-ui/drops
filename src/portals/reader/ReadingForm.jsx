import React,{useMemo,useState} from 'react'
import {useNavigate,useParams} from 'react-router-dom'
import {ArrowLeft,CheckCircle2,Printer,Save,TriangleAlert,UserRound} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {dateISO,consumptionOf} from '../../services/billingService.js'
import {classify,LEVELS} from '../../services/consumptionService.js'
import {connectedPrinter,printBytes,readingReceipt} from '../../services/printerService.js'
import {routeOrder,LOW_USAGE} from './readerShared.js'
import {receiptArgsFor} from './receiptPreview.js'
import BillStatement from './BillStatement.jsx'

const METER_STATUSES=['Normal','Meter damaged','Meter not reading','Inaccessible']

// Reading form for one customer. Data collection only: tariffs and classifications stay with the LGU.
export default function ReadingForm(){
  const {id}=useParams()
  const navigate=useNavigate()
  const {data,session,period,online,addReading,thresholds}=useData()
  const consumer=data.consumers.find(c=>c.id===id)
  const alreadyRead=data.readings.some(r=>r.consumerId===id&&r.date?.startsWith(period))
  const sequence=useMemo(()=>routeOrder(data.consumers,session?.route||[]).findIndex(c=>c.id===id)+1,[data.consumers,session,id])
  const [saved,setSaved]=useState(null)
  const [current,setCurrent]=useState(''),[date,setDate]=useState(dateISO()),[meterStatus,setMeterStatus]=useState('Normal'),[error,setError]=useState(''),[unusual,setUnusual]=useState(null),[printMessage,setPrintMessage]=useState('')
  if(!consumer)return <div className="reader-page"><header className="reader-hero compact"><div className="reader-hero-top"><button className="reader-icon-btn" onClick={()=>navigate('/reader/route')} aria-label="Back"><ArrowLeft size={18}/></button><h1>Customer</h1><span/></div></header><p className="reader-empty">This customer is not on your route.</p></div>
  const previous=consumer.current
  const usage=current===''?null:consumptionOf(previous,Number(current))
  const level=usage===null?null:classify(usage,consumer.type,thresholds)
  const flagged=level==='HIGH'||level==='CRITICAL'
  const unusualLow=usage!==null&&usage<LOW_USAGE
  const write=()=>{
    const value=Number(current)
    const problem=addReading({consumerId:consumer.id,previous,current:value,date,reader:session?.name||'Meter reader',remarks:meterStatus==='Normal'?'':`Meter status: ${meterStatus}`,meterStatus,photo:'',gps:null})
    if(problem){setError(problem);setUnusual(null);return}
    setUnusual(null)
    setSaved({consumerId:consumer.id,previous,current:value,date})
  }
  const save=event=>{
    event.preventDefault()
    if(current===''){setError('Enter the current meter reading.');return}
    const value=Number(current)
    if(!Number.isInteger(value)||value<previous){setError(`The current reading must be a whole number of at least ${previous} m³.`);return}
    if(unusualLow||flagged){setUnusual(unusualLow?'low':'high');return}
    write()
  }
  const printReceipt=()=>{
    if(!connectedPrinter()){setPrintMessage('Connect a printer on the Sync screen first.');return}
    printBytes(readingReceipt(receiptArgsFor(data,session,saved))).then(()=>setPrintMessage('Receipt sent to the printer.')).catch(e=>setPrintMessage(e.message||'The printer did not respond.'))
  }

  if(saved)return <div className="reader-page">
    <header className="reader-hero compact">
      <div className="reader-hero-top"><button className="reader-icon-btn" onClick={()=>navigate('/reader/route')} aria-label="Back to route"><ArrowLeft size={18}/></button><h1>Bill Preview</h1><span/></div>
    </header>
    <div className="reader-card saved-card"><CheckCircle2 size={22}/><div><strong>Reading Saved</strong><small>Bill generated successfully</small></div></div>
    <BillStatement data={data} session={session} reading={saved}/>
    {printMessage&&<p className="reader-muted">{printMessage}</p>}
    <button className="reader-save" onClick={printReceipt}><Printer size={18}/> Print Receipt</button>
    <button className="reader-save secondary" onClick={()=>navigate('/reader/route')}>Next Customer</button>
  </div>

  return <div className="reader-page">
    <header className="reader-hero compact">
      <div className="reader-hero-top"><button className="reader-icon-btn" onClick={()=>navigate(-1)} aria-label="Back"><ArrowLeft size={18}/></button><h1>Customer Details</h1><span className={`reader-net ${online?'on':'off'}`}>{online?'Online':'Offline'}</span></div>
    </header>
    <div className="reader-card customer-card">
      <div className="customer-head">
        <span className="customer-avatar"><UserRound size={22}/></span>
        <div><h2>{consumer.name}</h2></div>
        <span className="status-pill">{consumer.status}</span>
      </div>
      <dl className="customer-facts">
        <div><dt>Account No.</dt><dd>{consumer.account}</dd></div>
        <div><dt>Sequence No.</dt><dd className="accent">{sequence>0?String(sequence).padStart(3,'0'):'—'}</dd></div>
        <div><dt>Meter No.</dt><dd>{consumer.meter}</dd></div>
        <div><dt>Address</dt><dd>Brgy. {consumer.barangay}</dd></div>
      </dl>
      {alreadyRead&&<p className="customer-warn">Already read this period</p>}
    </div>
    <form className="reader-card reader-form-card" onSubmit={save} noValidate>
      <div className="reading-row"><span>Previous reading</span><strong>{previous} m³</strong></div>
      <div className="reading-row enter"><label htmlFor="new-reading">Enter New Reading</label><input id="new-reading" type="number" min={previous} step="1" inputMode="numeric" autoFocus value={current} onChange={e=>{setCurrent(e.target.value);setError('')}} placeholder={String(previous)}/></div>
      {current!==''&&<div className={`reader-calc ${flagged||unusualLow?'flagged':''}`}>
        <div><span>Consumption</span><strong>{usage===null?'—':`${usage} m³`}</strong></div>
        <div><span>Status</span><strong>{level?LEVELS[level].label:'—'}</strong></div>
        {flagged&&<p><TriangleAlert size={14}/> Potential high consumption for a {consumer.type.toLowerCase()} account. Recheck the meter before saving.</p>}
      </div>}
      <div className="reading-row"><span>Meter status</span><select aria-label="Meter status" value={meterStatus} onChange={e=>setMeterStatus(e.target.value)}>{METER_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div className="reading-row"><span>Reading date</span><input aria-label="Reading date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      {error&&<p className="reader-error">{error}</p>}
      <button className="reader-save" type="submit" disabled={current===''}><Save size={18}/>{online?'Save Reading & Print Bill':'Save offline'}</button>
    </form>
    {unusual&&<div className="unusual-scrim" role="dialog" aria-label="Unusual consumption">
      <div className="unusual-card">
        <span className="unusual-icon"><TriangleAlert size={22}/></span>
        <h3>Unusual Consumption</h3>
        <p>The calculated consumption is <b>{usage} m³</b>, which is <b>unusually {unusual==='low'?'low':'high'}</b>. Please double-check your input to ensure accuracy.</p>
        <button className="unusual-retry" onClick={()=>setUnusual(null)}>Re-enter Reading</button>
        <button className="reader-save" onClick={write}>Confirm &amp; Save</button>
      </div>
    </div>}
  </div>
}
