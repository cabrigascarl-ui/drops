import React,{useState,useEffect} from 'react'
import {CheckCircle2,Download,Eye,ShieldCheck,Wallet,Smartphone,Landmark,KeyRound,LoaderCircle,AlertTriangle} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {consumptionOf,formatDate,peso,billStatus} from '../../services/billingService.js'
import {viewReceipt,downloadReceipt} from '../../pages/Payments.jsx'
import {PAYMENT_METHODS,SANDBOX_OTP,isMobileNumber,createCheckout,confirmCheckout} from '../../services/paymentService.js'
import {Button,PageHeader,Card,CardHead,DataTable,StatusBadge,Modal} from '../../components/UI.jsx'

const ICON={ewallet:Smartphone,bank:Landmark}

// Citizen bill payments. Prototype checkout: choose a method, confirm the details, enter the one-time code,
// then the payment is recorded to the bill. No real money moves (see services/paymentService.js).
export default function CitizenBills(){
  const {data,addPayment,session,setToast}=useData()
  const account=data.consumers[0]
  const bills=data.bills.filter(b=>b.consumerId===account?.id).map(b=>({...b,computed:billStatus(b)}))
  const payments=data.payments.filter(p=>bills.some(b=>b.id===p.billId))
  const [paying,setPaying]=useState(null),[method,setMethod]=useState(PAYMENT_METHODS[0].id),[step,setStep]=useState('details'),[mobile,setMobile]=useState(''),[code,setCode]=useState(''),[session_,setSession]=useState(null),[error,setError]=useState(''),[receipt,setReceipt]=useState(null)
  const chosen=PAYMENT_METHODS.find(m=>m.id===method)

  const open=bill=>{setPaying(bill);setMethod(PAYMENT_METHODS[0].id);setStep('details');setMobile(account?.phone||'');setCode('');setSession(null);setError('');setReceipt(null)}
  const close=()=>{setPaying(null);setReceipt(null)}

  // Step 1: validate the details and start a checkout with the gateway.
  const startCheckout=event=>{
    event.preventDefault()
    if(chosen.kind==='ewallet'&&!isMobileNumber(mobile)){setError(`Enter the mobile number registered to your ${chosen.label} account (09XXXXXXXXX).`);return}
    const reference=`${paying.number}`
    setSession(createCheckout({method:chosen.id,amount:paying.amount,reference,mobile,accountName:account?.name}))
    setError('');setStep('otp')
  }

  // Step 2: confirm the one-time code, then record the payment on the bill.
  const confirm=event=>{
    event.preventDefault()
    if(String(code).trim().length!==6){setError('Enter the 6-digit code sent to your phone.');return}
    setStep('processing')
    setTimeout(()=>{
      const result=confirmCheckout(session_,code)
      if(result.status!=='succeeded'){setSession(result);setError(result.error);setStep('otp');return}
      const payment=addPayment(paying.id,chosen.id,`Online · ${chosen.label} (${result.id})`)
      if(!payment){setError('This bill could not be paid. It may already be settled.');setStep('details');return}
      setSession(result);setReceipt({payment,bill:paying});setStep('done')
    },1100)
  }

  useEffect(()=>{if(step==='processing')return undefined;return undefined},[step])

  const columns=[
    {key:'number',label:'BILL NO.',render:r=><span className="mono-cell">{r.number}</span>},
    {key:'month',label:'PERIOD'},
    {key:'usage',label:'USAGE',render:r=>`${consumptionOf(r.previous,r.current)} m³`},
    {key:'amount',label:'AMOUNT',sortable:true,render:r=><strong>{peso(r.amount)}</strong>},
    {key:'dueDate',label:'DUE',sortable:true,render:r=>formatDate(r.dueDate)},
    {key:'computed',label:'STATUS',render:r=><StatusBadge status={r.computed}/>},
    {key:'actions',label:'',render:r=>r.computed==='Paid'?null:<Button icon={Wallet} onClick={()=>open(r)}>Pay now</Button>}
  ]
  const paymentColumns=[
    {key:'receipt',label:'RECEIPT NO.',render:r=><span className="mono-cell">{r.receipt}</span>},
    {key:'date',label:'DATE',sortable:true,render:r=>formatDate(r.date)},
    {key:'method',label:'METHOD'},
    {key:'amount',label:'AMOUNT',render:r=>peso(r.amount)},
    {key:'actions',label:'',render:r=><div className="report-actions">
      <button className="table-icon-button" title="View receipt" aria-label={`View receipt ${r.receipt}`} onClick={()=>viewReceipt(r,bills.find(b=>b.id===r.billId),account,data.settings)}><Eye size={16}/></button>
      <button className="table-icon-button" title="Download receipt" aria-label={`Download receipt ${r.receipt}`} onClick={()=>downloadReceipt(r,bills.find(b=>b.id===r.billId),account,data.settings)}><Download size={16}/></button>
    </div>}
  ]
  if(!account)return null
  return <>
    <PageHeader eyebrow="PAYMENTS" title="Bills and payments" description="Pay your own bills online. Each payment updates your account and creates a receipt."/>
    <Card>
      <CardHead title="My bills" subtitle="Official bills are issued by your municipal water office"/>
      <div className="tight-table"><DataTable columns={columns} rows={bills} empty={<p className="muted">No bills have been issued to your account yet.</p>}/></div>
    </Card>
    <Card>
      <CardHead title="Payment history and receipts" subtitle="Print any receipt for your records"/>
      <DataTable columns={paymentColumns} rows={payments} empty={<p className="muted">No payments recorded yet.</p>}/>
    </Card>
    {paying&&<Modal title={step==='done'?'Payment received':'Pay your bill'} onClose={close} width="520px">
      <div className="sandbox-badge"><ShieldCheck size={14}/> Sandbox checkout · no real money moves</div>

      {step==='details'&&<form onSubmit={startCheckout} noValidate>
        <div className="pay-summary"><div><span>Bill</span><strong>{paying.number}</strong></div><div><span>Period</span><strong>{paying.month}</strong></div><div><span>Amount due</span><strong>{peso(paying.amount)}</strong></div></div>
        <div className="gateway-grid" role="radiogroup" aria-label="Payment method">
          {PAYMENT_METHODS.map(m=>{const Icon=ICON[m.kind];return <button type="button" key={m.id} role="radio" aria-checked={method===m.id} className={`gateway ${method===m.id?'active':''}`} onClick={()=>{setMethod(m.id);setError('')}}>
            <span className={`gateway-mark tone-${m.tone}`}>{m.logo?<img src={m.logo} alt={`${m.label} logo`}/>:m.mark}</span>
            <span className="gateway-text"><strong>{m.label}</strong><small>{m.hint}</small></span>
            <Icon size={16} className="gateway-icon"/>
          </button>})}
        </div>
        {chosen.kind==='ewallet'
          ?<label className="form-field"><span>{chosen.label} mobile number</span><input inputMode="tel" value={mobile} onChange={e=>{setMobile(e.target.value);setError('')}} placeholder="09XXXXXXXXX"/></label>
          :<div className="note-box">You will be asked to confirm the transfer in your bank app. Use the bill number <strong>{paying.number}</strong> as the reference.</div>}
        {error&&<p className="form-error">{error}</p>}
        <div className="modal-actions"><Button variant="secondary" type="button" onClick={close}>Cancel</Button><Button type="submit" icon={Wallet}>Continue to {chosen.label}</Button></div>
      </form>}

      {step==='otp'&&<form onSubmit={confirm} noValidate>
        <div className="otp-card">
          <span className={`gateway-mark large tone-${chosen.tone}`}>{chosen.logo?<img src={chosen.logo} alt={`${chosen.label} logo`}/>:chosen.mark}</span>
          <h3>Enter the code</h3>
          <p>We sent a 6-digit code to <strong>{session_?.mobile||'your bank app'}</strong> to approve {peso(paying.amount)} for bill {paying.number}.</p>
          <input className="otp-input" inputMode="numeric" maxLength={6} value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,''));setError('')}} placeholder="••••••" aria-label="One-time code"/>
          <small className="sandbox-hint"><KeyRound size={12}/> Sandbox code: <strong>{SANDBOX_OTP}</strong></small>
        </div>
        {error&&<p className="form-error"><AlertTriangle size={14}/> {error}</p>}
        <div className="modal-actions"><Button variant="secondary" type="button" onClick={()=>setStep('details')}>Back</Button><Button type="submit" icon={CheckCircle2}>Approve payment</Button></div>
      </form>}

      {step==='processing'&&<div className="pay-processing">
        <LoaderCircle size={34} className="spin-icon"/>
        <h3>Processing your {chosen.label} payment</h3>
        <p>Please keep this window open.</p>
      </div>}

      {step==='done'&&receipt&&<div className="pay-done">
        <div className="success-ring"><CheckCircle2 size={40}/></div>
        <h3>{peso(receipt.payment.amount)} paid</h3>
        <p>Thank you, {session?.name?.split(' ')[0]}. Your official receipt is <strong>{receipt.payment.receipt}</strong>.</p>
        <p className="muted">Gateway reference {session_?.id}</p>
        <div className="modal-actions"><Button variant="secondary" icon={Eye} onClick={()=>viewReceipt(receipt.payment,receipt.bill,account,data.settings)}>View receipt</Button><Button variant="secondary" icon={Download} onClick={()=>downloadReceipt(receipt.payment,receipt.bill,account,data.settings)}>Download receipt</Button><Button onClick={close}>Done</Button></div>
      </div>}
    </Modal>}
  </>
}
