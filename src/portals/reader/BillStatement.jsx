import React from 'react'
import {statementFigures,statementStamp} from '../../services/printerService.js'
import {receiptArgsFor} from './receiptPreview.js'

const money = n => Number(n || 0).toFixed(2)

// Statement of account for one reading, laid out like the printed bill. Figures come from the same helper the printer uses.
export default function BillStatement({data, session, reading}) {
  const {consumer, tariff, previousBalance, dueDays, reader, billingMonth} = receiptArgsFor(data, session, reading)
  const f = statementFigures({reading, tariff, previousBalance, dueDays})
  const time = new Date().toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', second: '2-digit'})
  const notice = 'Please disregard prior months charges if you have already paid the same. Kindly bring this copy with you when making payments. A surcharge of 10% will be added to your outstanding account if paid beyond due date. This likewise serves as your Notice of Disconnection if payment is not made after fifteen (15) days from due date. THANKS'

  return <div className="statement">
    <p className="statement-center small">Republic of the Philippines</p>
    <p className="statement-center">{data.settings.utilityAddress || `${consumer?.locality}, Samar`}</p>
    <h2 className="statement-center title">STATEMENT OF ACCOUNT</h2>

    <div className="statement-block">
      <div><span>Accnt No.</span><b>{consumer?.account}</b></div>
      <div><span>Name</span><b>{String(consumer?.name || '').toUpperCase()}</b></div>
      <div><span>Address</span><b>Brgy. {String(consumer?.barangay || '').replace(/\s*\(.*\)$/, '')}</b></div>
      <div><span>Rate Cls</span><b>{String(consumer?.type || 'Residential')}</b></div>
      <div><span>Meter No</span><b>{consumer?.meter}</b></div>
    </div>

    <div className="statement-block">
      <div><span>Billing</span><b>{billingMonth}</b></div>
      <div><span>Prev Rdg date</span><b>{statementStamp(f.prevDate)}</b></div>
      <div><span>Prev Rdg</span><b>{f.previous}</b></div>
      <div><span>Date Rdg</span><b>{statementStamp(f.readDate)}</b></div>
      <div><span>Pres Rdg</span><b>{f.current}</b></div>
      <div><span>Cons CUM</span><b>{f.consumption}</b></div>
    </div>

    <div className="statement-block">
      <div><span>Curr Bill Chg</span><b>{money(f.charge)}</b></div>
      <div><span>Pay on or before</span><b>{statementStamp(f.due)}</b></div>
      <div><span>Bal prev. bill</span><b>{money(previousBalance)}</b></div>
    </div>
    <div className="statement-total"><span>TOTAL BILL:</span><b>{money(f.total)}</b></div>

    <div className="statement-block">
      <p className="statement-label">After Due Date</p>
      <div><span>Penalty(10%)</span><b>Php {money(f.penalty)}</b></div>
      <div><span>Total After</span><b>Php {money(f.totalAfter)}</b></div>
    </div>

    <div className="statement-total"><span>OTHER BALANCES</span><b>0.00</b></div>
    <p className="statement-note">(Inst Fee, Materials, Labor)</p>

    <div className="statement-block">
      <div><span>Meter Reader</span><b>{String(reader || '').toUpperCase()}</b></div>
      <div><span>Rdg date</span><b>{statementStamp(f.readDate).split(' ')[0]}</b></div>
      <div><span>Rdg time</span><b>{time}</b></div>
    </div>
    <p className="statement-note">{notice}</p>
  </div>
}
