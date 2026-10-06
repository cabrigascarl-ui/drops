// Every important change writes one entry here. Entries are append-only.
export const auditEntry = ({user, role, municipality, action, oldValue = '', newValue = ''}) => ({
  id: globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  at: new Date().toISOString(),
  user,
  role,
  municipality,
  action,
  oldValue: String(oldValue ?? ''),
  newValue: String(newValue ?? '')
})
