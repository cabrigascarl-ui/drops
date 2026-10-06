import React from 'react'
import {samarArt} from '../data/samar-art.js'

// Teardrop map pin, tip at (0, 0) after the inner translate.
const PIN='M0 -22C-9 -22-14-15-14-8C-14 3 0 14 0 14C0 14 14 3 14-8C14-15 9-22 0-22Z'

// Decorative, non-interactive map of the whole island: every locality lit from within, province
// outlines drawn in with a light travelling along each border, a sheen sweeping across, pins on the
// three provinces, and pulsing markers on the main cities.
export default function SamarLightMap(){
  const {viewBox,provinces,localities,cities}=samarArt
  return <div className="samar-light" aria-hidden="true">
    <svg viewBox={viewBox} className="samar-svg" focusable="false">
      <defs>
        <linearGradient id="samar-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#79ebe5" stopOpacity=".42"/>
          <stop offset=".6" stopColor="#0aa6c9" stopOpacity=".18"/>
          <stop offset="1" stopColor="#0876e6" stopOpacity=".3"/>
        </linearGradient>
        <linearGradient id="samar-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2fffd"/>
          <stop offset="1" stopColor="#4ff0d2"/>
        </linearGradient>
        <linearGradient id="samar-brand-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2fffd"/>
          <stop offset=".45" stopColor="#4ff0d2"/>
          <stop offset="1" stopColor="#0aa6c9"/>
        </linearGradient>
        <filter id="samar-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="7" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#samar-glow)">
        {localities.map(locality=><path key={locality.name} d={locality.d} className="samar-loc"><title>{locality.name}</title></path>)}
      </g>
      {provinces.map(province=><path key={`draw-${province.name}`} d={province.d} pathLength="1" className="samar-prov"/>)}
      {provinces.map((province,index)=><path key={`flow-${province.name}`} d={province.d} pathLength="1" className="samar-flow" style={{animationDelay:`${-index*1.7}s`}}/>)}
      {cities.map(city=><g key={city.name} transform={`translate(${city.point[0]} ${city.point[1]})`} className="samar-city">
        <circle r="26" className="samar-ping"/>
        <circle r="26" className="samar-ping samar-ping-late"/>
        <circle r="6" className="samar-dot"/>
      </g>)}
      {provinces.map((province,index)=><g key={`pin-${province.name}`} transform={`translate(${province.point[0]} ${province.point[1]})`}>
        <circle r="34" className="samar-ping samar-ping-pin" style={{animationDelay:`${index*.6}s`}}/>
        <g className="samar-pin" style={{animationDelay:`${.4+index*.25}s`}}>
          <g transform="scale(1.6)"><g transform="translate(0 -14)">
            <path d={PIN} className="samar-pin-body"/>
            <circle cy="-8" r="4.5" className="samar-pin-core"/>
          </g></g>
          <text x="30" y="-30" className="samar-pin-label">{province.label}</text>
        </g>
      </g>)}
    </svg>
  </div>
}
