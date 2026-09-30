(function () {
const money = (value) => `$${Number(value).toFixed(value >= 100 ? 1 : 2)}M`;
const moneyK = (value) => `$${Math.round(value)}K`;
const whole = (value) => Math.round(value).toLocaleString('en-US');
const pct = (value) => `${Number(value).toFixed(1)}%`;

const state = { data: null, measure: 'market_millions', breakdown: 'conference', scope: 'p4' };
const measureLabels = {
  market_millions: 'Combined roster market',
  median_program_millions: 'Median program estimate',
  market_share: 'Share of D-I market',
  programs: 'Programs',
  leader_millions: 'Largest program estimate'
};
const formatMeasure = (measure, value) => measure === 'programs' ? whole(value) : measure === 'market_share' ? pct(value) : money(value);

function builderMoney(thousands) {
  return thousands >= 1000 ? `$${(thousands / 1000).toFixed(2)}M` : `$${Math.round(thousands)}K`;
}

function ballEmoji(kind) {
  return { football: '🏈', basketball: '🏀', baseball: '⚾', softball: '🥎', soccer: '⚽', volleyball: '🏐', gymnastics: '🤸', lacrosse: '🥍' }[kind] || '🏅';
}

function setupBuilder(data) {
  const sportSelect = document.querySelector('#builderSport'); const positionSelect = document.querySelector('#builderPosition'); const conferenceSelect = document.querySelector('#builderConference');
  const sports = data.player_builder.sports; const conferences = data.conferences;
  sportSelect.innerHTML = Object.keys(sports).map((sport) => `<option value="${sport}">${sport}</option>`).join('');
  conferenceSelect.innerHTML = conferences.map((row) => `<option value="${row.conference}">${row.conference} · ${row.tier}</option>`).join('');
  function updatePositions() { const sport = sports[sportSelect.value]; positionSelect.innerHTML = Object.keys(sport.positions).map((position) => `<option value="${position}">${position}</option>`).join(''); updateBuilder(); }
  function updateBuilder() {
    const sport = sports[sportSelect.value]; const position = positionSelect.value; const conference = conferences.find((row) => row.conference === conferenceSelect.value); const baseline = sport.positions[position];
    const allProgramAverage = data.market.total_millions / data.market.program_count; const conferenceProgramAverage = conference.market_millions / conference.programs; const multiplier = Math.sqrt(conferenceProgramAverage / allProgramAverage); const estimate = baseline * multiplier;
    const result = document.querySelector('#builderResult'); result.style.background = `linear-gradient(110deg, #0d3d83, ${sport.color})`;
    document.querySelector('#builderBall').textContent = ballEmoji(sport.ball); document.querySelector('#builderValue').textContent = builderMoney(estimate); document.querySelector('#builderSelection').textContent = `${position} · ${sportSelect.value} · ${conference.conference}`; document.querySelector('#builderBaseline').textContent = builderMoney(baseline); document.querySelector('#builderMultiplier').textContent = `${multiplier.toFixed(2)}×`; document.querySelector('#builderScope').textContent = 'D-I conference model';
    document.querySelector('#builderSourceNote').textContent = sport.source_type === 'FBS position median' ? 'Football baseline: published FBS position median.' : 'Illustrative sport baseline: useful for comparison, not reported pay.';
  }
  sportSelect.addEventListener('change', updatePositions); positionSelect.addEventListener('change', updateBuilder); conferenceSelect.addEventListener('change', updateBuilder); updatePositions();
}

function svgFrame(target, width = 720, height = 360) {
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Dashboard chart"></svg>`;
  return target.querySelector('svg');
}
function svgText(svg, x, y, value, className = '') { const node = document.createElementNS('http://www.w3.org/2000/svg', 'text'); node.setAttribute('x', x); node.setAttribute('y', y); node.setAttribute('class', className); node.textContent = value; svg.appendChild(node); }
function svgLine(svg, x1, y1, x2, y2) { const node = document.createElementNS('http://www.w3.org/2000/svg', 'line'); node.setAttribute('x1', x1); node.setAttribute('y1', y1); node.setAttribute('x2', x2); node.setAttribute('y2', y2); node.setAttribute('class', 'grid-line'); svg.appendChild(node); }
function svgRect(svg, x, y, width, height, color) { const node = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); node.setAttribute('x', x); node.setAttribute('y', y); node.setAttribute('width', Math.max(0, width)); node.setAttribute('height', height); node.setAttribute('rx', 3); node.setAttribute('fill', color); node.setAttribute('class', 'bar'); svg.appendChild(node); }

function scopedRows() {
  if (state.scope === 'all') return state.data.conferences;
  const tierByScope = { p4: 'Power 4', g5: 'Group of 5', fcs: 'FCS', no_football: 'No football' };
  return state.data.conferences.filter((row) => row.tier === tierByScope[state.scope]);
}

function scopeSummary() {
  const rows = scopedRows();
  if (state.scope === 'all') return { label: 'All D-I conferences', market: state.data.market.total_millions, share: 100, programs: state.data.market.program_count };
  return { label: state.scope === 'p4' ? 'Power 4' : state.scope === 'g5' ? 'Group of 5' : state.scope === 'fcs' ? 'FCS' : 'No football', market: rows.reduce((sum, row) => sum + row.market_millions, 0), share: rows.reduce((sum, row) => sum + row.market_share, 0), programs: rows.reduce((sum, row) => sum + row.programs, 0) };
}

function colorFor(row) { return row.tier === 'Power 4' ? '#1769d5' : row.tier === 'Group of 5' ? '#e0ab38' : '#8f70c9'; }

function chartRows() {
  if (state.breakdown === 'conference') return scopedRows().map((row) => ({ label: row.conference, value: row[state.measure], count: row.programs, row }));
  if (state.breakdown === 'tier') {
    const groups = ['Power 4', 'Group of 5', 'No football', 'FCS'];
    return groups.map((tier) => { const rows = state.data.conferences.filter((row) => row.tier === tier); const row = { conference: tier, tier, programs: rows.reduce((sum, item) => sum + item.programs, 0), market_millions: rows.reduce((sum, item) => sum + item.market_millions, 0), market_share: rows.reduce((sum, item) => sum + item.market_share, 0), median_program_millions: rows.reduce((sum, item) => sum + item.median_program_millions, 0) / rows.length, leader_millions: Math.max(...rows.map((item) => item.leader_millions)) }; return { label: tier, value: row[state.measure], count: row.programs, row }; });
  }
  return [];
}

function drawBars(target, rows) {
  const width = 720; const rowHeight = rows.length > 15 ? 29 : 45; const height = Math.max(250, rows.length * rowHeight + 64); const left = rows.length > 15 ? 175 : 155; const right = 92; const top = 28; const plot = width - left - right; const svg = svgFrame(target, width, height);
  const max = Math.max(...rows.map((row) => row.value), 1); const formatter = (value) => formatMeasure(state.measure, value);
  [0, 0.5, 1].forEach((fraction) => { const x = left + plot * fraction; svgLine(svg, x, top - 12, x, height - 24); svgText(svg, x, 16, formatter(max * fraction), 'axis-label axis-number'); });
  rows.forEach((row, index) => { const y = top + index * rowHeight; const color = row.row ? colorFor(row.row) : '#1769d5'; svgText(svg, left - 12, y + 17, row.label, 'axis-label axis-left'); svgRect(svg, left, y + 3, plot * row.value / max, 20, color); svgText(svg, Math.min(width - 8, left + plot * row.value / max + 8), y + 18, formatter(row.value), 'bar-label'); });
}

function drawSportMix(target) {
  const rows = state.data.conferences.filter((row) => row.tier === 'Power 4'); const keys = ['Football', "Men's basketball", "Women's basketball", 'Baseball', 'Everything else']; const colors = { Football: '#1769d5', "Men's basketball": '#8f70c9', "Women's basketball": '#f26b5e', Baseball: '#e0ab38', "Everything else": '#c5d0df' }; const width = 720; const rowHeight = 56; const height = 280; const left = 110; const right = 24; const top = 28; const plot = width - left - right; const svg = svgFrame(target, width, height);
  [0, 50, 100].forEach((value) => { const x = left + plot * value / 100; svgLine(svg, x, top - 12, x, height - 24); svgText(svg, x, 16, `${value}%`, 'axis-label axis-number'); });
  rows.forEach((row, index) => { const y = top + index * rowHeight; const mix = state.data.sport_mix[row.conference]; let cursor = left; svgText(svg, left - 12, y + 20, row.conference, 'axis-label axis-left'); keys.forEach((key) => { const value = 100 * mix[key] / row.market_millions; const segment = plot * value / 100; svgRect(svg, cursor, y + 4, segment, 23, colors[key]); if (segment > 42) svgText(svg, cursor + segment / 2, y + 21, `${Math.round(value)}%`, 'stack-label'); cursor += segment; }); });
}

function drawPositionChart(target) {
  const rows = [...state.data.fbs_position_context.groups].sort((a, b) => b.modeled_market_millions - a.modeled_market_millions); const width = 720; const rowHeight = 30; const height = Math.max(250, rows.length * rowHeight + 64); const left = 165; const right = 86; const top = 28; const plot = width - left - right; const svg = svgFrame(target, width, height); const max = 22;
  [0, 0.5, 1].forEach((fraction) => { const x = left + plot * fraction; svgLine(svg, x, top - 12, x, height - 24); svgText(svg, x, 16, pct(max * fraction), 'axis-label axis-number'); });
  rows.forEach((row, index) => { const y = top + index * rowHeight; const value = 100 * row.modeled_market_millions / state.data.fbs_position_context.market_millions; const color = row.position === 'Quarterback' ? '#1769d5' : row.position === 'Wide receiver' ? '#f26b5e' : '#8f70c9'; svgText(svg, left - 12, y + 17, row.position, 'axis-label axis-left'); svgRect(svg, left, y + 3, plot * value / max, 20, color); svgText(svg, Math.min(width - 8, left + plot * value / max + 8), y + 18, pct(value), 'bar-label'); });
}

function updateKpis() {
  const summary = scopeSummary(); const rows = state.scope === 'all' ? state.data.conferences : scopedRows(); const measureValue = state.scope === 'all' && state.measure === 'market_millions' ? summary.market : state.scope === 'all' && state.measure === 'market_share' ? 100 : state.scope === 'all' && state.measure === 'programs' ? summary.programs : state.measure === 'market_millions' ? summary.market : state.measure === 'market_share' ? summary.share : state.measure === 'programs' ? summary.programs : rows.reduce((sum, row) => sum + row[state.measure], 0) / Math.max(rows.length, 1);
  document.querySelector('#kpiMetricLabel').textContent = measureLabels[state.measure]; document.querySelector('#kpiMetricValue').textContent = formatMeasure(state.measure, measureValue); document.querySelector('#kpiMarket').textContent = money(summary.market); document.querySelector('#kpiShare').textContent = pct(summary.share); document.querySelector('#kpiScope').textContent = summary.label;
}

function updateTable(rows) {
  const head = document.querySelector('#dataHead'); const body = document.querySelector('#dataTable');
  const focusMarket = scopeSummary().market;
  head.innerHTML = '<tr><th>Conference</th><th>Tier</th><th>Programs</th><th>Median program</th><th>Market</th><th>D-I share</th><th>Focus share</th><th>Leader</th></tr>';
  body.innerHTML = rows.map((item) => { const row = item.row || item; return `<tr><td class="table-key">${row.conference}</td><td>${row.tier}</td><td>${whole(row.programs)}</td><td>${money(row.median_program_millions)}</td><td>${money(row.market_millions)}</td><td>${pct(row.market_share)}</td><td>${pct(100 * row.market_millions / focusMarket)}</td><td>${row.leader} · ${money(row.leader_millions)}</td></tr>`; }).join('');
  document.querySelector('#tableNote').textContent = `${rows.length} conferences · 2026 D-I estimates`;
}

function updatePositionTable() {
  const rows = [...state.data.fbs_position_context.groups].sort((a, b) => b.modeled_market_millions - a.modeled_market_millions); const head = document.querySelector('#positionHead'); const body = document.querySelector('#positionTable');
  head.innerHTML = '<tr><th>Position</th><th>Players</th><th>Market share</th><th>Median value</th><th>Mean value</th><th>Modeled market</th></tr>';
  body.innerHTML = rows.map((row) => `<tr><td class="table-key">${row.position}</td><td>${whole(row.players)}</td><td>${pct(100 * row.modeled_market_millions / state.data.fbs_position_context.market_millions)}</td><td>${moneyK(row.median_thousands)}</td><td>${moneyK(row.mean_thousands)}</td><td>${money(row.modeled_market_millions)}</td></tr>`).join('');
}

function setupSchoolExplorer(data) {
  const conferenceSelect = document.querySelector('#schoolConference'); const sortSelect = document.querySelector('#schoolSort'); const cloud = document.querySelector('#schoolCloud'); const detail = document.querySelector('#schoolDetail'); const surprise = document.querySelector('#surpriseSchool');
  const colors = { SEC: '#1769d5', 'Big Ten': '#ef8354', ACC: '#7b61b5', 'Big 12': '#2b9b8d' }; const conferenceTotals = Object.fromEntries(data.conferences.filter((row) => row.tier === 'Power 4').map((row) => [row.conference, row.market_millions])); const state = { conference: 'all', sort: 'market', selected: null };
  function currentRows() {
    const rows = data.power4_programs.filter((row) => state.conference === 'all' || row.conference === state.conference);
    if (state.sort === 'alphabetical') return rows.sort((a, b) => a.school.localeCompare(b.school));
    if (state.sort === 'share') return rows.sort((a, b) => b.market_millions / conferenceTotals[b.conference] - a.market_millions / conferenceTotals[a.conference]);
    return rows.sort((a, b) => b.market_millions - a.market_millions);
  }
  function renderDetail(row) {
    if (!row) { detail.innerHTML = ''; return; }
    const conferenceRows = data.power4_programs.filter((item) => item.conference === row.conference).sort((a, b) => b.market_millions - a.market_millions); const rank = conferenceRows.findIndex((item) => item.school === row.school) + 1; const share = 100 * row.market_millions / conferenceTotals[row.conference]; detail.innerHTML = `<div class="school-detail-icon" style="--school-color:${colors[row.conference]}">🎓</div><div class="school-detail-copy"><strong>${row.school}</strong><span>${row.conference} · #${rank} of ${conferenceRows.length} · ${share.toFixed(1)}% of conference market</span></div><div class="school-detail-value">${money(row.market_millions)}</div>`;
  }
  function render() {
    const rows = currentRows(); if (!rows.length) return; if (!state.selected || !rows.some((row) => row.school === state.selected)) state.selected = rows[0].school; const max = Math.max(...rows.map((row) => row.market_millions));
    cloud.innerHTML = rows.map((row, index) => { const share = 100 * row.market_millions / conferenceTotals[row.conference]; const selected = row.school === state.selected ? ' selected' : ''; const width = Math.max(18, 100 * row.market_millions / max); return `<button class="school-sticker${selected}" style="--school-color:${colors[row.conference]}; min-height:${Math.round(88 + 25 * row.market_millions / max)}px" data-school="${row.school}"><span class="school-rank">#${index + 1}</span><span class="school-icon">🏫</span><strong>${row.school}</strong><span class="school-value">${money(row.market_millions)}</span><span class="school-share">${share.toFixed(1)}% of ${row.conference}</span><span class="school-meter"><i style="width:${width}%"></i></span></button>`; }).join('');
    cloud.querySelectorAll('.school-sticker').forEach((button) => button.addEventListener('click', () => { state.selected = button.dataset.school; render(); })); renderDetail(rows.find((row) => row.school === state.selected));
  }
  conferenceSelect.addEventListener('change', (event) => { state.conference = event.target.value; state.selected = null; render(); }); sortSelect.addEventListener('change', (event) => { state.sort = event.target.value; render(); }); surprise.addEventListener('click', () => { const rows = currentRows(); state.selected = rows[Math.floor(Math.random() * rows.length)].school; render(); }); render();
}

function render() {
  updateKpis();
  const rows = chartRows();
  if (state.breakdown === 'sport') { drawSportMix(document.querySelector('#mainChart')); } else { drawBars(document.querySelector('#mainChart'), rows); }
  drawPositionChart(document.querySelector('#positionChart')); updatePositionTable();
  updateTable(state.scope === 'all' ? state.data.conferences : scopedRows());
  document.querySelector('#mainChartTitle').textContent = state.breakdown === 'sport' ? 'Where the Power 4 market sits by sport' : `${measureLabels[state.measure]} by ${state.breakdown}`;
  document.querySelector('#chartNote').textContent = state.breakdown === 'sport' ? 'Sport values are modeled roster-market estimates; “Everything else” is the source’s combined category.' : 'All values are modeled estimates from the same Division I market snapshot. They are not reported contract totals.';
}

function bind() {
  document.querySelector('#measureSelect').addEventListener('change', (event) => { state.measure = event.target.value; render(); });
  document.querySelector('#breakdownSelect').addEventListener('change', (event) => { state.breakdown = event.target.value; render(); });
  document.querySelector('#scopeSelect').addEventListener('change', (event) => { state.scope = event.target.value; render(); });
  document.querySelector('#resetButton').addEventListener('click', () => { state.measure = 'market_millions'; state.breakdown = 'conference'; state.scope = 'p4'; document.querySelector('#measureSelect').value = state.measure; document.querySelector('#breakdownSelect').value = state.breakdown; document.querySelector('#scopeSelect').value = state.scope; render(); });
}

const dashboardDataUrl = new URL('data/division1_market.json', document.currentScript.src);
const dashboardData = window.NIL_DATA ? Promise.resolve(window.NIL_DATA) : fetch(dashboardDataUrl).then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); });
dashboardData.then((data) => { state.data = data; setupBuilder(data); setupSchoolExplorer(data); bind(); render(); }).catch((error) => { document.querySelectorAll('.chart-wrap').forEach((node) => { node.innerHTML = `<div class="chart-empty">Interactive data could not load: ${error.message}. Make sure the site is opened through the local server.</div>`; }); });
})();
