import React,{useMemo} from 'react'
import {Bar,BarChart,CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts'
import {useData} from '../../context/DataContext.jsx'
import {provinceTotals,consumptionTrend,STATUS_LABELS} from '../../services/provinceService.js'
import {periodLabel} from '../../services/reportService.js'
import {Button,Card,CardHead,DataTable,StatusBadge,EmptyState} from '../../components/UI.jsx'
import PortalBanner from '../../components/PortalBanner.jsx'
import {downloadCsv,printPage} from '../../utils/export.js'

const top=(rows,key,count=8)=>[...rows].sort((a,b)=>(b[key]||0)-(a[key]||0)).slice(0,count).map(r=>({name:r.municipality,value:r[key]||0}))
// Lowest users, leaving out municipalities with no consumers on record.
const lowest=(rows,key,count=8)=>[...rows].filter(r=>r.consumers>0).sort((a,b)=>(a[key]||0)-(b[key]||0)).slice(0,count).map(r=>({name:r.municipality,value:r[key]||0}))

// Consumer growth from the two most recent submitted snapshots of a municipality.
function growthOf(store,municipality){
  const snaps=store.reports.filter(r=>r.municipality===municipality&&r.snapshot).sort((a,b)=>a.period.localeCompare(b.period))
  if(snaps.length<2)return null
  const last=snaps[snaps.length-1].snapshot.consumers,prev=snaps[snaps.length-2].snapshot.consumers
  return prev?Math.round((last-prev)/prev*100):null
}

export default function Comparison(){
  const {data,period}=useData()
  const totals=useMemo(()=>provinceTotals(data,period),[data,period])
  const trend=useMemo(()=>consumptionTrend(data),[data])
  const rows=totals.stats.map(s=>({...s,growth:growthOf(data,s.municipality)}))
  const columns=[
    {key:'municipality',label:'MUNICIPALITY',sortable:true,render:r=><strong>{r.municipality}</strong>},
    {key:'consumers',label:'CONSUMERS',sortable:true,render:r=>r.consumers.toLocaleString()},
    {key:'consumption',label:'CONSUMPTION',sortable:true,render:r=>`${r.consumption.toLocaleString()} m³`},
    {key:'efficiency',label:'EFFICIENCY',sortable:true,render:r=>r.efficiency===null?'—':`${r.efficiency}%`},
    {key:'high',label:'HIGH USE',sortable:true,render:r=>r.high},
    {key:'growth',label:'CONSUMER GROWTH',sortable:true,render:r=>r.growth===null?'—':`${r.growth>0?'+':''}${r.growth}%`},
    {key:'status',label:'REPORT',render:r=><StatusBadge status={STATUS_LABELS[r.status]}/>}
  ]
  const exportCsv=()=>downloadCsv(`drops-municipality-comparison-${period}.csv`,[['Municipality','Consumers','Consumption (m3)','Efficiency (%)','High usage','Consumer growth (%)','Report status'],...rows.map(r=>[r.municipality,r.consumers,r.consumption,r.efficiency??'',r.high,r.growth??'',STATUS_LABELS[r.status]])])
  const chart=(title,data,format)=><Card>
    <CardHead title={title}/>
    <div className="chart-area compare-chart">{data.length===0?<EmptyState title="No data yet" description="Figures appear once municipalities have records."/>:
      <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{left:8,right:24,top:8,bottom:8}}>
        <CartesianGrid horizontal={false} stroke="#eaf0f7"/><XAxis type="number" tickFormatter={format} tickLine={false} axisLine={false} tick={{fill:'#8da0b8',fontSize:11}}/><YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{fill:'#4d6780',fontSize:11}}/>
        <Tooltip formatter={v=>format(v)} contentStyle={{borderRadius:12,border:'1px solid #e5eef8'}}/><Bar dataKey="value" fill="#0876e6" radius={[0,6,6,0]} barSize={14}/>
      </BarChart></ResponsiveContainer>}</div>
  </Card>
  return <>
    <PortalBanner eyebrow="ANALYTICS" title="Municipality comparison" subtitle="Compare municipalities on the same measures. Figures reflect each municipality's records for the current period."
      stats={[{label:'Municipalities',value:totals.connected},{label:'Submitted',value:totals.submitted}]}
      action={<><Button variant="light" onClick={printPage}>Print</Button> <Button variant="light" onClick={exportCsv}>Export CSV</Button></>}/>
    <div className="page-kpis four">
      <div><span>Province consumption</span><strong>{totals.consumption.toLocaleString()} m³</strong></div>
      <div><span>Average efficiency</span><strong>{totals.averageEfficiency===null?'—':`${totals.averageEfficiency}%`}</strong></div>
    </div>
    <div className="compare-grid">
      {chart('Top consumption (m³)',top(totals.stats,'consumption'),v=>`${Number(v).toLocaleString()} m³`)}
      {chart('Lowest consumption (m³)',lowest(totals.stats,'consumption'),v=>`${Number(v).toLocaleString()} m³`)}
    </div>
    <Card>
      <CardHead title="Consumption trend" subtitle="Province-wide consumption from each submitted report"/>
      <div className="chart-area">{trend.length<1?<EmptyState title="No submitted periods yet" description="The trend fills in as municipalities submit their monthly reports."/>:
        <ResponsiveContainer width="100%" height="100%"><LineChart data={trend.map(t=>({...t,label:periodLabel(t.period)}))} margin={{left:0,right:16,top:16,bottom:8}}>
          <CartesianGrid vertical={false} stroke="#eaf0f7"/><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{fill:'#8da0b8',fontSize:11}}/><YAxis tickLine={false} axisLine={false} tick={{fill:'#8da0b8',fontSize:11}} tickFormatter={v=>`${Number(v).toLocaleString()}`}/>
          <Tooltip formatter={v=>`${Number(v).toLocaleString()} m³`} contentStyle={{borderRadius:12,border:'1px solid #e5eef8'}}/><Line type="monotone" dataKey="consumption" stroke="#7c5cfc" strokeWidth={3} dot={{r:4,fill:'#fff',stroke:'#7c5cfc',strokeWidth:2}}/>
        </LineChart></ResponsiveContainer>}</div>
    </Card>
    <Card>
      <CardHead title="Full comparison" subtitle="Click a column header to sort"/>
      <DataTable columns={columns} rows={rows} pageSize={12} empty={<p className="muted">No municipalities yet.</p>}/>
    </Card>
  </>
}
