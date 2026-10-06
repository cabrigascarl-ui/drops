import React from 'react'
import {Printer,Send} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {formatDate,peso} from '../../services/billingService.js'
import {printReceipt} from '../../pages/Payments.jsx'
import {PageHeader,Card,CardHead,DataTable,StatusBadge} from '../../components/UI.jsx'

export default function TellerReceipts(){
  const {data,setToast}=useData()
  const rows=data.payments.map(p=>{const bill=data.bills.find(b=>b.id===p.billId);return {...p,bill,consumer:data.consumers.find(c=>c.id===bill?.consumerId)}})
  const total=rows.reduce((sum,p)=>sum+p.amount,0)
  const columns=[
    {key:'receipt',label:'RECEIPT NO.',sortable:true,render:r=><span className="mono-cell">{r.receipt}</span>},
    {key:'consumer',label:'CONSUMER',render:r=><strong>{r.consumer?.name||'—'}</strong>},
    {key:'bill',label:'BILL',render:r=>r.bill?.number||'—'},
    {key:'method',label:'METHOD',sortable:true},
    {key:'amount',label:'AMOUNT',sortable:true,render:r=>peso(r.amount)},
    {key:'date',label:'DATE',sortable:true,render:r=>formatDate(r.date)},
    {key:'status',label:'STATUS',render:r=><StatusBadge status={r.status}/>},
    {key:'actions',label:'',render:r=><div className="report-actions">
      <button className="table-icon-button" title="Print receipt" aria-label={`Print receipt ${r.receipt}`} onClick={()=>printReceipt(r,r.bill,r.consumer,data.settings)}><Printer size={16}/></button>
      <button className="table-icon-button" title="Send digital receipt" aria-label={`Send receipt ${r.receipt}`} onClick={()=>{const target=r.consumer?.phone||r.consumer?.email;setToast(target?`Digital receipt ${r.receipt} sent to ${target} (demo).`:'No phone or email on file for this account.')}}><Send size={16}/></button>
    </div>}
  ]
  return <>
    <PageHeader eyebrow="COLLECTIONS" title="Receipts and daily collection" description={`${rows.length} receipts · ${peso(total)} collected`}/>
    <Card>
      <CardHead title="All receipts" subtitle="Payments recorded at this desk and online"/>
      <DataTable columns={columns} rows={rows} pageSize={10} empty={<p className="muted">No receipts yet.</p>}/>
    </Card>
  </>
}
