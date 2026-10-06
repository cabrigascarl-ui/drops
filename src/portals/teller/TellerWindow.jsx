import React,{useMemo,useState} from 'react'
import {Printer,Send,Wallet,Search} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {formatDate,peso,billStatus,dateISO} from '../../services/billingService.js'
import {printReceipt} from '../../pages/Payments.jsx'
import {PageHeader,Card,CardHead,Button,SearchInput,EmptyState,Modal,StatusBadge} from '../../components/UI.jsx'
import {TELLER_METHODS} from './TellerSearch.jsx'
import CustomerLedger from './CustomerLedger.jsx'

// Counter view: find the account, take the payment, and see what has been collected today.
export default function TellerWindow(){
  const {data,addPayment,setToast,session}=useData()
  const [query,setQuery]=useState(''),[selectedId,setSelectedId]=useState(null),[billId,setBillId]=useState(''),[method,setMethod]=useState('Cash'),[tendered,setTendered]=useState(''),[error,setError]=useState(''),[receipt,setReceipt]=useState(null)
  const results=useMemo(()=>{
    const q=query.trim().toLowerCase()
    if(!q)return []
    return data.consumers.filter(c=>[c.name,c.account,c.meter,c.phone].join(' ').toLowerCase().includes(q)).slice(0,8)
  },[data.consumers,query])
  // Sample accounts that have open bills, so the counter has something to try before any search.
  const samples=useMemo(()=>{const open=new Set(data.bills.filter(b=>billStatus(b)!=='Paid').map(b=>b.consumerId));return data.consumers.filter(c=>open.has(c.id)).slice(0,5)},[data.bills,data.consumers])
  const consumer=data.consumers.find(c=>c.id===selectedId)
  const bills=consumer?data.bills.filter(b=>b.consumerId===consumer.id).map(b=>({...b,computed:billStatus(b)})):[]
  const unpaid=bills.filter(b=>b.computed!=='Paid').sort((a,b)=>a.dueDate.localeCompare(b.dueDate))
  const totalDue=unpaid.reduce((sum,b)=>sum+b.amount,0)
  const selectedBill=unpaid.find(b=>b.id===billId)
  const paymentsOnAccount=consumer?data.payments.filter(p=>bills.some(b=>b.id===p.billId)):[]
  const cash=Number(tendered)
  const change=method==='Cash'&&selectedBill&&tendered!==''?cash-selectedBill.amount:null
  // Today's collections at this window, by method.
  const today=dateISO()
  const todays=data.payments.filter(p=>p.date===today&&p.collector===(session?.name||'Teller'))
  const byMethod=TELLER_METHODS.map(m=>({method:m,count:todays.filter(p=>p.method===m).length,total:todays.filter(p=>p.method===m).reduce((s,p)=>s+p.amount,0)})).filter(row=>row.count)
  const todayTotal=todays.reduce((s,p)=>s+p.amount,0)
  const choose=c=>{setSelectedId(c.id);setBillId('');setTendered('');setError('')}
  const pay=event=>{
    event.preventDefault()
    if(!selectedBill){setError('Choose the bill to pay.');return}
    if(method==='Cash'&&tendered!==''&&(!Number.isFinite(cash)||cash<selectedBill.amount)){setError(`Cash tendered must be at least ${peso(selectedBill.amount)}.`);return}
    const payment=addPayment(selectedBill.id,method,session?.name||'Teller')
    if(!payment){setError('This bill is already paid or cannot be paid.');return}
    setError('')
    setReceipt({payment,bill:selectedBill,change:method==='Cash'&&tendered!==''?change:null})
    setBillId('');setTendered('')
  }
  const sendDigital=()=>{const target=consumer.phone||consumer.email;setToast(target?`Digital receipt sent to ${target} (demo).`:'No phone or email on file for this account.')}
  return <>
    <PageHeader eyebrow="TELLER" title="Collection window" description="Serve the counter: find the account, take the payment, and print the official receipt."
      stats={[{label:'Collected today',value:peso(todayTotal)},{label:'Payments today',value:todays.length}]}/>
    <div className="dashboard-grid main-grid">
      <Card>
        <CardHead title="Find account" subtitle="Account number, name, meter number or phone"/>
        <div className="list-toolbar"><SearchInput value={query} onChange={setQuery} placeholder="Type to search..."/></div>
        {!query.trim()?<><p className="muted">Sample accounts with open bills. Tap one to try a payment, or search above.</p><div className="teller-results">{samples.map(c=><button key={c.id} className={c.id===selectedId?'active':''} onClick={()=>choose(c)}><strong>{c.name}</strong><small>{c.account} · Meter {c.meter}</small><small>{c.barangay}, {c.locality}</small></button>)}</div></>:
          results.length===0?<EmptyState title="No accounts found" description="Check the spelling or try the meter number."/>:
          <div className="teller-results">{results.map(c=><button key={c.id} className={c.id===selectedId?'active':''} onClick={()=>choose(c)}><strong>{c.name}</strong><small>{c.account} · Meter {c.meter}</small><small>{c.barangay}, {c.locality}</small></button>)}</div>}
        {!consumer&&!query.trim()&&<div className="citizen-note"><Search size={16}/> Pick an account to see the amount due.</div>}
        {consumer&&<div className="info-list" style={{marginTop:14}}>
          <div><span>Account</span><strong>{consumer.name} · {consumer.account}</strong></div>
          <div><span>Total due</span><strong className="total-due">{peso(totalDue)}</strong></div>
          <div><span>Open bills</span><strong>{unpaid.length}</strong></div>
        </div>}
      </Card>
      <Card>
        <CardHead title="Take payment" subtitle={consumer?'Full payment of one open bill':'Select an account first'}/>
        {!consumer?<p className="muted">No account selected.</p>:unpaid.length===0?<p className="muted">Nothing is due on this account.</p>:
        <form onSubmit={pay} noValidate className="calc-form">
          <label className="form-field"><span>Bill to pay</span><select value={billId} onChange={e=>{setBillId(e.target.value);setError('')}}><option value="">Select a bill</option>{unpaid.map(b=><option key={b.id} value={b.id}>{b.number} · {b.month} · {peso(b.amount)} · due {formatDate(b.dueDate)}</option>)}</select></label>
          <label className="form-field"><span>Payment method</span><select value={method} onChange={e=>{setMethod(e.target.value);setTendered('')}}>{TELLER_METHODS.map(m=><option key={m}>{m}</option>)}</select></label>
          {method==='Cash'&&<label className="form-field"><span>Cash tendered</span><input type="number" min="0" step="0.01" inputMode="decimal" value={tendered} onChange={e=>{setTendered(e.target.value);setError('')}} placeholder={selectedBill?String(selectedBill.amount):'0.00'}/></label>}
          {method==='Cash'&&change!==null&&<div className="bill-preview"><div><span>Amount due</span><strong>{peso(selectedBill.amount)}</strong></div><div><span>Change</span><strong className={change<0?'overdue':''}>{change<0?'Not enough':peso(change)}</strong></div></div>}
          {error&&<p className="form-error">{error}</p>}
          <Button type="submit" icon={Wallet}>Record payment</Button>
        </form>}
        <div style={{marginTop:18}}>
          <CardHead title="Collected today" subtitle={byMethod.length?'By payment method':'No payments at this window yet'}/>
          {byMethod.length>0&&<div className="info-list">{byMethod.map(row=><div key={row.method}><span>{row.method} · {row.count} payment{row.count===1?'':'s'}</span><strong>{peso(row.total)}</strong></div>)}</div>}
        </div>
      </Card>
    </div>
    {consumer&&<CustomerLedger consumer={consumer} bills={bills} payments={paymentsOnAccount}/>}
    {receipt&&<Modal title="Payment recorded" onClose={()=>setReceipt(null)} width="480px">
      <div className="pay-done"><h3>{peso(receipt.payment.amount)} received</h3>
        {receipt.change!==null&&<p><strong>Change: {peso(receipt.change)}</strong></p>}
        <p>Official receipt <strong>{receipt.payment.receipt}</strong> · {receipt.payment.method} · {formatDate(receipt.payment.date)}</p><p className="muted">Teller: {receipt.payment.collector}</p>
        <div className="modal-actions"><Button variant="secondary" icon={Send} onClick={sendDigital}>Send digital receipt</Button><Button variant="secondary" icon={Printer} onClick={()=>printReceipt(receipt.payment,receipt.bill,consumer,data.settings)}>Print receipt</Button><Button onClick={()=>setReceipt(null)}>Done</Button></div>
      </div>
    </Modal>}
  </>
}
