/* TerraScope — graphiques de la fiche pays.
   Un seul module, sans dépendance, pour des graphiques cohérents :
   grilles fines, graduations rondes, étiquettes directes sélectives,
   info-bulle au survol / au clavier et tableau de données accessible. */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const fr = (value, digits = 1) => Number(value).toLocaleString('fr-FR', {maximumFractionDigits: digits});
  const signed = (value, digits = 1) => (value > 0 ? '+' : value < 0 ? '−' : '') + fr(Math.abs(value), digits);

  function svg(tag, attrs = {}, text) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function html(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* Graduations « rondes » : pas de 1, 2, 2,5 ou 5 × 10^n. */
  function niceTicks(min, max, target = 5) {
    if (!(max > min)) max = min + 1;
    const raw = (max - min) / Math.max(1, target);
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(s => s >= raw);
    const start = Math.floor(min / step) * step;
    const end = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return ticks;
  }

  function dataTable(caption, headers, rows) {
    const details = html('details', 'tsc-data');
    details.append(html('summary', '', 'Afficher les données'));
    const wrap = html('div', 'tsc-table');
    const table = html('table');
    table.append(html('caption', '', caption));
    const head = html('tr');
    headers.forEach(h => { const th = html('th', '', h); th.scope = 'col'; head.append(th); });
    const thead = html('thead'); thead.append(head);
    const tbody = html('tbody');
    rows.forEach(r => { const tr = html('tr'); r.forEach(c => tr.append(html('td', '', c))); tbody.append(tr); });
    table.append(thead, tbody); wrap.append(table); details.append(wrap);
    return details;
  }

  /* ------------------------------------------------------------------ */
  /* Série temporelle : émissions observées                              */
  /* ------------------------------------------------------------------ */
  function timeSeries(root, opts) {
    const series = opts.series.filter(d => Number.isFinite(d.value));
    if (!series.length) return;
    const unit = opts.unit || '';
    const base = series.find(d => d.year === opts.baseYear) || series[0];
    const last = series.at(-1);
    const peak = series.reduce((a, b) => (b.value > a.value ? b : a));

    root.replaceChildren();
    root.classList.add('tsc-card');

    const header = html('div', 'tsc-header');
    const titles = html('div');
    titles.append(html('p', 'tsc-eyebrow', opts.eyebrow), html('h3', 'tsc-title', opts.title), html('p', 'tsc-subtitle', opts.subtitle));
    const stats = html('div', 'tsc-stats');
    const statLast = html('div', 'tsc-stat');
    statLast.append(html('span', 'tsc-stat-label', 'En ' + last.year), html('strong', 'tsc-stat-value', fr(last.value)), html('span', 'tsc-stat-unit', unit));
    const change = (last.value - base.value) / base.value * 100;
    const statChange = html('div', 'tsc-stat');
    const badge = html('strong', 'tsc-stat-value tsc-delta ' + (change <= 0 ? 'is-down' : 'is-up'), signed(change) + ' %');
    statChange.append(html('span', 'tsc-stat-label', 'Depuis ' + base.year), badge, html('span', 'tsc-stat-unit', 'variation'));
    stats.append(statLast, statChange);
    header.append(titles, stats);

    const plotWrap = html('div', 'tsc-plot');
    const chart = svg('svg', {role: 'img', 'aria-label': opts.ariaLabel || opts.title, tabindex: '0', focusable: 'true'});
    const tip = html('div', 'tsc-tooltip'); tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
    plotWrap.append(chart, tip);

    const live = html('p', 'tsc-sr'); live.setAttribute('aria-live', 'polite');

    const foot = html('div', 'tsc-foot');
    foot.append(html('span', '', opts.source || ''), html('span', '', 'Survol ou flèches ← → pour parcourir la série'));
    const table = dataTable(opts.title + ' (' + unit + ')', ['Année', unit, 'Écart à ' + base.year],
      series.map(d => [String(d.year), fr(d.value), signed((d.value - base.value) / base.value * 100) + ' %']));

    root.append(header, plotWrap, live, foot, table);

    let active = series.length - 1, geometry = null;

    function draw() {
      const width = Math.round(plotWrap.clientWidth);
      if (width <= 0) return;
      const height = width < 520 ? 240 : 300;
      const margin = {top: 18, right: width < 520 ? 16 : 92, bottom: 30, left: 44};
      const ticks = niceTicks(0, peak.value * 1.04, 5);
      const yMax = ticks.at(-1);
      const x0 = series[0].year, x1 = last.year;
      const x = year => margin.left + (year - x0) / (x1 - x0 || 1) * (width - margin.left - margin.right);
      const y = value => margin.top + (1 - value / yMax) * (height - margin.top - margin.bottom);
      geometry = {x, y, margin, width, height};

      chart.setAttribute('viewBox', `0 0 ${width} ${height}`);
      chart.setAttribute('width', width);
      chart.setAttribute('height', height);
      chart.replaceChildren();

      const grid = svg('g', {class: 'tsc-grid'});
      ticks.forEach(t => {
        grid.append(svg('line', {x1: margin.left, x2: width - margin.right, y1: y(t), y2: y(t), class: t === 0 ? 'tsc-baseline' : ''}));
        grid.append(svg('text', {x: margin.left - 10, y: y(t) + 4, 'text-anchor': 'end', class: 'tsc-axis'}, fr(t, 0)));
      });
      const step = width < 520 ? 10 : 5;
      const years = [];
      for (let yr = Math.ceil(x0 / step) * step; yr <= x1; yr += step) years.push(yr);
      if (!years.includes(x0)) years.unshift(x0);
      if (x1 - years.at(-1) >= Math.max(3, step * 0.6)) years.push(x1);
      years.forEach(yr => {
        grid.append(svg('line', {x1: x(yr), x2: x(yr), y1: y(0), y2: y(0) + 5, class: 'tsc-tick'}));
        grid.append(svg('text', {x: x(yr), y: height - 8, 'text-anchor': 'middle', class: 'tsc-axis'}, String(yr)));
      });
      chart.append(grid);

      // Repère : niveau de l'année de base.
      const ref = svg('g', {class: 'tsc-ref'});
      ref.append(svg('line', {x1: margin.left, x2: width - margin.right, y1: y(base.value), y2: y(base.value)}));
      // L'étiquette se place à l'extrémité où la courbe s'éloigne le plus du repère.
      const tail = series.slice(-5), head = series.slice(1, 6);
      const gap = part => Math.min(...part.map(d => Math.abs(d.value - base.value)));
      const atRight = gap(tail) >= gap(head);
      const above = (atRight ? tail : head).every(d => d.value <= base.value);
      ref.append(svg('text', {
        x: atRight ? width - margin.right - 4 : margin.left + 6,
        y: y(base.value) + (above ? -7 : 15),
        'text-anchor': atRight ? 'end' : 'start',
        class: 'tsc-ref-label'
      }, 'Niveau ' + base.year + ' · ' + fr(base.value)));
      chart.append(ref);

      const points = series.map(d => `${x(d.year).toFixed(1)},${y(d.value).toFixed(1)}`);
      chart.append(svg('path', {d: `M${x(x0)},${y(0)} L${points.join(' L')} L${x(x1)},${y(0)} Z`, class: 'tsc-area'}));
      chart.append(svg('path', {d: 'M' + points.join(' L'), class: 'tsc-line'}));

      // Étiquette directe sur le dernier point.
      chart.append(svg('circle', {cx: x(x1), cy: y(last.value), r: 4.5, class: 'tsc-dot'}));
      if (margin.right > 40) {
        const label = svg('text', {x: x(x1) + 10, y: y(last.value) + 4, class: 'tsc-end-label'});
        label.append(svg('tspan', {class: 'tsc-end-value'}, fr(last.value)));
        label.append(svg('tspan', {x: x(x1) + 10, dy: 15, class: 'tsc-end-unit'}, unit.split(' ')[0] + ' · ' + last.year));
        chart.append(label);
      }

      const hover = svg('g', {class: 'tsc-hover'});
      hover.append(svg('line', {class: 'tsc-crosshair', y1: margin.top, y2: y(0)}));
      hover.append(svg('circle', {class: 'tsc-hover-dot', r: 5}));
      chart.append(hover);
      hover.style.display = 'none';
      chart.append(svg('rect', {x: margin.left, y: 0, width: width - margin.left - margin.right, height: y(0), class: 'tsc-hit'}));
    }

    function show(index, announce) {
      if (!geometry) return;
      active = Math.max(0, Math.min(series.length - 1, index));
      const d = series[active], {x, y, width} = geometry;
      const hover = chart.querySelector('.tsc-hover');
      hover.style.display = '';
      hover.querySelector('line').setAttribute('x1', x(d.year));
      hover.querySelector('line').setAttribute('x2', x(d.year));
      hover.querySelector('circle').setAttribute('cx', x(d.year));
      hover.querySelector('circle').setAttribute('cy', y(d.value));
      const delta = (d.value - base.value) / base.value * 100;
      tip.innerHTML = '';
      tip.append(html('span', 'tsc-tip-year', String(d.year)));
      const row = html('span', 'tsc-tip-row');
      row.append(html('b', '', fr(d.value)), html('span', '', ' ' + unit));
      tip.append(row, html('span', 'tsc-tip-meta', d.year === base.year ? 'Année de référence' : signed(delta) + ' % vs ' + base.year));
      tip.hidden = false;
      const tipWidth = tip.offsetWidth;
      let left = x(d.year) + 14;
      if (left + tipWidth > width - 4) left = x(d.year) - tipWidth - 14;
      tip.style.left = Math.max(4, left) + 'px';
      tip.style.top = Math.max(0, y(d.value) - tip.offsetHeight - 10) + 'px';
      if (announce) live.textContent = d.year + ' : ' + fr(d.value) + ' ' + unit;
    }
    function hide() {
      chart.querySelector('.tsc-hover')?.style.setProperty('display', 'none');
      tip.hidden = true;
    }
    function indexAt(event) {
      const rect = chart.getBoundingClientRect(), {margin, width} = geometry;
      const px = (event.clientX - rect.left) * (width / rect.width);
      const year = series[0].year + (px - margin.left) / (width - margin.left - margin.right) * (last.year - series[0].year);
      return series.reduce((best, d, i) => Math.abs(d.year - year) < Math.abs(series[best].year - year) ? i : best, 0);
    }
    chart.addEventListener('pointermove', e => { if (geometry) show(indexAt(e)); });
    chart.addEventListener('pointerleave', hide);
    chart.addEventListener('focus', () => show(active, true));
    chart.addEventListener('blur', hide);
    chart.addEventListener('keydown', e => {
      const moves = {ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity};
      if (!(e.key in moves)) return;
      e.preventDefault();
      const m = moves[e.key];
      show(m === -Infinity ? 0 : m === Infinity ? series.length - 1 : active + m, true);
    });
    new ResizeObserver(() => { draw(); if (!tip.hidden) show(active); }).observe(plotWrap);
    draw();
  }

  /* ------------------------------------------------------------------ */
  /* Mix électrique : barre segmentée (partie d'un tout) + barres classées */
  /* ------------------------------------------------------------------ */
  function mixBreakdown(root, opts) {
    const items = opts.items.filter(d => Number.isFinite(d.value) && d.value > 0);
    const ranked = [...items].sort((a, b) => b.value - a.value);
    const max = ranked[0]?.value || 1;
    root.replaceChildren();
    root.classList.add('tsc-mix');

    const bar = html('div', 'tsc-stack');
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', opts.ariaLabel + ' : ' + items.map(d => d.name + ' ' + fr(d.value) + ' %').join(', '));
    const tip = html('div', 'tsc-tooltip tsc-stack-tip'); tip.hidden = true;
    items.forEach(d => {
      const seg = html('span', 'tsc-seg');
      seg.style.flexGrow = d.value;
      seg.style.background = d.color;
      seg.dataset.key = d.key;
      if (d.value >= 9) seg.append(html('em', d.dark ? 'is-dark' : '', fr(d.value, 0) + ' %'));
      seg.addEventListener('pointerenter', () => highlight(d.key));
      seg.addEventListener('pointermove', e => {
        tip.replaceChildren(html('span', 'tsc-tip-year', d.name), html('b', '', fr(d.value, 2) + ' %'));
        tip.hidden = false;
        const box = root.getBoundingClientRect();
        tip.style.left = Math.min(box.width - tip.offsetWidth, Math.max(0, e.clientX - box.left - tip.offsetWidth / 2)) + 'px';
        tip.style.top = '-' + (tip.offsetHeight + 8) + 'px';
      });
      seg.addEventListener('pointerleave', () => { tip.hidden = true; highlight(null); });
      bar.append(seg);
    });
    const scale = html('div', 'tsc-stack-scale');
    ['0 %', '50 %', '100 %'].forEach(t => scale.append(html('span', '', t)));

    const list = html('ul', 'tsc-ranked');
    ranked.forEach(d => {
      const li = html('li');
      li.dataset.key = d.key;
      const name = html('span', 'tsc-ranked-name');
      const sw = html('i'); sw.style.background = d.color;
      name.append(sw, document.createTextNode(d.name));
      const track = html('span', 'tsc-ranked-track');
      const fill = html('span', 'tsc-ranked-fill');
      fill.style.width = Math.min(100, d.value) + '%';
      fill.style.background = d.color;
      track.append(fill);
      li.append(name, track, html('b', '', fr(d.value, d.value < 1 ? 2 : 1) + ' %'));
      li.addEventListener('pointerenter', () => highlight(d.key));
      li.addEventListener('pointerleave', () => highlight(null));
      list.append(li);
    });
    function highlight(key) {
      root.classList.toggle('has-focus', !!key);
      root.querySelectorAll('[data-key]').forEach(n => n.classList.toggle('is-active', n.dataset.key === key));
    }
    const stackWrap = html('div', 'tsc-stack-wrap');
    stackWrap.append(tip, bar, scale);
    root.append(stackWrap, list);
  }

  global.TerraCharts = {timeSeries, mixBreakdown, niceTicks, format: fr, signed};
})(window);
