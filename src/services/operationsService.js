// Zones, routes, service requests and work orders for a municipality's operations.

export const REQUEST_STATUSES = ['Open', 'In progress', 'Resolved']
export const WORK_STATUSES = ['Scheduled', 'In progress', 'Completed']
export const REQUEST_TYPES = ['No water supply', 'Low pressure', 'Leak reported', 'Meter damaged', 'Meter not reading', 'Billing dispute', 'Other']
export const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent']
export const CREW_OPTIONS = ['Field crew A', 'Field crew B', 'Meter team', 'Pipeline team']

// Sample operations for Catbalogan City so every page has real records on first open.
export const seedOperations = () => ({
  zones: [
    {id: 'z1', municipality: 'Catbalogan City', name: 'Zone 1 · Poblacion', barangays: ['Mercedes', 'Poblacion 1 (Barangay 1)']},
    {id: 'z2', municipality: 'Catbalogan City', name: 'Zone 2 · Canlapwas', barangays: ['Canlapwas (Pob.)']}
  ],
  routes: [
    {id: 'r1', municipality: 'Catbalogan City', name: 'Route A · North', zoneId: 'z1', barangays: ['Mercedes', 'Poblacion 1 (Barangay 1)', 'Canlapwas (Pob.)'], reader: 'J. Castro'}
  ],
  serviceRequests: [
    {id: 'sr1', municipality: 'Catbalogan City', consumerId: 'c2', type: 'No water supply', priority: 'Urgent', status: 'Open', description: 'No water since Monday morning.', at: new Date(Date.now() - 3 * 3600e3).toISOString()},
    {id: 'sr2', municipality: 'Catbalogan City', consumerId: 'c1', type: 'Meter damaged', priority: 'High', status: 'In progress', description: 'Glass cover cracked; reading is unclear.', at: new Date(Date.now() - 26 * 3600e3).toISOString()},
    {id: 'sr3', municipality: 'Catbalogan City', consumerId: 'c3', type: 'Leak reported', priority: 'Normal', status: 'Resolved', description: 'Leak at the gate, repaired.', at: new Date(Date.now() - 96 * 3600e3).toISOString()}
  ],
  workOrders: [
    {id: 'wo1', municipality: 'Catbalogan City', requestId: 'sr2', title: 'Replace damaged meter', crew: 'Meter team', status: 'In progress', due: new Date(Date.now() + 2 * 86400e3).toISOString().slice(0, 10)}
  ]
})

export const emptyOperations = () => ({zones: [], routes: [], serviceRequests: [], workOrders: []})

// Validation. Each returns an error message, or null when valid.
export function validateZone(form, {zones, municipalBarangays}) {
  if (!form.name.trim()) return 'Give the zone a name.'
  if (!form.barangays.length) return 'Choose at least one barangay for the zone.'
  if (form.barangays.some(b => !municipalBarangays.includes(b))) return 'Every barangay must belong to this municipality.'
  const taken = zones.filter(z => z.id !== form.id).flatMap(z => z.barangays)
  const clash = form.barangays.find(b => taken.includes(b))
  if (clash) return `${clash} already belongs to another zone.`
  return null
}

export function validateRoute(form, {routes, zones, municipalBarangays}) {
  if (!form.name.trim()) return 'Give the route a name.'
  if (!form.barangays.length) return 'Choose at least one barangay on the route.'
  if (form.barangays.some(b => !municipalBarangays.includes(b))) return 'Every barangay must belong to this municipality.'
  if (form.zoneId && !zones.some(z => z.id === form.zoneId)) return 'Choose a zone that exists.'
  if (routes.some(r => r.id !== form.id && r.name.trim().toLowerCase() === form.name.trim().toLowerCase())) return `A route named “${form.name.trim()}” already exists.`
  return null
}

export function validateRequest(form, {consumers}) {
  if (!form.consumerId) return 'Choose the consumer account this request is about.'
  if (!consumers.some(c => c.id === form.consumerId)) return 'That consumer account is not in this municipality.'
  if (!form.type) return 'Choose the type of request.'
  if (!form.description.trim()) return 'Describe the problem so the crew knows what to check.'
  return null
}

export function validateWorkOrder(form) {
  if (!form.title.trim()) return 'Give the work order a title.'
  if (!form.crew) return 'Assign a crew.'
  if (!form.due) return 'Choose a due date.'
  return null
}

export const requestBadge = status => status.replace(/\s+/g, '-').toLowerCase()
