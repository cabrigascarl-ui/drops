import {billReceiptLines} from '../../services/printerService.js'
import {billStatus} from '../../services/billingService.js'

// Everything the bill layout needs for one reading: the customer's rate, unpaid balance, and the district settings.
export function receiptArgsFor(data, session, reading) {
  const consumer = data.consumers.find(c => c.id === reading.consumerId)
  const tariff = data.tariffs.find(t => t.name === consumer?.tier)
  const previousBalance = data.bills
    .filter(b => b.consumerId === consumer?.id && billStatus(b) !== 'Paid')
    .reduce((sum, b) => sum + b.amount, 0)
  const billingMonth = new Date(reading.date + 'T12:00:00').toLocaleString('en-US', {month: 'long', year: 'numeric'}).toUpperCase()
  return {utility: data.settings, consumer, reading, tariff, previousBalance, dueDays: data.settings.dueDays, reader: session?.name || '', billingMonth}
}

// The same bill layout the printer uses, as plain text for the screen.
export const receiptTextFor = (data, session, reading) =>
  billReceiptLines(receiptArgsFor(data, session, reading)).map(line => typeof line === 'string' ? line : line.text).join('\n')
