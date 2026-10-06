import {useEffect,useMemo} from 'react'
import {useMap} from 'react-leaflet'
import L from 'leaflet'

const anchors=new Map()
const bbox=geometry=>{
  let west=180,south=90,east=-180,north=-90
  for(const part of geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates)for(const [lng,lat] of part[0]){west=Math.min(west,lng);east=Math.max(east,lng);south=Math.min(south,lat);north=Math.max(north,lat)}
  return L.latLngBounds([south,west],[north,east])
}
// labelPoint is precomputed by scripts/build-samar-geometry.cjs (visual center of the representative part).
export function labelAnchor(feature){
  const code=feature.properties.code
  if(!anchors.has(code)){
    const [lng,lat]=feature.properties.labelPoint
    anchors.set(code,{latlng:L.latLng(lat,lng),bounds:bbox(feature.geometry)})
  }
  return anchors.get(code)
}
// Map labels drop PSGC suffixes such as "(Pob.)" to stay short; full names show on hover and in the panel.
export const shortName=name=>name.replace(/\s*\((Pob\.|Capital)\)$/,'').replace(/^(Poblacion \d+) \(Barangay \d+\)$/,'$1')

const LABEL_HEIGHT=15
const textWidth=text=>text.length*6.1+10
const overlaps=(a,b)=>a.x1<b.x2&&a.x2>b.x1&&a.y1<b.y2&&a.y2>b.y1

// Greedy collision-free labels: larger areas (and pinned codes) win; labels that would not fit
// inside their own shape at the current zoom are hidden until the user zooms in.
export default function MapLabels({features,pinned=[],minZoom=0}){
  const map=useMap()
  const ordered=useMemo(()=>{
    const rank=code=>{const index=pinned.indexOf(code);return index<0?pinned.length:index}
    return [...features].sort((a,b)=>rank(a.properties.code)-rank(b.properties.code)||(b.properties.areaKm2||0)-(a.properties.areaKm2||0))
  },[features,pinned])
  useEffect(()=>{
    const pane=map.getPane('area-labels')||map.createPane('area-labels')
    pane.style.zIndex=470
    pane.style.pointerEvents='none'
    const layer=L.layerGroup().addTo(map)
    const markers=new Map()
    const update=()=>{
      const size=map.getSize(),placed=[],visible=new Set()
      if(map.getZoom()>=minZoom){
        for(const feature of ordered){
          const {code,name}=feature.properties
          const {latlng,bounds}=labelAnchor(feature)
          const point=map.latLngToContainerPoint(latlng)
          const text=shortName(name),width=textWidth(text)
          if(point.x<-width||point.y<-LABEL_HEIGHT||point.x>size.x+width||point.y>size.y+LABEL_HEIGHT)continue
          const shapeWidth=map.latLngToContainerPoint(bounds.getNorthEast()).x-map.latLngToContainerPoint(bounds.getSouthWest()).x
          if(shapeWidth<width*.55&&!pinned.includes(code))continue
          const box={x1:point.x-width/2-3,x2:point.x+width/2+3,y1:point.y-LABEL_HEIGHT/2-2,y2:point.y+LABEL_HEIGHT/2+2}
          if(placed.some(other=>overlaps(box,other)))continue
          placed.push(box);visible.add(code)
          if(!markers.has(code))markers.set(code,L.marker(latlng,{pane:'area-labels',interactive:false,keyboard:false,icon:L.divIcon({className:'samar-map-label',html:`<span>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>`,iconSize:[width,LABEL_HEIGHT]})}))
          const marker=markers.get(code)
          if(!layer.hasLayer(marker))layer.addLayer(marker)
        }
      }
      for(const [code,marker] of markers)if(!visible.has(code)&&layer.hasLayer(marker))layer.removeLayer(marker)
    }
    update()
    map.on('zoomend moveend resize',update)
    return ()=>{map.off('zoomend moveend resize',update);layer.remove()}
  },[map,ordered,pinned,minZoom])
  return null
}
