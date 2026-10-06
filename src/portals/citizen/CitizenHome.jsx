import React from 'react'
import {Link} from 'react-router-dom'
import {ArrowRight,Droplets,Gauge,ReceiptText,Wallet,CalendarClock,ScanLine} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {consumptionOf,formatDate,peso,billStatus} from '../../services/billingService.js'
import {Card,CardHead,StatCard,StatusBadge,EmptyState} from '../../components/UI.jsx'
import PortalBanner from '../../components/PortalBanner.jsx'

// Consumption status from the citizen's own warning point and monthly limit.
export function limitStatus(usage,limit,warning){
  if(usage>limit)return {key:'EXCEEDED',label:'Exceeded',tone:'critical'}
  if(usage===limit)return {key:'LIMIT',label:'Limit reached',tone:'high'}
  if(usage>=warning)return {key:'NEAR',label:'Near limit',tone:'near'}
  return {key:'NORMAL',label:'Normal',tone:'normal'}
}

export default function CitizenHome(){
  const {data}=useData()
  const account=data.consumers[0]
  if(!account)return <EmptyState title="No account linked" description="Your account could not be found. Contact your municipal water office."/>
  const bills=data.bills.filter(b=>b.consumerId===account.id)
  const unpaid=bills.filter(b=>billStatus(b)!=='Paid')
  const outstanding=unpaid.reduce((sum,b)=>sum+b.amount,0)
  const current=bills[0]
  const nextDue=[...unpaid].sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]
  const lastPayment=data.payments.find(p=>data.bills.some(b=>b.id===p.billId&&b.consumerId===account.id))
  const usage=consumptionOf(account.previous,account.current)
  const status=limitStatus(usage,account.limit,account.warning)
  const percent=Math.min(100,Math.round(usage/Math.max(1,account.limit)*100))
  return <>
    <PortalBanner eyebrow="MY WATER ACCOUNT" title={`Good day, ${account.name.split(' ')[0]}`} subtitle={`${account.account} · Brgy. ${account.barangay}, ${account.locality}`} stats={[{label:'Current bill',value:peso(current?.amount)},{label:'Outstanding',value:peso(outstanding)}]} action={<Link className="btn btn-light" to="/citizen/bills"><span>Pay a bill</span></Link>}/>
    <div className="stats-grid citizen-stats">
      <StatCard label="CURRENT BILL" value={peso(current?.amount)} change={current?billStatus(current):'—'} detail={current?.month||'No bill yet'} icon={ReceiptText} tone="blue"/>
      <StatCard label="CURRENT CONSUMPTION" value={`${usage} m³`} change={status.label} detail={`Monthly limit ${account.limit} m³`} icon={Droplets} tone="cyan"/>
      <StatCard label="OUTSTANDING BALANCE" value={peso(outstanding)} change={`${unpaid.length} open`} detail="Unpaid bills" icon={Wallet} tone="rose"/>
      <StatCard label="NEXT DUE DATE" value={nextDue?formatDate(nextDue.dueDate):'—'} change={nextDue?'Pay on time':'All paid'} detail={lastPayment?`Last payment ${formatDate(lastPayment.date)}`:'No payments yet'} icon={CalendarClock} tone="teal"/>
    </div>
    <div className="dashboard-grid main-grid">
      <Card>
        <CardHead title="Consumption status" subtitle="Compared with your own warning point and monthly limit"/>
        <div className="citizen-meter"><strong>{usage} <small>/ {account.limit} m³</small></strong><StatusBadge status={status.label}/></div>
        <div className="progress-track citizen-track"><span style={{width:`${percent}%`}}/></div>
        <div className="citizen-readings">
          <div><span>Previous reading</span><strong>{account.previous} m³</strong></div>
          <div><span>Current reading</span><strong>{account.current} m³</strong></div>
          <div><span>Warning point</span><strong>{account.warning} m³</strong></div>
        </div>
        <Link className="text-link" to="/citizen/bills">View bills and pay <ArrowRight size={14}/></Link>
      </Card>
      <Card>
        <CardHead title="Quick actions" subtitle="Everything you need for your account"/>
        <div className="citizen-actions">
          <Link to="/citizen/bills"><ReceiptText size={18}/><span>Pay a bill</span></Link>
          <Link to="/citizen/calculator"><Gauge size={18}/><span>Estimate my bill</span></Link>
          <Link to="/citizen/account"><ScanLine size={18}/><span>Set my limits</span></Link>
        </div>
        <p className="muted citizen-note">Your official bill is issued by your municipal water office. Calculator results are estimates only.</p>
      </Card>
    </div>
  </>
}
