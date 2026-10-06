import React,{useEffect,useMemo,useState} from 'react'
import {GeoJSON,MapContainer,TileLayer,useMap} from 'react-leaflet'
import L from 'leaflet'
import {useSamarAreas} from '../hooks/useSamarAreas.js'
import {STATUS_COLORS,STATUS_LABELS} from '../services/provinceService.js'
import '../map.css'

// Frames the whole island once the map has its real size, so it never opens zoomed out.
function FrameIsland({bounds}){
  const map=useMap()
  useEffect(()=>{
    if(!bounds)return
    map.invalidateSize()
    map.fitBounds(bounds,{padding:[16,16],animate:false})
  },[map,bounds])
  return null
}

// Flies to one municipality when it is picked from the search.
function FocusOn({target,features}){
  const map=useMap()
  useEffect(()=>{
    if(!target)return
    const feature=features.features.find(f=>f.properties.name===target.name)
    if(feature)map.fitBounds(L.geoJSON(feature).getBounds(),{padding:[60,60],maxZoom:11})
  },[map,target,features])
  return null
}

// Municipalities colored by their report status for the current period. Search or click one to select it.
export default function ProvinceMap({stats,selected,onSelect}){
  const {areas,loading,error,reload}=useSamarAreas()
  const [query,setQuery]=useState(''),[target,setTarget]=useState(null)
  const features=useMemo(()=>areas?{type:'FeatureCollection',features:areas.localities.features}:null,[areas])
  const bounds=useMemo(()=>features?L.geoJSON(features).getBounds():null,[features])
  const matches=useMemo(()=>{
    const q=query.trim().toLowerCase()
    if(!q||!features)return []
    return features.features.map(f=>f.properties.name).filter(name=>name.toLowerCase().includes(q)).slice(0,6)
  },[query,features])
  if(loading)return <div className="coverage-loading"><span className="skeleton"/>Loading municipal boundaries…</div>
  if(error||!features)return <div className="coverage-error">Boundary data could not be loaded. <button onClick={reload}>Try again</button></div>
  const byName=Object.fromEntries(stats.map(s=>[s.municipality,s]))
  const style=feature=>{
    const name=feature.properties.name,status=byName[name]?.status||'NOT_STARTED',isSelected=name===selected
    return {color:isSelected?'#0d3b5e':'#ffffff',weight:isSelected?2.8:.9,fillColor:STATUS_COLORS[status],fillOpacity:isSelected?.92:.78}
  }
  const pick=name=>{setQuery('');onSelect(name);setTarget({name,at:Date.now()})}
  const legend=[...new Set(stats.map(s=>s.status).concat('NOT_STARTED'))]
  return <div className="province-map-wrap">
    <div className="province-search">
      <label><span className="sr-only">Search municipality</span><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&matches[0])pick(matches[0]);if(e.key==='Escape')setQuery('')}} placeholder="Search a city or municipality, e.g. Basey"/></label>
      {matches.length>0&&<ul className="province-suggest">{matches.map(name=><li key={name}><button type="button" onClick={()=>pick(name)}>{name}<small>{byName[name]?STATUS_LABELS[byName[name].status]:STATUS_LABELS.NOT_STARTED}</small></button></li>)}</ul>}
      {query.trim()&&matches.length===0&&<div className="province-suggest empty">No municipality matches “{query}”.</div>}
    </div>
    <div className="province-map">
      <MapContainer scrollWheelZoom={false} style={{height:'100%',width:'100%'}} attributionControl={false} minZoom={7} maxZoom={14}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors"/>
        <FrameIsland bounds={bounds}/>
        <FocusOn target={target} features={features}/>
        <GeoJSON key={`${selected}|${stats.map(s=>`${s.municipality}:${s.status}`).join(',')}`} data={features} style={style} onEachFeature={(feature,layer)=>{
          layer.on({click:()=>onSelect(feature.properties.name),mouseover:()=>layer.setStyle({weight:2}),mouseout:()=>layer.setStyle(style(feature))})
          layer.bindTooltip(feature.properties.name,{sticky:true,className:'samar-hover-label'})
        }}/>
      </MapContainer>
      <div className="province-legend">{legend.map(status=><span key={status}><i style={{background:STATUS_COLORS[status]}}/>{STATUS_LABELS[status]}</span>)}</div>
    </div>
  </div>
}
