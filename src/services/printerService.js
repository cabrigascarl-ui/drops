// Bluetooth thermal printing over Web Bluetooth (Bluetooth Low Energy printers, ESC/POS commands).
// Works in Chrome and Edge on desktop and Android, on localhost or HTTPS. Classic Bluetooth (SPP)
// printers cannot be reached from a browser; those need the native app.

import {calculateBill} from './billingService.js'

// Services that common BLE thermal printers expose. The first writable characteristic found is used.
export const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455'
]

export const bluetoothSupported = () => typeof navigator !== 'undefined' && !!navigator.bluetooth && window.isSecureContext

// ---- ESC/POS receipt encoding (pure, testable) ----
const ESC = 0x1b, GS = 0x1d, LF = 0x0a
const ascii = text => Array.from(String(text ?? ''), ch => (ch.charCodeAt(0) < 128 ? ch.charCodeAt(0) : 0x3f))
const line = text => [...ascii(text), LF]

// Turns a list of receipt lines into printer bytes. Each item is {text, align?, bold?} or a plain string.
export function encodeReceipt(items) {
  const bytes = [ESC, 0x40] // initialize
  for (const item of items) {
    const {text = '', align = 'left', bold = false} = typeof item === 'string' ? {text: item} : item
    bytes.push(ESC, 0x61, align === 'center' ? 1 : align === 'right' ? 2 : 0) // justification
    bytes.push(ESC, 0x45, bold ? 1 : 0) // bold on/off
    bytes.push(...line(text))
  }
  bytes.push(ESC, 0x61, 0, ESC, 0x45, 0, LF, LF, LF, GS, 0x56, 66, 0) // reset, feed, partial cut
  return new Uint8Array(bytes)
}

// The statement figures for one reading. The printed statement and the on-screen preview both use these.
export function statementFigures({reading, tariff, previousBalance = 0, dueDays = 15}) {
  const previous = Number(reading.previous)
  const current = Number(reading.current)
  const charge = tariff ? Number(calculateBill(previous, current, tariff)) || 0 : 0
  const total = charge + Number(previousBalance || 0)
  const penalty = Math.round(total * 0.1 * 100) / 100
  const readDate = new Date(reading.date + 'T12:00:00')
  const prevDate = new Date(readDate)
  prevDate.setMonth(prevDate.getMonth() - 1)
  const due = new Date(readDate)
  due.setDate(due.getDate() + Number(dueDays || 15))
  return {previous, current, consumption: Math.max(0, current - previous), charge, total, penalty, totalAfter: total + penalty, readDate, prevDate, due}
}

// Printer date format used on the statement, e.g. 10/7/2026 0:00:00.
export const statementStamp = date => `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} 0:00:00`

// Wraps a paragraph to the printer width.
const wrap = (text, width) => {
  const words = String(text).split(/\s+/)
  const lines = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > width) { lines.push(current); current = word }
    else current = (current + ' ' + word).trim()
  }
  if (current) lines.push(current)
  return lines
}

