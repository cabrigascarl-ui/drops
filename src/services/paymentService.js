// Payment gateway layer. This is a SANDBOX prototype: no money moves and no provider is contacted.
// To go live, replace the sandbox calls below with a real provider's server-side API (for example a
// hosted checkout session plus a webhook that confirms payment). The UI and the ledger stay the same.

export const PAYMENT_METHODS = [
  {id: 'GCash', kind: 'ewallet', label: 'GCash', mark: 'G', logo: '/logos/gcash.png', tone: 'gcash', hint: 'Pay from your GCash wallet'},
  {id: 'Maya', kind: 'ewallet', label: 'Maya', mark: 'M', logo: '/logos/paymaya-logo.jpg', tone: 'maya', hint: 'Pay from your Maya account'},
  {id: 'Bank Transfer', kind: 'bank', label: 'Bank transfer', mark: 'B', logo: '/logos/visa-mastercard.jpg', tone: 'bank', hint: 'Transfer from your bank app'}
]

export const SANDBOX_OTP = '123456'

export const isMobileNumber = value => /^09\d{9}$/.test(String(value || '').replace(/[\s-]/g, ''))
export const normalizeMobile = value => String(value || '').replace(/[\s-]/g, '')

// Starts a checkout. Returns a session the UI can follow until it is confirmed.
export function createCheckout({method, amount, reference, mobile = '', accountName = ''}) {
  const id = `SBX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  return {id, method, amount, reference, mobile: normalizeMobile(mobile), accountName, status: 'requires_otp', sandbox: true, createdAt: new Date().toISOString()}
}

// Confirms the one-time code. In the sandbox the code is SANDBOX_OTP.
export function confirmCheckout(session, code) {
  if (String(code).trim() !== SANDBOX_OTP) return {...session, status: 'failed', error: 'The code is incorrect. In the sandbox, use ' + SANDBOX_OTP + '.'}
  return {...session, status: 'succeeded', paidAt: new Date().toISOString()}
}
