import {ROLES} from '../config/permissions.js'

export const REPORT_STATUS = {
  DRAFT: 'Draft',
  FOR_REVIEW: 'For Review',
  VALIDATED: 'Validated',
  SUBMITTED: 'Submitted to Province',
  APPROVED: 'Approved',
  RETURNED: 'Returned for Correction'
}

// Who may move a report from one status to another.
const TRANSITIONS = {
  DRAFT: {FOR_REVIEW: [ROLES.LGU_ADMIN]},
  FOR_REVIEW: {VALIDATED: [ROLES.LGU_ADMIN], DRAFT: [ROLES.LGU_ADMIN]},
  VALIDATED: {SUBMITTED: [ROLES.LGU_ADMIN], FOR_REVIEW: [ROLES.LGU_ADMIN]},
  SUBMITTED: {APPROVED: [ROLES.PROVINCE_ADMIN], RETURNED: [ROLES.PROVINCE_ADMIN]},
  RETURNED: {DRAFT: [ROLES.LGU_ADMIN]},
  APPROVED: {}
}

export const canTransition = (from, to, role) => (TRANSITIONS[from]?.[to] || []).includes(role)
export const nextStatuses = (from, role) => Object.entries(TRANSITIONS[from] || {}).filter(([, roles]) => roles.includes(role)).map(([to]) => to)

// Once a report is submitted (or approved) the municipality's records for that period are frozen.
export const isLocked = status => status === 'SUBMITTED' || status === 'APPROVED'
// Bills can only be generated once the municipality has validated the period.
export const isBillable = status => ['VALIDATED', 'SUBMITTED', 'APPROVED'].includes(status)

export const currentPeriod = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
export const periodLabel = period => {
  const [year, month] = period.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})
}
export const reportId = (municipality, period) => `${municipality.toLowerCase().replace(/[^a-z]+/g, '-')}-${period}`
export const draftReport = (municipality, period) => ({id: reportId(municipality, period), municipality, period, status: 'DRAFT', history: [], revisions: []})
