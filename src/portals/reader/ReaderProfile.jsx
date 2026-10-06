import React,{useMemo} from 'react'
import {useNavigate} from 'react-router-dom'
import {CalendarDays,ClipboardList,LogOut,MapPin,ScanLine,ShieldCheck,Wifi,WifiOff} from 'lucide-react'
import {useData} from '../../context/DataContext.jsx'
import {signOut} from '../../services/sessionService.js'
import {ROLE_LABELS} from '../../config/permissions.js'
import {routeOrder} from './readerShared.js'

// Initials from every name part, including initials like "J." (so "J. Castro" gives "JC").
const initialsOf=name=>(name||'?').split(' ').filter(Boolean).map(p=>p[0]).slice(0,2).join('').toUpperCase()||'?'

export default function ReaderProfile(){
  const {data,session,period,online,lastSync}=useData()
  const navigate=useNavigate()
  const mine=useMemo(()=>routeOrder(data.consumers,session?.route||[]),[data.consumers,session])
  const readings=data.readings.filter(r=>r.reader===session?.name)
  const readIds=useMemo(()=>new Set(data.readings.filter(r=>r.date?.startsWith(period)).map(r=>r.consumerId)),[data.readings,period])
  const barangays=(session?.route||[]).map(name=>{
    const list=mine.filter(c=>c.barangay===name)
    return {name,total:list.length,done:list.filter(c=>readIds.has(c.id)).length}
  })
  const doneAll=barangays.reduce((n,b)=>n+b.done,0)
  const percent=mine.length?Math.round(doneAll/mine.length*100):0
  const lastSyncText=lastSync?new Date(lastSync).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'}):'Not synced yet'

  return <div className="reader-page profile-page">
    <header className="profile-banner">
      <div className="profile-orb" aria-hidden="true"/>
      <div className="profile-orb two" aria-hidden="true"/>
      <div className="profile-id">
        <div className="profile-avatar-ring"><div className="profile-avatar">{initialsOf(session?.name)}</div></div>
        <div className="profile-id-text">
          <span className="profile-kicker">Meter reader</span>
          <h1>{session?.name}</h1>
          <span className="profile-role"><ShieldCheck size={13}/> {ROLE_LABELS[session?.role]} · {session?.municipality}</span>
        </div>
      </div>
      <span className={`profile-net ${online?'on':'off'}`}>{online?<Wifi size={13}/>:<WifiOff size={13}/>}{online?'Online':'Offline'}</span>
    </header>

    <section className="reader-section profile-stats-wrap">
      <div className="profile-stats">
        <div className="pstat"><span className="profile-stat-icon g-blue"><ClipboardList size={18}/></span><strong>{mine.length}</strong><small>Customers</small></div>
        <div className="pstat"><span className="profile-stat-icon g-green"><ScanLine size={18}/></span><strong>{readings.length}</strong><small>Readings taken</small></div>
        <div className="pstat"><span className="profile-stat-icon g-violet"><CalendarDays size={18}/></span><strong>{period}</strong><small>Period</small></div>
      </div>
    </section>

    <section className="reader-section">
      <div className="profile-card">
        <div className="profile-card-head">
          <span className="profile-card-icon"><MapPin size={18}/></span>
          <div><h3>Assigned route</h3><small>{barangays.length} barangays · {doneAll} of {mine.length} read this period</small></div>
          <span className="profile-percent">{percent}%</span>
        </div>
        <div className="profile-progress"><span style={{width:`${percent}%`}}/></div>
        <ul className="route-stops">
          {barangays.map((b,i)=><li key={b.name}>
            <span className={`stop-num ${b.total&&b.done===b.total?'done':''}`}>{i+1}</span>
            <div className="stop-main"><strong>{b.name}</strong><small>{b.done} of {b.total} read</small></div>
            <div className="stop-bar"><span style={{width:`${b.total?Math.round(b.done/b.total*100):0}%`}}/></div>
          </li>)}
        </ul>
        <div className="profile-sync">
          <span className={`profile-dot ${online?'on':'off'}`}/>
          <span>{online?'Connected':'Offline. Readings are saved on this device.'}</span>
          <span className="profile-sync-when">Last sync · {lastSyncText}</span>
        </div>
      </div>
      <div className="profile-note"><ShieldCheck size={16}/><p>Your route and role are set by the municipal LGU. Contact the LGU office to change them.</p></div>
      <button className="profile-signout" onClick={()=>{signOut();navigate('/login')}}><LogOut size={18}/> Sign out</button>
    </section>
  </div>
}
