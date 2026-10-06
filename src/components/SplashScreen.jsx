import React from 'react'
import {Droplets} from 'lucide-react'

// Shown while a page loads: a gradient backdrop, a rising drop, and a shimmering progress line.
export default function SplashScreen({message='Loading DROPS…'}){
  return <div className="splash" role="status" aria-live="polite">
    <div className="splash-glow" aria-hidden="true"/>
    <div className="splash-card">
      <div className="splash-drop"><Droplets size={30} strokeWidth={2.4}/></div>
      <strong className="splash-brand">DROPS</strong>
      <small className="splash-sub">Digital Reading of Outflow &amp; Payment Sync</small>
      <div className="splash-bar"><span/></div>
      <p>{message}</p>
    </div>
  </div>
}
