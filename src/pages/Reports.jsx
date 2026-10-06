import React,{useMemo,useState} from 'react'
import {Download,Printer,ChartNoAxesCombined,ReceiptText,Wallet,Users,Layers3,MapPin,TrendingUp} from 'lucide-react'
import {BarChart,Bar,PieChart,Pie,Cell,LineChart,Line,CartesianGrid,XAxis,YAxis,Tooltip,ResponsiveContainer} from 'recharts'
import {useData} from '../context/DataContext.jsx'
import {peso,consumptionOf,formatDate,billStatus} from '../services/billingService.js'
import {periodLabel} from '../services/reportService.js'
import {downloadCsv,printPage} from '../utils/export.js'
import {Button,Card,CardHead,DataTable,EmptyState} from '../components/UI.jsx'
import PortalBanner from '../components/PortalBanner.jsx'

const REPORTS=[
  {key:'Monthly Consumption',icon:ChartNoAxesCombined,hint:'Water used each month, from meter readings'},
  {key:'Billing Summary',icon:ReceiptText,hint:'Amount billed each month'},
  {key:'Collection Summary',icon:Wallet,hint:'Payments received each month'},
  {key:'Outstanding Accounts',icon:Users,hint:'Bills still unpaid'},
  {key:'Rate Tier Distribution',icon:Layers3,hint:'Consumers on each rate tier'},
  {key:'Barangay Consumption',icon:MapPin,hint:'Water used in each barangay'},
  {key:'Consumer Growth',icon:TrendingUp,hint:'Consumers by municipality and period'}
]
const COLORS=['#0876e6','#00b9cb','#43cba7','#7c5cfc','#f7b351','#ef4444']
const monthKey=iso=>iso?.slice(0,7)
const monthName=key=>key?periodLabel(key):'—'
const sum=(list,pick)=>list.reduce((total,item)=>total+pick(item),0)

