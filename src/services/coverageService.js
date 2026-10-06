export const coverageMeta={
  normal:{label:'Normal',color:'#27b991',light:'#ddf7ed'},
  low:{label:'Low supply',color:'#eebd36',light:'#fff4cf'},
  severe:{label:'Severe',color:'#ef873d',light:'#fff0df'},
  critical:{label:'Critical',color:'#e64a5d',light:'#ffe1e6'},
  none:{label:'No data',color:'#a7b7c8',light:'#eef2f6'}
}
export const coverageKeys=Object.keys(coverageMeta)
// Deterministic color assignment for the demo. No real utility readings are implied.
export function demoCoverageStatus(code){
  // Match the reference's Catbalogan example while keeping the entire layer illustrative.
  if(code==='0806005000')return 'normal' // Catbalogan City, the LGU's own municipality (was falling into "No data")
  if(code==='0806012000')return 'normal' // Motiong (was falling into "No data")
  if(code==='0806017000')return 'normal' // Santa Rita (was falling into "No data")
  if(code==='0806005027')return 'critical' // Mercedes
  if(code==='0806005014')return 'low' // Canlapwas
  if(code==='0806005051')return 'severe' // San Andres
  if(code==='0806005026')return 'none' // Maulong
  if(Number(code)>=806005034&&Number(code)<=806005047)return 'normal' // Poblacion 1–14
  const digits=String(code).split('').reduce((sum,digit,index)=>sum+Number(digit)*(index+7),0)
  const value=(digits*37+Number(String(code).slice(-3))*13)%100
  if(value<42)return 'normal'
  if(value<64)return 'low'
  if(value<77)return 'severe'
  if(value<87)return 'critical'
  return 'none'
}
export const coverageStatus=(code,overrides={})=>overrides[code]||demoCoverageStatus(code)
export function demoCoveragePercent(code,status){
  if(code==='0806005027'&&status==='critical')return 20
  if(status==='none')return null
  const value=Number(String(code).slice(-3))
  const ranges={normal:[78,20],low:[51,24],severe:[29,22],critical:[8,18]}
  const [start,spread]=ranges[status]
  return start+(value*7)%spread
}
