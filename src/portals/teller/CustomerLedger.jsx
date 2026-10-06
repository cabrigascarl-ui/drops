import React,{useMemo} from 'react'
import {formatDate,peso} from '../../services/billingService.js'
import {Card,CardHead,StatusBadge} from '../../components/UI.jsx'

// Statement for one account: every bill (charge) and payment (credit), oldest first, with the running balance.
export default function CustomerLedger({consumer,bills,payments}){
  const rows=useMemo(()=>{
    const charges=bills.map(b=>({key:'b-'+b.id,date:b.dueDate,kind:'Bill',detail:`${b.number} · ${b.month}`,debit:b.amount,credit:0,status:b.status==='Paid'?'Paid':'Unpaid'}))
    const credits=payments.map(p=>({key:'p-'+p.id,date:p.date,kind:'Payment',detail:`${p.receipt} · ${p.method}`,debit:0,credit:p.amount,status:p.status||'Completed'}))
    const sorted=[...charges,...credits].sort((a,b)=>String(a.date).localeCompare(String(b.date)))
    let balance=0
    return sorted.map(row=>{balance+=row.debit-row.credit;return {...row,balance}})
  },[bills,payments])
  const balance=rows.length?rows[rows.length-1].balance:0
  return <Card>
    <CardHead title="Customer ledger" subtitle={`${consumer.account} · bills and payments, oldest first`} action={<strong className={balance>0?'total-due':''}>{peso(balance)} balance</strong>}/>
    {rows.length===0?<p className="muted">No bills or payments on this account yet.</p>:
    <div className="ledger-wrap"><table className="ledger-table">
      <thead><tr><th>Date</th><th>Entry</th><th className="num">Charges</th><th className="num">Payments</th><th className="num">Balance</th><th>Status</th></tr></thead>
      <tbody>{rows.map(r=><tr key={r.key}>
        <td>{formatDate(r.date)}</td>
        <td><strong>{r.kind}</strong><small className="block muted">{r.detail}</small></td>
        <td className="num">{r.debit?peso(r.debit):'—'}</td>
        <td className="num">{r.credit?peso(r.credit):'—'}</td>
        <td className="num"><strong>{peso(r.balance)}</strong></td>
        <td><StatusBadge status={r.status}/></td>
      </tr>)}</tbody>
    </table></div>}
  </Card>
}
