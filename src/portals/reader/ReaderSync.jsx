import React,{useRef,useState} from 'react'
import {Bluetooth,Database,Download,RefreshCw,Upload} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {dateISO,consumptionOf,calculateBill,addDays,billStatus} from '../../services/billingService.js'
import {routeOrder,parseReadingFile,TBLMAST_COLUMNS,RATE_CODES} from './readerShared.js'
import PrinterCard from './PrinterCard.jsx'

// Sync screen: upload readings from the billing system's file, download this device's readings in the same layout, and sync.
export default function ReaderSync(){
  const {data,session,period,online,syncNow,addReading,lastSync,setToast}=useData()
  const tariffs=data.tariffs
  const fileRef=useRef(null)
  const [result,setResult]=useState(null),[importError,setImportError]=useState('')
  const mine=routeOrder(data.consumers,session?.route||[])
  // Match a file row to a customer by account number, sequence number or meter number.
  const byKey=new Map()
  mine.forEach(c=>{[c.account,c.seq,c.meter].filter(Boolean).forEach(k=>byKey.set(String(k).trim().toLowerCase(),c))})
  const myReadings=data.readings.filter(r=>r.reader===session?.name)
  const pending=data.readings.filter(r=>r.sync==='Pending Sync').length
  const dueDays=Number(data.settings.dueDays)||15

  // Download in the billing system's layout (tblmast). Water charge is computed from the customer's active rate.
  const download=()=>{
    if(myReadings.length===0){setToast('Take at least one reading before transferring.');return}
    const billsFor=id=>data.bills.filter(b=>b.consumerId===id)
    const rows=myReadings.map(r=>{
      const c=data.consumers.find(x=>x.id===r.consumerId)
      const tariff=tariffs.find(t=>t.name===c?.tier)
      const usage=consumptionOf(r.previous,r.current)
      const charge=tariff?calculateBill(r.previous,r.current,tariff):0
      const previousBalance=billsFor(r.consumerId).filter(b=>billStatus(b)!=='Paid').reduce((sum,b)=>sum+b.amount,0)
      const billed=billsFor(r.consumerId).some(b=>b.month===new Date(r.date+'T12:00:00').toLocaleString('en-US',{month:'long',year:'numeric'}))
      const readDate=new Date((r.date||dateISO())+'T12:00:00')
      return {
        AccountID:c?.account||'',
        BillingMonth:(r.date||dateISO()).slice(0,7),
        PreviousReading:r.previous,
        PresentReading:r.current,
        Consumption:usage,
        ReadingDate:r.date||dateISO(),
        RateCode:RATE_CODES[c?.tier]||'',
        WaterCharge:charge.toFixed(2),
        SeniorDiscount:'0.00',
        PreviousBalance:previousBalance.toFixed(2),
        Penalty:'0.00',
        TotalAmount:(charge+previousBalance).toFixed(2),
        DueDate:dateISO(addDays(dueDays,readDate)),
        Reader:String(session?.name||'').toUpperCase(),
        CM:'N',CM_Start:0,CM_End:0,
        Status:billed?'Billed':'Read',
        Printed:'N'
      }
    })
    // Plain CSV, as the billing system expects: no quoting and no byte-order mark.
    const text=[TBLMAST_COLUMNS,...rows.map(r=>TBLMAST_COLUMNS.map(k=>r[k]))].map(line=>line.join(',')).join('\r\n')
    const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}))
    const link=document.createElement('a')
    link.href=url
    link.download=`tblmast-${period}-${String(session?.name||'reader').replace(/\W+/g,'-').toLowerCase()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setToast(`${rows.length} reading${rows.length===1?'':'s'} transferred in the billing layout.`)
  }

  const upload=async event=>{
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file)return
    setImportError('');setResult(null)
    if(file.size>5*1024*1024){setImportError('That file is larger than 5 MB. Export only this route from the billing system.');return}
    try{
      const rows=parseReadingFile(await file.text(),file.name)
      if(rows.length===0){setImportError('The file has no readings in it.');return}
      const seen=new Set();let saved=0;const skipped=[]
      for(const row of rows){
        const consumer=byKey.get(String(row.account).trim().toLowerCase())
        if(!consumer){skipped.push(`${row.account}: not on your route`);continue}
        if(seen.has(consumer.id)){skipped.push(`${row.account}: listed twice in the file`);continue}
        seen.add(consumer.id)
        const value=Number(row.current)
        if(row.current===undefined||row.current===''||!Number.isInteger(value)){skipped.push(`${row.account}: PresentReading is not a whole number`);continue}
        if(value<consumer.current){skipped.push(`${row.account}: reading is below ${consumer.current} m³`);continue}
        const problem=addReading({consumerId:consumer.id,previous:consumer.current,current:value,date:row.date||dateISO(),reader:session?.name||'Meter reader',remarks:'Imported from billing file',photo:'',gps:null})
        if(problem)skipped.push(`${row.account}: ${problem}`);else saved++
      }
      setResult({saved,skipped})
      setToast(saved?`${saved} reading${saved===1?'':'s'} imported from the LGU file.`:'No readings were imported. See the list below.')
    }catch(error){setImportError(error.message==='No PresentReading column'?'The file needs a PresentReading column (the billing system layout).':'That file could not be read. Use the billing system CSV, TXT or JSON.')}
  }

  return <div className="reader-page">
    <header className="reader-hero compact"><div className="reader-hero-top"><h1>Data Sync</h1><span className={`reader-net ${online?'on':'off'}`}>{online?'Online':'Offline'}</span></div><p className="reader-hero-sub">Import or export your local readings</p></header>
    <section className="reader-section">
      <div className="sync-row"><span className="r-icon g-blue"><Database size={20}/></span><span><strong>Current Data</strong><small>{mine.length} customers · {data.readings.length} readings on this device</small></span></div>
      <button className="sync-row" onClick={download} aria-disabled={myReadings.length===0}><span className="r-icon g-violet"><Download size={20}/></span><span><strong>Transfer data to LGU Catbalogan</strong><small>{myReadings.length} reading{myReadings.length===1?'':'s'} you took · CSV in the billing layout ({TBLMAST_COLUMNS.slice(0,4).join(', ')}…)</small></span></button>
      <button className="sync-row" onClick={()=>fileRef.current?.click()}><span className="r-icon g-green"><Upload size={20}/></span><span><strong>Request data from LGU Catbalogan</strong><small>Import the LGU billing file (CSV). Customers are matched by AccountID and their readings are recorded.</small></span></button>
      <input ref={fileRef} type="file" accept=".txt,.csv,.json,text/plain,text/csv,application/json" hidden onChange={upload}/>
      {importError&&<p className="reader-error">{importError}</p>}
      {result&&<div className="reader-card import-result"><strong>{result.saved} reading{result.saved===1?'':'s'} imported</strong>{result.skipped.length>0&&<><small>{result.skipped.length} skipped</small><ul>{result.skipped.slice(0,8).map(s=><li key={s}>{s}</li>)}</ul></>}</div>}
    </section>
    <section className="reader-section">
      <h3 className="reader-label">Printer connection</h3>
      <PrinterCard/>
    </section>
    <p className="reader-muted reader-foot-line">Period {period}</p>
  </div>
}
