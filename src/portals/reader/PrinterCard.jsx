import React,{useState} from 'react'
import {Bluetooth,Printer,Unplug,Receipt} from 'lucide-react'
import {billStatus} from '../../services/billingService.js'
import {useData} from '../../context/DataContext.jsx'
import {bluetoothSupported,connectedPrinter,scanAndConnect,disconnectPrinter,printBytes,testPage,readingReceipt,billReceiptLines} from '../../services/printerService.js'

// Bluetooth printer: scan and connect, print a test page, or print the receipt for a reading.
export default function PrinterCard(){
  const {data,session,period}=useData()
  const [name,setName]=useState(connectedPrinter()),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[readingId,setReadingId]=useState('')
  const supported=bluetoothSupported()
  const [showPreview,setShowPreview]=useState(false)
  const organization=data.settings.utilityName
  const mine=data.readings.filter(r=>r.reader===session?.name).slice(0,15)
  const run=async(action,ok)=>{
    setBusy(true);setMessage('')
    try{await action();setMessage(ok)}catch(error){setMessage(error.message||'The printer did not respond.')}
    finally{setBusy(false)}
  }
  const connect=()=>run(async()=>setName(await scanAndConnect()),'Printer connected.')
  const disconnect=()=>run(async()=>{await disconnectPrinter();setName(null)},'Printer disconnected.')
  const test=()=>run(()=>printBytes(testPage(organization)),'Test page sent.')
  const printReading=()=>{
    const reading=mine.find(r=>r.id===readingId)
    if(!reading)return setMessage('Choose a reading to print.')
    const consumer=data.consumers.find(c=>c.id===reading.consumerId)
    run(()=>printBytes(readingReceipt(receiptArgs(reading))),'Receipt sent to the printer.')
  }
  // Everything the receipt needs, from the reading, the customer's rate, and the district settings.
  const receiptArgs=reading=>{
    const consumer=data.consumers.find(c=>c.id===reading.consumerId)
    const tariff=data.tariffs.find(t=>t.name===consumer?.tier)
    const previousBalance=data.bills.filter(b=>b.consumerId===consumer?.id&&billStatus(b)!=='Paid').reduce((sum,b)=>sum+b.amount,0)
    const billingMonth=new Date(reading.date+'T12:00:00').toLocaleString('en-US',{month:'long',year:'numeric'}).toUpperCase()
    return {utility:data.settings,consumer,reading,tariff,previousBalance,dueDays:data.settings.dueDays,reader:session?.name||'',billingMonth}
  }
  const previewText=()=>{
    const reading=mine.find(r=>r.id===readingId)
    if(!reading)return ''
    return billReceiptLines(receiptArgs(reading)).map(l=>typeof l==='string'?l:l.text).join('\n')
  }

  return <div className="reader-card printer">
    <div className="printer-head"><Bluetooth size={20}/><strong>{name?`Connected: ${name}`:'Thermal printer'}</strong>
      {name
        ?<button className="reader-chip-btn" onClick={disconnect} disabled={busy}><Unplug size={14}/> Disconnect</button>
        :<button className="reader-chip-btn" onClick={connect} disabled={busy||!supported}>{busy?'Connecting…':'Scan & connect'}</button>}
    </div>
    {!supported&&<div className="printer-empty">Thermal printing needs Chrome or Edge on localhost or HTTPS. Classic Bluetooth printers need the native app.</div>}
    {supported&&!name&&<div className="printer-empty">Turn the thermal printer on, then press Scan &amp; connect. Choose it from the list the browser shows.</div>}
    {name&&<button className="reader-chip-btn" onClick={test} disabled={busy} style={{marginTop:10}}><Printer size={14}/> Print test page</button>}
    <div className="printer-receipt">
      <select aria-label="Reading to print" value={readingId} onChange={e=>{setReadingId(e.target.value);setShowPreview(false)}}>
        <option value="">Choose a reading ({period})</option>
        {mine.map(r=>{const c=data.consumers.find(x=>x.id===r.consumerId);return <option key={r.id} value={r.id}>{c?.account} · {c?.name} · {r.current} m³</option>})}
      </select>
      <button className="reader-chip-btn" onClick={()=>setShowPreview(!showPreview)} disabled={!readingId}><Receipt size={14}/> {showPreview?'Hide preview':'Preview receipt'}</button>
      <button className="reader-save small" onClick={printReading} disabled={busy||!readingId||!name}><Printer size={14}/> {name?'Print receipt':'Connect to print'}</button>
    </div>
    {showPreview&&readingId&&<pre className="receipt-preview">{previewText()}</pre>}
    {message&&<p className="printer-message">{message}</p>}
  </div>
}
