import React,{useMemo,useState} from 'react'
import {KeyRound,Pencil,Plus,ShieldCheck,UserCheck,UserX} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {ROLES,ROLE_LABELS} from '../../config/permissions.js'
import {allMunicipalities} from '../../services/provinceService.js'
import {ROLE_OPTIONS,needsMunicipality,accessText,roleLabel} from '../../services/userService.js'
import {PageHeader,Card,CardHead,DataTable,StatusBadge,SearchInput,FilterDropdown,Button,Modal,ConfirmDialog} from '../../components/UI.jsx'

const EMPTY={name:'',email:'',role:ROLES.LGU_ADMIN,municipality:'',consumerId:'',route:[],password:'',confirm:''}

// Add or edit one account. Fields that do not apply to the chosen role are hidden.
function UserForm({initial,editing,onSave,onClose,data,municipalities}){
  const [form,setForm]=useState(initial?{...EMPTY,...initial,password:'',confirm:''}:EMPTY)
  const [error,setError]=useState('')
  const set=(key,value)=>{setError('');setForm(f=>({...f,[key]:value}))}
  const barangays=useMemo(()=>[...new Set(data.consumers.filter(c=>c.locality===form.municipality).map(c=>c.barangay))].sort(),[data.consumers,form.municipality])
  const consumers=useMemo(()=>data.consumers.filter(c=>c.locality===form.municipality),[data.consumers,form.municipality])
  const submit=event=>{
    event.preventDefault()
    if(form.password&&form.password!==form.confirm){setError('The two passwords do not match.');return}
    if(!editing&&!form.password){setError('Set a starting password of at least 8 characters.');return}
    const problem=onSave({...form,password:form.password})
    if(problem)setError(problem)
  }
  return <form onSubmit={submit} noValidate className="user-form">
    <div className="form-grid">
      <label className="form-field"><span>Full name</span><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Rosa Mendoza"/></label>
      <label className="form-field"><span>Email</span><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="name@drops.ph"/></label>
      <label className="form-field"><span>Role</span><select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value,consumerId:'',route:[]}))}>{ROLE_OPTIONS.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></label>
      {needsMunicipality(form.role)&&<label className="form-field"><span>Municipality</span><select value={form.municipality} onChange={e=>setForm(f=>({...f,municipality:e.target.value,consumerId:'',route:[]}))}><option value="">Choose a municipality</option>{municipalities.map(m=><option key={m} value={m}>{m}</option>)}</select></label>}
      {form.role===ROLES.CITIZEN&&form.municipality&&<label className="form-field"><span>Consumer account</span><select value={form.consumerId} onChange={e=>set('consumerId',e.target.value)}><option value="">Choose the account</option>{consumers.map(c=><option key={c.id} value={c.id}>{c.name} · {c.account}</option>)}</select></label>}
      {form.role===ROLES.METER_READER&&form.municipality&&<fieldset className="form-field route-field"><legend>Route barangays</legend>{barangays.map(b=><label key={b} className="route-check"><input type="checkbox" checked={form.route.includes(b)} onChange={e=>set('route',e.target.checked?[...form.route,b]:form.route.filter(x=>x!==b))}/>{b}</label>)}</fieldset>}
      <label className="form-field"><span>{editing?'New password (optional)':'Starting password'}</span><input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="At least 8 characters"/></label>
      <label className="form-field"><span>Confirm password</span><input type="password" value={form.confirm} onChange={e=>set('confirm',e.target.value)}/></label>
    </div>
    {error&&<p className="form-error">{error}</p>}
    <div className="modal-actions"><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button type="submit" icon={ShieldCheck}>{editing?'Save changes':'Create account'}</Button></div>
  </form>
}

