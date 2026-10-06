import React,{useMemo,useState} from 'react'
import {Layers,Pencil,Plus,Trash2} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {Button,Card,CardHead,DataTable,Modal,ConfirmDialog,SearchInput,EmptyState} from '../../components/UI.jsx'
import PortalBanner from '../../components/PortalBanner.jsx'

// Zones group barangays of the municipality. A barangay can belong to one zone only.
export default function Zones(){
  const {data,scope,session,opsContext,saveZone,deleteZone}=useData()
  const municipality=scope||session?.municipality
  const {municipalBarangays,zones,routes}=opsContext(municipality)
  const [search,setSearch]=useState(''),[editing,setEditing]=useState(null),[name,setName]=useState(''),[picked,setPicked]=useState([]),[error,setError]=useState(''),[removing,setRemoving]=useState(null)
  const rows=useMemo(()=>zones.map(z=>({...z,routeCount:routes.filter(r=>r.zoneId===z.id).length,consumers:data.consumers.filter(c=>z.barangays.includes(c.barangay)).length})).filter(z=>z.name.toLowerCase().includes(search.trim().toLowerCase())),[zones,routes,data.consumers,search])
  const taken=new Set(zones.filter(z=>z.id!==editing?.id).flatMap(z=>z.barangays))
  const open=zone=>{setEditing(zone||{});setName(zone?.name||'');setPicked(zone?.barangays||[]);setError('')}
  const save=()=>{const result=saveZone({id:editing.id,name,barangays:picked});if(result)setError(result);else setEditing(null)}
  const toggle=b=>setPicked(p=>p.includes(b)?p.filter(x=>x!==b):[...p,b])
  const columns=[
    {key:'name',label:'ZONE',sortable:true,render:r=><div className="ops-name"><span className="ops-icon"><Layers size={16}/></span><strong>{r.name}</strong></div>},
    {key:'barangays',label:'BARANGAYS',render:r=>r.barangays.length},
    {key:'consumers',label:'CONSUMERS',sortable:true},
    {key:'routeCount',label:'ROUTES',sortable:true},
    {key:'actions',label:'',render:r=><div className="report-actions">
      <button className="table-icon-button" aria-label={`Edit ${r.name}`} onClick={()=>open(r)}><Pencil size={16}/></button>
      <button className="table-icon-button danger" aria-label={`Delete ${r.name}`} onClick={()=>setRemoving(r)}><Trash2 size={16}/></button>
    </div>}
  ]
  return <>
    <PortalBanner eyebrow="OPERATIONS" title="Zone management" subtitle={`${zones.length} zones across ${municipalBarangays.length} barangays in ${municipality}.`}
      stats={[{label:'Zones',value:zones.length},{label:'Barangays zoned',value:zones.reduce((n,z)=>n+z.barangays.length,0)}]}
      action={<Button variant="light" icon={Plus} onClick={()=>open(null)}>New zone</Button>}/>
    <Card>
      <CardHead title="Zones" subtitle="Each barangay is in one zone"/>
      <div className="list-toolbar"><SearchInput value={search} onChange={setSearch} placeholder="Search zones..."/></div>
      <DataTable columns={columns} rows={rows} pageSize={10} empty={<EmptyState title="No zones yet" description="Create a zone to group barangays for routes and work."/>}/>
    </Card>
    {editing&&<Modal title={editing.id?'Edit zone':'New zone'} onClose={()=>setEditing(null)} width="560px">
      <form onSubmit={e=>{e.preventDefault();save()}} noValidate>
        <label className="form-field"><span>Zone name</span><input value={name} onChange={e=>{setName(e.target.value);setError('')}} placeholder="e.g. Zone 3 · Cinco"/></label>
        <fieldset className="barangay-picker"><legend>Barangays<b>{picked.length} selected</b></legend>
          {municipalBarangays.length===0&&<p className="muted">Barangay boundaries are still loading.</p>}
          <div className="barangay-grid">{municipalBarangays.map(b=><label key={b} className={`route-check ${taken.has(b)?'disabled':''}`}><input type="checkbox" disabled={taken.has(b)} checked={picked.includes(b)} onChange={()=>toggle(b)}/><span>{b}{taken.has(b)&&<small>In another zone</small>}</span></label>)}</div>
        </fieldset>
        {error&&<p className="form-error">{error}</p>}
        <div className="modal-actions"><Button variant="secondary" type="button" onClick={()=>setEditing(null)}>Cancel</Button><Button type="submit">Save zone</Button></div>
      </form>
    </Modal>}
    {removing&&<ConfirmDialog title={`Delete ${removing.name}?`} description={removing.routeCount?`This zone still has ${removing.routeCount} route${removing.routeCount===1?'':'s'}. Move or delete them first.`:'The barangays will no longer belong to a zone.'} confirm="Delete" onConfirm={()=>deleteZone(removing.id)} onClose={()=>setRemoving(null)}/>}
  </>
}
