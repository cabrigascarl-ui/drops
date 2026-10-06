const names = ['Maria L. Reyes','Antonio Dela Cruz','Liza M. Garcia','Pedro Santos','Greg Mendoza','Ana Villanueva','Jose Ramos','Elena Bautista','Carlos Navarro','Grace Aquino','Ramon Flores','Bea Domingo','Rafael Lim','Teresa Cruz','Daniel Valdez','Nina Soriano','Paolo Fernandez','Celia Mercado']
const locations = [
  {locality:'Catbalogan City',barangay:'Mercedes'},
  {locality:'Catbalogan City',barangay:'Poblacion 1 (Barangay 1)'},
  {locality:'Catbalogan City',barangay:'Canlapwas (Pob.)'},
  {locality:'Calbayog City',barangay:'Acedillo'},
  {locality:'Basey',barangay:'Amandayehan'},
  {locality:'Gandara',barangay:'Balocawe'}
]
const dayOffset = days => { const d = new Date(); d.setDate(d.getDate()+days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const currentMonth = new Date().toLocaleString('en-US',{month:'long',year:'numeric'})
export const seedConsumers = names.map((name, i) => ({ id: `c${i+1}`, account: `${i < 2 ? 'A' : i < 4 ? 'B' : 'C'}-2025-${String([124,125,498,499,1021][i] || 1022+i).padStart(5,'0')}`, name, province:'Samar Province', locality:locations[i%6].locality, barangay:locations[i%6].barangay, address: `${18+i*3} ${['Mabini St.','Rizal Ave.','Quezon Road','Barangay Road'][i%4]}`, meter: `MT-${String(20048+i).padStart(6,'0')}`, phone: `09${String(171234500+i*137).slice(0,9)}`, email: `${name.toLowerCase().replace(/[^a-z ]/g,'').replaceAll(' ','.')}@example.com`, type: i===4 || i===13 ? 'Commercial' : i===8 ? 'Government' : 'Residential', tier: i===4 || i===13 ? 'Commercial' : i%5===0 ? 'Lifeline' : 'Standard', previous: 338+i*29, current: 338+i*29+[18,25,12,8,42,14,21,19,31,9,16,28,23,35,11,17,26,13][i], status: i===16 ? 'Inactive' : 'Active', limit: 30, warning: 24, alerts: { lowUsage:true, billReady:true, usageLimit:true } }))
export const seedTariffs = [
  { id:'t1', name:'Lifeline', category:'Low-income residential', rate:12, minimum:0, status:'Active', effective:'2025-01-01' },
  { id:'t2', name:'Standard', category:'Domestic consumers', rate:25, minimum:0, status:'Active', effective:'2025-01-01' },
  { id:'t3', name:'Commercial', category:'Businesses / high-volume', rate:48, minimum:0, status:'Active', effective:'2025-01-01' }
]
export const seedReadings = seedConsumers.slice(0,12).map((c,i)=>({id:`r${i+1}`, consumerId:c.id, previous:c.previous, current:c.current, date:dayOffset(-i), reader:['J. Castro','M. Torres','A. Cruz'][i%3], sync:i===6?'Pending Sync':'Synced'}))
export const seedBills = seedConsumers.slice(0,14).map((c,i)=>({id:`b${i+1}`, number:`BIL-${new Date().getFullYear()}-${String(2401+i)}`,consumerId:c.id,month:currentMonth,previous:c.previous,current:c.current,amount:Math.max(0,c.current-c.previous)*(c.tier==='Lifeline'?12:c.tier==='Commercial'?48:25),dueDate:dayOffset(i===4?-4:9+i),status:[0,2,3,5,7,10].includes(i)?'Paid':'Unpaid'}))
export const seedPayments = [0,2,3,5,7,10].map((i,j)=>({id:`p${j+1}`,receipt:`REC-${new Date().getFullYear()}-${String(8101+j)}`,billId:`b${i+1}`,amount:seedBills[i].amount,method:['Cash','GCash','Maya','Bank Transfer'][j%4],date:dayOffset(-j),collector:'Maria Santos',status:'Completed'}))
export const seedAlerts = [
  {id:'a1',type:'High Usage',consumerId:'c5',message:'Consumption reached 42 m³, above the monthly limit.',date:dayOffset(0),channel:'Both',status:'Sent'},
  {id:'a2',type:'Bill Generated',consumerId:'c2',message:'Your water bill is ready to view.',date:dayOffset(-1),channel:'SMS',status:'Sent'},
  {id:'a3',type:'Payment Received',consumerId:'c1',message:'Your payment was received. Thank you!',date:dayOffset(-2),channel:'App',status:'Sent'},
  {id:'a4',type:'Payment Due',consumerId:'c9',message:'Your water bill is due soon.',date:dayOffset(-3),channel:'Both',status:'Scheduled'},
  {id:'a5',type:'Consumption Warning',consumerId:'c8',message:'Consumption has reached your warning point.',date:dayOffset(-4),channel:'App',status:'Sent'}
]
export const seedSettings = { utilityName:'Provincial Water District', utilityAddress:'Catbalogan City, Samar', contact:'(053) 321-1234', billingDay:'1', dueDays:'15', currency:'PHP', lowUsage:true, billReady:true, usageLimit:true, sms:true, app:true, cash:true, gcash:true, maya:true, bank:true }

// Reports at different stages so every workflow state is visible in the demo.
const monthsAgoIso = (days) => new Date(Date.now() - days * 86400000).toISOString()
const reportSeed = (municipality, period, status, history = []) => ({id:`${municipality.toLowerCase().replace(/[^a-z]+/g,'-')}-${period}`, municipality, period, status, history, revisions:[]})
export const seedReports = [
  reportSeed('Catbalogan City', '2026-09', 'APPROVED', [{at:monthsAgoIso(24),by:'Elena Bautista',role:'LGU_ADMIN',from:'DRAFT',to:'FOR_REVIEW',remarks:''},{at:monthsAgoIso(22),by:'Elena Bautista',role:'LGU_ADMIN',from:'FOR_REVIEW',to:'VALIDATED',remarks:''},{at:monthsAgoIso(21),by:'Elena Bautista',role:'LGU_ADMIN',from:'VALIDATED',to:'SUBMITTED',remarks:''},{at:monthsAgoIso(18),by:'Maria Santos',role:'PROVINCE_ADMIN',from:'SUBMITTED',to:'APPROVED',remarks:'Complete. Thank you.'}]),
  reportSeed('Basey', '2026-10', 'SUBMITTED', [{at:monthsAgoIso(2),by:'Basey LGU',role:'LGU_ADMIN',from:'VALIDATED',to:'SUBMITTED',remarks:''}]),
  reportSeed('Calbayog City', '2026-10', 'FOR_REVIEW', [{at:monthsAgoIso(1),by:'Calbayog LGU',role:'LGU_ADMIN',from:'DRAFT',to:'FOR_REVIEW',remarks:''}])
]
export const seedAudit = [
  {id:'au1',at:monthsAgo(3),user:'Elena Bautista',role:'LGU_ADMIN',municipality:'Catbalogan City',action:'Report Approved',oldValue:'SUBMITTED',newValue:'APPROVED'},
  {id:'au2',at:monthsAgo(4),user:'Elena Bautista',role:'LGU_ADMIN',municipality:'Catbalogan City',action:'Report Submitted',oldValue:'VALIDATED',newValue:'SUBMITTED'},
  {id:'au3',at:monthsAgo(5),user:'Elena Bautista',role:'LGU_ADMIN',municipality:'Catbalogan City',action:'Tariff Changed',oldValue:'Standard ₱24.00 / m³',newValue:'Standard ₱25.00 / m³'},
  {id:'au4',at:monthsAgo(6),user:'Basey LGU',role:'LGU_ADMIN',municipality:'Basey',action:'Report Submitted',oldValue:'VALIDATED',newValue:'SUBMITTED'},
  {id:'au5',at:monthsAgo(7),user:'Calbayog LGU',role:'LGU_ADMIN',municipality:'Calbayog City',action:'Consumer Classification Changed',oldValue:'Residential',newValue:'Commercial'}
]
function monthsAgo(days){return new Date(Date.now()-days*86400000).toISOString()}