// Statement of account in the district's printed layout. Returns plain text lines (32 columns for the printer).
export function billReceiptLines({utility, consumer, reading, tariff, previousBalance = 0, billingMonth, dueDays = 15, reader = ''}) {
  const W = 32
  const rule = '-'.repeat(W)
  const bar = '='.repeat(W)
  const money = n => Number(n || 0).toFixed(2)
  // Label column, then the value. A value too long for the line wraps under itself.
  const pair = (label, value) => {
    const head = `${String(label).padEnd(13)}: `
    const text = String(value)
    if (head.length + text.length <= W) return head + text
    return head + text.slice(0, W - head.length) + '\n' + ' '.repeat(head.length) + text.slice(W - head.length)
  }
  const amount = (label, value) => String(label).padEnd(Math.max(1, W - String(value).length)) + String(value)
  const f = statementFigures({reading, tariff, previousBalance, dueDays})
  const barangay = String(consumer.barangay).replace(/\s*\(.*\)$/, '')
  const notice = 'Please disregard prior months charges if you have already paid the same. Kindly bring this copy with you when making payments. A surcharge of 10% will be added to your outstanding account if paid beyond due date. This likewise serves as your Notice of Disconnection if payment is not made after fifteen (15) days from due date. THANKS'
  return [
    {text: 'Republic of the Philippines', align: 'center'},
    {text: utility?.utilityAddress || `${consumer.locality}, Samar`, align: 'center'},
    {text: 'STATEMENT OF ACCOUNT', align: 'center', bold: true},
    {text: rule},
    pair('Accnt No.', consumer.account),
    pair('Name', String(consumer.name).toUpperCase()),
    pair('Address', `Brgy. ${barangay}`),
    pair('Rate Cls', String(consumer.type || 'Residential')),
    pair('Meter No', consumer.meter),
    {text: rule},
    pair('Billing', billingMonth || reading.date.slice(0, 7)),
    pair('Prev Rdg date', statementStamp(f.prevDate)),
    pair('Prev Rdg', f.previous),
    pair('Date Rdg', statementStamp(f.readDate)),
    pair('Pres Rdg', f.current),
    pair('Cons CUM', f.consumption),
    {text: bar},
    amount('Curr Bill Chg', money(f.charge)),
    ' Pay on or before',
    {text: ` Due date (${statementStamp(f.due)})`, bold: true},
    amount('Bal prev. bill', money(previousBalance)),
    {text: bar},
    {text: amount('TOTAL BILL:', money(f.total)), bold: true},
    {text: bar},
    '',
    'After Due Date',
    amount('Penalty(10%)   :Php', money(f.penalty)),
    amount('Total After    :Php', money(f.totalAfter)),
    {text: bar},
    {text: amount('OTHER BALANCES', '0.00'), bold: true},
    '(Inst Fee, Materials, Labor)',
    {text: bar},
    pair('Meter Reader', String(reader || '').toUpperCase()),
    pair('Rdg date', `${f.readDate.getMonth() + 1}/${f.readDate.getDate()}/${f.readDate.getFullYear()}`),
    pair('Rdg time', new Date().toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', second: '2-digit'})),
    ...wrap(notice, W),
    {text: bar}
  ]
}

// Same receipt, as printer bytes.
export function readingReceipt(args) {
  return encodeReceipt(billReceiptLines(args))
}

export function testPage(organization) {
  return encodeReceipt([
    {text: organization, align: 'center', bold: true},
    {text: 'Printer test page', align: 'center'},
    'Connection OK.',
    `Printed ${new Date().toLocaleString('en-PH')}`
  ])
}

// ---- Device handling ----
let connection = null // {device, characteristic}

export function connectedPrinter() {
  return connection?.device?.gatt?.connected ? connection.device.name || 'Thermal printer' : null
}

export async function scanAndConnect() {
  if (!bluetoothSupported()) throw new Error('Bluetooth printing needs Chrome or Edge on localhost or HTTPS.')
  const device = await navigator.bluetooth.requestDevice({acceptAllDevices: true, optionalServices: PRINTER_SERVICES})
  const server = await device.gatt.connect()
  let characteristic = null
  for (const uuid of PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(uuid)
      const characteristics = await service.getCharacteristics()
      characteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse)
      if (characteristic) break
    } catch { /* service not offered by this printer */ }
  }
  if (!characteristic) {
    server.disconnect()
    throw new Error('This printer does not expose a writable printing service. It may use classic Bluetooth, which needs the native app.')
  }
  device.addEventListener('gattserverdisconnected', () => { connection = null })
  connection = {device, characteristic}
  return device.name || 'Thermal printer'
}

export async function disconnectPrinter() {
  connection?.device?.gatt?.disconnect()
  connection = null
}

// Sends the bytes in small chunks, which BLE printers need.
export async function printBytes(bytes) {
  if (!connection?.device?.gatt?.connected) throw new Error('Connect a printer first.')
  const write = connection.characteristic.properties.writeWithoutResponse
    ? (chunk => connection.characteristic.writeValueWithoutResponse(chunk))
    : (chunk => connection.characteristic.writeValueWithResponse(chunk))
  for (let offset = 0; offset < bytes.length; offset += 100) {
    await write(bytes.slice(offset, offset + 100))
    await new Promise(resolve => setTimeout(resolve, 20))
  }
}
