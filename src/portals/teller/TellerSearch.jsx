import React,{useMemo,useState} from 'react'
import {Printer,Send,Wallet,Search} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {formatDate,peso,billStatus} from '../../services/billingService.js'
import {printReceipt} from '../../pages/Payments.jsx'
import {PageHeader,Card,CardHead,Button,SearchInput,EmptyState,Modal,StatusBadge} from '../../components/UI.jsx'
import CustomerLedger from './CustomerLedger.jsx'

export const TELLER_METHODS=['Cash','GCash','Maya','Bank Transfer','Other']

export default function TellerSearch(){
  const {data,addPayment,setToast,session}=useData()
  const [query,setQuery]=useState(''),[selectedId,setSelectedId]=useState(null),[billId,setBillId]=useState(''),[method,setMethod]=useState('Cash'),[error,setError]=useState(''),[receipt,setReceipt]=useState(null)
  const results=useMemo(()=>{
    const q=query.trim().toLowerCase()
    if(!q)return []
    return data.consumers.filter(c=>[c.name,c.account,c.meter,c.phone].join(' ').toLowerCase().includes(q)).slice(0,12)
  },[data.consumers,query])
  // Sample accounts that have open bills, so the desk has something to try before any search.
  const samples=useMemo(()=>{const open=new Set(data.bills.filter(b=>billStatus(b)!=='Paid').map(b=>b.consumerId));return data.consumers.filter(c=>open.has(c.id)).slice(0,5)},[data.bills,data.consumers])
  const consumer=data.consumers.find(c=>c.id===selectedId)
  const bills=consumer?data.bills.filter(b=>b.consumerId===consumer.id).map(b=>({...b,computed:billStatus(b)})):[]
  const unpaid=bills.filter(b=>b.computed!=='Paid').sort((a,b)=>a.dueDate.localeCompare(b.dueDate))
  const current=unpaid[unpaid.length-1]||bills[0]
  const previousBalance=unpaid.filter(b=>b.id!==current?.id).reduce((sum,b)=>sum+b.amount,0)
  const penalty=0
  const totalDue=unpaid.reduce((sum,b)=>sum+b.amount,0)+penalty
  const pay=event=>{
    event.preventDefault()
    if(!billId){setError('Choose the bill to pay.');return}
    const payment=addPayment(billId,method,session?.name||'Teller')
    if(!payment){setError('This bill is already paid or cannot be paid.');return}
    setError('')
    setReceipt({payment,bill:bills.find(b=>b.id===billId)})
    setBillId('')
  }
  const sendDigital=()=>{const target=consumer.phone||consumer.email;setToast(target?`Digital receipt sent to ${target} (demo).`:'No phone or email on file for this account.')}
  return <>
    <PageHeader eyebrow="TELLER" title="Search account" description="Find a consumer by account number, name, meter number or phone, then record a payment."/>
    <Card>
      <div className="list-toolbar"><SearchInput value={query} onChange={setQuery} placeholder="Account no., name, meter no. or phone..."/></div>
      {!query.trim()?<><p className="muted">Sample accounts with open bills. Tap one to try a payment, or search above.</p><div className="teller-results">{samples.map(c=><button key={c.id} className={c.id===selectedId?'active':''} onClick={()=>{setSelectedId(c.id);setBillId('');setError('')}}><strong>{c.name}</strong><small>{c.account} · Meter {c.meter}</small><small>{c.barangay}, {c.locality}</small></button>)}</div></>:
        results.length===0?<EmptyState title="No accounts found" description="Check the spelling or try the account number."/>:
        <div className="teller-results">{results.map(c=><button key={c.id} className={c.id===selectedId?'active':''} onClick={()=>{setSelectedId(c.id);setBillId('');setError('')}}><strong>{c.name}</strong><small>{c.account} · Meter {c.meter}</small><small>{c.barangay}, {c.locality}</small></button>)}</div>}
    </Card>
    {consumer&&<div className="dashboard-grid main-grid">
      <Card>
        <CardHead title={consumer.name} subtitle={`${consumer.account} · ${consumer.status}`} action={<StatusBadge status={consumer.status}/>}/>
        <div className="info-list">
          <div><span>Address</span><strong>{consumer.address}, {consumer.barangay}, {consumer.locality}</strong></div>
          <div><span>Meter number</span><strong>{consumer.meter}</strong></div>
          <div><span>Current bill</span><strong>{current?`${peso(current.amount)} · ${current.month}`:'No bill yet'}</strong></div>
          <div><span>Previous balance</span><strong>{peso(previousBalance)}</strong></div>
          <div><span>Penalty</span><strong>{peso(penalty)} <small className="muted">(no late penalty configured)</small></strong></div>
          <div><span>Total due</span><strong className="total-due">{peso(totalDue)}</strong></div>
        </div>
      </Card>
      <Card>
        <CardHead title="Record payment" subtitle="Full payment of the selected bill"/>
        {unpaid.length===0?<p className="muted">Nothing is due on this account.</p>:
        <form onSubmit={pay} noValidate className="calc-form">
          <label className="form-field"><span>Bill to pay</span><select value={billId} onChange={e=>{setBillId(e.target.value);setError('')}}><option value="">Select a bill</option>{unpaid.map(b=><option key={b.id} value={b.id}>{b.number} · {b.month} · {peso(b.amount)} · due {formatDate(b.dueDate)}</option>)}</select></label>
          <label className="form-field"><span>Payment method</span><select value={method} onChange={e=>setMethod(e.target.value)}>{TELLER_METHODS.map(m=><option key={m}>{m}</option>)}</select></label>
          {error&&<p className="form-error">{error}</p>}
          <Button type="submit" icon={Wallet}>Record payment</Button>
        </form>}
      </Card>
    </div>}
    {consumer&&<CustomerLedger consumer={consumer} bills={bills} payments={data.payments.filter(p=>bills.some(b=>b.id===p.billId))}/>}
    {receipt&&<Modal title="Payment recorded" onClose={()=>setReceipt(null)} width="480px">
      <div className="pay-done"><h3>{peso(receipt.payment.amount)} received</h3><p>Official receipt <strong>{receipt.payment.receipt}</strong> · {receipt.payment.method} · {formatDate(receipt.payment.date)}</p><p className="muted">Teller: {receipt.payment.collector}</p>
        <div className="modal-actions"><Button variant="secondary" icon={Send} onClick={sendDigital}>Send digital receipt</Button><Button variant="secondary" icon={Printer} onClick={()=>printReceipt(receipt.payment,receipt.bill,consumer,data.settings)}>Print receipt</Button><Button onClick={()=>setReceipt(null)}>Done</Button></div>
      </div>
    </Modal>}
  </>
}
