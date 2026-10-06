import React,{useEffect,useMemo,useRef,useState} from 'react'
import {useNavigate,useSearchParams} from 'react-router-dom'
import {GeoJSON,MapContainer,Pane,TileLayer,useMap} from 'react-leaflet'
import L from 'leaflet'
import {ArrowLeft,ChevronDown,MapPin,Search,X,ZoomIn} from 'lucide-react'
import {useSamarAreas} from '../hooks/useSamarAreas.js'
import {useData} from '../context/DataContext.jsx'
import {coverageKeys,coverageMeta,coverageStatus,demoCoveragePercent} from '../services/coverageService.js'
import MapLabels from './MapLabels.jsx'
import '../map.css'

const collection=features=>({type:'FeatureCollection',features})
const CATBALOGAN_PINNED=['0806005027','0806005014','0806005051','0806005026','0806005034']
const NO_PINS=[]
function FitBounds({feature,compact,detail}){
  const map=useMap()
  useEffect(()=>{
    if(!feature)return
    const bounds=L.geoJSON(feature).getBounds()
    if(bounds.isValid())map.fitBounds(bounds,{padding:compact?[10,10]:[28,28],maxZoom:detail?15:13,animate:false})
  },[map,feature,compact,detail])
  return null
}
// Keep Leaflet's size in sync with responsive layouts (sidebar toggles, breakpoints).
function SizeWatcher(){
  const map=useMap()
  useEffect(()=>{
    const observer=new ResizeObserver(()=>map.invalidateSize({pan:false}))
    observer.observe(map.getContainer())
    return ()=>observer.disconnect()
  },[map])
  return null
}

