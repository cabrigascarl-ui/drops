import {consumptionOf} from './billingService.js'

// Sample thresholds only. Administrators change them on the High Consumption page.
export const DEFAULT_THRESHOLDS = {
  Residential: {normalMax: 20, highMax: 30},
  Commercial: {normalMax: 50, highMax: 100},
  Government: {normalMax: 40, highMax: 80},
  Institutional: {normalMax: 40, highMax: 80}
}

export const LEVELS = {
  NORMAL: {label: 'Normal', tone: 'normal'},
  NEAR: {label: 'Near limit', tone: 'near'},
  HIGH: {label: 'High consumption', tone: 'high'},
  CRITICAL: {label: 'Critical', tone: 'critical'}
}

export const thresholdsFor = (thresholds, classification) =>
  thresholds?.[classification] || DEFAULT_THRESHOLDS[classification] || DEFAULT_THRESHOLDS.Residential

// Near limit starts at 80% of the normal ceiling.
export function classify(usage, classification, thresholds) {
  const {normalMax, highMax} = thresholdsFor(thresholds, classification)
  if (usage > highMax) return 'CRITICAL'
  if (usage > normalMax) return 'HIGH'
  if (usage >= Math.floor(normalMax * 0.8)) return 'NEAR'
  return 'NORMAL'
}

export const levelOf = (consumer, thresholds) =>
  classify(consumptionOf(consumer.previous, consumer.current), consumer.type, thresholds)

export function validateThresholds(thresholds) {
  for (const [classification, {normalMax, highMax}] of Object.entries(thresholds)) {
    const low = Number(normalMax), high = Number(highMax)
    if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0) return `${classification}: the normal ceiling must be a number above 0.`
    if (high <= low) return `${classification}: the high ceiling must be greater than the normal ceiling.`
  }
  return null
}
