import React from 'react'
import {useData} from '../context/DataContext.jsx'
import Dashboard from './Dashboard.jsx'
import ProvinceDashboard from '../portals/province/ProvinceDashboard.jsx'

// The province gets the provincial overview; municipal users keep the operations dashboard.
export default function Home(){
  const {role}=useData()
  return role==='PROVINCE_ADMIN'?<ProvinceDashboard/>:<Dashboard/>
}
