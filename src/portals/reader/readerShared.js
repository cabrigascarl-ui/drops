import {consumptionOf} from '../../services/billingService.js'
import {classify} from '../../services/consumptionService.js'

// Usage under this many cubic metres counts as low consumption.
export const LOW_USAGE = 10

// Column layout of the billing system's reading file (tblmast), used for both download and upload.
export const TBLMAST_COLUMNS = ['AccountID','BillingMonth','PreviousReading','PresentReading','Consumption','ReadingDate','RateCode','WaterCharge','SeniorDiscount','PreviousBalance','Penalty','TotalAmount','DueDate','Reader','CM','CM_Start','CM_End','Status','Printed']

// Rate codes used by the billing system, one per tariff.
export const RATE_CODES = {Lifeline: 11, Standard: 12, Commercial: 13}

// Route order: barangays in the order assigned, then account number.
export function routeOrder(consumers, route = []) {
  return [...consumers].sort((a, b) =>
    (route.indexOf(a.barangay) - route.indexOf(b.barangay)) ||
    String(a.account).localeCompare(String(b.account), undefined, {numeric: true}))
}

export const usageOf = consumer => consumptionOf(consumer.previous, consumer.current)
export const levelOfUsage = (consumer, thresholds) => classify(usageOf(consumer), consumer.type, thresholds)

export const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}
export const todayLabel = () => new Date().toLocaleDateString('en-PH', {weekday: 'long', month: 'long', day: 'numeric'})
export const timeLabel = () => new Date().toLocaleTimeString('en-PH', {hour: 'numeric', minute: '2-digit'})

// First name for greetings; skips initials, so 'J. Castro' greets as 'Castro'.
export const displayName = name => {
  const parts = (name || '').split(' ').filter(part => part.length > 1 && !part.endsWith('.'))
  return parts[0] || name || ''
}

// Splits one CSV line, respecting quoted fields.
function splitCsv(line, delimiter) {
  const cells = []
  let cell = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (ch === delimiter && !quoted) { cells.push(cell.trim()); cell = '' }
    else cell += ch
  }
  cells.push(cell.trim())
  return cells
}

// Reads a reading file. Accepts the billing system's CSV (tblmast columns, matched by name), TXT with
// a header, or JSON. Each row needs an AccountID and a PresentReading.
export function parseReadingFile(text, filename = '') {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (filename.toLowerCase().endsWith('.json') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed).map(row => ({
      account: String(row.AccountID ?? row.account ?? '').trim(),
      current: row.PresentReading ?? row.current,
      date: row.ReadingDate || row.date || ''
    }))
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean)
  // Billing master file (Tblmast.txt): pipe-separated, no header, positional columns.
  // 0 AccountID · 1 zone code · 2 old account · 3 name · 4 barangay · 5 meter · 7 reading date
  // 8 previous reading · 9 consumption · 10 previous balance · 11 due date
  if (lines[0].includes('|') && lines[0].split('|').length >= 12 && !/^[a-z]/i.test(lines[0].split('|')[0].trim())) {
    return lines.map(line => {
      const cols = line.split('|').map(cell => cell.trim())
      const previous = Number(cols[8])
      const consumption = Number(cols[9])
      return {
        account: cols[0] || '',
        name: cols[3] || '',
        barangay: (cols[4] || '').replace(/^Brgy\.?,?\s*/i, '').trim(),
        meter: cols[5] || '',
        previous: Number.isFinite(previous) ? previous : undefined,
        consumption: Number.isFinite(consumption) ? consumption : undefined,
        current: Number.isFinite(previous) && Number.isFinite(consumption) ? previous + consumption : undefined,
        date: (cols[7] || '').split(' ')[0] ? new Date(cols[7].split(' ')[0]).toISOString().slice(0, 10) : ''
      }
    }).filter(row => row.account)
  }
  const delimiter = lines[0].includes('|') ? '|' : lines[0].includes('\t') ? '\t' : ','
  const rows = lines.map(line => splitCsv(line, delimiter))
  const header = rows[0].map(cell => cell.toLowerCase())
  const find = (...names) => header.findIndex(cell => names.includes(cell))
  const hasHeader = find('accountid', 'account') >= 0
  if (!hasHeader) {
    // Headerless: account, current reading, optional date
    return rows.map(cols => ({account: cols[0] || '', current: cols[1], date: cols[2] || ''})).filter(row => row.account)
  }
  const col = {
    account: find('accountid', 'account'),
    current: find('presentreading', 'current', 'current reading'),
    date: find('readingdate', 'date', 'reading date')
  }
  if (col.current < 0) throw new Error('No PresentReading column')
  return rows.slice(1)
    .map(cols => ({account: cols[col.account] || '', current: cols[col.current], date: col.date >= 0 ? cols[col.date] || '' : ''}))
    .filter(row => row.account)
}
