'use strict';

/**
 * Draw the month-wise CAC payback bar chart onto a PDFKit document.
 * Pure vector — sharp at any zoom, tiny file size.
 */
function drawPaybackChart(doc, rows, opts) {
  const {
    x = 50, y = 50, width = 500, height = 200,
    formatShort = (n) => String(n)
  } = opts || {};

  const baseY = y + height;
  const chartH = height - 30;
  const chartW = width - 50;
  const chartX = x + 50;

  const maxVal = Math.max(...rows.map(r => r.barTotal), 1);

  // Title
  doc.fontSize(11).fillColor('#92400E')
     .text('Month-wise CAC Payback', x, y - 16, { width });

  // Legend
  const legendY = y - 4;
  doc.rect(chartX, legendY, 8, 8).fill('#F87171');
  doc.fontSize(7).fillColor('#4B5563').text('Unrecovered', chartX + 12, legendY + 1);
  doc.rect(chartX + 80, legendY, 8, 8).fill('#60A5FA');
  doc.fillColor('#4B5563').text('Recovered', chartX + 92, legendY + 1);
  doc.rect(chartX + 150, legendY, 8, 8).fill('#D4A843');
  doc.fillColor('#4B5563').text('Profit', chartX + 162, legendY + 1);

  // Grid + Y labels
  doc.fontSize(7).fillColor('#9CA3AF');
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const gy = baseY - (chartH / steps) * s;
    doc.moveTo(chartX, gy).lineTo(chartX + chartW, gy)
       .lineWidth(0.3).strokeColor('#F3F4F6').stroke();
    doc.fillColor('#9CA3AF')
       .text(formatShort((maxVal / steps) * s), x, gy - 3, { width: 46, align: 'right' });
  }

  // Axis
  doc.moveTo(chartX, baseY).lineTo(chartX + chartW, baseY)
     .lineWidth(0.5).strokeColor('#E5E7EB').stroke();

  // Bars
  const n = rows.length;
  const gap = chartW / n;
  const barW = Math.max(3, gap * 0.62);

  rows.forEach((r, i) => {
    const bx = chartX + i * gap + (gap - barW) / 2;
    const total = r.barTotal || 0;
    if (total <= 0) return;

    const recH    = (r.recovered / maxVal) * chartH;
    const unrecH  = (r.unrecovered / maxVal) * chartH;
    const profitH = (r.profit / maxVal) * chartH;

    let cursor = baseY;
    if (recH > 0)    { doc.rect(bx, cursor - recH, barW, recH).fill('#3B82F6');    cursor -= recH; }
    if (unrecH > 0)  { doc.rect(bx, cursor - unrecH, barW, unrecH).fill('#DC2626'); cursor -= unrecH; }
    if (profitH > 0) { doc.rect(bx, cursor - profitH, barW, profitH).fill('#D4A843'); }
  });

  // X labels
  const showEvery = rows.length > 12 ? Math.ceil(rows.length / 12) : 1;
  doc.fontSize(6.5).fillColor('#6B7280');
  rows.forEach((r, i) => {
    if (i % showEvery !== 0 && i !== rows.length - 1) return;
    const lx = chartX + i * gap + gap / 2 - 8;
    doc.text('M' + r.m, lx, baseY + 4, { width: 16, align: 'center' });
  });

  return baseY + 20; // return the y position after the chart
}

module.exports = { drawPaybackChart };