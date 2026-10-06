import React,{useMemo,useState} from 'react'
import {Pencil,Plus,Route as RouteIcon,Trash2} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {Button,Card,CardHead,DataTable,Modal,ConfirmDialog,SearchInput,EmptyState,FilterDropdown} from '../../components/UI.jsx'
import PortalBanner from '../../components/PortalBanner.jsx'

// A route is the set of barangays one meter reader walks, optionally inside a zone.
export default function Routes(){
  const {data,scope,session,opsContext,saveRoute,deleteRoute}=useData()
  const municipality=scope||session?.municipality
  const {municipalBarangays,zones,routes,consumers}=opsContext(municipality)
  const [search,setSearch]=useState(''),[zoneFilter,setZoneFilter]=useState(''),[editing,setEditing]=useState(null),[form,setForm]=useState({name:'',zoneId:'',reader:'',barangays:[]}),[error,setError]=useState(''),[removing,setRemoving]=useState(null)
  const zoneName=id=>zones.find(z=>z.id===id)?.name||'Unzoned'
  const rows=useMemo(()=>routes.map(r=>({...r,zoneName:zoneName(r.zoneId),customers:consumers.filter(c=>r.barangays.includes(c.barangay)).length})).filter(r=>(!zoneFilter||r.zoneName===zoneFilter)&&[r.name,r.reader,r.zoneName].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[routes,zones,consumers,search,zoneFilter])
  const open=route=>{setEditing(route||{});setForm({name:route?.name||'',zoneId:route?.zoneId||'',reader:route?.reader||'',barangays:route?.barangays||[]});setError('')}
  const set=(k,v)=>{setError('');setForm(f=>({...f,[k]:v}))}
  const toggle=b=>set('barangays',form.barangays.includes(b)?form.barangays.filter(x=>x!==b):[...form.barangays,b])
  const save=()=>{const result=saveRoute({id:editing.id,...form});if(result)setError(result);else setEditing(null)}
  const columns=[
    {key:'name',label:'ROUTE',sortable:true,render:r=><div className="ops-name"><span className="ops-icon"><RouteIcon size={16}/></span><span><strong>{r.name}</strong><small>{r.zoneName}</small></span></div>},
    {key:'barangays',label:'BARANGAYS',render:r=>r.barangays.join(', ')},
    {key:'customers',label:'CUSTOMERS',sortable:true},
    {key:'reader',label:'READER',sortable:true,render:r=>r.reader||<span className="muted">Unassigned</span>},
    {key:'actions',label:'',render:r=><div className="report-actions">
      <button className="table-icon-button" aria-label={`Edit ${r.name}`} onClick={()=>open(r)}><Pencil size={16}/></button>
      <button className="table-icon-button danger" aria-label={`Delete ${r.name}`} onClick={()=>setRemoving(r)}><Trash2 size={16}/></button>
    </div>}
  ]
  return <>
    <PortalBanner eyebrow="OPERATIONS" title="Route management" subtitle={`${routes.length} route${routes.length===1?'':'s'} in ${municipality}. Each route is walked by one meter reader.`}
      stats={[{label:'Routes',value:routes.length},{label:'Customers on routes',value:rows.reduce((n,r)=>n+r.customers,0)}]}
      action={<Button variant="light" icon={Plus} onClick={()=>open(null)}>New route</Button>}/>
    <Card>
      <CardHead title="Routes" subtitle="Barangays and the reader who walks them"/>
      <div className="list-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search routes, zones or readers..."/>
        <FilterDropdown value={zoneFilter} onChange={setZoneFilter} options={[...new Set(zones.map(z=>z.name)),'Unzoned']} all="All zones"/>
      </div>
      <DataTable columns={columns} rows={rows} pageSize={10} empty={<EmptyState title="No routes yet" description="Create a route from the barangays in a zone."/>}/>
    </Card>
    {editing&&<Modal title={editing.id?'Edit route':'New route'} onClose={()=>setEditing(null)} width="600px">
      <form onSubmit={e=>{e.preventDefault();save()}} noValidate>
        <div className="form-grid">
          <label className="form-field"><span>Route name</span><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Route B · South"/></label>
          <label className="form-field"><span>Zone</span><select value={form.zoneId} onChange={e=>set('zoneId',e.target.value)}><option value="">No zone</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
          <label className="form-field"><span>Reader</span><input value={form.reader} onChange={e=>set('reader',e.target.value)} placeholder="e.g. J. Castro"/></label>
        </div>
        <fieldset className="barangay-picker"><legend>Barangays on this route<b>{form.barangays.length} selected</b></legend>
          <div className="barangay-grid">{municipalBarangays.map(b=><label key={b} className="route-check"><input type="checkbox" checked={form.barangays.includes(b)} onChange={()=>toggle(b)}/><span>{b}</span></label>)}</div>
        </fieldset>
        {error&&<p className="form-error">{error}</p>}
        <div className="modal-actions"><Button variant="secondary" type="button" onClick={()=>setEditing(null)}>Cancel</Button><Button type="submit">Save route</Button></div>
      </form>
    </Modal>}
    {removing&&<ConfirmDialog title={`Delete ${removing.name}?`} description="Its barangays stay in their zone. The reader will lose this route." confirm="Delete" onConfirm={()=>deleteRoute(removing.id)} onClose={()=>setRemoving(null)}/>}
  </>
}
