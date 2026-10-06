export const consumptionOf = (previous, current) => Math.max(0, Number(current) - Number(previous))
export const calculateBill = (previous, current, tariff) => {
  const consumption = consumptionOf(previous, current)
  return Math.max(Number(tariff?.minimum || 0), consumption * Number(tariff?.rate || 0))
}
export const peso = amount => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(amount || 0))
// Date-only strings parse as UTC midnight; pin them to local noon so the calendar day never shifts.
export const formatDate = value => value ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
// Local calendar date (toISOString would shift to UTC and show yesterday before 8 AM in the Philippines).
export const dateISO = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const addDays = (days, date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + Number(days || 0))
export const timeAgo = value => {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 45) return 'Just now'
  const [unit, size] = [['minute', 60], ['hour', 3600], ['day', 86400]].findLast(([, s]) => seconds >= s * .75) || ['minute', 60]
  if (unit === 'day' && seconds > 86400 * 6) return formatDate(value)
  const count = Math.max(1, Math.round(seconds / size))
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`
}
export const activityTime = item => item.at ? timeAgo(item.at) : item.time
export const billStatus = bill => bill.status === 'Paid' ? 'Paid' : new Date(bill.dueDate + 'T23:59:59') < new Date() ? 'Overdue' : 'Unpaid'