export default function Users(){
  const {data,session,upsertUser,setUserStatus,resetPassword}=useData()
  const [query,setQuery]=useState(''),[roleFilter,setRoleFilter]=useState(''),[statusFilter,setStatusFilter]=useState('')
  const [modal,setModal]=useState(null),[resetFor,setResetFor]=useState(null),[newPassword,setNewPassword]=useState(''),[resetError,setResetError]=useState(''),[toggle,setToggle]=useState(null)
  const users=data.users||[]
  const municipalities=useMemo(()=>allMunicipalities(data),[data])
  const rows=useMemo(()=>users.map(u=>({...u,roleName:roleLabel(u.role),status:u.active===false?'Inactive':'Active',scope:u.municipality||'All municipalities',access:accessText(u)})),[users])
  const counts=useMemo(()=>({active:rows.filter(r=>r.status==='Active').length,inactive:rows.filter(r=>r.status==='Inactive').length}),[rows])
  const filtered=rows.filter(r=>(!roleFilter||r.roleName===roleFilter)&&(!statusFilter||r.status===statusFilter)&&[r.name,r.email,r.scope,r.access].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  const save=form=>{
    const result=upsertUser(form,modal?.email||null)
    if(!result)setModal(null)
    return result
  }
  const doReset=()=>{
    const result=resetPassword(resetFor.email,newPassword)
    if(result){setResetError(result);return}
    setResetFor(null);setNewPassword('')
  }
  const columns=[
    {key:'name',label:'NAME',sortable:true,render:r=><div className="user-name"><span className="user-avatar">{r.name.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()}</span><span><strong>{r.name}</strong><small>{r.access}</small></span></div>},
    {key:'email',label:'EMAIL',render:r=><span className="mono-cell">{r.email}</span>},
    {key:'roleName',label:'ROLE',sortable:true,render:r=><StatusBadge status={r.roleName}/>},
    {key:'scope',label:'SCOPE',sortable:true},
    {key:'status',label:'STATUS',sortable:true,render:r=><StatusBadge status={r.status}/>},
    {key:'actions',label:'',render:r=><div className="report-actions">
      <button className="table-icon-button" title="Edit account" aria-label={`Edit ${r.name}`} onClick={()=>setModal(r)}><Pencil size={16}/></button>
      <button className="table-icon-button" title="Reset password" aria-label={`Reset password for ${r.name}`} onClick={()=>{setResetFor(r);setNewPassword('');setResetError('')}}><KeyRound size={16}/></button>
      {r.status==='Active'
        ?<button className="table-icon-button danger" title={r.email===session?.email?'Your own account':'Deactivate'} aria-label={`Deactivate ${r.name}`} disabled={r.email===session?.email} onClick={()=>setToggle(r)}><UserX size={16}/></button>
        :<button className="table-icon-button" title="Reactivate" aria-label={`Reactivate ${r.name}`} onClick={()=>setToggle(r)}><UserCheck size={16}/></button>}
    </div>}
  ]
  return <>
    <PageHeader eyebrow="ADMINISTRATION" title="Users and roles" description="Create accounts, change roles and routes, reset passwords, and deactivate access. Every change is recorded in the audit log." actions={<Button icon={Plus} onClick={()=>setModal({})}>Add user</Button>}/>
    <div className="page-kpis four">
      <div><span>Accounts</span><strong>{rows.length}</strong></div>
      <div><span>Active</span><strong>{counts.active}</strong></div>
      <div><span>Inactive</span><strong>{counts.inactive}</strong></div>
      <div><span>Municipalities</span><strong>{new Set(rows.map(r=>r.municipality).filter(Boolean)).size}</strong></div>
    </div>
    <Card>
      <CardHead title="Accounts" subtitle={`${filtered.length} of ${rows.length} shown`} action={<ShieldCheck size={18} color="#92a4b8"/>}/>
      <div className="list-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, municipality or access..."/>
        <FilterDropdown value={roleFilter} onChange={setRoleFilter} options={ROLE_OPTIONS.map(r=>ROLE_LABELS[r])} all="All roles"/>
        <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={['Active','Inactive']} all="All statuses"/>
      </div>
      <DataTable columns={columns} rows={filtered} pageSize={10} empty={<p className="muted">No accounts match these filters.</p>}/>
    </Card>
    {modal&&<Modal title={modal.email?'Edit account':'Add user'} onClose={()=>setModal(null)} width="640px">
      <UserForm initial={modal.email?modal:null} editing={!!modal.email} onSave={save} onClose={()=>setModal(null)} data={data} municipalities={municipalities}/>
    </Modal>}
    {resetFor&&<Modal title={`Reset password · ${resetFor.name}`} onClose={()=>setResetFor(null)} width="460px">
      <form onSubmit={e=>{e.preventDefault();doReset()}} noValidate>
        <label className="form-field"><span>New password</span><input type="password" value={newPassword} onChange={e=>{setNewPassword(e.target.value);setResetError('')}} placeholder="At least 8 characters"/></label>
        {resetError&&<p className="form-error">{resetError}</p>}
        <div className="modal-actions"><Button variant="secondary" type="button" onClick={()=>setResetFor(null)}>Cancel</Button><Button type="submit" icon={KeyRound}>Set password</Button></div>
      </form>
    </Modal>}
    {toggle&&<ConfirmDialog title={toggle.status==='Active'?`Deactivate ${toggle.name}?`:`Reactivate ${toggle.name}?`} description={toggle.status==='Active'?'They will not be able to sign in until the account is reactivated. Their past records stay in the system.':'They will be able to sign in again with their current password.'} confirm={toggle.status==='Active'?'Deactivate':'Reactivate'} onConfirm={()=>setUserStatus(toggle.email,toggle.status!=='Active')} onClose={()=>setToggle(null)}/>}
  </>
}
