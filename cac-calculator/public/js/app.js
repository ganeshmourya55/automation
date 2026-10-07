'use strict';

/**
 * CAC Calculator — frontend controller.
 * Contains NO business logic. Every figure is fetched from /api/calculate.
 */
(function () {

    const $ = (id) => document.getElementById(id);

    /* ---------- config (fetched once at boot) -------------------------- */
    let CONFIG = null;

    /* ---------- input elements ----------------------------------------- */
    const inputs = {
        spend:           { num: $('spendNum'),           range: $('spendRange') },
        customers:       { num: $('customersNum'),       range: $('customersRange') },
        months:          { num: $('monthsNum'),          range: $('monthsRange') },
        arpu:            { num: $('arpuNum'),            range: $('arpuRange') },
        marginPct:       { num: $('marginNum'),          range: $('marginRange') },
        churnPct:        { num: $('churnNum'),           range: $('churnRange') },
        targetCustomers: { num: $('targetCustNum'),      range: $('targetCustRange') }
    };

    /* ---------- output elements ---------------------------------------- */
    const OUT = {
        heroLabel: $('heroLabel'), heroValue: $('heroValue'), heroWords: $('heroWords'),
        gainPill: $('gainPill'), gainPillText: $('gainPillText'),
        spendValue: $('spendValue'), custValue: $('custValue'),
        cacValue: $('cacValue'), ltvValue: $('ltvValue'),
        ratioValue: $('ratioValue'), paybackValue: $('paybackValue'),
        profitPct: $('profitPct'),
        legendCac: $('legendCac'), legendProfit: $('legendProfit'),
        multipleValue: $('multipleValue'),
        segCac: $('segCac'), segProfit: $('segProfit'),
        sumCAC: $('sumCAC'), sumLTV: $('sumLTV'),
        sumRatio: $('sumRatio'), sumRatioNote: $('sumRatioNote'),
        ccSpend: $('ccSpend'), ccProfit: $('ccProfit'), ccLtv: $('ccLtv'),
        ccProfitNote: $('ccProfitNote'), ccLtvNote: $('ccLtvNote'),
        chartBars: $('chartBars'), chartAxis: $('chartAxis'),
        breakdownBody: $('breakdownBody'), compareBody: $('compareBody'),
        inputPanelTitle: $('inputPanelTitle'), resultPanelTitle: $('resultPanelTitle')
    };

    const CIRC = 2 * Math.PI * 78;
    let mode = 'cac';

    /* ================================================================
       REQUEST LAYER — debounced, cancellable
       ================================================================ */
    let inflight = null;
    let debounceTimer = null;

    function gatherInputs() {
        return {
            mode,
            spend:           Number(inputs.spend.num.value),
            customers:       Number(inputs.customers.num.value),
            months:          Number(inputs.months.num.value),
            arpu:            Number(inputs.arpu.num.value),
            marginPct:       Number(inputs.marginPct.num.value),
            churnPct:        Number(inputs.churnPct.num.value),
            targetCustomers: Number(inputs.targetCustomers.num.value)
        };
    }

    async function requestCalculation() {
        if (inflight) inflight.abort();
        const ctrl = new AbortController();
        inflight = ctrl;

        try {
            const res = await fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gatherInputs()),
                signal: ctrl.signal
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            if (ctrl.signal.aborted) return;
            renderAll(data);
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('[calculate]', err);
            showToast('Calculation failed — retrying', 'fas fa-triangle-exclamation');
        } finally {
            if (inflight === ctrl) inflight = null;
        }
    }

    function scheduleUpdate(immediate) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(requestCalculation, immediate ? 0 : 140);
    }

    /* ================================================================
       RENDERING — pure display, all values come from the server
       ================================================================ */
    function renderAll(res) {
        renderHero(res);
        renderRows(res);
        renderDonut(res);
        renderSummary(res);
        renderBreakdownStrip(res);
        renderChart(res);
        renderMonthTable(res);
        renderChannelTable(res);
    }

    function renderHero(res) {
        const d = res.display;

        if (res.mode === 'cac') {
            OUT.heroLabel.textContent = 'Customer Acquisition Cost';
            OUT.heroValue.textContent = d.cac;
            OUT.heroWords.textContent =
                `Blended CAC across ${d.customers} customers`;
        } else if (res.mode === 'ltv') {
            OUT.heroLabel.textContent = 'LTV : CAC Ratio';
            OUT.heroValue.textContent = d.ltvCac;
            OUT.heroWords.textContent = d.ratioNote;
        } else {
            OUT.heroLabel.textContent = 'Required Acquisition Budget';
            OUT.heroValue.textContent = d.requiredBudget;
            OUT.heroWords.textContent =
                `To acquire ${res.inputs.targetCustomers.toLocaleString('en-IN')} customers at ${d.cac} CAC`;
        }

        OUT.gainPill.classList.remove('loss', 'warn');
        const tone = d.ratioTone;
        if (tone === 'red')  OUT.gainPill.classList.add('loss');
        if (tone === 'warn') OUT.gainPill.classList.add('warn');

        const icon = OUT.gainPill.querySelector('i');
        icon.className = tone === 'red'  ? 'fas fa-arrow-trend-down'
                       : tone === 'warn' ? 'fas fa-triangle-exclamation'
                       : 'fas fa-arrow-trend-up';

        if (res.mode === 'ltv') {
            OUT.gainPillText.textContent = `CAC ${d.cac} · LTV ${d.ltv}`;
        } else if (res.mode === 'scale') {
            OUT.gainPillText.textContent =
                `Current CAC ${d.cac} × ${res.inputs.targetCustomers.toLocaleString('en-IN')} customers`;
        } else {
            OUT.gainPillText.textContent = `LTV : CAC ratio ${d.ltvCac}`;
        }
    }

    function renderRows(res) {
        const d = res.display;
        OUT.spendValue.textContent   = d.spend;
        OUT.custValue.textContent    = d.customers;
        OUT.cacValue.textContent     = d.cac;
        OUT.ltvValue.textContent     = d.ltv;
        OUT.ratioValue.textContent   = d.ltvCac;
        OUT.ratioValue.classList.toggle('red', res.ltvCac < 1);
        OUT.ratioValue.classList.toggle('cyan', res.ltvCac >= 1);
        OUT.paybackValue.textContent = d.paybackMonths;
        OUT.paybackValue.classList.toggle('red', res.paybackMonths > 18);
    }

    function renderDonut(res) {
        const total = Math.max(res.ltv, res.cac, 1);
        const cacShare = res.cac / total;
        const profitShare = Math.max(0, res.ltv - res.cac) / total;

        const cacLen = CIRC * cacShare;
        const profitLen = CIRC * profitShare;

        OUT.segCac.setAttribute('stroke-dasharray', `${cacLen} ${CIRC - cacLen}`);
        OUT.segCac.setAttribute('stroke-dashoffset', '0');
        OUT.segProfit.setAttribute('stroke-dasharray', `${profitLen} ${CIRC - profitLen}`);
        OUT.segProfit.setAttribute('stroke-dashoffset', String(-cacLen));

        const pct = res.ltv > 0
            ? (Math.max(0, res.ltv - res.cac) / res.ltv) * 100
            : 0;
        OUT.profitPct.textContent = pct.toFixed(0) + '%';
        OUT.profitPct.classList.toggle('loss', res.netProfitPerCustomer < 0);

        OUT.legendCac.textContent = res.display.cac;
        OUT.legendProfit.textContent =
            (res.netProfitPerCustomer >= 0 ? '' : '−') +
            formatShortINR(Math.abs(res.netProfitPerCustomer));
        OUT.multipleValue.textContent = res.display.ltvCac;
    }

    function renderSummary(res) {
        const d = res.display;
        OUT.sumCAC.textContent = d.cac;
        OUT.sumLTV.textContent = d.ltv;
        OUT.sumRatio.textContent = d.ltvCac;
        OUT.sumRatio.classList.toggle('red', res.ltvCac < 1);
        OUT.sumRatio.classList.toggle('purple', res.ltvCac >= 1);
        OUT.sumRatioNote.textContent = d.ratioNote;
    }

    function renderBreakdownStrip(res) {
        const d = res.display;
        OUT.ccSpend.textContent = d.spend;
        OUT.ccProfit.textContent = d.netProfitPerCustomer;
        OUT.ccProfit.classList.toggle('red', res.netProfitPerCustomer < 0);
        OUT.ccProfit.classList.toggle('gold', res.netProfitPerCustomer >= 0);
        OUT.ccLtv.textContent = d.ltv;
        OUT.ccProfitNote.textContent = res.netProfitPerCustomer >= 0
            ? 'Lifetime value minus acquisition cost'
            : 'You lose money on every customer acquired';
        OUT.ccLtvNote.textContent =
            `Over ~${d.lifetimeMonths} at ${res.inputs.churnPct}% churn`;
    }

    function renderChart(res) {
        const rows = res.monthRows;
        if (!rows.length) return;

        const maxVal = Math.max(...rows.map(r => r.barTotal), 1);
        const showEvery = rows.length > 24 ? Math.ceil(rows.length / 12) : 1;

        let barsHTML = '';
        let axisHTML = '';

        rows.forEach((r, idx) => {
            const barHeightPct = Math.min(100, (r.barTotal / maxVal) * 100);
            const total = r.barTotal || 1;
            const recPct = (r.recovered / total) * 100;
            const profitPctBar = (r.profit / total) * 100;
            const unrecPct = (r.unrecovered / total) * 100;

            const tip =
                `<b>Month ${r.m}</b><br>` +
                `Customers: ${Math.round(r.customers).toLocaleString('en-IN')}<br>` +
                `Cum. Spend: ${formatShortINR(r.spend)}<br>` +
                `Cum. Gross Profit: ${formatShortINR(r.gp)}<br>` +
                `Net: <b>${r.net >= 0 ? '+' : ''}${formatShortINR(r.net)}</b>`;

            barsHTML +=
                `<div class="bar-col" style="--bar-h:${barHeightPct.toFixed(2)}%">` +
                    `<div class="bar-tip">${tip}</div>` +
                    `<div class="bar" style="height:${barHeightPct.toFixed(2)}%">` +
                        (profitPctBar > 0 ? `<div class="seg-profit" style="height:${profitPctBar.toFixed(2)}%"></div>` : '') +
                        (unrecPct > 0 ? `<div class="seg-unrec" style="height:${unrecPct.toFixed(2)}%"></div>` : '') +
                        `<div class="seg-rec" style="height:${recPct.toFixed(2)}%"></div>` +
                    `</div>` +
                `</div>`;

            const label = (idx % showEvery === 0 || idx === rows.length - 1) ? 'M' + r.m : '';
            axisHTML += `<div class="axis-lbl">${label}</div>`;
        });

        OUT.chartBars.innerHTML = barsHTML;
        OUT.chartAxis.innerHTML = axisHTML;
    }

    function renderMonthTable(res) {
        const rows = res.monthRows;
        if (!rows.length) return;
        const showEvery = rows.length > 20 ? Math.ceil(rows.length / 15) : 1;

        let html = '';
        rows.forEach((r, idx) => {
            if (idx === 0) return;
            if (idx % showEvery !== 0 && idx !== rows.length - 1) return;

            const isLast = idx === rows.length - 1;
            const status = r.net > 0 ? 'Profit' : (r.net === 0 ? 'Break-even' : 'Recovering');
            const cls = r.net > 0 ? 'green' : (r.net === 0 ? 'gold' : 'red');

            html +=
                `<tr${isLast ? ' class="highlight-row"' : ''}>` +
                    `<td>Month ${r.m}</td>` +
                    `<td>${Math.round(r.customers).toLocaleString('en-IN')}</td>` +
                    `<td class="blue">${formatINR(r.spend)}</td>` +
                    `<td class="gold">${formatINR(r.gp)}</td>` +
                    `<td>${r.net >= 0 ? '+' : ''}${formatINR(r.net)}</td>` +
                    `<td class="${cls}">${status}</td>` +
                `</tr>`;
        });
        OUT.breakdownBody.innerHTML = html;
    }

    function renderChannelTable(res) {
        const html = res.channels.map(ch =>
            `<tr${ch.isBaseline ? ' class="active"' : ''}>` +
                `<td>${ch.name}</td>` +
                `<td>${ch.index.toFixed(2)}×</td>` +
                `<td class="gold">${formatINR(ch.cac)}</td>` +
                `<td>${Math.round(ch.customers).toLocaleString('en-IN')}</td>` +
                `<td class="${ch.healthy ? 'green' : 'red'}">${ch.ltvCac.toFixed(2)}×</td>` +
            `</tr>`
        ).join('');
        OUT.compareBody.innerHTML = html;
    }

    /* ================================================================
       FORMAT HELPERS (display only, not calculation)
       ================================================================ */
    function formatINR(n) {
        if (!Number.isFinite(n)) return '₹0';
        return '₹' + Math.round(n).toLocaleString('en-IN');
    }
    function formatShortINR(n) {
        if (!Number.isFinite(n)) return '₹0';
        const v = Math.round(n);
        const abs = Math.abs(v);
        const sign = v < 0 ? '−' : '';
        if (abs >= 10000000) return sign + '₹' + (abs / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
        if (abs >= 100000)   return sign + '₹' + (abs / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
        if (abs >= 1000)     return sign + '₹' + (abs / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return sign + '₹' + abs;
    }

    /* ================================================================
       MODE SWITCHING
       ================================================================ */
    const FIELDS_BY_MODE = {
        cac:   { show: ['spend','customers','months'],                              title: 'Acquisition Inputs',      result: 'Your CAC' },
        ltv:   { show: ['spend','customers','months','arpu','marginPct','churnPct'], title: 'Unit Economics Inputs',  result: 'LTV & Payback' },
        scale: { show: ['spend','customers','months','targetCustomers'],            title: 'Scale Planning Inputs',  result: 'Required Budget' }
    };

    function setMode(newMode) {
        mode = newMode;

        ['tabCAC','tabLTV','tabScale'].forEach(id => {
            const el = $(id);
            const isActive = el.dataset.mode === newMode;
            el.classList.toggle('active', isActive);
            el.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        const cfg = FIELDS_BY_MODE[newMode];
        document.querySelectorAll('.collapsible-field').forEach(el => {
            el.classList.toggle('show', cfg.show.includes(el.dataset.field));
        });

        OUT.inputPanelTitle.textContent = cfg.title;
        OUT.resultPanelTitle.textContent = cfg.result;

        scheduleUpdate(true);
    }

    /* ================================================================
       INPUT WIRING
       ================================================================ */
    function link(num, range, min, max) {
        num.addEventListener('input', () => {
            range.value = Math.min(Math.max(Number(num.value) || min, min), max);
            scheduleUpdate();
        });
        num.addEventListener('blur', () => {
            const v = Math.min(Math.max(Number(num.value) || min, min), max);
            num.value = v;
            range.value = v;
            scheduleUpdate(true);
        });
        range.addEventListener('input', () => {
            num.value = range.value;
            scheduleUpdate();
        });
    }

    function wireAllInputs() {
        const L = CONFIG.limits;
        link(inputs.spend.num,           inputs.spend.range,           L.spend.min,           L.spend.max);
        link(inputs.customers.num,       inputs.customers.range,       L.customers.min,       L.customers.max);
        link(inputs.months.num,          inputs.months.range,          L.months.min,          L.months.max);
        link(inputs.arpu.num,            inputs.arpu.range,            L.arpu.min,            L.arpu.max);
        link(inputs.marginPct.num,       inputs.marginPct.range,       L.marginPct.min,       L.marginPct.max);
        link(inputs.churnPct.num,        inputs.churnPct.range,        L.churnPct.min,        L.churnPct.max);
        link(inputs.targetCustomers.num, inputs.targetCustomers.range, L.targetCustomers.min, L.targetCustomers.max);
    }

    /* ================================================================
       ITEMIZED SPEND (client-side sum — plain arithmetic, not secret)
       ================================================================ */
    const BP_FIELDS = ['bpAdSpend','bpSalaries','bpTools','bpAgency','bpContent','bpOther'].map($);
    const bpTotal = $('bpTotal');
    const bpDiff = $('bpDiff');

    function bpSum() {
        return BP_FIELDS.reduce((s, el) => s + Math.max(0, Number(el.value) || 0), 0);
    }

    function updateBpTotal() {
        const total = bpSum();
        bpTotal.textContent = formatINR(total);
        const current = Number(inputs.spend.num.value) || 0;
        const diff = total - current;

        if (total === 0) {
            bpDiff.textContent = 'No line items entered';
            bpDiff.style.color = '';
        } else if (Math.abs(diff) < 1) {
            bpDiff.textContent = 'Matches current spend';
            bpDiff.style.color = '';
        } else if (diff > 0) {
            bpDiff.textContent = formatShortINR(diff) + ' above current spend';
            bpDiff.style.color = 'var(--orange)';
        } else {
            bpDiff.textContent = formatShortINR(-diff) + ' below current spend';
            bpDiff.style.color = 'var(--blue)';
        }
    }

    /* ================================================================
       REPORT GENERATION — server-side
       ================================================================ */
    async function requestReport(format) {
        const inputs = gatherInputs();
        const customization = readCustomizationFromModal();

        try {
            showToast(
                `Generating ${format.toUpperCase()}…`,
                format === 'pdf' ? 'fas fa-spinner fa-spin' : 'fas fa-spinner fa-spin'
            );

            const res = await fetch(`/api/report/${format}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inputs, customization })
            });

            if (!res.ok) throw new Error('HTTP ' + res.status);

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `CAC-Report-${Date.now()}.${format === 'pdf' ? 'pdf' : 'doc'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`${format.toUpperCase()} downloaded`, `fas fa-file-${format}`);
        } catch (err) {
            console.error('[report]', err);
            showToast('Report generation failed', 'fas fa-triangle-exclamation');
        }
    }

    async function requestCsv() {
        try {
            const res = await fetch('/api/export/csv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gatherInputs())
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `CAC-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('CSV downloaded', 'fas fa-file-csv');
        } catch (err) {
            showToast('CSV export failed', 'fas fa-triangle-exclamation');
        }
    }

    /* ================================================================
       CUSTOMIZATION MODAL (localStorage — client preference only)
       ================================================================ */
    const STORAGE_KEY = 'pg_cac_report_customization_v1';
    const customizeModal = $('customizeModal');

    function readCustomizationFromModal() {
        return {
            title: $('repTitle').value.trim(),
            company: $('repCompany').value.trim(),
            tagline: $('repTagline').value.trim(),
            founder: $('repFounder').value.trim(),
            founderTitle: $('repFounderTitle').value.trim(),
            website: $('repWebsite').value.trim(),
            chart: $('repChart').checked,
            ref: $('repRef').checked,
            formula: $('repFormula').checked,
            disclaimer: $('repDisclaimer').checked,
            founderSec: $('repFounderSec').checked,
            yearTable: $('repYearTable').checked
        };
    }

    function applyCustomizationToModal(c) {
        $('repTitle').value = c.title;
        $('repCompany').value = c.company;
        $('repTagline').value = c.tagline;
        $('repFounder').value = c.founder;
        $('repFounderTitle').value = c.founderTitle;
        $('repWebsite').value = c.website;
        $('repChart').checked = c.chart;
        $('repRef').checked = c.ref;
        $('repFormula').checked = c.formula;
        $('repDisclaimer').checked = c.disclaimer;
        $('repFounderSec').checked = c.founderSec;
        $('repYearTable').checked = c.yearTable;
    }

    function loadSavedCustomization() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            return Object.assign({}, CONFIG.defaultCustomization, saved || {});
        } catch {
            return Object.assign({}, CONFIG.defaultCustomization);
        }
    }

    function persistCustomization() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(readCustomizationFromModal()));
        } catch {}
    }

    function openCustomizeModal() {
        applyCustomizationToModal(loadSavedCustomization());
        customizeModal.classList.add('open');
    }
    function closeCustomizeModal() {
        persistCustomization();
        customizeModal.classList.remove('open');
    }

    /* ================================================================
       TOAST
       ================================================================ */
    const toast = $('toast');
    const toastText = $('toastText');
    function showToast(msg, icon) {
        toastText.textContent = msg;
        toast.querySelector('i').className = icon || 'fas fa-check-circle';
        toast.classList.add('show');
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => toast.classList.remove('show'), 2600);
    }

    /* ================================================================
       BOOT
       ================================================================ */
    async function boot() {
        try {
            const res = await fetch('/api/config');
            CONFIG = await res.json();
        } catch (err) {
            console.error('[boot] config fetch failed', err);
            showToast('Failed to load configuration', 'fas fa-triangle-exclamation');
            return;
        }

        // Set defaults
        const d = CONFIG.defaults;
        inputs.spend.num.value = d.spend;           inputs.spend.range.value = d.spend;
        inputs.customers.num.value = d.customers;   inputs.customers.range.value = d.customers;
        inputs.months.num.value = d.months;         inputs.months.range.value = d.months;
        inputs.arpu.num.value = d.arpu;             inputs.arpu.range.value = d.arpu;
        inputs.marginPct.num.value = d.marginPct;   inputs.marginPct.range.value = d.marginPct;
        inputs.churnPct.num.value = d.churnPct;     inputs.churnPct.range.value = d.churnPct;
        inputs.targetCustomers.num.value = d.targetCustomers;
        inputs.targetCustomers.range.value = d.targetCustomers;

        wireAllInputs();

        // Mode tabs
        $('tabCAC').dataset.mode = 'cac';
        $('tabLTV').dataset.mode = 'ltv';
        $('tabScale').dataset.mode = 'scale';
        $('tabCAC').addEventListener('click', () => setMode('cac'));
        $('tabLTV').addEventListener('click', () => setMode('ltv'));
        $('tabScale').addEventListener('click', () => setMode('scale'));

        // Chips
        document.querySelectorAll('.chip[data-amt]').forEach(chip => {
            chip.addEventListener('click', () => {
                const amt = Number(chip.dataset.amt);
                inputs.spend.num.value = amt;
                inputs.spend.range.value = Math.min(amt, CONFIG.limits.spend.max);
                document.querySelectorAll('.chip[data-amt]').forEach(c =>
                    c.classList.toggle('active', Number(c.dataset.amt) === amt));
                scheduleUpdate(true);
            });
        });

        // Buttons
        $('calcBtn').addEventListener('click', () => {
            scheduleUpdate(true);
            document.querySelector('.panel .result-hero')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        $('resetBtn').addEventListener('click', () => {
            Object.entries(CONFIG.defaults).forEach(([k, v]) => {
                if (inputs[k]) {
                    inputs[k].num.value = v;
                    inputs[k].range.value = v;
                }
            });
            BP_FIELDS.forEach(el => el.value = 0);
            updateBpTotal();
            scheduleUpdate(true);
            showToast('Reset to defaults', 'fas fa-rotate-left');
        });

        $('exportWordBtn').addEventListener('click', openCustomizeModal);
        $('exportPdfBtn').addEventListener('click', openCustomizeModal);
        $('exportCsvBtn').addEventListener('click', requestCsv);
        $('printBtn').addEventListener('click', () => {
            scheduleUpdate(true);
            setTimeout(() => window.print(), 200);
        });

        // Modal
        $('customizeCloseBtn').addEventListener('click', closeCustomizeModal);
        customizeModal.addEventListener('click', e => {
            if (e.target === customizeModal) closeCustomizeModal();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && customizeModal.classList.contains('open'))
                closeCustomizeModal();
        });
        $('modalGenWord').addEventListener('click', () => {
            closeCustomizeModal();
            requestReport('word');
        });
        $('modalGenPdf').addEventListener('click', () => {
            closeCustomizeModal();
            requestReport('pdf');
        });
        $('resetCustomize').addEventListener('click', () => {
            applyCustomizationToModal(CONFIG.defaultCustomization);
            try { localStorage.removeItem(STORAGE_KEY); } catch {}
            showToast('Reset to defaults', 'fas fa-rotate-left');
        });

        // Itemized spend
        BP_FIELDS.forEach(el => {
            el.addEventListener('input', updateBpTotal);
            el.addEventListener('blur', () => {
                el.value = Math.max(0, Number(el.value) || 0);
                updateBpTotal();
            });
        });
        $('bpApplyBtn').addEventListener('click', () => {
            const total = bpSum();
            if (total <= 0) {
                showToast('Add at least one line item', 'fas fa-triangle-exclamation');
                return;
            }
            inputs.spend.num.value = total;
            inputs.spend.range.value = Math.min(total, CONFIG.limits.spend.max);
            updateBpTotal();
            scheduleUpdate(true);
            showToast('Itemized total applied', 'fas fa-check');
        });
        $('bpResetBtn').addEventListener('click', () => {
            BP_FIELDS.forEach(el => el.value = 0);
            updateBpTotal();
            showToast('Line items cleared', 'fas fa-rotate-left');
        });

        // Share link
        $('shareBtn').addEventListener('click', async () => {
            const params = new URLSearchParams(gatherInputs());
            const url = `${location.origin}${location.pathname}#${params}`;
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(url);
                    showToast('Share link copied', 'fas fa-link');
                } else {
                    throw new Error('no clipboard');
                }
            } catch {
                const ta = document.createElement('textarea');
                ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); showToast('Share link copied', 'fas fa-link'); }
                catch { showToast('Copy failed — link in URL bar', 'fas fa-triangle-exclamation'); }
                document.body.removeChild(ta);
            }
            try { history.replaceState(null, '', '#' + params); } catch {}
        });

        // Mobile nav
        const hamburger = $('hamburgerBtn');
        const mobileNav = $('mobileNav');
        const mobileOverlay = $('mobileOverlay');
        const mobileClose = $('mobileCloseBtn');
        const openMobile = () => {
            mobileNav.classList.add('open'); mobileOverlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            hamburger.setAttribute('aria-expanded', 'true');
        };
        const closeMobile = () => {
            mobileNav.classList.remove('open'); mobileOverlay.classList.remove('open');
            document.body.style.overflow = '';
            hamburger.setAttribute('aria-expanded', 'false');
        };
        hamburger.addEventListener('click', openMobile);
        mobileClose.addEventListener('click', closeMobile);
        mobileOverlay.addEventListener('click', closeMobile);
        mobileNav.querySelectorAll('a').forEach(l => l.addEventListener('click', closeMobile));

        // Scroll chrome
        const scrollBtn = $('scrollTopBtn');
        const progressBar = $('progressBar');
        window.addEventListener('scroll', () => {
            const top = window.scrollY;
            const h = document.documentElement.scrollHeight - window.innerHeight;
            const p = h > 0 ? (top / h) * 100 : 0;
            progressBar.style.width = p + '%';
            progressBar.setAttribute('aria-valuenow', Math.round(p));
            scrollBtn.classList.toggle('visible', top > 500);
        }, { passive: true });
        scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        // FAQ accordion
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const q = item.querySelector('.faq-question');
            const a = item.querySelector('.faq-answer');
            q.addEventListener('click', () => {
                const wasOpen = a.classList.contains('open');
                faqItems.forEach(o => {
                    o.querySelector('.faq-answer').classList.remove('open');
                    o.querySelector('.faq-question').classList.remove('open');
                    o.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                });
                if (!wasOpen) {
                    a.classList.add('open'); q.classList.add('open');
                    q.setAttribute('aria-expanded', 'true');
                }
            });
        });

        // Reveal on scroll
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('.reveal').forEach(el => io.observe(el));

        // Keyboard shortcuts
        document.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const k = e.key.toLowerCase();
            if (k === 'c') setMode('cac');
            if (k === 'l') setMode('ltv');
            if (k === 's') setMode('scale');
            if (k === 'r') $('resetBtn').click();
        });

        // URL state
        if (location.hash) {
            const params = new URLSearchParams(location.hash.slice(1));
            for (const [k, v] of params.entries()) {
                if (inputs[k]) {
                    inputs[k].num.value = v;
                    inputs[k].range.value = v;
                }
            }
        }

        // Initial render
        setMode('cac');
        updateBpTotal();
    }

    document.addEventListener('DOMContentLoaded', boot);

    console.log('✅ CAC Calculator frontend loaded (backend-driven)');
})();