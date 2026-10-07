'use strict';

const express = require('express');
const router = express.Router();

const { validateInputs, validateCustomization, LIMITS, DEFAULT_CUSTOM } = require('../middleware/validate');
const { reportLimiter } = require('../middleware/rateLimit');
const { calculate } = require('../services/cacEngine');
const { streamPdfReport } = require('../services/pdfExport');
const { buildWordBuffer } = require('../services/wordExport');

/* ---------- GET /api/config ------------------------------------------- */
/**
 * Public config the frontend legitimately needs: slider bounds and defaults.
 * Note: channel indices are NOT here — those come back only as a derived
 * table inside /api/calculate.
 */
router.get('/config', (req, res) => {
  res.json({
    limits: LIMITS,
    defaults: {
      spend: 500000,
      customers: 250,
      months: 12,
      arpu: 800,
      marginPct: 75,
      churnPct: 6,
      targetCustomers: 1000,
      mode: 'cac'
    },
    modes: [
      { key: 'cac',   label: 'Calculate CAC' },
      { key: 'ltv',   label: 'LTV & Payback' },
      { key: 'scale', label: 'Scale Budget' }
    ],
    defaultCustomization: DEFAULT_CUSTOM
  });
});

/* ---------- POST /api/calculate --------------------------------------- */
router.post('/calculate', (req, res) => {
  const inputs = validateInputs(req.body);
  const result = calculate(inputs);
  res.json(result);
});

/* ---------- POST /api/report/pdf -------------------------------------- */
router.post('/report/pdf', reportLimiter, (req, res) => {
  const inputs = validateInputs(req.body.inputs);
  const custom = validateCustomization(req.body.customization);

  const safeName = custom.company.replace(/[^A-Za-z0-9]+/g, '-');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}-CAC-Report-${Date.now()}.pdf"`
  );

  streamPdfReport(res, inputs, custom);
});

/* ---------- POST /api/report/word ------------------------------------- */
router.post('/report/word', reportLimiter, (req, res) => {
  const inputs = validateInputs(req.body.inputs);
  const custom = validateCustomization(req.body.customization);

  const buffer = buildWordBuffer(inputs, custom);
  const safeName = custom.company.replace(/[^A-Za-z0-9]+/g, '-');

  res.setHeader('Content-Type', 'application/msword');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}-CAC-Report-${Date.now()}.doc"`
  );
  res.send(buffer);
});

/* ---------- POST /api/export/csv -------------------------------------- */
router.post('/export/csv', (req, res) => {
  const inputs = validateInputs(req.body);
  const result = calculate(inputs);

  const lines = [];
  lines.push('# Profit Growth — CAC Calculator Pro');
  lines.push('# Generated: ' + new Date().toISOString());
  lines.push('');
  lines.push('# UNIT ECONOMICS');
  lines.push('CAC,' + result.cac.toFixed(2));
  lines.push('LTV,' + result.ltv.toFixed(2));
  lines.push('LTV:CAC Ratio,' + result.ltvCac.toFixed(4));
  lines.push('CAC Payback (months),' +
    (Number.isFinite(result.paybackMonths) ? result.paybackMonths.toFixed(2) : ''));
  lines.push('');
  lines.push('# MONTH-WISE BREAKDOWN');
  lines.push('Month,Customers,Cum. Spend,Cum. Gross Profit,Net Position,Status');
  result.monthRows.forEach(r => {
    const status = r.net > 0 ? 'Profit' : (r.net === 0 ? 'Break-even' : 'Recovering');
    lines.push(
      [r.m, Math.round(r.customers), Math.round(r.spend),
       Math.round(r.gp), Math.round(r.net), status].join(',')
    );
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition',
    `attachment; filename="ProfitGrowth-CAC-${Date.now()}.csv"`);
  res.send('\ufeff' + lines.join('\n'));
});

module.exports = router;