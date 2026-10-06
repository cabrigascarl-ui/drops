import React,{useState} from 'react'
import {Calculator} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {calculateBill,consumptionOf,peso} from '../../services/billingService.js'
import {PageHeader,Card,CardHead,Button} from '../../components/UI.jsx'

// Uses only the signed-in citizen's own tariff and classification. Previous and current readings are entered here.
export default function CalculatorPage(){
  const {data}=useData()
  const account=data.consumers[0]
  const tariff=data.tariffs.find(t=>t.name===account?.tier)
  const previous=account?.current??'',[current,setCurrent]=useState(''),[error,setError]=useState(''),[result,setResult]=useState(null)
  if(!account)return null
  const calculate=event=>{
    event.preventDefault()
    const prev=Number(previous),cur=Number(current)
    if(previous===''||current===''){setError('Enter both the previous and the current reading.');setResult(null);return}
    if(!Number.isFinite(prev)||!Number.isFinite(cur)||prev<0||cur<0){setError('Readings must be numbers of 0 or more.');setResult(null);return}
    if(cur<prev){setError('The current reading must be at least the previous reading.');setResult(null);return}
    if(!tariff){setError('No rate is assigned to your account. Contact your municipal water office.');setResult(null);return}
    setError('')
    setResult({usage:consumptionOf(prev,cur),amount:calculateBill(prev,cur,tariff)})
  }
  return <>
    <PageHeader eyebrow="ESTIMATE" title="Bill calculator" description="Estimate your water bill from your meter readings. Your rate comes from your account and cannot be changed here."/>
    <div className="dashboard-grid main-grid">
      <Card>
        <CardHead title="Your readings" subtitle="The previous reading is pre-filled from your last recorded reading"/>
        <form onSubmit={calculate} noValidate className="calc-form">
          <label className="form-field"><span>Previous reading (m³)</span><input type="number" value={previous} readOnly aria-readonly="true" className="readonly-field" title="Your last recorded reading. It cannot be changed here."/><small className="field-note">Your last recorded reading</small></label>
          <label className="form-field"><span>Current reading (m³)</span><input type="number" min="0" step="1" value={current} onChange={e=>setCurrent(e.target.value)} placeholder="e.g. 140"/></label>
          {error&&<p className="form-error">{error}</p>}
          <Button type="submit" icon={Calculator}>Calculate estimate</Button>
        </form>
      </Card>
      <Card>
        <CardHead title="Your rate" subtitle="Assigned to your account"/>
        <div className="calc-rate">
          <div><span>Classification</span><strong>{account.type} / {account.tier}</strong></div>
          <div><span>Rate</span><strong>{tariff?`${peso(tariff.rate)} / m³`:'Not assigned'}</strong></div>
          <div><span>Minimum charge</span><strong>{tariff?peso(tariff.minimum):'—'}</strong></div>
        </div>
        {result&&<div className="calc-result">
          <span>Consumption</span><strong>{result.usage} m³</strong>
          <span>Estimated bill</span><strong>{peso(result.amount)}</strong>
          <p>THIS IS AN ESTIMATED BILL. The official bill is issued by the municipal water office.</p>
        </div>}
      </Card>
    </div>
  </>
}
