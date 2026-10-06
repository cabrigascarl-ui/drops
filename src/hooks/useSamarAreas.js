import {useEffect,useState} from 'react'

let cachedPromise
const paths=['samar-island-provinces','samar-island-localities','samar-island-barangays']
export function loadSamarAreas(){
  if(!cachedPromise){
    cachedPromise=Promise.all(paths.map(async name=>{
      const response=await fetch(`/data/${name}.geojson`)
      if(!response.ok)throw new Error(`Could not load ${name} boundaries`)
      return response.json()
    })).then(([provinces,localities,barangays])=>({provinces,localities,barangays})).catch(error=>{cachedPromise=null;throw error})
  }
  return cachedPromise
}
export function useSamarAreas(){
  const [state,setState]=useState({areas:null,loading:true,error:null})
  const reload=()=>{setState({areas:null,loading:true,error:null});loadSamarAreas().then(areas=>setState({areas,loading:false,error:null}),error=>setState({areas:null,loading:false,error}))}
  useEffect(()=>{let active=true;loadSamarAreas().then(areas=>active&&setState({areas,loading:false,error:null}),error=>active&&setState({areas:null,loading:false,error}));return()=>{active=false}},[])
  return {...state,reload}
}
