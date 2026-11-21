// Check each generated RIC's disclosure box against the right arithmetic.
//   node tests/_ric-fin-check.mjs <results.json>   (helper for test-ric-financing.mjs; not a suite)
import fs from 'fs';
const R = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const num = s => { const t = String(s ?? '').replace(/[$,\s]/g, ''); const neg = /^\(.*\)$/.test(t); const x = parseFloat(t.replace(/[()]/g, '')); return isNaN(x) ? 0 : (neg ? -x : x); };
const r2 = x => Math.round((x + 1e-9) * 100) / 100;
const finMonthly = (b, n, a) => a === 0 ? b / n : b * (a / 12) * Math.pow(1 + a / 12, n) / (Math.pow(1 + a / 12, n) - 1);
const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
// Reg Z (Appendix J) APR: unit period = month, odd first period in fractional months (days/30)
function apr(amount, pmts, t1) {
  let lo = 0, hi = 1;
  const pv = i => pmts.reduce((s, p, k) => s + p / Math.pow(1 + i, t1 + k), 0);
  for (let it = 0; it < 200; it++) { const mid = (lo + hi) / 2; if (pv(mid) > amount) lo = mid; else hi = mid; }
  return (lo + hi) / 2 * 12 * 100;
}
const rows = [];
for (const { c, setup, pdf, errs } of R) {
  const p = []; const note = [];
  if (setup.error || pdf.error) { rows.push([c.id, 'ERROR ' + (setup.error || pdf.error)]); continue; }
  const v = k => num(pdf[k]);
  const total = setup.total, tab = setup.tab;
  const down = num(tab.down), n = parseInt(tab.months) || 0, rate = parseFloat(tab.rate) || 0;
  const financed = n > 0 && r2(total - down) > 0;
  if (Math.abs(v('TotalCP') - total) > 0.005) p.push(`TotalCP ${pdf.TotalCP} != quote ${total}`);
  if (Math.abs(v('DPAmount') + v('UnpaidBalance') - v('TotalCP')) > 0.005) p.push(`(a)-(b) off: ${pdf.TotalCP} - ${pdf.DPAmount} != ${pdf.UnpaidBalance}`);
  if (Math.abs(v('UnpaidBalance') + v('FCAmount') - v('TotalPayments')) > 0.005) p.push(`(c)+(d) != (e): ${pdf.UnpaidBalance} + ${pdf.FCAmount} != ${pdf.TotalPayments}`);
  if (Math.abs(v('TotalCP') + v('FCAmount') - v('Total Sales Price')) > 0.005) p.push(`(a)+(d) != (f): ${pdf.TotalCP} + ${pdf.FCAmount} != ${pdf['Total Sales Price']}`);
  for (const [a, b] of [['FCAmount', 'FCAmount_TIL'], ['UnpaidBalance', 'UnpaidBalance_TIL'], ['TotalPayments', 'TotalPayments_TIL'], ['Total Sales Price', 'TotalSalesPrice_TIL']])
    if (Math.abs(v(a) - v(b)) > 0.005) p.push(`${b} ${pdf[b]} != ${a} ${pdf[a]}`);
  // the rate box
  const rateBox = String(pdf['Finance Charge']);
  if (financed && Math.abs(parseFloat(rateBox) - rate) > 0.0001) p.push(`rate box "${rateBox}" but plan is ${rate}%`);
  if (financed) {
    const unpaid = r2(total - down), mo = r2(finMonthly(unpaid, n, rate / 100));
    if (Math.abs(v('UnpaidBalance') - unpaid) > 0.005) p.push(`amount financed ${pdf.UnpaidBalance} != ${unpaid}`);
    if (String(pdf.Terms) !== String(n)) p.push(`Terms "${pdf.Terms}" != ${n}`);
    if (Math.abs(v('PaymentAmount1') - mo) > 0.005) p.push(`payment ${pdf.PaymentAmount1} != ${mo}`);
    const tpQuote = rate === 0 ? unpaid : r2(finMonthly(unpaid, n, rate / 100) * n);   // quote page / fillable form
    const tpRounded = rate === 0 ? unpaid : r2(mo * n);
    // Accounting's FINANCING CALCULATOR.xlsx: finance charge = exact payment x months - amount financed
    if (Math.abs(v('TotalPayments') - tpQuote) > 0.005) p.push(`TP ${pdf.TotalPayments} != Accounting's calculator ${tpQuote.toFixed(2)} (rounded-payment x n = ${tpRounded.toFixed(2)})`);
    const sched = r2(v('PaymentAmount1') * n);
    if (Math.abs(sched - v('TotalPayments')) > 0.005) note.push(`schedule ${n} x ${pdf.PaymentAmount1} = ${sched.toFixed(2)} vs TP ${pdf.TotalPayments} (${(sched - v('TotalPayments')).toFixed(2)})`);
    // first payment: a 10/20/25 day, after the contract date
    const fp = String(pdf['Date of First Payment']); const m = fp.match(/^(\w+)\s+(\d+),?\s+(\d{4})$/);
    const cd = new Date((c.now || '2026-11-20') + 'T12:00:00');
    if (!m) p.push(`first payment "${fp}" unreadable`);
    else {
      const d = new Date(+m[3], MON.indexOf(m[1]), +m[2], 12);
      if (![10, 20, 25].includes(+m[2])) p.push(`first payment day ${m[2]} not 10/20/25`);
      const days = Math.round((d - cd) / 864e5);
      const monthsOut = (d.getFullYear() - cd.getFullYear()) * 12 + d.getMonth() - cd.getMonth();
      note.push(`1st pmt ${fp} (${days} days, ${monthsOut} cal. months after ${c.now || '2026-11-20'})`);
      if (rate > 0) {
        const pm = Array(n).fill(v('PaymentAmount1')); pm[n - 1] = r2(v('TotalPayments') - v('PaymentAmount1') * (n - 1));
        const a = apr(v('UnpaidBalance'), pm, days / 30);
        const a1 = apr(v('UnpaidBalance'), pm, 1);
        note.push(`Reg Z APR ${a.toFixed(3)}% with this first date (${a1.toFixed(3)}% with a 1-month first period)`);
        if (Math.abs(a - rate) > 0.125) p.push(`APR ${rate}% printed, true APR ${a.toFixed(3)}% (> 1/8 pt off, Reg Z tolerance)`);
      }
    }
    if (pdf.Cash !== (rate === 0 ? 'ACH' : pdf.Cash)) p.push(`0% plan method ${pdf.Cash}, expected ACH`);
  } else {
    if (v('FCAmount') !== 0) p.push(`not financed but FC ${pdf.FCAmount}`);
    if (pdf.Terms) p.push(`not financed but Terms "${pdf.Terms}"`);
    if (pdf.Cash === 'ACH') p.push('not financed but method ACH');
  }
  const rem = ['Notes 5', 'Notes 6', 'Notes 7', 'Notes 8', 'Notes 9'].map(k => pdf[k]).join(' ');
  const achLine = /ACH bank withdrawals/.test(rem), discLine = R.length && /disc/.test(c.q);
  const wantAch = (financed && rate === 0) || discLine;
  if (achLine !== wantAch) p.push(`ACH remark ${achLine ? 'printed' : 'missing'} (0% plan: ${financed && rate === 0}, discount: ${discLine})`);
  if (errs.length) p.push('page: ' + errs.join(' | '));
  rows.push([c.id, `tab down=${tab.down} n=${tab.months} rate=${tab.rate} mo=${tab.monthly} | CP ${pdf.TotalCP} DP ${pdf.DPAmount} fin ${pdf.UnpaidBalance} rate "${rateBox}" FC ${pdf.FCAmount} TP ${pdf.TotalPayments} TSP ${pdf['Total Sales Price']} pay ${pdf.Terms}x${pdf.PaymentAmount1} ${pdf.Cash}`, p, note]);
}
for (const [id, s, p, note] of rows) {
  console.log(`\n${p && p.length ? 'BREAK' : 'ok   '} ${id}\n      ${s}`);
  for (const x of p || []) console.log('   !! ' + x);
  for (const x of note || []) console.log('   .. ' + x);
}
