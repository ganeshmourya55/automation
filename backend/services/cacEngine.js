'use strict';

const { CHANNEL_BENCHMARKS, ratioBand } = require('../config/channels');

/* ---------- primitives (private) --------------------------------------- */

function computeCAC(spend, customers) {
  return customers > 0 ? spend / customers : 0;
}

function monthlyGrossProfit(arpu, marginPct) {
  return arpu * (marginPct / 100);
}

function computeLTV(arpu, marginPct, churnPct) {
  if (churnPct <= 0) return 0;
  return monthlyGrossProfit(arpu, marginPct) * (100 / churnPct);
}

function computePayback(cac, arpu, marginPct) {
  const mgp = monthlyGrossProfit(arpu, marginPct);
  return mgp > 0 ? cac / mgp : Infinity;
}

/**
 * Cohort payback model.
 * Customers are assumed acquired evenly across `months`.
 * A customer acquired in month k has been held (m - k + 1) months by month m,
 * so cumulative gross profit at month m =
 *     custPerMonth * monthlyGP * sum_{k=1..m}(m - k + 1)
 *   = custPerMonth * monthlyGP * m(m+1)/2
 */
function buildMonthRows(spend, customers, months, mgpPerCustomer) {
  const rows = [];
  const custPerMonth = months > 0 ? customers / months : 0;

  for (let m = 0; m <= months; m++) {
    const cumCustomers = custPerMonth * m;
    const cumSpend = months > 0 ? spend * (m / months) : 0;
    const cumGP = custPerMonth * mgpPerCustomer * (m * (m + 1)) / 2;

    rows.push({
      m,
      customers:   Math.round(cumCustomers * 100) / 100,
      spend:       cumSpend,
      gp:          cumGP,
      recovered:   Math.min(cumSpend, cumGP),
      unrecovered: Math.max(0, cumSpend - cumGP),
      profit:      Math.max(0, cumGP - cumSpend),
      net:         cumGP - cumSpend,
      barTotal:    Math.max(cumSpend, cumGP)
    });
  }
  return rows;
}

/* ---------- channel benchmark derivation ------------------------------- */

function buildChannelTable(res) {
  const baseCac = res.cac || 1;
  return CHANNEL_BENCHMARKS.map(ch => {
    const channelCac = baseCac * ch.idx;
    const channelCustomers = channelCac > 0 ? res.spend / channelCac : 0;
    const channelRatio = channelCac > 0 ? res.ltv / channelCac : 0;
    return {
      key: ch.key,
      name: ch.name,
      tier: ch.tier,
      index: ch.idx,
      cac: channelCac,
      customers: channelCustomers,
      ltvCac: channelRatio,
      healthy: channelRatio >= 3,
      isBaseline: ch.idx === 1.00
    };
  });
}

/* ---------- public API ------------------------------------------------- */

/**
 * Compute the full result object from validated inputs.
 * @param {object} input  output of validateInputs()
 */
function calculate(input) {
  const {
    spend, customers, months, arpu, marginPct,
    churnPct, targetCustomers, mode
  } = input;

  const cac = computeCAC(spend, customers);
  const mgp = monthlyGrossProfit(arpu, marginPct);
  const lifetimeMonths = churnPct > 0 ? 100 / churnPct : months;
  const ltv = mgp * lifetimeMonths;
  const ltvCac = cac > 0 ? ltv / cac : 0;
  const paybackMonths = mgp > 0 ? cac / mgp : Infinity;
  const netProfitPerCustomer = ltv - cac;
  const requiredBudget = cac * targetCustomers;
  const band = ratioBand(ltvCac);

  const monthRows = buildMonthRows(spend, customers, months, mgp);

  return {
    mode,
    inputs: { spend, customers, months, arpu, marginPct, churnPct, targetCustomers },

    cac,
    ltv,
    ltvCac,
    paybackMonths,
    lifetimeMonths,
    monthlyGrossProfit: mgp,
    netProfitPerCustomer,
    requiredBudget,

    customersPerMonth: months > 0 ? customers / months : 0,
    grossProfitTotal: ltv * customers,

    ratioBand: band,

    monthRows,
    channels: buildChannelTable({
      cac, ltv, spend
    }),

    // Pre-formatted strings so the frontend does no maths at all
    display: {
      cac:                formatINR(cac),
      ltv:                formatINR(ltv),
      ltvCac:             ltvCac.toFixed(2) + '×',
      paybackMonths:      Number.isFinite(paybackMonths)
                            ? paybackMonths.toFixed(1) + ' mo'
                            : '—',
      lifetimeMonths:     lifetimeMonths.toFixed(1) + ' months',
      netProfitPerCustomer: (netProfitPerCustomer >= 0 ? '+' : '') + formatINR(netProfitPerCustomer),
      requiredBudget:     formatINR(requiredBudget),
      spend:              formatINR(spend),
      customers:          customers.toLocaleString('en-IN'),
      monthlyGrossProfit: formatINR(mgp),
      ratioNote:          band.label,
      ratioTone:          band.tone
    }
  };
}

/* ---------- formatting helpers (server-side only) ---------------------- */

function formatINR(n) {
  if (!Number.isFinite(n)) return '₹0';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function formatINRShort(n) {
  if (!Number.isFinite(n)) return '₹0';
  const v = Math.round(n);
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 10000000) return sign + '₹' + (abs / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
  if (abs >= 100000)   return sign + '₹' + (abs / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
  if (abs >= 1000)     return sign + '₹' + (abs / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return sign + '₹' + abs;
}

function formatNumShort(n) {
  const v = Math.round(n);
  if (v >= 10000000) return (v / 10000000).toFixed(2) + ' Cr';
  if (v >= 100000)   return (v / 100000).toFixed(2) + ' L';
  if (v >= 1000)     return (v / 1000).toFixed(1) + 'K';
  return String(v);
}

module.exports = {
  calculate,
  buildMonthRows,
  formatINR,
  formatINRShort,
  formatNumShort
};