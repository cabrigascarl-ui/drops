import React, {createContext,useContext,useEffect,useMemo,useRef,useState} from 'react'
import {useLocation} from 'react-router-dom'
import {seedConsumers,seedTariffs,seedReadings,seedBills,seedPayments,seedAlerts,seedSettings,seedReports,seedAudit} from '../data/seed.js'
import {calculateBill,consumptionOf,dateISO} from '../services/billingService.js'
import {storageService} from '../services/storageService.js'
import {cloudLoad} from '../services/cloudService.js'
import {getSession,baseUsers} from '../services/sessionService.js'
import {validateUser,needsMunicipality,roleLabel} from '../services/userService.js'
import {seedOperations,validateZone,validateRoute,validateRequest,validateWorkOrder,REQUEST_STATUSES,REQUEST_TYPES,WORK_STATUSES} from '../services/operationsService.js'
import {ROLES,canOperate} from '../config/permissions.js'
import {DEFAULT_THRESHOLDS,classify,levelOf,validateThresholds} from '../services/consumptionService.js'
import {REPORT_STATUS,canTransition,currentPeriod,draftReport,isBillable,isLocked,periodLabel} from '../services/reportService.js'
import {auditEntry} from '../services/auditService.js'
import {useSamarAreas} from '../hooks/useSamarAreas.js'
import {generatedConsumers} from '../data/samar-lgus.js'
import {municipalityStats,snapshotOf} from '../services/provinceService.js'