// Every report is computed from the records the signed-in user can see.
export default function Reports(){
  const {data}=useData()
  const [active,setActive]=useState(REPORTS[0].key)
  const reports=useMemo(()=>{
    const byId=Object.fromEntries(data.consumers.map(c=>[c.id,c]))
    const consumption=Object.values(data.readings.reduce((groups,r)=>{
      const key=monthKey(r.date)||'unknown'
      groups[key]=groups[key]||{period:key,consumption:0,readings:0}
      groups[key].consumption+=consumptionOf(r.previous,r.current)
      groups[key].readings++
      return groups
    },{})).sort((a,b)=>a.period.localeCompare(b.period)).map(r=>({...r,label:monthName(r.period)}))
    const billed=Object.values(data.bills.reduce((groups,b)=>{
      const key=b.month||'—'
      groups[key]=groups[key]||{period:key,billed:0,bills:0}
      groups[key].billed+=b.amount
      groups[key].bills++
      return groups
    },{})).map(r=>({...r,label:r.period}))
    const collected=Object.values(data.payments.reduce((groups,p)=>{
      const key=monthKey(p.date)||'unknown'
      groups[key]=groups[key]||{period:key,collected:0,payments:0}
      groups[key].collected+=p.amount
      groups[key].payments++
      return groups
    },{})).sort((a,b)=>a.period.localeCompare(b.period)).map(r=>({...r,label:monthName(r.period)}))
    const outstanding=data.bills.filter(b=>billStatus(b)!=='Paid').map(b=>({id:b.id,account:byId[b.consumerId]?.account||'—',name:byId[b.consumerId]?.name||'—',municipality:byId[b.consumerId]?.locality||'—',amount:b.amount,due:b.dueDate,status:billStatus(b)}))
    const tiers=data.tariffs.map(t=>({name:t.name,value:data.consumers.filter(c=>c.tier===t.name).length})).filter(t=>t.value>0)
    const barangays=Object.values(data.consumers.reduce((groups,c)=>{
      const key=`${c.locality}|${c.barangay}`
      groups[key]=groups[key]||{id:key,name:c.barangay,locality:c.locality,consumers:0,consumption:0}
      groups[key].consumers++
      groups[key].consumption+=consumptionOf(c.previous,c.current)
      return groups
    },{})).sort((a,b)=>b.consumption-a.consumption)
    const municipalities=Object.values(data.consumers.reduce((groups,c)=>{
      groups[c.locality]=groups[c.locality]||{name:c.locality,consumers:0}
      groups[c.locality].consumers++
      return groups
    },{})).sort((a,b)=>b.consumers-a.consumers)
    const snapshots=data.reports.filter(r=>r.snapshot).sort((a,b)=>a.period.localeCompare(b.period)).map(r=>({period:r.period,label:periodLabel(r.period),municipality:r.municipality,consumers:r.snapshot.consumers}))
    return {consumption,billed,collected,outstanding,tiers,barangays,municipalities,snapshots,byId}
  },[data])

  const totals={
    consumption:sum(reports.consumption,r=>r.consumption),
    billed:sum(reports.billed,r=>r.billed),
    collected:sum(reports.collected,r=>r.collected),
    outstanding:sum(reports.outstanding,r=>r.amount)
  }

  // The table and CSV for the selected report.
  const table=(()=>{
    switch(active){
      case 'Monthly Consumption':return {rows:reports.consumption,headers:['Period','Consumption (m³)','Readings'],cells:r=>[r.label,r.consumption,r.readings],chart:'line',key:'consumption',name:'m³'}
      case 'Billing Summary':return {rows:reports.billed,headers:['Period','Billed (PHP)','Bills'],cells:r=>[r.label,r.billed,r.bills],chart:'bar',key:'billed',name:'₱'}
      case 'Collection Summary':return {rows:reports.collected,headers:['Period','Collected (PHP)','Payments'],cells:r=>[r.label,r.collected,r.payments],chart:'bar',key:'collected',name:'₱'}
      case 'Outstanding Accounts':return {rows:reports.outstanding,headers:['Account','Consumer','Municipality','Amount (PHP)','Due date','Status'],cells:r=>[r.account,r.name,r.municipality,r.amount,r.due,r.status],chart:null}
      case 'Rate Tier Distribution':return {rows:reports.tiers,headers:['Tier','Consumers'],cells:r=>[r.name,r.value],chart:'pie'}
      case 'Barangay Consumption':return {rows:reports.barangays,headers:['Barangay','Municipality','Consumers','Consumption (m³)'],cells:r=>[r.name,r.locality,r.consumers,r.consumption],chart:'barangay'}
      case 'Consumer Growth':return reports.snapshots.length
        ?{rows:reports.snapshots,headers:['Period','Municipality','Consumers'],cells:r=>[r.label,r.municipality,r.consumers],chart:'line',key:'consumers',name:'consumers'}
        :{rows:reports.municipalities,headers:['Municipality','Consumers'],cells:r=>[r.name,r.consumers],chart:'municipal'}
      default:return {rows:[],headers:[],cells:()=>[],chart:null}
    }
  })()

  const columns=table.headers.map((header,index)=>({key:String(index),label:header.toUpperCase(),render:r=>{
    const value=table.cells(r)[index]
    if(typeof value!=='number')return value
    if(header.includes('(PHP)'))return peso(value)
    if(header.includes('(m³)'))return `${value.toLocaleString()} m³`
    return value.toLocaleString()
  }}))

  const exportCsv=()=>{
    const rows=[table.headers,...table.rows.map(r=>table.cells(r))]
    downloadCsv(`drops-${active.toLowerCase().replace(/\s+/g,'-')}-${new Date().toISOString().slice(0,10)}.csv`,rows)
  }

  const chartBody=()=>{
    if(!table.chart)return null
    if(table.rows.length===0)return <EmptyState title="Nothing to chart yet" description="This report fills in as readings, bills and payments are recorded."/>
    if(table.chart==='pie')return <PieChart><Pie data={table.rows.map(r=>({name:r.name,value:r.value}))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={120} paddingAngle={3} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>{table.rows.map((r,i)=><Cell key={r.name} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/></PieChart>
    if(table.chart==='barangay'||table.chart==='municipal'){
      const data=table.chart==='barangay'?table.rows.slice(0,12).map(r=>({name:r.name,value:r.consumption})):table.rows.slice(0,12).map(r=>({name:r.name,value:r.consumers}))
      return <BarChart data={data} layout="vertical" margin={{left:8,right:24,top:8,bottom:8}}><CartesianGrid horizontal={false} stroke="#eaf0f7"/><XAxis type="number" tickLine={false} axisLine={false} tick={{fill:'#8da0b8',fontSize:11}}/><YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tick={{fill:'#4d6780',fontSize:11}}/><Tooltip/><Bar dataKey="value" fill="#0876e6" radius={[0,6,6,0]} barSize={14}/></BarChart>
    }
    if(table.chart==='bar')return <BarChart data={table.rows.map(table.cells).map(c=>({name:c[0],value:c[1]}))} margin={{left:4,right:12,top:16,bottom:12}}><CartesianGrid vertical={false} stroke="#eaf0f7"/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill:'#8da0b8',fontSize:11}}/><YAxis tickLine={false} axisLine={false} tick={{fill:'#8da0b8',fontSize:11}}/><Tooltip/><Bar dataKey="value" fill="#0876e6" radius={[8,8,0,0]} barSize={28}/></BarChart>
    return <LineChart data={table.rows.map(table.cells).map(c=>({name:c[0],value:c[1]}))} margin={{left:0,right:16,top:16,bottom:12}}><CartesianGrid vertical={false} stroke="#eaf0f7"/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill:'#8da0b8',fontSize:11}}/><YAxis tickLine={false} axisLine={false} tick={{fill:'#8da0b8',fontSize:11}}/><Tooltip/><Line type="monotone" dataKey="value" stroke="#0876e6" strokeWidth={3} dot={{fill:'#fff',stroke:'#0876e6',strokeWidth:2,r:4}}/></LineChart>
  }

  return <>
    <PortalBanner eyebrow="INSIGHTS & ACCOUNTABILITY" title="Reports" subtitle="Every figure is computed from the records you can see. Export any report as CSV or print it."
      action={<><Button variant="light" icon={Printer} onClick={printPage}>Print</Button> <Button variant="light" icon={Download} onClick={exportCsv}>Export CSV</Button></>}/>
    <div className="report-cards">{REPORTS.map(r=>{const Icon=r.icon;return <button key={r.key} className={`report-selector ${active===r.key?'active':''}`} onClick={()=>setActive(r.key)}><span><Icon size={20}/></span><strong>{r.key}</strong><small>{r.hint}</small></button>})}</div>
    <Card className="report-panel">
      <CardHead title={active} subtitle={`${table.rows.length} row${table.rows.length===1?'':'s'}`}/>
      {table.chart&&<div className="report-chart"><ResponsiveContainer width="100%" height="100%">{chartBody()||<g/>}</ResponsiveContainer></div>}
      <DataTable rows={table.rows.map((r,i)=>({...r,__i:i}))} columns={columns} pageSize={10} empty={<EmptyState title="No records yet" description="Nothing has been recorded for this report."/>}/>
    </Card>
  </>
}
