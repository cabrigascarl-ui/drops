import {ROLES,ROLE_LABELS} from '../config/permissions.js'

export const ROLE_OPTIONS = [ROLES.PROVINCE_ADMIN, ROLES.LGU_ADMIN, ROLES.TELLER, ROLES.METER_READER, ROLES.CITIZEN]
export const needsMunicipality = role => role !== ROLES.PROVINCE_ADMIN
export const emailOk = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

// Checks one account before it is saved. Returns an error message, or null when it is valid.
export function validateUser(form, {users, consumers, editingEmail = null, newPassword = false}) {
  const email = form.email.trim().toLowerCase()
  if (!form.name.trim()) return 'Enter the person’s full name.'
  if (!emailOk(email)) return 'Enter a valid email address.'
  if (users.some(u => u.email === email && u.email !== editingEmail)) return `${email} already has an account.`
  if (!ROLE_OPTIONS.includes(form.role)) return 'Choose a role.'
  if (needsMunicipality(form.role) && !form.municipality) return 'Choose the municipality this account works in.'
  if (newPassword && (form.password || '').length < 8) return 'The password must be at least 8 characters.'
  if (form.role === ROLES.CITIZEN) {
    const consumer = consumers.find(c => c.id === form.consumerId)
    if (!consumer || consumer.locality !== form.municipality) return 'Choose the consumer account this citizen owns, in the same municipality.'
  }
  if (form.role === ROLES.METER_READER) {
    const barangays = new Set(consumers.filter(c => c.locality === form.municipality).map(c => c.barangay))
    if (!form.route?.length) return 'Choose at least one barangay on the reader’s route.'
    if (form.route.some(b => !barangays.has(b))) return 'Every route barangay must be in the selected municipality.'
  }
  return null
}

// Short description of what an account can reach, shown in the Access column.
export function accessText(user) {
  if (user.role === ROLES.PROVINCE_ADMIN) return 'Monitors all municipalities'
  if (user.role === ROLES.LGU_ADMIN) return `Operations · ${user.municipality}`
  if (user.role === ROLES.TELLER) return `Collections · ${user.municipality}`
  if (user.role === ROLES.METER_READER) return `Route · ${(user.route || []).join(', ')}`
  if (user.role === ROLES.CITIZEN) return `Own account · ${user.consumerId}`
  return ''
}

export const roleLabel = role => ROLE_LABELS[role] || role
