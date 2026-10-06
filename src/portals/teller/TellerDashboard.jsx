import React from 'react'
import {Link} from 'react-router-dom'
import {CreditCard,Landmark,ReceiptText,Wallet,Users} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {dateISO,formatDate,peso,billStatus} from '../../services/billingService.js'
import {Card,CardHead,StatCard,DataTable,StatusBadge} from '../../components/UI.jsx'
import PortalBanner from '../../components/PortalBanner.jsx'

export default function TellerDashboard(){
  const {data,session}=useData()
  const today=dateISO()
  const todays=data.payments.filter(p=>p.date===today)
  const collected=todays.reduce((sum,p)=>sum+p.amount,0)
  const cash=todays.filter(p=>p.method==='Cash').reduce((sum,p)=>sum+p.amount,0)
  const digital=collected-cash
  const recent=data.payments.slice(0,8).map(p=>({...p,consumer:data.consumers.find(c=>c.id===data.bills.find(b=>b.id===p.billId)?.consumerId)}))
  const columns=[
    {key:'receipt',label:'RECEIPT NO.',render:r=><span className="mono-cell">{r.receipt}</span>},
    {key:'consumer',label:'CONSUMER',render:r=><strong>{r.consumer?.name||'—'}</strong>},
    {key:'method',label:'METHOD'},
    {key:'amount',label:'AMOUNT',render:r=>peso(r.amount)},
    {key:'date',label:'DATE',render:r=>formatDate(r.date)},
    {key:'status',label:'STATUS',render:r=><StatusBadge status={r.status}/>}
  ]
  return <>
    <PortalBanner eyebrow="COLLECTIONS DESK" title={`Welcome, ${session?.name?.split(' ')[0]}`} subtitle={`${session?.municipality} · collections for ${today}`} action={<Link className="btn btn-light" to="/teller/search"><span>Find an account</span></Link>}>
    <div className="stats-grid">
      <StatCard label="COLLECTIONS TODAY" value={peso(collected)} change={`${todays.length} payments`} detail="Recorded today" icon={Wallet} tone="teal"/>
      <StatCard label="TRANSACTIONS TODAY" value={todays.length} change="Today" detail="Completed payments" icon={ReceiptText} tone="blue"/>
      <StatCard label="CASH PAYMENTS" value={peso(cash)} change="Cash" detail="Collected at the counter" icon={Landmark} tone="cyan"/>
      <StatCard label="DIGITAL PAYMENTS" value={peso(digital)} change="E-wallet & bank" detail="GCash, Maya, bank transfer" icon={CreditCard} tone="blue"/>
    </div>
    </PortalBanner>
    <Card>
      <CardHead title="Recent payments" subtitle="Latest transactions at this desk" action={<Users size={18} color="#92a4b8"/>}/>
      <DataTable columns={columns} rows={recent} empty={<p className="muted">No payments recorded yet.</p>}/>
    </Card>
  </>
}
