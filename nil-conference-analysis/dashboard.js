(function () {
const whole = (value) => Math.round(Number(value)).toLocaleString('en-US');
const dollars = (value) => `$${Math.round(Number(value)).toLocaleString('en-US')}`;
const moneyM = (value) => `$${Number(value).toFixed(value >= 100 ? 1 : 2)}M`;
const percent = (value) => `${Number(value).toFixed(1)}%`;
const state = { data: null, history: null, year: 'all', group: 'all', measure: 'average_disclosure_value', breakdown: 'group', rank: '8' };
const measureLabels = { disclosure_count: 'Disclosure count', average_disclosure_value: 'Average disclosure value', median_disclosure_value: 'Median disclosure value', average_total_athlete_earnings: 'Average athlete earnings', median_total_athlete_earnings: 'Median athlete earnings', market_millions: 'Modeled market', programs: 'Programs' };
const measureFormat = (measure, value) => measure === 'disclosure_count' || measure === 'programs' ? whole(value) : measure === 'market_millions' ? moneyM(value) : dollars(value);

function svgFrame(target, width = 720, height = 360) {
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Interactive dashboard chart"></svg>`;
  return target.querySelector('svg');
}
function svgText(svg, x, y, value, className = '') { const node = document.createElementNS('http://www.w3.org/2000/svg', 'text'); node.setAttribute('x', x); node.setAttribute('y', y); node.setAttribute('class', className); node.textContent = value; svg.appendChild(node); }
function svgLine(svg, x1, y1, x2, y2) { const node = document.createElementNS('http://www.w3.org/2000/svg', 'line'); node.setAttribute('x1', x1); node.setAttribute('y1', y1); node.setAttribute('x2', x2); node.setAttribute('y2', y2); node.setAttribute('class', 'grid-line'); svg.appendChild(node); }
function svgRect(svg, x, y, width, height, color) { const node = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); node.setAttribute('x', x); node.setAttribute('y', y); node.setAttribute('width', Math.max(0, width)); node.setAttribute('height', height); node.setAttribute('rx', 3); node.setAttribute('fill', color); node.setAttribute('class', 'bar'); svg.appendChild(node); }
function noData(target, message) { if (target) target.innerHTML = `<div class="chart-empty">${message}</div>`; }

function drawBars(target, rows, options = {}) {
  if (!target) return;
  const usable = rows.filter((row) => Number.isFinite(Number(row.value)));
  if (!usable.length) { noData(target, options.empty || 'No data is available for this combination of filters.'); return; }
  const width = 720; const rowHeight = usable.length > 15 ? 29 : 44; const height = Math.max(250, usable.length * rowHeight + 64); const left = usable.length > 15 ? 185 : (options.left || 170); const right = 92; const top = 28; const plot = width - left - right; const svg = svgFrame(target, width, height); const max = options.max || Math.max(...usable.map((row) => row.value), 1); const formatter = options.formatter || ((value) => whole(value));
  [0, 0.5, 1].forEach((fraction) => { const x = left + plot * fraction; svgLine(svg, x, top - 12, x, height - 24); svgText(svg, x, 16, formatter(max * fraction), 'axis-label axis-number'); });
  usable.slice().sort((a, b) => b.value - a.value).forEach((row, index) => { const y = top + index * rowHeight; const color = row.color || '#1769d5'; svgText(svg, left - 12, y + 17, row.label, 'axis-label axis-left'); svgRect(svg, left, y + 3, plot * row.value / max, 20, color); svgText(svg, Math.min(width - 8, left + plot * row.value / max + 8), y + 18, formatter(row.value), 'bar-label'); });
}

function drawGrouped(target, rows, series, options = {}) {
  if (!target) return;
  const usable = rows.filter((row) => series.some((item) => Number.isFinite(Number(row[item.key]))));
  if (!usable.length) { noData(target, options.empty || 'No historical data is available for this combination of filters.'); return; }
  const width = 720; const rowHeight = options.rowHeight || 58; const height = Math.max(260, usable.length * rowHeight + 64); const left = options.left || 140; const right = 92; const top = 28; const plot = width - left - right; const svg = svgFrame(target, width, height); const max = options.max || Math.max(...usable.flatMap((row) => series.map((item) => Number(row[item.key]) || 0)), 1); const formatter = options.formatter || ((value) => whole(value));
  [0, 0.5, 1].forEach((fraction) => { const x = left + plot * fraction; svgLine(svg, x, top - 12, x, height - 24); svgText(svg, x, 16, formatter(max * fraction), 'axis-label axis-number'); });
  usable.forEach((row, index) => { const y = top + index * rowHeight; svgText(svg, left - 12, y + 25, row.label, 'axis-label axis-left'); series.forEach((item, seriesIndex) => { const value = Number(row[item.key]) || 0; const barY = y + seriesIndex * 22; svgRect(svg, left, barY, plot * value / max, 15, item.color); svgText(svg, Math.min(width - 8, left + plot * value / max + 8), barY + 12, formatter(value), 'bar-label'); }); });
}

function scopeGroups(rows) {
  return state.group === 'all' ? rows : rows.filter((row) => row.group === state.group || row.tier === state.group);
}
function selectedYear() { return state.year === 'all' ? null : Number(state.year); }
function currentConferenceRows() {
  if (state.year !== 'all' && state.year !== '2026') return [];
  const rows = state.data.conferences.map((row) => ({ ...row, year: 2026, group: row.tier, category: row.conference, type: 'conference' }));
  return scopeGroups(rows);
}
function currentHistoryRows() {
  let rows = state.history.trend.slice();
  if (selectedYear() !== null) rows = rows.filter((row) => row.year === selectedYear());
  if (state.group !== 'all') rows = rows.filter((row) => row.group === state.group);
  return rows.map((row) => ({ ...row, category: row.group, type: 'history' }));
}
function groupRows() {
  if (state.year === '2026') {
    const source = currentConferenceRows(); const byGroup = {};
    source.forEach((row) => { byGroup[row.group] ||= { year: 2026, group: row.group, category: row.group, type: 'group', programs: 0, market_millions: 0, market_share: 0, leader_millions: 0, medianValues: [] }; byGroup[row.group].programs += row.programs; byGroup[row.group].market_millions += row.market_millions; byGroup[row.group].market_share += row.market_share; byGroup[row.group].leader_millions = Math.max(byGroup[row.group].leader_millions, row.leader_millions); byGroup[row.group].medianValues.push(row.median_program_millions); });
    return Object.values(byGroup).map((row) => ({ ...row, median_program_millions: row.medianValues.reduce((sum, value) => sum + value, 0) / row.medianValues.length }));
  }
  return currentHistoryRows();
}
function sportRows() {
  if (state.year === '2026' || state.year === 'all') {
    if (state.group !== 'all' && state.group !== 'Power 4') return [];
    const conferenceRows = state.data.conferences.filter((row) => row.tier === 'Power 4'); const keys = ['Football', "Men's basketball", "Women's basketball", 'Baseball', 'Everything else'];
    return keys.map((sport) => ({ year: 2026, group: 'Power 4', category: sport, sport, market_millions: conferenceRows.reduce((sum, row) => sum + (state.data.sport_mix[row.conference][sport] || 0), 0), type: 'sport' }));
  }
  if (state.group === 'all') return state.history.sports.map((row) => ({ ...row, category: row.sport, type: 'sport' }));
  return (state.history.segment_sports[state.group] || []).map((row) => ({ ...row, year: 2025, group: state.group, category: row.sport, type: 'sport' }));
}
function positionRows() {
  if (state.year !== 'all' && state.year !== '2026') return [];
  if (state.group !== 'all' && state.group !== 'Power 4') return [];
  return state.data.fbs_position_context.groups.map((row) => ({ ...row, year: 2026, group: 'FBS football', category: row.position, type: 'position', market_millions: row.modeled_market_millions, disclosure_count: row.players, average_disclosure_value: row.mean_thousands * 1000, median_disclosure_value: row.median_thousands * 1000 }));
}
function rowsForMain() {
  if (state.breakdown === 'conference') return currentConferenceRows();
  if (state.breakdown === 'sport') return sportRows();
  if (state.breakdown === 'position') return positionRows();
  return groupRows();
}
function valueFor(row) {
  if (state.breakdown === 'sport') return state.year === '2026' || (state.year === 'all' && row.year === 2026) ? row.market_millions : row.count;
  if (state.measure === 'market_millions' && row.market_millions !== undefined) return row.market_millions;
  if (state.measure === 'programs' && row.programs !== undefined) return row.programs;
  return row[state.measure];
}
function valueFormatter(row) {
  if (state.breakdown === 'sport') return state.year === '2026' || (state.year === 'all' && row.year === 2026) ? moneyM : whole;
  if (state.breakdown === 'position' && state.measure === 'market_millions') return moneyM;
  return (value) => measureFormat(state.measure, value);
}
function displayRows(rows) {
  const mapped = rows.map((row) => ({ ...row, value: Number(valueFor(row)), label: row.category || row.group || row.conference }));
  if (state.rank === 'all') return mapped;
  return mapped.sort((a, b) => (Number.isFinite(b.value) ? b.value : -Infinity) - (Number.isFinite(a.value) ? a.value : -Infinity)).slice(0, Number(state.rank));
}
function trendRows() {
  const targetGroup = state.group === 'all' ? 'All public disclosures' : state.group;
  let rows = state.history.trend.filter((row) => row.group === targetGroup);
  if (selectedYear() !== null) rows = rows.filter((row) => row.year === selectedYear());
  return rows.map((row) => ({ label: String(row.year), value: Number(row[state.measure]), year: row.year }));
}
function updateKpis(rows) {
  const values = rows.map(valueFor).filter((value) => Number.isFinite(Number(value))).map(Number); const sorted = values.slice().sort((a, b) => a - b); const aggregate = ['disclosure_count', 'market_millions', 'programs'].includes(state.measure) ? values.reduce((sum, value) => sum + value, 0) : values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN; const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : NaN;
  document.querySelector('#kpiMetricLabel').textContent = `${measureLabels[state.measure]} in view`; document.querySelector('#kpiMetricValue').textContent = Number.isFinite(aggregate) ? measureFormat(state.measure, aggregate) : '—'; document.querySelector('#kpiSecondLabel').textContent = `Median ${measureLabels[state.measure].toLowerCase()}`; document.querySelector('#kpiSecondValue').textContent = Number.isFinite(median) ? measureFormat(state.measure, median) : '—'; document.querySelector('#kpiThirdLabel').textContent = 'Rows in current view'; document.querySelector('#kpiThirdValue').textContent = whole(rows.length); document.querySelector('#kpiFourthLabel').textContent = state.year === 'all' ? 'Years represented' : 'Current time'; document.querySelector('#kpiFourthValue').textContent = state.year === 'all' ? whole(new Set(rows.map((row) => row.year)).size) : (state.year || '—');
}
function updateTable(rows) {
  const head = document.querySelector('#dataHead'); const body = document.querySelector('#dataTable'); const shown = displayRows(rows);
  head.innerHTML = '<tr><th>Year</th><th>Group</th><th>Category</th><th>Selected value</th><th>Count</th><th>Market / context</th></tr>';
  body.innerHTML = shown.map((row) => { const count = row.disclosure_count ?? row.players ?? row.programs ?? row.count; const context = row.market_millions !== undefined ? moneyM(row.market_millions) : row.average_disclosure_value !== undefined ? `avg ${dollars(row.average_disclosure_value)}` : '—'; return `<tr><td>${row.year ?? '—'}</td><td>${row.group ?? row.tier ?? '—'}</td><td class="table-key">${row.category ?? row.conference ?? '—'}</td><td>${Number.isFinite(row.value) ? valueFormatter(row)(row.value) : '—'}</td><td>${count === undefined ? '—' : whole(count)}</td><td>${context}</td></tr>`; }).join('');
  document.querySelector('#tableNote').textContent = `${shown.length} of ${rows.length} rows shown · filters are calculated in the browser`;
}
function renderTrend() { const rows = trendRows(); drawBars(document.querySelector('#trendChart'), rows.map((row) => ({ ...row, label: row.label, color: '#1769d5' })), { formatter: (value) => measureFormat(state.measure, value), left: 110, empty: 'Historical disclosure trend is available for the All public disclosures group in 2024 and 2025.' }); document.querySelector('#trendNote').textContent = state.group === 'all' ? 'The trend uses the two comparable public disclosure snapshots; the 2026 modeled market is kept separate.' : 'This selected segment is only reported in the 2025 public snapshot, so a two-year trend is not available.'; }
function renderSport() { const rows = sportRows().map((row) => ({ ...row, value: state.year === '2026' || (state.year === 'all' && row.year === 2026) ? row.market_millions : row.count, label: row.sport, color: row.sport === 'Football' ? '#1769d5' : row.sport.includes('Women') ? '#f26b5e' : '#8f70c9' })); drawBars(document.querySelector('#sportChart'), rows, { formatter: (value) => state.year === '2026' || (state.year === 'all' && rows[0]?.year === 2026) ? moneyM(value) : whole(value), left: 175, empty: 'Sport disclosure counts are available for the 2025 public snapshot. Choose 2025 or the Power 4 2026 model.' }); document.querySelector('#sportNote').textContent = state.year === '2026' ? '2026 uses modeled Power 4 sport-market estimates.' : '2025 uses public disclosure counts; “Other sports” groups smaller source categories.'; }
function renderPosition() { const rows = positionRows().map((row) => ({ ...row, value: state.measure === 'market_millions' ? row.market_millions : state.measure === 'average_disclosure_value' ? row.average_disclosure_value : state.measure === 'median_disclosure_value' ? row.median_disclosure_value : row.disclosure_count, label: row.position, color: row.position === 'Quarterback' ? '#1769d5' : row.position === 'Wide receiver' ? '#f26b5e' : '#8f70c9' })); drawBars(document.querySelector('#positionChart'), rows, { formatter: (value) => state.measure === 'disclosure_count' ? whole(value) : state.measure === 'market_millions' ? moneyM(value) : dollars(value), left: 165, empty: 'The position model is available for 2026 FBS football only. Choose the 2026 time filter and All groups or Power 4.' }); document.querySelector('#positionNote').textContent = 'This is a separate FBS football position model, not a complete Division I salary file.'; }
function render() { const rows = rowsForMain(); const shown = displayRows(rows); const chartRows = shown.map((row) => ({ ...row, value: row.value, label: state.breakdown === 'sport' ? row.sport : row.label, color: row.group === 'Power 4' || row.tier === 'Power 4' ? '#1769d5' : row.group === 'Group of 5' || row.tier === 'Group of 5' ? '#e0ab38' : '#8f70c9' })); drawBars(document.querySelector('#mainChart'), chartRows, { formatter: (value) => valueFormatter(chartRows[0] || {}) (value), left: chartRows.length > 15 ? 190 : 170, empty: 'No rows match these filters. Try a different year, group, or breakdown.' }); document.querySelector('#mainChartTitle').textContent = `${measureLabels[state.measure]} by ${state.breakdown}`; document.querySelector('#mainChartSubtitle').textContent = state.year === 'all' ? 'all available snapshots' : `${state.year} snapshot`; document.querySelector('#chartNote').textContent = state.breakdown === 'conference' ? 'Conference estimates are available in the 2026 modeled market layer.' : state.breakdown === 'position' ? 'Position values are a separate FBS football model.' : state.breakdown === 'sport' ? 'Sport rows change with the time and group filters.' : 'The selected measure, time, and group filters update these rows in the browser.'; updateKpis(rows); updateTable(rows); renderTrend(); renderSport(); renderPosition(); }

function builderMoney(thousands) { return thousands >= 1000 ? `$${(thousands / 1000).toFixed(2)}M` : `$${Math.round(thousands)}K`; }
function ballEmoji(kind) { return { football: '🏈', basketball: '🏀', baseball: '⚾', softball: '🥎', soccer: '⚽', volleyball: '🏐', gymnastics: '🤸', lacrosse: '🥍' }[kind] || '🏅'; }
function setupBuilder(data) { const sportSelect = document.querySelector('#builderSport'); if (!sportSelect) return; const positionSelect = document.querySelector('#builderPosition'); const conferenceSelect = document.querySelector('#builderConference'); const sports = data.player_builder.sports; const conferences = data.conferences; sportSelect.innerHTML = Object.keys(sports).map((sport) => `<option value="${sport}">${sport}</option>`).join(''); conferenceSelect.innerHTML = conferences.map((row) => `<option value="${row.conference}">${row.conference} · ${row.tier}</option>`).join(''); function updatePositions() { const sport = sports[sportSelect.value]; positionSelect.innerHTML = Object.keys(sport.positions).map((position) => `<option value="${position}">${position}</option>`).join(''); updateBuilder(); } function updateBuilder() { const sport = sports[sportSelect.value]; const position = positionSelect.value; const conference = conferences.find((row) => row.conference === conferenceSelect.value); const baseline = sport.positions[position]; const allAverage = data.market.total_millions / data.market.program_count; const conferenceAverage = conference.market_millions / conference.programs; const multiplier = Math.sqrt(conferenceAverage / allAverage); const estimate = baseline * multiplier; document.querySelector('#builderResult').style.background = `linear-gradient(110deg, #0d3d83, ${sport.color})`; document.querySelector('#builderBall').textContent = ballEmoji(sport.ball); document.querySelector('#builderValue').textContent = builderMoney(estimate); document.querySelector('#builderSelection').textContent = `${position} · ${sportSelect.value} · ${conference.conference}`; document.querySelector('#builderBaseline').textContent = builderMoney(baseline); document.querySelector('#builderMultiplier').textContent = `${multiplier.toFixed(2)}×`; document.querySelector('#builderScope').textContent = 'D-I conference model'; document.querySelector('#builderSourceNote').textContent = sport.source_type === 'FBS position median' ? 'Football baseline: published FBS position median.' : 'Illustrative sport baseline: useful for comparison, not reported pay.'; } sportSelect.addEventListener('change', updatePositions); positionSelect.addEventListener('change', updateBuilder); conferenceSelect.addEventListener('change', updateBuilder); updatePositions(); }

function setupSchoolExplorer(data) { const conferenceSelect = document.querySelector('#schoolConference'); if (!conferenceSelect) return; const sortSelect = document.querySelector('#schoolSort'); const cloud = document.querySelector('#schoolCloud'); const detail = document.querySelector('#schoolDetail'); const surprise = document.querySelector('#surpriseSchool'); const colors = { SEC: '#1769d5', 'Big Ten': '#ef8354', ACC: '#7b61b5', 'Big 12': '#2b9b8d' }; const conferenceTotals = Object.fromEntries(data.conferences.filter((row) => row.tier === 'Power 4').map((row) => [row.conference, row.market_millions])); const explorer = { conference: 'all', sort: 'market', selected: null }; function currentRows() { const rows = data.power4_programs.filter((row) => explorer.conference === 'all' || row.conference === explorer.conference); if (explorer.sort === 'alphabetical') return rows.sort((a, b) => a.school.localeCompare(b.school)); if (explorer.sort === 'share') return rows.sort((a, b) => b.market_millions / conferenceTotals[b.conference] - a.market_millions / conferenceTotals[a.conference]); return rows.sort((a, b) => b.market_millions - a.market_millions); } function renderDetail(row) { if (!row) { detail.innerHTML = ''; return; } const conferenceRows = data.power4_programs.filter((item) => item.conference === row.conference).sort((a, b) => b.market_millions - a.market_millions); const rank = conferenceRows.findIndex((item) => item.school === row.school) + 1; const share = 100 * row.market_millions / conferenceTotals[row.conference]; detail.innerHTML = `<div class="school-detail-icon">🎓</div><div class="school-detail-copy"><strong>${row.school}</strong><span>${row.conference} · #${rank} of ${conferenceRows.length} · ${share.toFixed(1)}% of conference market</span></div><div class="school-detail-value">${moneyM(row.market_millions)}</div>`; } function renderExplorer() { const rows = currentRows(); if (!rows.length) return; if (!explorer.selected || !rows.some((row) => row.school === explorer.selected)) explorer.selected = rows[0].school; const max = Math.max(...rows.map((row) => row.market_millions)); cloud.innerHTML = rows.map((row, index) => { const share = 100 * row.market_millions / conferenceTotals[row.conference]; const selected = row.school === explorer.selected ? ' selected' : ''; const width = Math.max(18, 100 * row.market_millions / max); return `<button class="school-sticker${selected}" style="--school-color:${colors[row.conference]}; min-height:${Math.round(88 + 25 * row.market_millions / max)}px" data-school="${row.school}"><span class="school-rank">#${index + 1}</span><span class="school-icon">🏫</span><strong>${row.school}</strong><span class="school-value">${moneyM(row.market_millions)}</span><span class="school-share">${share.toFixed(1)}% of ${row.conference}</span><span class="school-meter"><i style="width:${width}%"></i></span></button>`; }).join(''); cloud.querySelectorAll('.school-sticker').forEach((button) => button.addEventListener('click', () => { explorer.selected = button.dataset.school; renderExplorer(); })); renderDetail(rows.find((row) => row.school === explorer.selected)); } conferenceSelect.addEventListener('change', (event) => { explorer.conference = event.target.value; explorer.selected = null; renderExplorer(); }); sortSelect.addEventListener('change', (event) => { explorer.sort = event.target.value; renderExplorer(); }); surprise.addEventListener('click', () => { const rows = currentRows(); explorer.selected = rows[Math.floor(Math.random() * rows.length)].school; renderExplorer(); }); renderExplorer(); }

function bind() { document.querySelector('#yearSelect').addEventListener('change', (event) => { state.year = event.target.value; render(); }); document.querySelector('#groupSelect').addEventListener('change', (event) => { state.group = event.target.value; render(); }); document.querySelector('#measureSelect').addEventListener('change', (event) => { state.measure = event.target.value; render(); }); document.querySelector('#breakdownSelect').addEventListener('change', (event) => { state.breakdown = event.target.value; render(); }); document.querySelector('#rankSelect').addEventListener('change', (event) => { state.rank = event.target.value; render(); }); document.querySelector('#resetButton').addEventListener('click', () => { Object.assign(state, { year: 'all', group: 'all', measure: 'average_disclosure_value', breakdown: 'group', rank: '8' }); ['yearSelect', 'groupSelect', 'measureSelect', 'breakdownSelect', 'rankSelect'].forEach((id) => { document.querySelector(`#${id}`).value = state[id.replace('Select', '')] || state[id]; }); render(); }); }

const dataUrl = new URL('data/division1_market.json', document.currentScript.src); const historyUrl = new URL('data/nil_summary.json', document.currentScript.src); const dataPromise = window.NIL_DATA ? Promise.resolve(window.NIL_DATA) : fetch(dataUrl).then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }); const historyPromise = window.NIL_HISTORY ? Promise.resolve(window.NIL_HISTORY) : fetch(historyUrl).then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); });
Promise.all([dataPromise, historyPromise]).then(([data, history]) => { state.data = data; state.history = history; setupBuilder(data); setupSchoolExplorer(data); bind(); render(); }).catch((error) => { document.querySelectorAll('.chart-wrap').forEach((node) => { node.innerHTML = `<div class="chart-empty">Interactive data could not load: ${error.message}. Make sure the site is opened through a web server.</div>`; }); });
})();
