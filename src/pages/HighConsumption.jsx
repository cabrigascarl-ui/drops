import React,{useMemo,useState} from 'react'
import {Gauge,Save,RotateCcw} from 'lucide-react'
import {useData} from '../context/DataContext.jsx'
import {consumptionOf} from '../services/billingService.js'
import {DEFAULT_THRESHOLDS,LEVELS} from '../services/consumptionService.js'
import {Button,Card,CardHead,SearchInput,FilterDropdown,DataTable,StatusBadge} from '../components/UI.jsx'
import PortalBanner from '../components/PortalBanner.jsx'
import {downloadCsv} from '../utils/export.js'

const rangeText=({normalMax,highMax})=>`Normal 0–${normalMax} · High ${normalMax+1}–${highMax} · Critical ${highMax+1}+ m³`

export default function HighConsumption(){
  const {data,thresholds,levelOf,markReviewed,saveThresholds,role,period}=useData()
  const canEdit=role==='LGU_ADMIN'
  const [search,setSearch]=useState(''),[level,setLevel]=useState(''),[draft,setDraft]=useState(thresholds),[error,setError]=useState(''),[municipality,setMunicipality]=useState('')
  const rows=useMemo(()=>data.consumers.map(c=>({...c,usage:consumptionOf(c.previous,c.current),level:levelOf(c)})),[data.consumers,levelOf])
  const counts=Object.fromEntries(Object.keys(LEVELS).map(key=>[key,rows.filter(r=>r.level===key).length]))
  const flagged=rows.filter(r=>r.level==='HIGH'||r.level==='CRITICAL')
  const reviewed=flagged.filter(r=>r.reviewedPeriod===period).length
  const filtered=rows
    .filter(r=>(!level||r.level===level)&&(!municipality||r.locality===municipality)&&(r.name+' '+r.account+' '+r.barangay).toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a,b)=>(['CRITICAL','HIGH','NEAR','NORMAL'].indexOf(a.level)-['CRITICAL','HIGH','NEAR','NORMAL'].indexOf(b.level))||b.usage-a.usage)
  const exportCsv=()=>downloadCsv(`drops-high-consumption-${period}.csv`,[['Account','Consumer','Municipality','Classification','Barangay','Usage (m3)','Status','Review'],...filtered.map(r=>[r.account,r.name,r.locality,r.type,r.barangay,r.usage,LEVELS[r.level].label,r.reviewedPeriod===period?'Reviewed':(r.level==='HIGH'||r.level==='CRITICAL'?'Pending review':'')])])
  const setLimit=(type,field,value)=>setDraft(current=>({...current,[type]:{...current[type],[field]:value}}))
  const save=()=>{
    const next=Object.fromEntries(Object.entries(draft).map(([type,{normalMax,highMax}])=>[type,{normalMax:Number(normalMax),highMax:Number(highMax)}]))
    setError(saveThresholds(next)||'')
  }

  const columns=[
    {key:'account',label:'ACCOUNT NO.',render:r=><span className="mono-cell">{r.account}</span>},
    {key:'name',label:'CONSUMER',sortable:true,render:r=><strong>{r.name}</strong>},
    {key:'locality',label:'MUNICIPALITY',sortable:true},
    {key:'type',label:'CLASSIFICATION',sortable:true},
    {key:'barangay',label:'BARANGAY',sortable:true},
    {key:'usage',label:'USAGE',sortable:true,render:r=>`${r.usage} m³`},
    {key:'level',label:'STATUS',render:r=><StatusBadge status={LEVELS[r.level].label}/>},
    {key:'review',label:'REVIEW',render:r=>{
      if(r.level!=='HIGH'&&r.level!=='CRITICAL')return <span className="muted">—</span>
      return r.reviewedPeriod===period?<StatusBadge status="Reviewed"/>:<StatusBadge status="Pending review"/>
    }},
    {key:'actions',label:'ACTION',render:r=>{
      if(r.level!=='HIGH'&&r.level!=='CRITICAL')return null
      if(!canEdit)return <span className="muted">Read only</span>
      return <Button variant="secondary" onClick={()=>markReviewed(r.id)}>{r.reviewedPeriod===period?'Clear review':'Mark reviewed'}</Button>
    }}
  ]

  return <>
    <PortalBanner eyebrow="MONITORING" title="High consumption" subtitle="Accounts are judged against their own classification threshold, so a commercial account is not compared with a household."
      stats={[{label:'Flagged',value:flagged.length},{label:'Reviewed',value:`${reviewed} / ${flagged.length}`}]}
      action={<Button variant="light" onClick={exportCsv}>Export CSV</Button>}/>
    <div className="page-kpis four">
      {Object.entries(LEVELS).map(([key,{label}])=><div key={key}><span>{label}</span><strong>{counts[key]}</strong></div>)}
    </div>
    <Card>
      <CardHead title="Flagged for review" subtitle={`${reviewed} of ${flagged.length} flagged accounts reviewed for this period. Validation of the monthly report is blocked until every flagged account is reviewed.`}/>
      <div className="list-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search consumer, account or barangay..."/>
        <FilterDropdown value={municipality} onChange={setMunicipality} options={[...new Set(rows.map(r=>r.locality))].sort()} all="All municipalities"/><FilterDropdown value={level} onChange={setLevel} options={Object.keys(LEVELS)} all="All statuses"/>
      </div>
      <DataTable columns={columns} rows={filtered} search={search} empty={<div className="empty-state"><Gauge size={28}/><h3>No accounts match</h3><p>Try a different status or search term.</p></div>}/>
    </Card>
    <Card className="threshold-card">
      <CardHead title="Consumption thresholds" subtitle={canEdit?'Sample values for the demo. Change them to match your ordinance; every status is recalculated immediately.':'Set by the municipal LGU. Read only for the province.'}/>
      <div className="threshold-grid">
        {Object.keys(DEFAULT_THRESHOLDS).map(type=>{
          const value=draft[type]||DEFAULT_THRESHOLDS[type]
          return <div className="threshold-row" key={type}>
            <div><strong>{type}</strong><small>{rangeText({normalMax:Number(value.normalMax)||0,highMax:Number(value.highMax)||0})}</small></div>
            <label><span>Normal up to (m³)</span><input type="number" min="1" step="1" disabled={!canEdit} value={value.normalMax} onChange={e=>setLimit(type,'normalMax',e.target.value)}/></label>
            <label><span>High up to (m³)</span><input type="number" min="2" step="1" disabled={!canEdit} value={value.highMax} onChange={e=>setLimit(type,'highMax',e.target.value)}/></label>
          </div>
        })}
      </div>
      {error&&<p className="form-error">{error}</p>}
      {canEdit&&<div className="threshold-actions">
        <Button variant="secondary" icon={RotateCcw} onClick={()=>{setDraft(DEFAULT_THRESHOLDS);setError('')}}>Reset to sample values</Button>
        <Button icon={Save} onClick={save}>Save thresholds</Button>
      </div>}
      <p className="muted threshold-note">Near limit starts at 80% of the normal ceiling. Changes apply to every account of that classification.</p>
    </Card>
  </>
}
