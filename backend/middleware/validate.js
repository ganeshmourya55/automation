'use strict';

const LIMITS = {
  spend:           { min: 1000,   max: 100000000 },
  customers:       { min: 1,      max: 100000 },
  months:          { min: 1,      max: 60 },
  arpu:            { min: 1,      max: 100000 },
  marginPct:       { min: 1,      max: 100 },
  churnPct:        { min: 0.1,    max: 50 },
  targetCustomers: { min: 1,      max: 100000 }
};

const VALID_MODES = ['cac', 'ltv', 'scale'];

function clamp(n, min, max) {
  n = Number(n);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

/**
 * Normalise + clamp an arbitrary request body into a safe input object.
 * This is the ONLY place raw client input is trusted.
 */
function validateInputs(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};

  return {
    spend:           clamp(raw.spend,           LIMITS.spend.min,           LIMITS.spend.max),
    customers:       clamp(raw.customers,       LIMITS.customers.min,       LIMITS.customers.max),
    months:          clamp(raw.months,          LIMITS.months.min,          LIMITS.months.max),
    arpu:            clamp(raw.arpu,            LIMITS.arpu.min,            LIMITS.arpu.max),
    marginPct:       clamp(raw.marginPct,       LIMITS.marginPct.min,       LIMITS.marginPct.max),
    churnPct:        clamp(raw.churnPct,        LIMITS.churnPct.min,        LIMITS.churnPct.max),
    targetCustomers: clamp(raw.targetCustomers, LIMITS.targetCustomers.min, LIMITS.targetCustomers.max),
    mode:            VALID_MODES.includes(raw.mode) ? raw.mode : 'cac'
  };
}

function sanitizeString(str, maxLen, fallback) {
  if (typeof str !== 'string') return fallback;
  return str
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen) || fallback;
}

const DEFAULT_CUSTOM = {
  title: 'Customer Acquisition Report',
  company: 'Profit Growth',
  tagline: 'Learn • Build • Grow',
  founder: 'Ganesh Mourya',
  founderTitle: 'AI Automation & AI Agent Engineer · Full Stack Web Developer · SEO Specialist',
  website: 'https://profit-growth.vercel.app/',
  chart: true,
  ref: true,
  formula: true,
  disclaimer: true,
  founderSec: true,
  yearTable: true
};

function validateCustomization(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  return {
    title:        sanitizeString(raw.title,        80,  DEFAULT_CUSTOM.title),
    company:      sanitizeString(raw.company,      60,  DEFAULT_CUSTOM.company),
    tagline:      sanitizeString(raw.tagline,      80,  DEFAULT_CUSTOM.tagline),
    founder:      sanitizeString(raw.founder,      60,  DEFAULT_CUSTOM.founder),
    founderTitle: sanitizeString(raw.founderTitle, 200, DEFAULT_CUSTOM.founderTitle),
    website:      sanitizeString(raw.website,      100, DEFAULT_CUSTOM.website),
    chart:        Boolean(raw.chart),
    ref:          Boolean(raw.ref),
    formula:      Boolean(raw.formula),
    disclaimer:   Boolean(raw.disclaimer),
    founderSec:   Boolean(raw.founderSec),
    yearTable:    Boolean(raw.yearTable)
  };
}

module.exports = { validateInputs, validateCustomization, LIMITS, DEFAULT_CUSTOM, clamp };