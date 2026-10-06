import React,{useEffect,useRef,useState} from 'react'

// Parses "₱8,672.00", "3,778 m³" or "73" into prefix, number and suffix so only the number animates.
const PATTERN=/^(\D*?)([\d,]+(?:\.\d+)?)(.*)$/

// Counts up from zero to the value, like a rolling counter. Non-numeric values are shown as they are.
export default function AnimatedValue({value,duration=900}){
  const parts=typeof value==='number'?null:String(value).match(PATTERN)
  const target=typeof value==='number'?value:parts?parseFloat(parts[2].replace(/,/g,'')):null
  const decimals=typeof value==='number'?(String(value).split('.')[1]||'').length:(parts?.[2].split('.')[1]||'').length
  const [current,setCurrent]=useState(target===null?0:0)
  const frame=useRef(null)
  useEffect(()=>{
    if(target===null)return undefined
    const reduce=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if(reduce){setCurrent(target);return undefined}
    const start=performance.now()
    const step=now=>{
      const progress=Math.min(1,(now-start)/duration)
      const eased=1-Math.pow(1-progress,3)
      setCurrent(target*eased)
      if(progress<1)frame.current=requestAnimationFrame(step)
    }
    frame.current=requestAnimationFrame(step)
    return ()=>cancelAnimationFrame(frame.current)
  },[target,duration])
  if(target===null)return <>{value}</>
  const formatted=current.toLocaleString('en-PH',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})
  if(typeof value==='number')return <>{formatted}</>
  return <>{parts[1]}{formatted}{parts[3]}</>
}
