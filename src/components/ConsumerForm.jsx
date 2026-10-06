import React,{useEffect,useState} from 'react'
import {Save} from 'lucide-react'
import {useSamarAreas} from '../hooks/useSamarAreas.js'
import {useData} from '../context/DataContext.jsx'
import {Button} from './UI.jsx'

export default function ConsumerForm({initial,onSave,onClose}){
  const [form,setForm]=useState(initial)
  const [error,setError]=useState('')
  const {areas,loading,error:areasError}=useSamarAreas()
  const {data,scope}=useData()
  const tiers=[...new Set([...data.tariffs.filter(tariff=>tariff.status==='Active').map(tariff=>tariff.name),...(form.tier?[form.tier]:[])])]
  const set=(key,value)=>setForm(current=>({...current,[key]:value}))
  // An LGU account works only in its own municipality, so its province and city are fixed to that place.
  const home=scope&&areas?areas.localities.features.find(feature=>feature.properties.name===scope):null
  const provinces=(areas?.provinces.features||[]).filter(feature=>!home||feature.properties.name===home.properties.province)
  const localities=(areas?.localities.features||[]).filter(feature=>(!form.province||feature.properties.province===form.province)&&(!scope||feature.properties.name===scope))
  useEffect(()=>{
    if(home&&!form.locality)setForm(current=>({...current,province:home.properties.province,locality:home.properties.name,barangay:''}))
  },[home,form.locality])
  const barangays=areas?.barangays.features.filter(feature=>feature.properties.province===form.province&&feature.properties.locality===form.locality)||[]
  const currentBarangayAvailable=barangays.some(feature=>feature.properties.name===form.barangay)
  const submit=event=>{
    event.preventDefault()
    if(!form.account?.trim()||!form.name?.trim()||!form.province||!form.locality||!form.barangay||!form.meter?.trim()){
      setError('Account number, name, province, city or municipality, barangay, and meter number are required.')
      return
    }
    if(form.phone?.trim()&&!/^09\d{9}$/.test(form.phone.trim())){setError('Phone number must be 11 digits and start with 09.');return}
    const others=data.consumers.filter(consumer=>consumer.id!==form.id)
    const same=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase()
    if(others.some(consumer=>same(consumer.account,form.account))){setError(`Account number ${form.account.trim()} is already registered.`);return}
    if(others.some(consumer=>same(consumer.meter,form.meter))){setError(`Meter ${form.meter.trim()} is already assigned to another consumer.`);return}
    if(!data.tariffs.some(tariff=>tariff.name===(form.tier||'Standard'))){setError('Choose a rate tier that exists in Tariff Tiers.');return}
    const problem=onSave({...form,account:form.account.trim(),name:form.name.trim(),meter:form.meter.trim(),type:form.type||'Residential',tier:form.tier||tiers[0]||'Standard'})
    if(problem){setError(problem);return}
    onClose()
  }
  return <form onSubmit={submit}>
    {areasError&&<p className="form-error">Samar areas could not be loaded. Reload the page and try again.</p>}
    <div className="form-grid">
      <label>Account number<input value={form.account||''} onChange={event=>set('account',event.target.value)} placeholder="A-2026-00001" required/></label>
      <label>Consumer name<input value={form.name||''} onChange={event=>set('name',event.target.value)} placeholder="Full name" required/></label>
      <label>Province<select value={form.province||''} onChange={event=>setForm(current=>({...current,province:event.target.value,locality:'',barangay:''}))} required disabled={loading}><option value="">{loading?'Loading Samar areas...':'Select province'}</option>{provinces.map(feature=><option key={feature.properties.code} value={feature.properties.name}>{feature.properties.name}</option>)}</select></label>
      <label>City or municipality<select value={form.locality||''} onChange={event=>setForm(current=>({...current,locality:event.target.value,barangay:''}))} required disabled={!form.province||loading}><option value="">Select city or municipality</option>{localities.map(feature=><option key={feature.properties.code} value={feature.properties.name}>{feature.properties.name}</option>)}</select></label>
      <label>Barangay<select value={form.barangay||''} onChange={event=>set('barangay',event.target.value)} required disabled={!form.locality||loading}><option value="">Select barangay</option>{form.barangay&&!currentBarangayAvailable&&<option value={form.barangay}>{form.barangay} (legacy)</option>}{barangays.map(feature=><option key={feature.properties.code} value={feature.properties.name}>{feature.properties.name}</option>)}</select></label>
      <label className="full">Address<input value={form.address||''} onChange={event=>set('address',event.target.value)} placeholder="Street and house number"/></label>
      <label>Meter number<input value={form.meter||''} onChange={event=>set('meter',event.target.value)} placeholder="MT-000000" required/></label>
      <label>Phone number<input value={form.phone||''} onChange={event=>set('phone',event.target.value)} placeholder="09XXXXXXXXX"/></label>
      <label>Email<input type="email" value={form.email||''} onChange={event=>set('email',event.target.value)} placeholder="name@example.com"/></label>
      <label>Consumer type<select value={form.type||'Residential'} onChange={event=>set('type',event.target.value)}>{['Residential','Commercial','Government','Institutional'].map(value=><option key={value}>{value}</option>)}</select></label>
      <label>Rate tier<select value={form.tier||tiers[0]||''} onChange={event=>set('tier',event.target.value)}>{tiers.map(value=><option key={value} value={value}>{value}{data.tariffs.find(tariff=>tariff.name===value)?.status==='Active'?'':' (inactive)'}</option>)}</select></label>
    </div>
    {error&&<p className="form-error">{error}</p>}
    <div className="modal-actions"><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button type="submit" icon={Save}>Save consumer</Button></div>
  </form>
}
