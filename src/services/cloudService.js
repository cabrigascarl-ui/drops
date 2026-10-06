// Cloud copy of the workspace in Firebase Realtime Database. Local storage stays the fast cache;
// this mirrors every save so the data survives a browser reset and can follow the user across devices.
import {initializeApp} from 'firebase/app'
import {getDatabase, ref, get, set} from 'firebase/database'
import {getAuth, signInAnonymously} from 'firebase/auth'

// Public web-app configuration (safe to ship; access is controlled by the database rules).
const config = {
  apiKey: 'AIzaSyDix2ga2XFkYRvF3VdTGnyDNUPUENXyfTc',
  authDomain: 'drops-bba1a.firebaseapp.com',
  databaseURL: 'https://drops-bba1a-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'drops-bba1a',
  storageBucket: 'drops-bba1a.firebasestorage.app',
  messagingSenderId: '72686747891',
  appId: '1:72686747891:web:c139a8033396a7be773786'
}
const PATH = 'drops/workspace'
const ANONYMOUS_AUTH = true

let db = null
let ready = null
try {
  const app = initializeApp(config)
  db = getDatabase(app)
  // Anonymous sign-in is switched on once the Anonymous provider is enabled in the Firebase console.
  // Until then the app writes without signing in, and the database rules decide what is allowed.
  ready = ANONYMOUS_AUTH ? signInAnonymously(getAuth(app)).catch(() => null) : Promise.resolve(null)
} catch {
  db = null
}

let timer = null
let pending = null

// Writes the latest snapshot, at most once per second.
export function cloudSave(payload) {
  if (!db) return
  pending = JSON.parse(JSON.stringify(payload))
  clearTimeout(timer)
  timer = setTimeout(async () => {
    await ready
    set(ref(db, PATH), pending).catch(() => {})
  }, 1000)
}

// Reads the saved workspace, or null when there is none or the database is unreachable.
export async function cloudLoad() {
  if (!db) return null
  try {
    await ready
    const snapshot = await get(ref(db, PATH))
    return snapshot.exists() ? snapshot.val() : null
  } catch {
    return null
  }
}
