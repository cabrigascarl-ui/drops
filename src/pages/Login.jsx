import React,{useState} from 'react'
import {Navigate,useLocation,useNavigate} from 'react-router-dom'
import {AlertTriangle,ArrowRight,Droplets,Eye,EyeOff,Lock,LoaderCircle,Mail,MapPin,ReceiptText,ScanLine} from 'lucide-react'
import {DEMO_ACCOUNTS,getSession,signIn} from '../services/sessionService.js'
import {homePath} from '../config/permissions.js'
import SamarLightMap from '../components/SamarLightMap.jsx'
import '../login.css'

const features=[
  [ScanLine,'Offline-ready meter readings','Readings saved on the device sync automatically when the connection returns.'],
  [ReceiptText,'Bills and printable receipts','Generate bills by tariff tier and issue official payment receipts.'],
  [MapPin,'Samar Island coverage','Consumers are registered against 2,117 barangays across three provinces.']
]


export default function Login(){
  const navigate=useNavigate(),location=useLocation()
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[remember,setRemember]=useState(true)
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[welcome,setWelcome]=useState(null)
  if(getSession()&&!welcome)return <Navigate to={homePath(getSession().role)} replace/>
  const submit=async event=>{
    event.preventDefault()
    if(!email.trim()||!password){setError('Enter your email and password.');return}
    setBusy(true);setError('');setNotice('')
    // Short pause so the sign-in state is visible; there is no network request.
    await new Promise(resolve=>setTimeout(resolve,500))
    const session=signIn(email,password,remember)
    if(!session){setBusy(false);setError('That email and password don’t match an account. Check them and try again.');return}
    // Welcome moment: a drop splashes in before the portal opens.
    setWelcome(session)
    setTimeout(()=>navigate(location.state?.from||homePath(session.role),{replace:true}),1300)
  }
  return <div className="login-root">
    {welcome&&<div className="login-welcome" role="status">
      <div className="login-welcome-card">
        <div className="login-welcome-drop"><Droplets size={34} strokeWidth={2.4}/></div>
        <h2>Welcome, {welcome.name.split(' ').find(part=>part.length>1&&!part.endsWith('.'))||welcome.name}</h2>
        <p>Opening your workspace…</p>
      </div>
    </div>}
    <header className="login-header">
      <div className="login-mark">
        <span className="login-mark-icon"><Droplets size={20} strokeWidth={2.4}/></span>
        <div><strong>DROPS</strong><small>DIGITAL READING OF OUTFLOW &amp; PAYMENT SYNC</small></div>
      </div>
      <span className="login-status"><i aria-hidden="true"/>System operational</span>
    </header>
    <div className="login-page">
    <aside className="login-brand">
      <div className="login-beam" aria-hidden="true"/>
      <SamarLightMap/>
      <div>
        <h1>Every drop accounted for. <em>Every payment synced.</em></h1>
        <p className="login-lead">The provincial water district workspace for consumers, meter readings, billing and collections.</p>
        <ul className="login-features">{features.map(([Icon,title,text])=><li key={title}><span><Icon size={17}/></span><div><b>{title}</b><small>{text}</small></div></li>)}</ul>
      </div>
    </aside>
    <main className="login-panel">
      <form className="login-card" onSubmit={submit} noValidate>
        <span className="login-eyebrow">SIGN IN</span>
        <h2>Welcome back</h2>
        <p className="login-sub">Sign in to manage your district’s water service.</p>
        {error&&<div className="login-error" role="alert"><AlertTriangle size={16}/><span>{error}</span></div>}
        {notice&&<div className="login-notice" role="status">{notice}</div>}
        <label className="login-field"><span>Email address</span>
          <div className={`login-input ${error?'invalid':''}`}><Mail size={17}/><input type="email" autoComplete="username" autoFocus placeholder="name@district.gov.ph" value={email} onChange={e=>{setEmail(e.target.value);setError('')}}/></div>
        </label>
        <label className="login-field"><span>Password</span>
          <div className={`login-input ${error?'invalid':''}`}><Lock size={17}/><input type={show?'text':'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e=>{setPassword(e.target.value);setError('')}}/>
            <button type="button" className="login-icon-btn" onClick={()=>setShow(!show)} aria-label={show?'Hide password':'Show password'}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button>
          </div>
        </label>
        <div className="login-row">
          <label className="login-check"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>Keep me signed in on this device</label>
          <button type="button" className="login-link" onClick={()=>{setError('');setNotice('Password resets are handled by your district administrator. Contact the IT office to reset yours.')}}>Forgot password?</button>
        </div>
        <button className="login-submit" type="submit" disabled={busy}>{busy?<><LoaderCircle size={18} className="login-spin"/>Signing in…</>:<>Sign in<ArrowRight size={18}/></>}</button>
        <div className="login-demo">
          {DEMO_ACCOUNTS.filter(account=>!account.generated).map(account=><button type="button" key={account.email} onClick={()=>{setEmail(account.email);setPassword(account.password);setError('');setNotice('')}}><span>{account.label}</span><small>{account.caption}</small></button>)}
        </div>
      </form>
    </main>
    </div>
    <footer className="login-footer">
      <span>© 2026 DROPS · Provincial Water District</span>
      <span>Demo environment · data stays in this browser</span>
    </footer>
  </div>
}
