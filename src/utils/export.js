const cell = value => `"${String(value ?? '').replaceAll('"', '""')}"`

// Downloads rows as a CSV file that opens cleanly in Excel (UTF-8 with a byte-order mark).
export function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], {type: 'text/csv;charset=utf-8'}))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const printPage = () => window.print()
