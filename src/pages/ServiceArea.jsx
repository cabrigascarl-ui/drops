import React from 'react'
import {useNavigate} from 'react-router-dom'
import {ArrowLeft,MapPinned,Layers3,Landmark,Info} from 'lucide-react'
import SamarCoverageMap from '../components/SamarCoverageMap.jsx'
import {PageHeader,Card,CardHead} from '../components/UI.jsx'

export default function ServiceArea(){
  const navigate=useNavigate()
  return <>
    <button className="back-link" onClick={()=>navigate('/')}><ArrowLeft size={16}/> Back to dashboard</button>
    <PageHeader eyebrow="SAMAR ISLAND · DISTRICT COVERAGE" title="Service area" description="Explore every city, municipality, and barangay across Samar, Northern Samar, and Eastern Samar."/>
    <div className="page-kpis"><div><span>Provinces</span><strong>3</strong></div><div><span>Cities & municipalities</span><strong>73</strong></div><div><span>Barangays mapped</span><strong>2,117</strong></div></div>
    <Card className="samar-map-card"><CardHead title="Barangay coverage map" subtitle="Select a province or locality, or click the map to explore its barangays" action={<span className="map-data-badge"><MapPinned size={15}/> Island-wide view</span>}/><SamarCoverageMap/></Card>
    <div className="map-source-note"><Info size={16}/><p>Administrative boundaries come from PSA/NAMRIA-derived GeoJSON. Colored coverage statuses are demo scenarios until verified LGU water service data is connected.</p></div>
  </>
}
