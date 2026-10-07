'use strict';

const { calculate, formatINR, formatINRShort, formatNumShort } = require('./cacEngine');

/**
 * Build the inner HTML body of the report (no <html> wrapper).
 * Shared by both the Word and PDF paths.
 */
function buildReportBody(inputs, custom) {
  const res = calculate(inputs);
  const now = new Date();

  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });

  const modeLabel = {
    cac:   'Calculate CAC',
    ltv:   'LTV & Payback',
    scale: 'Scale Budget'
  }[res.mode];

  const paybackText = Number.isFinite(res.paybackMonths)
    ? res.paybackMonths.toFixed(2) + ' months'
    : '—';

  const heroLine = res.mode === 'scale'
    ? `<b>Required Acquisition Budget:</b> ${formatINR(res.requiredBudget)} for ${res.inputs.targetCustomers.toLocaleString('en-IN')} customers`
    : `<b>Customer Acquisition Cost:</b> ${formatINR(res.cac)}`;

  const ratioColor = res.ltvCac >= 3 ? '#047857'
                   : res.ltvCac >= 1 ? '#B45309'
                   : '#B91C1C';

  /* ---------- month-wise table ---------- */
  let monthTable = '';
  if (custom.yearTable) {
    const showEvery = res.monthRows.length > 20
      ? Math.ceil(res.monthRows.length / 15)
      : 1;

    const rowsHtml = res.monthRows
      .map((r, idx) => {
        if (idx === 0) return '';
        if (idx % showEvery !== 0 && idx !== res.monthRows.length - 1) return '';
        const status = r.net > 0 ? 'Profit' : (r.net === 0 ? 'Break-even' : 'Recovering');
        const color  = r.net > 0 ? '#047857' : (r.net === 0 ? '#B45309' : '#B91C1C');
        return `<tr>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:600;">Month ${r.m}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;">${Math.round(r.customers).toLocaleString('en-IN')}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:#1D4ED8;font-weight:700;">${formatINR(r.spend)}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:#B45309;font-weight:700;">${formatINR(r.gp)}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;">${r.net >= 0 ? '+' : ''}${formatINR(r.net)}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:${color};font-weight:700;">${status}</td>
        </tr>`;
      })
      .join('');

    monthTable = `
      <h2 style="font-size:15px;font-weight:800;color:#B45309;margin:0 0 10px 0;padding-bottom:6px;border-bottom:2px solid #D4A843;">3. Month-wise Breakdown</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:22px;">
        <thead><tr style="background:#fef3c7;">
          <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:left;font-weight:700;color:#92400e;">Month</th>
          <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#92400e;">Customers</th>
          <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#92400e;">Cum. Spend</th>
          <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#92400e;">Cum. Gross Profit</th>
          <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#92400e;">Net Position</th>
          <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#92400e;">Status</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
  }

  /* ---------- channel benchmarks ---------- */
  let channelTable = '';
  if (custom.ref) {
    const rowsHtml = res.channels.map(ch => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:600;">${ch.name}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;">${ch.index.toFixed(2)}×</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:#B45309;font-weight:700;">${formatINR(ch.cac)}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;">${Math.round(ch.customers).toLocaleString('en-IN')}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:${ch.healthy ? '#047857' : '#B91C1C'};font-weight:700;">${ch.ltvCac.toFixed(2)}×</td>
      </tr>`).join('');

    channelTable = `
      <h2 style="font-size:15px;font-weight:800;color:#B45309;margin:0 0 10px 0;padding-bottom:6px;border-bottom:2px solid #D4A843;">4. Channel CAC Benchmarks</h2>
      <p style="font-size:12px;color:#4b5563;margin:0 0 8px 0;">Illustrative channel efficiency relative to your blended CAC of ${formatINR(res.cac)}.</p>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:22px;">
        <thead><tr style="background:#fef3c7;">
          <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:left;font-weight:700;color:#92400e;">Channel</th>
          <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#92400e;">Index</th>
          <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#92400e;">Est. CAC</th>
          <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#92400e;">Customers</th>
          <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#92400e;">LTV : CAC</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
  }

  /* ---------- formula ---------- */
  const formulaBlock = custom.formula ? `
    <h2 style="font-size:15px;font-weight:800;color:#B45309;margin:0 0 10px 0;padding-bottom:6px;border-bottom:2px solid #D4A843;">5. Formulas Used</h2>
    <div style="background:#fef9e7;border-left:4px solid #D4A843;padding:12px 16px;margin-bottom:22px;font-family:Consolas,monospace;font-size:12.5px;color:#92400e;line-height:1.9;">
      CAC = Total Acquisition Spend ÷ New Customers Acquired<br>
      LTV = ARPU × Gross Margin ÷ Monthly Churn Rate<br>
      LTV : CAC Ratio = LTV ÷ CAC<br>
      CAC Payback (months) = CAC ÷ (ARPU × Gross Margin)
    </div>` : '';

  /* ---------- disclaimer ---------- */
  const disclaimerBlock = custom.disclaimer ? `
    <h2 style="font-size:15px;font-weight:800;color:#B45309;margin:0 0 10px 0;padding-bottom:6px;border-bottom:2px solid #D4A843;">6. Disclaimer</h2>
    <div style="background:#fef2f2;border:1px solid #fecaca;padding:12px 16px;border-radius:6px;font-size:11.5px;color:#7f1d1d;line-height:1.65;margin-bottom:22px;">
      This report is generated by ${custom.company} for educational purposes. It assumes constant monthly churn and gross margin, and an even spread of customer acquisition across the period. Actual acquisition costs, retention rates, and margins vary widely by business. Channel indices shown are illustrative, not measured benchmarks. Please consult a qualified business or financial adviser before making investment decisions.
    </div>` : '';

  /* ---------- founder ---------- */
  const founderBlock = custom.founderSec ? `
    <div style="background:#fef9e7;border-top:3px solid #D4A843;padding:16px 20px;border-radius:8px;margin-bottom:22px;text-align:center;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.8px;color:#B45309;margin-bottom:6px;">Founded By</div>
      <div style="font-size:17px;font-weight:800;color:#111827;margin-bottom:4px;">${custom.founder}</div>
      <div style="font-size:11.5px;color:#4b5563;line-height:1.6;">${custom.founderTitle}</div>
    </div>` : '';

  /* ---------- chart placeholder ---------- */
  const chartPlaceholder = custom.chart
    ? '<h2 style="font-size:15px;font-weight:800;color:#B45309;margin:0 0 10px 0;padding-bottom:6px;border-bottom:2px solid #D4A843;">Chart — Month-wise CAC Payback</h2>' +
      '<div style="height:8px;"></div>'
    : '';

  /* ---------- assemble ---------- */
  return `
    <div style="font-family:Calibri,Arial,Helvetica,sans-serif;color:#1f2937;background:#ffffff;padding:30px;max-width:820px;margin:0 auto;line-height:1.55;">
      <div style="background:linear-gradient(135deg,#D4A843,#F6E27A);padding:22px 26px;border-radius:10px;margin-bottom:24px;">
        <div style="font-size:22px;font-weight:800;color:#080B12;letter-spacing:-0.5px;">${custom.company} — ${custom.title}</div>
        <div style="font-size:12px;color:#080B12;margin-top:4px;">${custom.tagline}</div>
      </div>

      <table style="width:100%;margin-bottom:22px;font-size:12.5px;color:#4b5563;">
        <tr>
          <td style="padding:3px 0;"><b style="color:#111827;">Report Date:</b> ${dateStr} at ${timeStr}</td>
          <td style="padding:3px 0;text-align:right;"><b style="color:#111827;">Mode:</b> ${modeLabel}</td>
        </tr>
      </table>

      <h2 style="font-size:15px;font-weight:800;color:#B45309;margin:0 0 10px 0;padding-bottom:6px;border-bottom:2px solid #D4A843;">1. Acquisition Inputs</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:22px;">
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;width:46%;font-weight:600;">Total Acquisition Spend</td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${formatINR(res.inputs.spend)}</td></tr>
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">New Customers Acquired</td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${res.inputs.customers.toLocaleString('en-IN')}</td></tr>
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Time Period</td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${res.inputs.months} ${res.inputs.months === 1 ? 'month' : 'months'}</td></tr>
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">ARPU (per month)</td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${formatINR(res.inputs.arpu)}</td></tr>
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Gross Margin</td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${res.inputs.marginPct}%</td></tr>
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Monthly Churn Rate</td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${res.inputs.churnPct}%</td></tr>
      </table>

      <h2 style="font-size:15px;font-weight:800;color:#B45309;margin:0 0 10px 0;padding-bottom:6px;border-bottom:2px solid #D4A843;">2. Summary of Results</h2>
      <div style="background:#fef9e7;border-left:4px solid #D4A843;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#92400e;">${heroLine}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:22px;">
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;width:46%;font-weight:600;">Customer Acquisition Cost (CAC)</td><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#6D28D9;font-weight:800;">${formatINR(res.cac)}</td></tr>
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Lifetime Value (LTV)</td><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#047857;font-weight:800;">${formatINR(res.ltv)}</td></tr>
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">LTV : CAC Ratio</td><td style="padding:6px 10px;border:1px solid #e5e7eb;color:${ratioColor};font-weight:800;">${res.ltvCac.toFixed(2)}×</td></tr>
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">CAC Payback Period</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:700;">${paybackText}</td></tr>
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Net Profit per Customer</td><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#B45309;font-weight:700;">${res.netProfitPerCustomer >= 0 ? '+' : ''}${formatINR(res.netProfitPerCustomer)}</td></tr>
        <tr><td style="padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Customer Lifetime</td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${res.lifetimeMonths.toFixed(1)} months</td></tr>
      </table>

      ${chartPlaceholder}
      ${monthTable}
      ${channelTable}
      ${formulaBlock}
      ${founderBlock}
      ${disclaimerBlock}

      <div style="border-top:1px solid #e5e7eb;padding-top:14px;text-align:center;font-size:11px;color:#6b7280;">
        <div style="font-weight:800;color:#B45309;font-size:13px;margin-bottom:3px;">${custom.company}</div>
        ${custom.tagline} · Founded by ${custom.founder}<br>
        ${custom.website}
      </div>
    </div>`;
}

module.exports = { buildReportBody };