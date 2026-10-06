import {ROLES} from '../config/permissions.js'
import {samarLgus} from '../data/samar-lgus.js'
import {storageService} from './storageService.js'

// Client-side demo session. There is no server, so this gates the UI only and is not a security boundary.
const KEY = 'drops-session'

// consumerId ties a citizen to one account; route limits a meter reader to their barangays.
const CORE_ACCOUNTS = [
  {email: 'admin@drops.ph', password: 'drops-demo', name: 'Maria Santos', role: ROLES.PROVINCE_ADMIN, municipality: null, label: 'Province admin', caption: 'Samar Province · monitoring'},
  {email: 'lgu.catbalogan@drops.ph', password: 'drops-demo', name: 'Elena Bautista', role: ROLES.LGU_ADMIN, municipality: 'Catbalogan City', label: 'Catbalogan LGU', caption: 'Catbalogan City · operations'},
  {email: 'teller.catbalogan@drops.ph', password: 'drops-demo', name: 'Grace Aquino', role: ROLES.TELLER, municipality: 'Catbalogan City', label: 'Teller', caption: 'Collections · Catbalogan City'},
  {email: 'reader.catbalogan@drops.ph', password: 'drops-demo', name: 'J. Castro', role: ROLES.METER_READER, municipality: 'Catbalogan City', route: ['Mercedes', 'Poblacion 1 (Barangay 1)', 'Canlapwas (Pob.)'], label: 'Meter reader', caption: 'Route · Mercedes, Poblacion 1, Canlapwas'},
  {email: 'antonio.delacruz@drops.ph', password: 'drops-demo', name: 'Antonio Dela Cruz', role: ROLES.CITIZEN, municipality: 'Catbalogan City', consumerId: 'c2', label: 'Citizen', caption: 'Consumer account · Poblacion 1'}
]

// Every city and municipality on Samar Island gets an LGU account. Catbalogan keeps its core account.
const LGU_ACCOUNTS = samarLgus
  .filter(lgu => !CORE_ACCOUNTS.some(account => account.municipality === lgu.name))
  .map(lgu => ({email: lgu.email, password: 'drops-demo', name: `${lgu.name} LGU Admin`, role: ROLES.LGU_ADMIN, municipality: lgu.name, label: `${lgu.name} LGU`, caption: `${lgu.name} · ${lgu.province}`, generated: true}))

// The demo panel on the login page shows the core roles only.
export const DEMO_ACCOUNTS = [...CORE_ACCOUNTS, ...LGU_ACCOUNTS]

// The starting set of accounts, before any admin changes.
export const baseUsers = () => DEMO_ACCOUNTS.map(account => ({...account, active: true}))

const read = store => {
  try { return JSON.parse(store.getItem(KEY) || 'null') }
  catch { return null }
}

export function getSession() {
  try { return read(sessionStorage) || read(localStorage) }
  catch { return null }
}

// Accounts come from the shared store, so changes made by the province take effect at sign-in.
const accountsNow = () => storageService.load().users || baseUsers()

// Returns the session on success, or null when the credentials do not match an active account.
export function signIn(email, password, remember) {
  const account = accountsNow().find(item => item.email === email.trim().toLowerCase() && item.password === password && item.active !== false)
  if (!account) return null
  const session = {name: account.name, role: account.role, email: account.email, municipality: account.municipality, consumerId: account.consumerId || null, route: account.route || null, signedInAt: new Date().toISOString()}
  try { (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(session)) }
  catch { /* storage blocked: the session lasts for this page load only */ }
  return session
}

export function signOut() {
  try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY) }
  catch { /* nothing to clear */ }
}
