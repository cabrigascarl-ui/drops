import React from 'react'

// Gradient banner that opens each role's home page: who is signed in, what matters today, and one main action.
// Pass children to place content (such as stat cards) inside the banner, below the heading.
export default function PortalBanner({eyebrow,title,subtitle,stats=[],action,children}){
  return <section className={`portal-banner${children?' wide':''}`}>
    <div className="portal-banner-copy">
      <span className="portal-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {subtitle&&<p>{subtitle}</p>}
      {action&&<div className="portal-banner-action">{action}</div>}
    </div>
    {stats.length>0&&<div className="portal-banner-stats">{stats.map(s=><div key={s.label}><span>{s.label}</span><strong>{s.value}</strong></div>)}</div>}
    {children&&<div className="portal-banner-body">{children}</div>}
  </section>
}
