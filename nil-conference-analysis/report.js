(function () {
const money = (value) => `$${Number(value).toFixed(value >= 100 ? 1 : 2)}M`;
const bigMoney = (value) => `$${(Number(value) / 1000).toFixed(2)}B`;
const integer = (value) => Math.round(value).toLocaleString('en-US');
const percent = (value) => `${Number(value).toFixed(1)}%`;

function setStat(name, value) {
  document.querySelectorAll(`[data-stat="${name}"]`).forEach((node) => { node.textContent = value; });
}

function svgFrame(target, width = 720, height = 360) {
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Data visualization"></svg>`;
  return target.querySelector('svg');
}

function text(svg, x, y, value, className = '') {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  node.setAttribute('x', x); node.setAttribute('y', y); node.setAttribute('class', className); node.textContent = value;
  svg.appendChild(node); return node;
}

function rect(svg, x, y, width, height, className, fill) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  node.setAttribute('x', x); node.setAttribute('y', y); node.setAttribute('width', Math.max(0, width)); node.setAttribute('height', height); node.setAttribute('rx', 3);
  node.setAttribute('class', className); if (fill) node.setAttribute('fill', fill); svg.appendChild(node); return node;
}

function line(svg, x1, y1, x2, y2, className = '') {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  node.setAttribute('x1', x1); node.setAttribute('y1', y1); node.setAttribute('x2', x2); node.setAttribute('y2', y2); node.setAttribute('class', className); svg.appendChild(node); return node;
}

function barChart(target, rows, options = {}) {
  if (!target) return;
  const width = 720; const rowHeight = options.rowHeight || 34; const height = Math.max(250, rows.length * rowHeight + 64);
  const svg = svgFrame(target, width, height); const left = options.left || 160; const right = 86; const top = 28; const plot = width - left - right;
  const max = options.max || Math.max(...rows.map((row) => row.value), 1); const formatter = options.valueFormat || ((value) => value.toLocaleString());
  [0, 0.5, 1].forEach((fraction) => { const x = left + plot * fraction; line(svg, x, top - 12, x, height - 24, 'grid-line'); text(svg, x, 16, formatter(max * fraction), 'axis-label axis-number'); });
  rows.forEach((row, index) => {
    const y = top + index * rowHeight; const value = Number(row.value) || 0; const color = row.color || options.color || '#1769d5';
    text(svg, left - 12, y + 17, row.label, 'axis-label axis-left'); rect(svg, left, y + 3, plot * value / max, 20, 'bar', color); text(svg, Math.min(width - 8, left + plot * value / max + 8), y + 18, formatter(value), 'bar-label');
  });
}

function groupedBarChart(target, rows, series, options = {}) {
  if (!target) return;
  const width = 720; const rowHeight = options.rowHeight || 54; const height = Math.max(260, rows.length * rowHeight + 64);
  const svg = svgFrame(target, width, height); const left = options.left || 160; const right = 92; const top = 28; const plot = width - left - right;
  const max = options.max || Math.max(...rows.flatMap((row) => series.map((item) => row[item.key] || 0)), 1); const formatter = options.valueFormat || ((value) => value.toLocaleString());
  [0, 0.5, 1].forEach((fraction) => { const x = left + plot * fraction; line(svg, x, top - 12, x, height - 24, 'grid-line'); text(svg, x, 16, formatter(max * fraction), 'axis-label axis-number'); });
  rows.forEach((row, index) => {
    const y = top + index * rowHeight; text(svg, left - 12, y + 25, row.label, 'axis-label axis-left');
    series.forEach((item, seriesIndex) => { const value = Number(row[item.key]) || 0; const barY = y + seriesIndex * 22; rect(svg, left, barY, plot * value / max, 15, 'bar', item.color); text(svg, Math.min(width - 8, left + plot * value / max + 8), barY + 12, formatter(value), 'bar-label'); });
  });
}

function stackedBarChart(target, rows, keys, options = {}) {
  if (!target) return;
  const width = 720; const rowHeight = 52; const height = Math.max(260, rows.length * rowHeight + 64); const left = 110; const right = 24; const top = 28; const plot = width - left - right; const svg = svgFrame(target, width, height);
  const max = options.max || Math.max(...rows.map((row) => keys.reduce((sum, key) => sum + (row[key] || 0), 0)), 1);
  [0, 0.5, 1].forEach((fraction) => { const x = left + plot * fraction; line(svg, x, top - 12, x, height - 24, 'grid-line'); text(svg, x, 16, `${Math.round(max * fraction)}%`, 'axis-label axis-number'); });
  rows.forEach((row, index) => { const y = top + index * rowHeight; text(svg, left - 12, y + 20, row.label, 'axis-label axis-left'); let cursor = left; keys.forEach((key) => { const value = Number(row[key]) || 0; const widthValue = plot * value / max; rect(svg, cursor, y + 4, widthValue, 22, 'bar', options.colors[key]); if (widthValue > 42) text(svg, cursor + widthValue / 2, y + 20, `${Math.round(value)}%`, 'stack-label'); cursor += widthValue; }); });
}

function render(data) {
  const conferences = data.conferences; const byName = Object.fromEntries(conferences.map((row) => [row.conference, row]));
  const p4 = conferences.filter((row) => row.tier === 'Power 4');
  setStat('market_total', bigMoney(data.market.total_millions)); setStat('conference_count', integer(data.market.conference_count)); setStat('program_count', integer(data.market.program_count)); setStat('athlete_count', integer(data.market.athlete_count));
  setStat('p4_share', percent(data.market.p4_share)); setStat('top_conference', conferences[0].conference); setStat('sec_market', money(byName.SEC.market_millions)); setStat('big_ten_market', money(byName['Big Ten'].market_millions)); setStat('big12_market', money(byName['Big 12'].market_millions)); setStat('acc_market', money(byName.ACC.market_millions));
  setStat('sec_median', money(byName.SEC.median_program_millions)); setStat('big_ten_median', money(byName['Big Ten'].median_program_millions)); setStat('big12_median', money(byName['Big 12'].median_program_millions)); setStat('acc_median', money(byName.ACC.median_program_millions));
  setStat('sec_edge', percent(100 * (byName.SEC.market_millions / byName['Big Ten'].market_millions - 1)));

  barChart(document.querySelector('#conferenceChart'), p4.map((row) => ({ label: row.conference, value: row.market_millions, color: row.conference === 'SEC' ? '#1769d5' : '#8f70c9' })), { max: 900, valueFormat: money, left: 150, rowHeight: 46 });
  barChart(document.querySelector('#fullRankingChart'), conferences.slice(0, 12).map((row) => ({ label: row.conference, value: row.market_millions, color: row.tier === 'Power 4' ? '#1769d5' : row.tier === 'Group of 5' ? '#e0ab38' : '#8f70c9' })), { max: 900, valueFormat: money, left: 165, rowHeight: 32 });
  groupedBarChart(document.querySelector('#medianChart'), p4.map((row) => ({ label: row.conference, market: row.market_millions, median: row.median_program_millions })), [{ key: 'market', color: '#1769d5' }, { key: 'median', color: '#f26b5e' }], { max: 900, valueFormat: money, left: 150, rowHeight: 62 });
  stackedBarChart(document.querySelector('#sportMixChart'), p4.map((row) => { const mix = data.sport_mix[row.conference]; const total = row.market_millions; return { label: row.conference, Football: 100 * mix.Football / total, "Men's basketball": 100 * mix["Men's basketball"] / total, "Women's basketball": 100 * mix["Women's basketball"] / total, Baseball: 100 * mix.Baseball / total, "Everything else": 100 * mix["Everything else"] / total }; }), ['Football', "Men's basketball", "Women's basketball", 'Baseball', 'Everything else'], { max: 100, colors: { Football: '#1769d5', "Men's basketball": '#8f70c9', "Women's basketball": '#f26b5e', Baseball: '#e0ab38', "Everything else": '#c5d0df' } });
  barChart(document.querySelector('#leaderChart'), p4.map((row) => ({ label: row.leader, value: row.leader_millions, color: '#f26b5e' })), { max: 85, valueFormat: money, left: 165, rowHeight: 42 });
  const positions = data.fbs_position_context.groups;
  barChart(document.querySelector('#positionMarketChart'), positions.map((row) => ({ label: row.position, value: 100 * row.modeled_market_millions / data.fbs_position_context.market_millions, color: row.position === 'Quarterback' ? '#1769d5' : row.position === 'Wide receiver' ? '#f26b5e' : '#8f70c9' })), { max: 22, valueFormat: percent, left: 165, rowHeight: 30 });
  barChart(document.querySelector('#positionMedianChart'), [...positions].sort((a, b) => b.median_thousands - a.median_thousands).map((row) => ({ label: row.position, value: row.median_thousands, color: row.position === 'Quarterback' ? '#1769d5' : '#e0ab38' })), { max: 650, valueFormat: (value) => `$${Math.round(value)}K`, left: 165, rowHeight: 30 });
}

const reportDataUrl = new URL('data/division1_market.json', document.currentScript.src);
const reportData = window.NIL_DATA ? Promise.resolve(window.NIL_DATA) : fetch(reportDataUrl).then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); });
reportData.then(render).catch((error) => { document.querySelectorAll('.chart-wrap').forEach((node) => { node.innerHTML = `<div class="chart-empty">Could not load the D-I market snapshot: ${error.message}</div>`; }); });
})();