const DataContext=createContext(null)
// crypto.randomUUID only exists in secure contexts; the dev server is also opened over plain-http LAN addresses.
export const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`
const minutesAgo=minutes=>new Date(Date.now()-minutes*60000).toISOString()
const seedActivities=()=>[{id:'ac1',title:'New meter reading synced',detail:'Brgy. Mercedes',at:minutesAgo(2),kind:'reading'},{id:'ac2',title:'Payment received',detail:'Account A-2025-00124',at:minutesAgo(8),kind:'payment'},{id:'ac3',title:'New consumer registered',detail:'Brgy. Poblacion 1',at:minutesAgo(15),kind:'consumer'},{id:'ac4',title:'Bill generated',detail:'Account B-2025-00498',at:minutesAgo(21),kind:'bill'}]
const fresh=()=>({...seedOperations(),users:baseUsers(),consumers:[...seedConsumers,...generatedConsumers],tariffs:seedTariffs,readings:seedReadings,bills:seedBills,payments:seedPayments,alerts:seedAlerts,settings:{...seedSettings,thresholds:DEFAULT_THRESHOLDS},mapStatuses:{},activities:seedActivities(),reports:seedReports,audit:seedAudit,lastSync:null})
const load=(stored=storageService.load())=>{
  const initial=fresh()
  const legacyBarangays=['San Isidro','Poblacion','Mercedes','Rizal','San Isidro','Guindapunan']
  const renamedLocalities={'Catarman (Capital)':'Catarman','Lope De Vega':'Lope de Vega','General Macarthur':'General MacArthur'}
  const consumers=stored.consumers?.map(consumer=>{
    const seed=seedConsumers.find(item=>item.id===consumer.id)
    const index=Number(consumer.id?.slice(1))-1
    return {...consumer,province:consumer.province||seed?.province||'Samar Province',locality:renamedLocalities[consumer.locality]||consumer.locality||seed?.locality||'Catbalogan City',barangay:!consumer.locality&&seed&&consumer.barangay===legacyBarangays[index%6]?seed.barangay:consumer.barangay}
  })||seedConsumers
  const loaded={...initial,...stored,settings:{...initial.settings,...stored.settings,thresholds:{...DEFAULT_THRESHOLDS,...stored.settings?.thresholds}},reports:stored.reports||initial.reports,audit:stored.audit||initial.audit,consumers:[...consumers,...generatedConsumers.filter(g=>!consumers.some(c=>c.id===g.id))]}
  // Current-period submissions without a snapshot get one, so the province trend has data to draw.
  return {...loaded,reports:loaded.reports.map(r=>r.snapshot||!['SUBMITTED','APPROVED'].includes(r.status)||r.period!==currentPeriod()?r:{...r,snapshot:snapshotOf(municipalityStats(loaded,r.municipality,r.period))})}
}
// Alerts honor the global switches (Settings / Alerts page) and the consumer's own preferences.
const channelFor=settings=>settings.sms&&settings.app?'Both':settings.sms?'SMS':settings.app?'App':null
const wantsAlert=(settings,consumer,key)=>settings[key]!==false&&consumer?.alerts?.[key]!==false&&!!channelFor(settings)
const nextNumber=(prefix,items,field)=>{
  const year=new Date().getFullYear(),pattern=new RegExp(`^${prefix}-${year}-(\\d+)$`)
  const last=items.reduce((max,item)=>Math.max(max,Number(pattern.exec(item[field]||'')?.[1]||0)),0)
  return `${prefix}-${year}-${String(last+1).padStart(4,'0')}`
}
// The municipal view: only that municipality's consumers and the records that belong to them.
export function scopeTo(store,municipality){
  if(!municipality)return store
  const consumers=store.consumers.filter(c=>c.locality===municipality)
  const inMunicipality=list=>list.filter(item=>item.municipality===municipality)
  return {...restrictTo(store,consumers,{reports:store.reports.filter(r=>r.municipality===municipality),audit:store.audit.filter(a=>a.municipality===municipality),activities:store.activities}),zones:inMunicipality(store.zones||[]),routes:inMunicipality(store.routes||[]),serviceRequests:inMunicipality(store.serviceRequests||[]),workOrders:inMunicipality(store.workOrders||[])}
}
// Keeps only the records that belong to the given consumers.
export function restrictTo(store,consumers,{reports=[],audit=[],activities=[]}={}){
  const ids=new Set(consumers.map(c=>c.id))
  const bills=store.bills.filter(b=>ids.has(b.consumerId))
  const billIds=new Set(bills.map(b=>b.id))
  return {...store,consumers,readings:store.readings.filter(r=>ids.has(r.consumerId)),bills,payments:store.payments.filter(p=>billIds.has(p.billId)),alerts:store.alerts.filter(a=>ids.has(a.consumerId)),reports,audit,activities}
}
// What each signed-in role is allowed to see.
export function scopeFor(store,session){
  if(!session)return restrictTo(store,[])
  switch(session.role){
    case ROLES.PROVINCE_ADMIN: return store
    case ROLES.LGU_ADMIN: return scopeTo(store,session.municipality)
    case ROLES.TELLER: return restrictTo(store,store.consumers.filter(c=>c.locality===session.municipality),{activities:store.activities})
    case ROLES.METER_READER: return restrictTo(store,store.consumers.filter(c=>c.locality===session.municipality&&session.route?.includes(c.barangay)))
    case ROLES.CITIZEN: return restrictTo(store,store.consumers.filter(c=>c.id===session.consumerId))
    default: return restrictTo(store,[])
  }
}
const ACTION_BY_FIELD={type:'Consumer Classification Changed',tier:'Tariff Assignment Changed',meter:'Meter Changed',status:'Consumer Status Changed',locality:'Consumer Relocated',barangay:'Consumer Relocated',account:'Account Number Changed',name:'Consumer Name Changed',address:'Consumer Address Changed',limit:'Monthly Limit Changed',warning:'Warning Point Changed'}
const AUDITED_FIELDS=Object.keys(ACTION_BY_FIELD)

// Barangay names for a municipality, read from the boundary data used by the map.
let barangayCache=null
export function setBarangayIndex(index){barangayCache=index}
function municipalBarangaysFor(municipality){return barangayCache?.[municipality]||[]}

export function DataProvider({children}){
  const {pathname}=useLocation()
  // Re-read the session on every navigation so sign-in and sign-out take effect immediately.
  const session=useMemo(()=>getSession(),[pathname])
  const role=session?.role||null
  const scope=[ROLES.LGU_ADMIN,ROLES.TELLER,ROLES.METER_READER].includes(role)?session.municipality:null
  const [store,setStore]=useState(load)
  const storeRef=useRef(store)
  storeRef.current=store
  const [toast,setToast]=useState('')
  const [online,setOnline]=useState(navigator.onLine)
  const {areas}=useSamarAreas()
  useEffect(()=>{if(!areas)return;const index={};for(const feature of areas.barangays.features){const p=feature.properties;(index[p.locality]=index[p.locality]||[]).push(p.name)}setBarangayIndex(index)},[areas])
  // Local save time from before this session writes anything, used to decide whether the cloud copy is newer.
  const [bootSavedAt]=useState(()=>Number(storageService.load().savedAt)||0)
  // On start, adopt the cloud workspace when it was saved after this browser's copy (for example from another device).
  useEffect(()=>{cloudLoad().then(remote=>{if(remote&&(Number(remote.savedAt)||0)>bootSavedAt)setStore(load(remote))})},[bootSavedAt])
  useEffect(()=>{if(!storageService.save(store))setToast('Browser storage is full or blocked. Recent changes may not persist.')},[store])
  useEffect(()=>{if(!toast)return; const t=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(t)},[toast])
  useEffect(()=>{const offline=()=>setOnline(false);const onlineHandler=()=>{const pending=storeRef.current.readings.filter(r=>r.sync==='Pending Sync').length;setOnline(true);setStore(d=>({...d,readings:d.readings.map(r=>r.sync==='Pending Sync'?{...r,sync:'Synced'}:r),lastSync:new Date().toISOString()}));setToast(pending?`${pending} meter reading${pending===1?'':'s'} synchronized successfully.`:'Connection restored. No readings were waiting to sync.')};window.addEventListener('offline',offline);window.addEventListener('online',onlineHandler);return()=>{window.removeEventListener('offline',offline);window.removeEventListener('online',onlineHandler)}},[])

  const who=session?.name||'Unknown user'
  const thresholds=store.settings.thresholds
  const audit=(municipality,action,oldValue,newValue)=>auditEntry({user:who,role,municipality:municipality||scope||'Samar Province',action,oldValue,newValue})
  const activity=(title,detail,kind)=>({id:uid(),title,detail,at:new Date().toISOString(),kind})
  const alert=(type,consumerId,message,settings)=>({id:uid(),type,consumerId,message,date:dateISO(),channel:channelFor(settings),status:'Sent'})
  const period=currentPeriod()
  const reportFor=(municipality,forPeriod=period)=>store.reports.find(r=>r.municipality===municipality&&r.period===forPeriod)||draftReport(municipality,forPeriod)
  const lockedFor=(municipality,forPeriod=period)=>isLocked(reportFor(municipality,forPeriod).status)
  const fail=message=>{setToast(message);return message}

  // Guards every write: signed in, LGU role, own municipality, and the period not frozen by submission.
  const operateError=municipality=>{
    if(!session)return 'Sign in first.'
    if(!canOperate(role))return 'Province monitoring is read-only for municipal operations.'
    if(municipality&&scope&&municipality!==scope)return `This account can only change records in ${scope}.`
    if(municipality&&lockedFor(municipality))return `${municipality}'s ${periodLabel(period)} report is submitted and locked. Ask the province to return it before changing records.`
    return null
  }
  const scopeError=municipality=>{
    if(!session)return 'Sign in first.'
    if(!canOperate(role))return 'Province monitoring is read-only for municipal operations.'
    if(municipality&&scope&&municipality!==scope)return `This account can only change records in ${scope}.`
    return null
  }

  const roleError=allowed=>!session?'Sign in first.':allowed.includes(role)?null:'Your role cannot make this change.'
  // Meter readers only record readings for accounts on their route, and never for a locked period.
  const readerError=consumer=>{
    const error=roleError([ROLES.METER_READER])
    if(error)return error
    if(!session.route?.includes(consumer.barangay)||consumer.locality!==session.municipality)return 'This account is not on your route.'
    if(lockedFor(consumer.locality))return `${consumer.locality}'s ${periodLabel(period)} report is submitted and locked.`
    return null
  }
  // Citizens pay only their own bills; tellers and the LGU collect for their own municipality.
  const payError=consumer=>{
    if(!session)return 'Sign in first.'
    if(role===ROLES.CITIZEN)return consumer?.id===session.consumerId?null:'You can only pay your own bill.'
    if(role===ROLES.LGU_ADMIN||role===ROLES.TELLER){
      if(consumer&&scope&&consumer.locality!==scope)return `This account belongs to another municipality.`
      return null
    }
    return 'Your role cannot record payments.'
  }
  const saveOwnLimits=(limit,warning)=>{
    const error=roleError([ROLES.CITIZEN])
    if(error)return fail(error)
    const consumer=store.consumers.find(c=>c.id===session.consumerId)
    if(!consumer)return fail('Your account could not be found.')
    const max=Number(limit),low=Number(warning)
    if(!Number.isFinite(max)||max<=0)return fail('The maximum must be a number above 0.')
    if(!Number.isFinite(low)||low<=0||low>=max)return fail('The warning point must be above 0 and below the maximum.')
    setStore(d=>({...d,consumers:d.consumers.map(c=>c.id===consumer.id?{...c,limit:max,warning:low}:c),audit:[audit(consumer.locality,'Consumption Limit Changed',`${consumer.limit} / ${consumer.warning} m³`,`${max} / ${low} m³`),...d.audit]}))
    setToast('Your consumption limits are saved.')
    return null
  }

  const addConsumer=c=>{
    const error=operateError(c.locality)
    if(error)return fail(error)
    const id=uid()
    const record={...c,id,status:'Active',previous:0,current:0,limit:20,warning:15,alerts:{lowUsage:true,billReady:true,usageLimit:true}}
    setStore(d=>({...d,consumers:[record,...d.consumers],activities:[activity('New consumer registered',`Brgy. ${c.barangay}, ${c.locality}`,'consumer'),...d.activities],audit:[audit(c.locality,'Consumer Registered','',`${c.account} · ${c.name}`),...d.audit]}))
    setToast('Consumer added successfully.')
    return null
  }
  const updateConsumer=(id,patch,message='Consumer updated successfully.')=>{
    const consumer=store.consumers.find(c=>c.id===id)
    if(!consumer)return fail('Consumer not found.')
    const error=operateError(consumer.locality)||(patch.locality&&patch.locality!==consumer.locality?operateError(patch.locality):null)
    if(error)return fail(error)
    const entries=AUDITED_FIELDS.filter(key=>key in patch&&String(patch[key]??'')!==String(consumer[key]??'')).map(key=>audit(consumer.locality,ACTION_BY_FIELD[key],consumer[key],patch[key]))
    setStore(d=>({...d,consumers:d.consumers.map(c=>c.id===id?{...c,...patch}:c),audit:[...entries,...d.audit]}))
    setToast(message)
    return null
  }
  const markReviewed=consumerId=>{
    const consumer=store.consumers.find(c=>c.id===consumerId)
    if(!consumer)return fail('Consumer not found.')
    const error=operateError(consumer.locality)
    if(error)return fail(error)
    const reviewed=consumer.reviewedPeriod!==period
    setStore(d=>({...d,consumers:d.consumers.map(c=>c.id===consumerId?{...c,reviewedPeriod:reviewed?period:null}:c),audit:[audit(consumer.locality,reviewed?'High Consumption Reviewed':'High Consumption Review Cleared',consumer.account,periodLabel(period)),...d.audit]}))
    setToast(reviewed?'Marked as reviewed for this period.':'Review mark cleared.')
    return null
  }
  const addReading=r=>{
    const consumer=store.consumers.find(c=>c.id===r.consumerId)
    if(!consumer)return fail('Choose a consumer account.')
    const error=role===ROLES.METER_READER?readerError(consumer):operateError(consumer.locality)
    if(error)return fail(error)
    if(store.readings.some(x=>x.consumerId===r.consumerId&&x.date===r.date))return fail(`A reading for ${consumer.account} on ${r.date} is already recorded.`)
    const sync=navigator.onLine?'Synced':'Pending Sync'
    const usage=consumptionOf(r.previous,r.current)
    const settings=store.settings,alerts=[]
    const level=classify(usage,consumer.type,thresholds)
    if(level==='HIGH'||level==='CRITICAL')alerts.push(alert('High Consumption',consumer.id,`${usage} m³ is ${level==='CRITICAL'?'critical':'high'} for a ${(consumer.type||'Residential').toLowerCase()} account.`,settings))
    if(usage>=consumer.limit&&wantsAlert(settings,consumer,'usageLimit'))alerts.push(alert('Consumption Limit Reached',consumer.id,`Consumption reached ${usage} m³, at or above the ${consumer.limit} m³ monthly limit.`,settings))
    else if(usage>=consumer.warning&&wantsAlert(settings,consumer,'usageLimit'))alerts.push(alert('Consumption Warning',consumer.id,`Consumption reached ${usage} m³, past the ${consumer.warning} m³ warning point.`,settings))
    if(usage===0&&wantsAlert(settings,consumer,'lowUsage'))alerts.push(alert('Low Usage',consumer.id,'No consumption was recorded this period. Please check the meter.',settings))
    setStore(d=>({...d,readings:[{...r,id:uid(),sync},...d.readings],consumers:d.consumers.map(c=>c.id===r.consumerId?{...c,previous:Number(r.previous),current:Number(r.current)}:c),alerts:[...alerts,...d.alerts],activities:[activity('New meter reading recorded',consumer.account,'reading'),...d.activities],audit:[audit(consumer.locality,'Meter Reading Created',`${r.previous} m³`,`${r.current} m³ (${usage} m³, ${level.toLowerCase()})`),...d.audit]}))
    setToast(sync==='Synced'?`Meter reading saved.${alerts.length?' Consumer alert queued.':''}`:'Reading saved offline. It will sync when online.')
    return null
  }
  // Returns an error message when the bill cannot be generated.
  const addBill=(consumerId,month,dueDate)=>{
    const c=store.consumers.find(x=>x.id===consumerId)
    if(!c)return 'Select a consumer.'
    const error=operateError(c.locality)
    if(error)return error
    if(!isBillable(reportFor(c.locality).status))return `Validate the ${periodLabel(period)} report for ${c.locality} before generating bills.`
    const tariff=store.tariffs.find(t=>t.name===c.tier)
    if(!tariff)return `No tariff named "${c.tier}" exists. Update the consumer's rate tier first.`
    if(tariff.status!=='Active')return `The ${tariff.name} tariff is inactive. Activate it in Tariff Tiers or change the consumer's rate tier.`
    if(store.bills.some(b=>b.consumerId===consumerId&&b.month.trim().toLowerCase()===month.trim().toLowerCase()))return `${c.name} already has a bill for ${month}.`
    const number=nextNumber('BIL',store.bills,'number')
    const amount=calculateBill(c.previous,c.current,tariff)
    const alerts=wantsAlert(store.settings,c,'billReady')?[alert('Bill Generated',consumerId,`Your ${month} water bill is ready.`,store.settings)]:[]
    setStore(d=>({...d,bills:[{id:uid(),number,consumerId,month,previous:c.previous,current:c.current,amount,dueDate,status:'Unpaid'},...d.bills],alerts:[...alerts,...d.alerts],activities:[activity('Bill generated',c.account,'bill'),...d.activities],audit:[audit(c.locality,'Bill Generated','',`${number} · ${c.account} · ₱${amount}`),...d.audit]}))
    setToast(alerts.length?'Bill generated and notification queued.':'Bill generated.')
    return null
  }
  const addPayment=(billId,method,collector)=>{
    const bill=store.bills.find(b=>b.id===billId)
    if(!bill||bill.status==='Paid')return null
    const c=store.consumers.find(x=>x.id===bill.consumerId)
    const error=payError(c)
    if(error)return fail(error)
    const payment={id:uid(),receipt:nextNumber('REC',store.payments,'receipt'),billId,method,collector,amount:bill.amount,date:dateISO(),status:'Completed'}
    const alerts=channelFor(store.settings)?[alert('Payment Received',bill.consumerId,`Payment for ${bill.number} was received. Thank you!`,store.settings)]:[]
    setStore(d=>({...d,payments:[payment,...d.payments],bills:d.bills.map(b=>b.id===billId?{...b,status:'Paid'}:b),alerts:[...alerts,...d.alerts],activities:[activity('Payment received',c?.account||bill.number,'payment'),...d.activities],audit:[audit(c?.locality,'Payment Recorded',`${bill.number} unpaid`,`${payment.receipt} · ${method} · ₱${bill.amount}`),...d.audit]}))
    setToast('Payment recorded. Receipt is ready.')
    return payment
  }
  // Consumers reference tariffs by name, so a rename carries their assignments along.
  const saveTariff=t=>{
    const error=scopeError(null)
    if(error)return fail(error)
    const previous=store.tariffs.find(x=>x.id===t.id)
    setStore(d=>{const consumers=previous&&previous.name!==t.name?d.consumers.map(c=>c.tier===previous.name?{...c,tier:t.name}:c):d.consumers;return {...d,consumers,tariffs:t.id?d.tariffs.map(x=>x.id===t.id?t:x):[...d.tariffs,{...t,id:uid()}],audit:[audit(null,previous?'Tariff Changed':'Tariff Added',previous?`${previous.name} ₱${previous.rate} / m³`:'',`${t.name} ₱${t.rate} / m³`),...d.audit]}})
    setToast('Tariff saved successfully.')
    return null
  }
  const saveSettings=patch=>{
    const error=scopeError(null)
    if(error)return fail(error)
    const {thresholds:nextThresholds,...rest}=patch
    if(nextThresholds){const problem=validateThresholds(nextThresholds);if(problem)return fail(problem)}
    const changed=Object.keys(rest).filter(key=>String(rest[key])!==String(store.settings[key]))
    const entries=changed.map(key=>audit(null,'Setting Changed',`${key}: ${store.settings[key]}`,`${key}: ${rest[key]}`))
    setStore(d=>({...d,settings:{...d.settings,...rest,...(nextThresholds?{thresholds:nextThresholds}:{})},audit:[...entries,...d.audit]}))
    setToast('Settings saved.')
    return null
  }
  const saveThresholds=next=>{
    const error=scopeError(null)||null
    if(error)return fail(error)
    const problem=validateThresholds(next)
    if(problem)return fail(problem)
    const summary=t=>Object.entries(t).map(([k,v])=>`${k} ${v.normalMax}/${v.highMax}`).join(', ')
    setStore(d=>({...d,settings:{...d.settings,thresholds:next},audit:[audit(null,'Consumption Thresholds Changed',summary(thresholds),summary(next)),...d.audit]}))
    setToast('Consumption thresholds saved. Statuses have been recalculated.')
    return null
  }
  // Moves a monthly report through its workflow. Validation needs every high-consumption account reviewed.
  const advanceReport=(municipality,forPeriod,to,remarks='')=>{
    if(!session)return fail('Sign in first.')
    if(scope&&municipality!==scope)return fail(`This account can only act on ${scope} reports.`)
    const base=store.reports.find(r=>r.municipality===municipality&&r.period===forPeriod)||draftReport(municipality,forPeriod)
    if(!canTransition(base.status,to,role))return fail(`A report that is ${REPORT_STATUS[base.status]} cannot be moved to ${REPORT_STATUS[to]} by your role.`)
    if(to==='VALIDATED'){
      const pending=store.consumers.filter(c=>c.locality===municipality&&['HIGH','CRITICAL'].includes(levelOf(c,thresholds))&&c.reviewedPeriod!==forPeriod)
      if(pending.length)return fail(`${pending.length} high-consumption account${pending.length===1?'':'s'} still need review before validation.`)
    }
    if(to==='RETURNED'&&!remarks.trim())return fail('Add remarks explaining what must be corrected.')
    const at=new Date().toISOString()
    const entry={at,by:who,role,from:base.status,to,remarks:remarks.trim()}
    const revisions=base.status==='RETURNED'&&to==='DRAFT'?[...base.revisions,{at,by:who,note:'Correction started after province return',remarks:base.history.filter(h=>h.to==='RETURNED').slice(-1)[0]?.remarks||''}]:base.revisions
    const updated={...base,status:to,history:[...base.history,entry],revisions,snapshot:to==='SUBMITTED'?snapshotOf(municipalityStats(store,municipality,forPeriod)):base.snapshot}
    setStore(d=>({...d,reports:[...d.reports.filter(r=>r.id!==updated.id),updated],audit:[audit(municipality,`Report ${REPORT_STATUS[to]}`,REPORT_STATUS[base.status],`${periodLabel(forPeriod)}${remarks.trim()?` · ${remarks.trim()}`:''}`),...d.audit]}))
    setToast(`${periodLabel(forPeriod)} report for ${municipality}: ${REPORT_STATUS[to]}.`)
    return null
  }
  const updateCoverageStatus=(code,status)=>{
    const error=scopeError(null)
    if(error)return fail(error)
    setStore(d=>({...d,mapStatuses:{...d.mapStatuses,[code]:status}}))
    setToast('Demo coverage status updated.')
    return null
  }
  const syncNow=()=>{
    const pendingIds=new Set(data.readings.filter(r=>r.sync==='Pending Sync').map(r=>r.id))
    if(!online)return fail('You are offline. Readings will sync when the connection returns.')
    if(pendingIds.size===0){setToast('Everything is already synchronized.');return null}
    setStore(d=>({...d,readings:d.readings.map(r=>pendingIds.has(r.id)?{...r,sync:'Synced'}:r),lastSync:new Date().toISOString()}))
    setToast(`${pendingIds.size} meter reading${pendingIds.size===1?'':'s'} synchronized successfully.`)
    return null
  }
  // Province admins manage accounts. Each change is audited, and deactivated accounts cannot sign in.
  const upsertUser=(form,editingEmail=null)=>{
    const error=roleError([ROLES.PROVINCE_ADMIN])
    if(error)return fail(error)
    const users=store.users||[]
    const isNew=!editingEmail
    const problem=validateUser(form,{users,consumers:store.consumers,editingEmail,newPassword:isNew})
    if(problem)return fail(problem)
    const current=users.find(u=>u.email===editingEmail)||null
    const email=form.email.trim().toLowerCase()
    const record={
      email,
      name:form.name.trim(),
      role:form.role,
      municipality:needsMunicipality(form.role)?form.municipality:null,
      consumerId:form.role===ROLES.CITIZEN?form.consumerId:null,
      route:form.role===ROLES.METER_READER?form.route:null,
      password:form.password||current?.password||'',
      active:current?current.active:true
    }
    const entries=[]
    if(isNew)entries.push(audit(record.municipality,'User Created','',`${record.name} · ${roleLabel(record.role)}`))
    else{
      if(current.role!==record.role)entries.push(audit(record.municipality,'User Role Changed',roleLabel(current.role),roleLabel(record.role)))
      if(form.password)entries.push(audit(record.municipality,'Password Changed',email,'New password set'))
      if(current.name!==record.name||current.municipality!==record.municipality||current.consumerId!==record.consumerId||JSON.stringify(current.route)!==JSON.stringify(record.route))entries.push(audit(record.municipality,'User Updated',current.name,record.name))
    }
    setStore(d=>({...d,users:isNew?[...(d.users||[]),record]:(d.users||[]).map(u=>u.email===editingEmail?record:u),audit:[...entries,...d.audit]}))
    setToast(isNew?`${record.name} can now sign in.`:'Account saved.')
    return null
  }
  const setUserStatus=(email,active)=>{
    const error=roleError([ROLES.PROVINCE_ADMIN])
    if(error)return fail(error)
    if(email===session?.email)return fail('You cannot deactivate the account you are signed in with.')
    const user=(store.users||[]).find(u=>u.email===email)
    if(!user)return fail('Account not found.')
    setStore(d=>({...d,users:d.users.map(u=>u.email===email?{...u,active}:u),audit:[audit(user.municipality,active?'User Reactivated':'User Deactivated',user.name,active?'Active':'Inactive'),...d.audit]}))
    setToast(`${user.name} ${active?'reactivated':'deactivated'}.`)
    return null
  }
  const resetPassword=(email,password)=>{
    const error=roleError([ROLES.PROVINCE_ADMIN])
    if(error)return fail(error)
    if((password||'').length<8)return fail('The password must be at least 8 characters.')
    const user=(store.users||[]).find(u=>u.email===email)
    if(!user)return fail('Account not found.')
    setStore(d=>({...d,users:d.users.map(u=>u.email===email?{...u,password}:u),audit:[audit(user.municipality,'Password Reset',user.name,'New password set'),...d.audit]}))
    setToast(`Password reset for ${user.name}.`)
    return null
  }
  // ---- Operations: zones, routes, service requests, work orders (municipal LGU only) ----
  const opsContext=municipality=>({zones:store.zones||[],routes:store.routes||[],consumers:store.consumers.filter(c=>c.locality===municipality),municipalBarangays:municipalBarangaysFor(municipality)})
  const saveZone=form=>{
    const municipality=scope||session?.municipality
    const error=operateError(municipality)||validateZone(form,{zones:store.zones||[],municipalBarangays:municipalBarangaysFor(municipality)})
    if(error)return fail(error)
    const exists=(store.zones||[]).find(z=>z.id===form.id)
    const record={id:form.id||uid(),municipality,name:form.name.trim(),barangays:form.barangays}
    setStore(d=>({...d,zones:exists?d.zones.map(z=>z.id===record.id?record:z):[...(d.zones||[]),record],audit:[audit(municipality,exists?'Zone Changed':'Zone Created',exists?exists.name:'',record.name),...d.audit]}))
    setToast(exists?'Zone saved.':'Zone created.')
    return null
  }
  const deleteZone=id=>{
    const zone=(store.zones||[]).find(z=>z.id===id)
    if(!zone)return fail('Zone not found.')
    const error=operateError(zone.municipality)
    if(error)return fail(error)
    if((store.routes||[]).some(r=>r.zoneId===id))return fail(`${zone.name} still has routes. Move or delete them first.`)
    setStore(d=>({...d,zones:d.zones.filter(z=>z.id!==id),audit:[audit(zone.municipality,'Zone Deleted',zone.name,''),...d.audit]}))
    setToast('Zone deleted.')
    return null
  }
  const saveRoute=form=>{
    const municipality=scope||session?.municipality
    const error=operateError(municipality)||validateRoute(form,{routes:store.routes||[],zones:(store.zones||[]).filter(z=>z.municipality===municipality),municipalBarangays:municipalBarangaysFor(municipality)})
    if(error)return fail(error)
    const exists=(store.routes||[]).find(r=>r.id===form.id)
    const record={id:form.id||uid(),municipality,name:form.name.trim(),zoneId:form.zoneId||null,barangays:form.barangays,reader:form.reader||''}
    setStore(d=>({...d,routes:exists?d.routes.map(r=>r.id===record.id?record:r):[...(d.routes||[]),record],audit:[audit(municipality,exists?'Route Changed':'Route Created',exists?exists.name:'',record.name),...d.audit]}))
    setToast(exists?'Route saved.':'Route created.')
    return null
  }
  const deleteRoute=id=>{
    const route=(store.routes||[]).find(r=>r.id===id)
    if(!route)return fail('Route not found.')
    const error=operateError(route.municipality)
    if(error)return fail(error)
    setStore(d=>({...d,routes:d.routes.filter(r=>r.id!==id),audit:[audit(route.municipality,'Route Deleted',route.name,''),...d.audit]}))
    setToast('Route deleted.')
    return null
  }
  const saveServiceRequest=form=>{
    const municipality=scope||session?.municipality
    const error=operateError(municipality)||validateRequest(form,{consumers:store.consumers.filter(c=>c.locality===municipality)})
    if(error)return fail(error)
    const consumer=store.consumers.find(c=>c.id===form.consumerId)
    const record={id:uid(),municipality,consumerId:form.consumerId,type:form.type,priority:form.priority||'Normal',status:'Open',description:form.description.trim(),at:new Date().toISOString()}
    setStore(d=>({...d,serviceRequests:[record,...(d.serviceRequests||[])],audit:[audit(municipality,'Service Request Logged',consumer?.account||'',form.type),...d.audit]}))
    setToast('Service request logged.')
    return null
  }
  // A citizen reports a problem with their own connection. It lands in the LGU's Service Requests for their municipality.
  const saveCitizenRequest=form=>{
    if(!session||role!==ROLES.CITIZEN)return fail('Only citizen accounts can send a service request here.')
    const consumer=store.consumers.find(c=>c.id===session.consumerId)
    if(!consumer)return fail('Your account could not be found.')
    if(!REQUEST_TYPES.includes(form.type))return fail('Choose what the problem is.')
    if(!form.description?.trim())return fail('Describe the problem so the crew knows what to check.')
    const record={id:uid(),municipality:consumer.locality,consumerId:consumer.id,type:form.type,priority:'Normal',status:'Open',description:form.description.trim(),source:'Citizen',photo:form.photo||'',at:new Date().toISOString()}
    setStore(d=>({...d,serviceRequests:[record,...(d.serviceRequests||[])],activities:[activity('Citizen service request',consumer.account+' · '+form.type,'consumer'),...d.activities],audit:[audit(consumer.locality,'Service Request Logged',consumer.account,form.type+' (citizen)'),...d.audit]}))
    setToast('Request sent to the '+consumer.locality+' LGU.')
    return null
  }
  const setRequestStatus=(id,status)=>{
    const request=(store.serviceRequests||[]).find(r=>r.id===id)
    if(!request)return fail('Request not found.')
    const error=operateError(request.municipality)
    if(error)return fail(error)
    if(!REQUEST_STATUSES.includes(status))return fail('Unknown status.')
    setStore(d=>({...d,serviceRequests:d.serviceRequests.map(r=>r.id===id?{...r,status}:r),audit:[audit(request.municipality,'Service Request Updated',request.status,status),...d.audit]}))
    setToast(`Request marked ${status.toLowerCase()}.`)
    return null
  }
  const saveWorkOrder=form=>{
    const municipality=scope||session?.municipality
    const error=operateError(municipality)||validateWorkOrder(form)
    if(error)return fail(error)
    const exists=(store.workOrders||[]).find(w=>w.id===form.id)
    const record={id:form.id||uid(),municipality,requestId:form.requestId||exists?.requestId||null,title:form.title.trim(),crew:form.crew,status:exists?.status||'Scheduled',due:form.due}
    setStore(d=>({...d,workOrders:exists?d.workOrders.map(w=>w.id===record.id?record:w):[record,...(d.workOrders||[])],audit:[audit(municipality,exists?'Work Order Changed':'Work Order Created',exists?exists.title:'',record.title),...d.audit]}))
    setToast(exists?'Work order saved.':'Work order created.')
    return null
  }
  const setWorkStatus=(id,status)=>{
    const order=(store.workOrders||[]).find(w=>w.id===id)
    if(!order)return fail('Work order not found.')
    const error=operateError(order.municipality)
    if(error)return fail(error)
    if(!WORK_STATUSES.includes(status))return fail('Unknown status.')
    setStore(d=>({...d,workOrders:d.workOrders.map(w=>w.id===id?{...w,status}:w),audit:[audit(order.municipality,'Work Order Updated',order.status,status),...d.audit]}))
    setToast(`Work order marked ${status.toLowerCase()}.`)
    return null
  }
  const resetData=()=>{setStore(fresh());setToast('Demo workspace reset.')}

  const data=useMemo(()=>scopeFor(store,session),[store,session])
  // The Province sends the consolidated report for a period once at least one municipal report is approved.
  // There is no outbound connection in the demo, so sending records the send in the audit trail and the activity feed.
  const sendProvincialReport=forPeriod=>{
    if(!session)return fail('Sign in first.')
    if(role!==ROLES.PROVINCE_ADMIN)return fail('Only the Province can send the consolidated report.')
    const approved=store.reports.filter(r=>r.period===forPeriod&&r.status==='APPROVED')
    if(!approved.length)return fail('No municipal report is approved for this period yet.')
    const at=new Date().toISOString()
    const names=approved.map(r=>r.municipality).join(', ')
    setStore(d=>({...d,provincialSent:{...(d.provincialSent||{}),[forPeriod]:at},activities:[activity('Provincial report sent',`${periodLabel(forPeriod)} · ${names}`,'report'),...d.activities],audit:[audit('Samar Province','Provincial Report Sent',periodLabel(forPeriod),`${approved.length} municipal report${approved.length===1?'':'s'} · ${names}`),...d.audit]}))
    setToast(`Provincial report for ${periodLabel(forPeriod)} sent.`)
    return null
  }
  const value={data,session,role,scope,thresholds,period,lastSync:store.lastSync,saveOwnLimits,syncNow,upsertUser,setUserStatus,resetPassword,opsContext,municipalBarangays:municipalBarangaysFor,saveZone,deleteZone,saveRoute,deleteRoute,saveServiceRequest,saveCitizenRequest,setRequestStatus,saveWorkOrder,setWorkStatus,reportFor,lockedFor,sendProvincialReport,levelOf:consumer=>levelOf(consumer,thresholds),toast,setToast,online,addConsumer,updateConsumer,markReviewed,addReading,addBill,addPayment,saveTariff,saveSettings,saveThresholds,advanceReport,updateCoverageStatus,resetData}
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
export const useData=()=>useContext(DataContext)