export default function SamarCoverageMap({compact=false}){
  const {areas,loading,error,reload}=useSamarAreas()
  const {data,updateCoverageStatus,scope}=useData()
  const navigate=useNavigate()
  const [params,setParams]=useSearchParams()
  const [search,setSearch]=useState('')
  const [active,setActive]=useState(null)
  const [focusCode,setFocusCode]=useState('')
  const [areaLevel,setAreaLevel]=useState('localities')
  const [mapQuery,setMapQuery]=useState('')
  const areaLayer=useRef(null)
  const canvas=useMemo(()=>L.canvas({padding:.5,tolerance:3}),[])
  const provinces=areas?.provinces.features||[]
  const localities=areas?.localities.features||[]
  const barangays=areas?.barangays.features||[]
  // An LGU account sees only its own municipality: its border and barangays, nothing else on the island.
  const lockedLocality=scope?localities.find(feature=>feature.properties.name===scope):null
  const selectedProvince=lockedLocality?provinces.find(feature=>feature.properties.code===lockedLocality.properties.provinceCode):compact?null:provinces.find(feature=>feature.properties.code===params.get('province'))
  const provinceCode=selectedProvince?.properties.code||'all'
  const chosen=lockedLocality||(compact?null:localities.find(feature=>feature.properties.code===params.get('locality')))
  const selectedCode=chosen?.properties.code||'all'
  const scopedLocalities=useMemo(()=>lockedLocality?[lockedLocality]:selectedProvince?localities.filter(feature=>feature.properties.provinceCode===provinceCode):localities,[localities,lockedLocality,selectedProvince,provinceCode])
  const scopedBarangays=useMemo(()=>selectedProvince?barangays.filter(feature=>feature.properties.provinceCode===provinceCode):barangays,[barangays,selectedProvince,provinceCode])
  const scopedProvinces=useMemo(()=>selectedProvince?[selectedProvince]:provinces,[provinces,selectedProvince])
  const counts=useMemo(()=>{
    const result={}
    for(const feature of barangays){const code=feature.properties.localityCode;result[code]=(result[code]||0)+1}
    return result
  },[barangays])
  const selectedBarangays=useMemo(()=>chosen?barangays.filter(feature=>feature.properties.localityCode===selectedCode):[],[barangays,chosen,selectedCode])
  const showBarangays=!compact&&areaLevel==='barangays'
  const visibleFeatures=chosen?selectedBarangays:showBarangays?scopedBarangays:scopedLocalities
  // Out-of-scope localities stay on the map, muted, so the selection keeps its geographic context.
  const contextFeatures=useMemo(()=>compact||lockedLocality?[]:chosen?localities.filter(feature=>feature.properties.code!==selectedCode):selectedProvince?localities.filter(feature=>feature.properties.provinceCode!==provinceCode):[],[compact,lockedLocality,chosen,localities,selectedCode,selectedProvince,provinceCode])
  const directoryFeatures=chosen?selectedBarangays:scopedLocalities
  const query=search.trim().toLowerCase()
  const filteredDirectory=directoryFeatures.filter(feature=>feature.properties.name.toLowerCase().includes(query))
  const focusFeature=selectedBarangays.find(feature=>feature.properties.code===focusCode)
  const boundary=useMemo(()=>focusFeature||chosen||collection(scopedProvinces),[focusFeature,chosen,scopedProvinces])
  const islandBounds=useMemo(()=>provinces.length?L.geoJSON(collection(provinces)).getBounds().pad(.35):null,[provinces])
  const overrides=data.mapStatuses||{}
  // Layer event handlers outlive renders, so they read the latest overrides and focus through a ref.
  const live=useRef({})
  live.current={overrides,focusCode}
  const styleFor=feature=>{
    const focused=live.current.focusCode===feature.properties.code
    return {color:focused?'#0d3b5e':'#ffffff',weight:focused?2.6:compact?.8:showBarangays&&!chosen?.6:1.2,opacity:1,fillColor:coverageMeta[coverageStatus(feature.properties.code,live.current.overrides)].color,fillOpacity:chosen?.74:.66}
  }
  useEffect(()=>{areaLayer.current?.setStyle(styleFor)},[overrides,focusCode])
  const chooseProvince=code=>{
    setParams(code==='all'?{}:{province:code})
    setActive(null);setFocusCode('');setSearch('')
  }
  const choose=code=>{
    if(compact){navigate(code==='all'?'/service-area':`/service-area?locality=${code}`);return}
    if(lockedLocality&&code!==lockedLocality.properties.code)return
    setParams(code==='all'?(selectedProvince?{province:provinceCode}:{}):{province:localities.find(feature=>feature.properties.code===code)?.properties.provinceCode||provinceCode,locality:code})
    setActive(null);setFocusCode('');setSearch('')
  }
  const focusBarangay=feature=>{setFocusCode(feature?.properties.code||'');setActive(feature||null)}
  useEffect(()=>{
    if(compact||!areas)return
    const stale=(params.get('province')&&!selectedProvince)||(params.get('locality')&&!chosen)
    if(stale)setParams(chosen?{province:chosen.properties.provinceCode,locality:selectedCode}:selectedProvince?{province:provinceCode}:{},{replace:true})
  },[areas,params,selectedProvince,chosen,compact,setParams,provinceCode,selectedCode])
  const onEachFeature=(feature,layer)=>{
    const p=feature.properties
    layer.on({
      mouseover:()=>{layer.setStyle({weight:2.4,fillOpacity:.86,color:p.code===live.current.focusCode?'#0d3b5e':'#ffffff'});layer.bringToFront()},
      mouseout:()=>layer.setStyle(styleFor(feature)),
      click:()=>{if(chosen)focusBarangay(feature);else if(showBarangays)choose(p.localityCode);else choose(p.code)}
    })
    if(!compact)layer.bindTooltip(chosen?p.name:showBarangays?`${p.name} · ${p.locality}`:`${p.name} · ${counts[p.code]||0} barangays`,{sticky:true,direction:'top',offset:[0,-8],className:'samar-hover-label'})
  }
  const onEachContext=(feature,layer)=>{
    layer.on({mouseover:()=>layer.setStyle({fillOpacity:.75}),mouseout:()=>layer.setStyle({fillOpacity:.5}),click:()=>choose(feature.properties.code)})
    layer.bindTooltip(`${feature.properties.name} · ${feature.properties.province}`,{sticky:true,direction:'top',offset:[0,-8],className:'samar-hover-label'})
  }
  const statusCounts=useMemo(()=>{
    const result=Object.fromEntries(coverageKeys.map(key=>[key,0]))
    for(const feature of visibleFeatures)result[coverageStatus(feature.properties.code,overrides)]++
    return result
  },[visibleFeatures,overrides])
  // Map search: a city or municipality, or a barangay once one is chosen. Same pattern as the province map.
  const mapMatches=(()=>{const q=mapQuery.trim().toLowerCase();if(!q||compact)return[];const pool=chosen?selectedBarangays:scopedLocalities;return pool.filter(feature=>feature.properties.name.toLowerCase().includes(q)).slice(0,6)})()
  const pickFromMap=feature=>{setMapQuery('');if(chosen)focusBarangay(feature);else choose(feature.properties.code)}
  if(loading)return <div className={`coverage-loading ${compact?'compact':''}`}><span className="skeleton"/>Loading Samar Island boundaries…</div>
  if(error)return <div className={`coverage-error ${compact?'compact':''}`}>Boundary data could not be loaded. <button onClick={reload}>Try again</button></div>
  const activeStatus=active?coverageStatus(active.properties.code,overrides):null
  const activePercent=active?demoCoveragePercent(active.properties.code,activeStatus):null
  const cities=scopedLocalities.filter(feature=>feature.properties.kind==='City').length
  const municipalities=scopedLocalities.length-cities
  const scopeName=chosen?.properties.name||selectedProvince?.properties.name||'Samar Island'
  const layerKey=`${provinceCode}-${selectedCode}-${areaLevel}`
  return <div className={`samar-coverage ${compact?'compact':''}`}>
    {!compact&&<div className="province-search">
      <label><span className="sr-only">Search map</span><input value={mapQuery} onChange={e=>setMapQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&mapMatches[0])pickFromMap(mapMatches[0]);if(e.key==='Escape')setMapQuery('')}} placeholder={chosen?`Search a barangay in ${chosen.properties.name}, e.g. Poblacion 1`:'Search a city or municipality, e.g. Basey'}/></label>
      {mapMatches.length>0&&<ul className="province-suggest">{mapMatches.map(feature=><li key={feature.properties.code}><button type="button" onClick={()=>pickFromMap(feature)}>{feature.properties.name}<small>{chosen?feature.properties.locality:feature.properties.province}</small></button></li>)}</ul>}
      {mapQuery.trim()&&mapMatches.length===0&&<div className="province-suggest empty">No area matches “{mapQuery}”.</div>}
    </div>}
    {!compact&&<div className="coverage-toolbar"><div className="coverage-toolbar-left">
      {!lockedLocality&&<div className="coverage-select coverage-province-select"><MapPin size={16}/><select aria-label="Province" value={provinceCode} onChange={event=>chooseProvince(event.target.value)}><option value="all">All Samar Island</option>{provinces.map(feature=><option key={feature.properties.code} value={feature.properties.code}>{feature.properties.name}</option>)}</select><ChevronDown size={15}/></div>}
      {!lockedLocality&&<div className="coverage-select"><select aria-label="City or municipality" value={selectedCode} onChange={event=>choose(event.target.value)}><option value="all">All cities & municipalities</option>{scopedProvinces.map(province=><optgroup key={province.properties.code} label={province.properties.name}>{scopedLocalities.filter(feature=>feature.properties.provinceCode===province.properties.code).map(feature=><option key={feature.properties.code} value={feature.properties.code}>{feature.properties.name}</option>)}</optgroup>)}</select><ChevronDown size={15}/></div>}
      {chosen?<div className="coverage-select coverage-barangay-select"><select aria-label="Focus barangay" value={focusCode} onChange={event=>focusBarangay(selectedBarangays.find(feature=>feature.properties.code===event.target.value))}><option value="">{chosen.properties.kind==='City'?'City overview':'Municipality overview'}</option>{selectedBarangays.map(feature=><option key={feature.properties.code} value={feature.properties.code}>{feature.properties.name}</option>)}</select><ChevronDown size={15}/></div>:<div className="coverage-layer-switch" role="group" aria-label="Map layer"><button aria-pressed={areaLevel==='localities'} className={areaLevel==='localities'?'active':''} onClick={()=>setAreaLevel('localities')}>Localities</button><button aria-pressed={areaLevel==='barangays'} className={areaLevel==='barangays'?'active':''} onClick={()=>setAreaLevel('barangays')}>Barangays</button></div>}
    </div><div className="coverage-toolbar-right"><span>{chosen?`${selectedBarangays.length} barangays · ${chosen.properties.kind}`:`${cities} ${cities===1?'city':'cities'} · ${municipalities} municipalities · ${scopedBarangays.length.toLocaleString()} barangays`}</span><span className="demo-tag">ILLUSTRATIVE COVERAGE</span></div></div>}
    <div className={`coverage-map-frame ${compact?'compact':''}`}>
      <MapContainer center={[11.8,125]} zoom={8} zoomSnap={.25} zoomDelta={.5} wheelPxPerZoomLevel={90} minZoom={7} maxZoom={17} maxBounds={islandBounds} maxBoundsViscosity={.9} scrollWheelZoom={!compact} dragging={!compact} doubleClickZoom={!compact} touchZoom={!compact} keyboard={!compact} zoomControl={!compact} attributionControl={!compact} style={{height:'100%',width:'100%'}}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Boundaries: PSA/NAMRIA 2023' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}/>
        <SizeWatcher/>
        <FitBounds feature={boundary} compact={compact} detail={!!focusFeature}/>
        {contextFeatures.length>0&&<GeoJSON key={`context-${layerKey}`} data={collection(contextFeatures)} renderer={canvas} style={{color:'#ffffff',weight:.9,fillColor:'#8fa3b4',fillOpacity:.5}} onEachFeature={onEachContext}/>}
        <GeoJSON ref={areaLayer} key={`areas-${layerKey}`} data={collection(visibleFeatures)} renderer={canvas} style={styleFor} onEachFeature={onEachFeature}/>
        <Pane name="area-outlines" style={{zIndex:450,pointerEvents:'none'}}>
          {showBarangays&&!chosen&&<GeoJSON key={`locality-lines-${provinceCode}`} data={collection(scopedLocalities)} interactive={false} style={{color:'#ffffff',weight:1.6,opacity:.95,fill:false}}/>}
          {chosen?<GeoJSON key={`chosen-line-${selectedCode}`} data={chosen} interactive={false} style={{color:'#174a73',weight:2.2,opacity:.9,fill:false}}/>:<GeoJSON key={`province-lines-${provinceCode}`} data={collection(scopedProvinces)} interactive={false} style={{color:'#174a73',weight:compact?1.1:1.8,opacity:.75,fill:false}}/>}
        </Pane>
        {!compact&&<MapLabels key={`labels-${layerKey}`} features={visibleFeatures} pinned={selectedCode==='0806005000'?CATBALOGAN_PINNED:NO_PINS} minZoom={showBarangays&&!chosen?10.5:0}/>}
      </MapContainer>
      {compact?<div className="coverage-mini-chip"><span/> {lockedLocality?lockedLocality.properties.name.toUpperCase():'SAMAR ISLAND'} <b>{lockedLocality?`${selectedBarangays.length} barangays · ${lockedLocality.properties.province}`:`3 provinces · 73 localities · ${barangays.length.toLocaleString()} barangays`}</b></div>:<>
        <div className="coverage-map-title">{scopeName.toUpperCase()} <span>· {chosen?chosen.properties.province.toUpperCase():'PHILIPPINES'}</span></div>
        <div className="province-legend">{coverageKeys.map(key=><span key={key}><i style={{background:coverageMeta[key].color}}/>{coverageMeta[key].label}</span>)}</div>
        {showBarangays&&!chosen&&<div className="coverage-map-hint">Zoom in to see barangay names</div>}
        {chosen&&(focusCode||!lockedLocality)&&<button className="coverage-show-all" onClick={()=>focusCode?focusBarangay(null):choose('all')}>{focusCode?`Show all of ${chosen.properties.name}`:`Back to ${selectedProvince?.properties.name||'Samar Island'}`}</button>}
        {active&&<div className="coverage-info" role="dialog" aria-label={`${active.properties.name} details`}><button className="coverage-info-close" onClick={()=>setActive(null)} aria-label="Close area details"><X size={16}/></button><small>BARANGAY · {active.properties.locality.toUpperCase()}</small><h3>{active.properties.name}</h3><div className="coverage-info-meter"><span>Illustrative coverage</span><strong>{activePercent===null?'No data':`${activePercent}%`}</strong></div><div className="coverage-info-track"><span style={{width:`${activePercent||0}%`,background:coverageMeta[activeStatus].color}}/></div><label>Demo supply status<select value={activeStatus} onChange={event=>updateCoverageStatus(active.properties.code,event.target.value)}>{coverageKeys.map(key=><option key={key} value={key}>{coverageMeta[key].label}</option>)}</select></label><dl><div><dt>PSGC code</dt><dd>{active.properties.code}</dd></div><div><dt>Land area</dt><dd>{active.properties.areaKm2<.1?'< 0.1':active.properties.areaKm2.toLocaleString()} km²</dd></div><div><dt>Province</dt><dd>{active.properties.province}</dd></div></dl></div>}
      </>}
    </div>
    {!compact&&<><div className="coverage-footnote">Boundaries: PSA PSGC / NAMRIA, 2023 snapshot. Colors and percentages are illustrative demo data, not live water service measurements.</div><div className="coverage-summary">{coverageKeys.map(key=><div key={key}><i style={{background:coverageMeta[key].color}}/><strong>{statusCounts[key].toLocaleString()}</strong><span>{coverageMeta[key].label}</span></div>)}</div><div className="coverage-directory-head"><div><span className="eyebrow">{chosen?'BARANGAY DIRECTORY':`${scopeName.toUpperCase()} DIRECTORY`}</span><h2>{chosen?`${chosen.properties.name} barangays`:'Cities & municipalities'}</h2><p>{chosen?'Select a barangay to zoom in and view its demo status.':'Choose a locality to explore its barangay boundaries.'}</p></div><label><Search size={16}/><input aria-label={chosen?'Search barangays':'Search cities or municipalities'} placeholder={chosen?'Search barangays...':'Search cities or municipalities...'} value={search} onChange={e=>setSearch(e.target.value)}/></label></div><div className="coverage-directory">{filteredDirectory.map(feature=>{const p=feature.properties,status=coverageStatus(p.code,overrides);return <button key={p.code} className={p.code===focusCode?'active':''} onClick={()=>{if(chosen)focusBarangay(feature);else choose(p.code)}}><span className="coverage-directory-icon" style={{background:coverageMeta[status].light,color:coverageMeta[status].color}}><MapPin size={17}/></span><span><strong title={p.name}>{p.name}</strong><small>{chosen?`PSGC ${p.code}`:`${p.province} · ${p.kind} · ${counts[p.code]||0} barangays`}</small></span><i style={{background:coverageMeta[status].color}} title={coverageMeta[status].label}/><ZoomIn size={15}/></button>})}{!filteredDirectory.length&&<div className="coverage-no-results">No areas match your search.</div>}</div>{chosen&&!lockedLocality&&<button className="coverage-back" onClick={()=>choose('all')}><ArrowLeft size={15}/> Back to {selectedProvince?.properties.name||'Samar Island'}</button>}</>}
  </div>
}
