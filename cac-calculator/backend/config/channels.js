'use strict';

/**
 * Channel efficiency indices relative to blended CAC (index 1.00 = blended).
 * These are Profit Growth's internal planning assumptions and are NOT
 * exposed to the browser in any form other than the derived table.
 */
const CHANNEL_BENCHMARKS = Object.freeze([
  { key: 'referral',  name: 'Referral / Word of Mouth',    idx: 0.40, tier: 'organic'  },
  { key: 'seo',       name: 'Organic Search / SEO Content', idx: 0.60, tier: 'organic'  },
  { key: 'email',     name: 'Email / CRM',                  idx: 0.75, tier: 'owned'    },
  { key: 'paid_search', name: 'Paid Search',                idx: 1.00, tier: 'paid'     },
  { key: 'paid_social', name: 'Paid Social',                idx: 1.30, tier: 'paid'     },
  { key: 'affiliate', name: 'Affiliate / Partnerships',     idx: 1.60, tier: 'partner'  },
  { key: 'events',    name: 'Events / Webinars',            idx: 2.20, tier: 'field'    }
]);

/**
 * Health thresholds for the LTV:CAC ratio.
 */
const RATIO_BANDS = Object.freeze([
  { min: 5,    label: 'Excellent — you may be under-investing in growth', tone: 'green'  },
  { min: 3,    label: 'Healthy — above the 3× benchmark',                 tone: 'green'  },
  { min: 1,    label: 'Below the 3× benchmark — needs improvement',       tone: 'warn'   },
  { min: -Infinity, label: 'Loss-making — CAC exceeds LTV',               tone: 'red'    }
]);

function ratioBand(ratio) {
  return RATIO_BANDS.find(b => ratio >= b.min) || RATIO_BANDS[RATIO_BANDS.length - 1];
}

module.exports = { CHANNEL_BENCHMARKS, RATIO_BANDS, ratioBand };