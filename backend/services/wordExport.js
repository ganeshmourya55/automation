'use strict';

const { buildReportBody } = require('./reportBuilder');

/**
 * Return a Buffer containing a .doc file (HTML-in-Word wrapper).
 * The report template is assembled server-side and never sent raw to the client.
 */
function buildWordBuffer(inputs, custom) {
  const body = buildReportBody(inputs, custom);

  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
    'xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8">' +
    `<title>${custom.company} Report</title>` +
    '<style>@page { size: A4; margin: 1.5cm; } ' +
    'body { font-family: Calibri, Arial, sans-serif; }</style>' +
    '</head><body>' + body + '</body></html>';

  return Buffer.from('\ufeff' + html, 'utf8');
}

module.exports = { buildWordBuffer };