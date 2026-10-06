import {consumptionOf} from './billingService.js'
import {levelOf} from './consumptionService.js'
import {currentPeriod} from './reportService.js'

// Colors for the province map and legend, one per report status.
export const STATUS_COLORS = {
  NOT_STARTED: '#c9d6e2',
  DRAFT: '#9fb3c8',
  FOR_REVIEW: '#0876e6',
  VALIDATED: '#0da7a5',
  SUBMITTED: '#7c5cfc',
  APPROVED: '#10b981',
  RETURNED: '#ef4444'
}

export const STATUS_LABELS = {
  NOT_STARTED: 'Not started',
  DRAFT: 'Draft',
  FOR_REVIEW: 'For review',
  VALIDATED: 'Validated',
  SUBMITTED: 'Submitted to Province',
  APPROVED: 'Approved',
  RETURNED: 'Returned for correction'
}

const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0)

// Everything the province needs about one municipality for one reporting period.
export function municipalityStats(store, municipality, period = currentPeriod()) {
  const thresholds = store.settings.thresholds
  const consumers = store.consumers.filter(c => c.locality === municipality)
  const ids = new Set(consumers.map(c => c.id))
  const bills = store.bills.filter(b => ids.has(b.consumerId))
  const billIds = new Set(bills.map(b => b.id))
  const payments = store.payments.filter(p => billIds.has(p.billId))
  const flagged = consumers.filter(c => ['HIGH', 'CRITICAL'].includes(levelOf(c, thresholds)))
  const billing = sum(bills, b => b.amount)
  const collections = sum(payments, p => p.amount)
  const report = store.reports.find(r => r.municipality === municipality && r.period === period) || null
  return {
    municipality,
    period,
    consumers: consumers.length,
    consumption: sum(consumers, c => consumptionOf(c.previous, c.current)),
    billing,
    collections,
    outstanding: sum(bills.filter(b => b.status !== 'Paid'), b => b.amount),
    high: flagged.length,
    critical: consumers.filter(c => levelOf(c, thresholds) === 'CRITICAL').length,
    low: consumers.filter(c => consumptionOf(c.previous, c.current) < 10).length,
    reviewed: flagged.filter(c => c.reviewedPeriod === period).length,
    flagged,
    efficiency: billing ? Math.round(collections / billing * 100) : null,
    report,
    status: report?.status || 'NOT_STARTED'
  }
}

// The numbers saved when a report is submitted, so trends can be drawn later.
export function snapshotOf(stats) {
  return {
    at: new Date().toISOString(),
    consumers: stats.consumers,
    consumption: stats.consumption,
    billing: stats.billing,
    collections: stats.collections,
    outstanding: stats.outstanding,
    high: stats.high,
    critical: stats.critical,
    efficiency: stats.efficiency
  }
}

// Every municipality the province knows about: those with consumers or reports.
export function allMunicipalities(store) {
  return [...new Set([...store.consumers.map(c => c.locality), ...store.reports.map(r => r.municipality)].filter(Boolean))].sort()
}

export function provinceTotals(store, period = currentPeriod()) {
  const stats = allMunicipalities(store).map(name => municipalityStats(store, name, period))
  const rated = stats.filter(s => s.efficiency !== null)
  return {
    stats,
    connected: stats.length,
    submitted: stats.filter(s => ['SUBMITTED', 'APPROVED'].includes(s.status)).length,
    pending: stats.filter(s => s.status === 'SUBMITTED').length,
    consumers: sum(stats, s => s.consumers),
    consumption: sum(stats, s => s.consumption),
    billing: sum(stats, s => s.billing),
    collections: sum(stats, s => s.collections),
    outstanding: sum(stats, s => s.outstanding),
    high: sum(stats, s => s.high),
    critical: sum(stats, s => s.critical),
    low: sum(stats, s => s.low),
    averageEfficiency: rated.length ? Math.round(sum(rated, s => s.efficiency) / rated.length) : null
  }
}

// Submitted reports waiting for the province, oldest first.
export function waitingReports(store) {
  return store.reports
    .filter(r => r.status === 'SUBMITTED')
    .map(r => ({...r, waitingSince: [...r.history].reverse().find(h => h.to === 'SUBMITTED')?.at || null}))
    .sort((a, b) => (a.waitingSince || '').localeCompare(b.waitingSince || ''))
}

// Province-wide consumption by period, from the snapshots saved at submission.
export function consumptionTrend(store) {
  const byPeriod = {}
  for (const report of store.reports) {
    if (!report.snapshot) continue
    byPeriod[report.period] = (byPeriod[report.period] || 0) + report.snapshot.consumption
  }
  return Object.entries(byPeriod).sort(([a], [b]) => a.localeCompare(b)).map(([period, consumption]) => ({period, consumption}))
}
