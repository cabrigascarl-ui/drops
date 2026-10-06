// Roles and route access. Enforced in the UI layer only; the demo has no server to enforce it.
export const ROLES = {
  CITIZEN: 'CITIZEN',
  METER_READER: 'METER_READER',
  TELLER: 'TELLER',
  LGU_ADMIN: 'LGU_ADMIN',
  PROVINCE_ADMIN: 'PROVINCE_ADMIN'
}

export const ROLE_LABELS = {
  CITIZEN: 'Citizen',
  METER_READER: 'Meter reader',
  TELLER: 'Teller',
  LGU_ADMIN: 'Municipal LGU',
  PROVINCE_ADMIN: 'Province of Samar'
}

// Each self-service portal lives under its own path prefix.
export const PORTAL_PREFIX = {
  CITIZEN: '/citizen',
  METER_READER: '/reader',
  TELLER: '/teller'
}

// Provincial monitoring pages. Everything else is municipal operations and belongs to the LGU.
const PROVINCE_PATHS = ['/', '/service-area', '/monthly-reports', '/reports', '/audit-logs', '/municipalities', '/comparison', '/high-consumption', '/users']
// Province-wide pages the municipal LGU should not open.
const PROVINCE_ONLY = ['/municipalities', '/comparison', '/users']

const inPortal = (prefix, pathname) => pathname === prefix || pathname.startsWith(`${prefix}/`)

export function canAccess(role, pathname) {
  if (role === ROLES.LGU_ADMIN) {
    if (Object.values(PORTAL_PREFIX).some(prefix => inPortal(prefix, pathname))) return false
    return !PROVINCE_ONLY.includes(pathname.split('/').slice(0, 2).join('/'))
  }
  if (role === ROLES.PROVINCE_ADMIN) {
    const base = pathname === '/' ? '/' : `/${pathname.split('/')[1]}`
    return PROVINCE_PATHS.includes(base)
  }
  if (PORTAL_PREFIX[role]) return inPortal(PORTAL_PREFIX[role], pathname)
  return false
}

// Where each role lands after sign-in.
export const homePath = role => PORTAL_PREFIX[role] || '/'

export const canOperate = role => role === ROLES.LGU_ADMIN
export const canReview = role => role === ROLES.PROVINCE_ADMIN
