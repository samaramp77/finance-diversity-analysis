(function () {
  const number = new Intl.NumberFormat('en-US');
  const percent = (value) => `${Number(value || 0).toFixed(2)}%`;
  const integer = (value) => number.format(Math.round(Number(value || 0)));
  const esc = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const state = {
    rows: [],
    filtered: [],
    measure: 'employees',
    breakdown: 'job_category',
    filters: { year: '', state: '', region: '', job_category: '', race_ethnicity: '', sex: '' }
  };

  const filterConfig = [
    ['yearFilter', 'year', 'All years'],
    ['stateFilter', 'state', 'All states'],
    ['regionFilter', 'region', 'All regions'],
    ['jobFilter', 'job_category', 'All job categories'],
    ['raceFilter', 'race_ethnicity', 'All groups'],
    ['sexFilter', 'sex', 'All sexes']
  ];

  function parseCSV(text) {
    const output = [];
    let row = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      const next = text[index + 1];
      if (character === '"' && quoted && next === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === ',' && !quoted) {
        row.push(value);
        value = '';
      } else if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && next === '\n') index += 1;
        row.push(value);
        output.push(row);
        row = [];
        value = '';
      } else {
        value += character;
      }
    }
    if (value.length || row.length) {
      row.push(value);
      output.push(row);
    }
    const headers = output.shift().map((header) => header.trim());
    return output.filter((values) => values.length >= headers.length).map((values) => {
      const item = {};
      headers.forEach((header, index) => { item[header] = values[index]; });
      ['year', 'employee_count', 'job_total', 'share_of_job', 'finance_total', 'share_of_finance', 'establishments'].forEach((key) => {
        item[key] = Number(item[key]);
      });
      return item;
    });
  }

  function label(value) {
    return String(value)
      .replace('and managers', '& managers')
      .replace('Black or African American', 'Black')
      .replace('Native Hawaiian or Other Pacific Islander', 'NHOPI')
      .replace('American Indian or Alaska Native', 'AIAN')
      .replace('Two or more races', 'Two+ races');
  }

  function leadership(row) {
    return row.job_category === 'Senior officials and managers' || row.job_category === 'Mid-level officials and managers';
  }

  function filterRows() {
    return state.rows.filter((row) => Object.entries(state.filters).every(([key, value]) => !value || String(row[key]) === String(value)));
  }

  function aggregate(rows, key) {
    const groups = new Map();
    rows.forEach((row) => {
      const groupKey = row[key] || 'Unknown';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { key: groupKey, employees: 0, women: 0, blackWomen: 0, leaders: 0, femaleLeaders: 0, blackWomenLeaders: 0, rowCount: 0 });
      }
      const group = groups.get(groupKey);
      const employees = Number(row.employee_count) || 0;
      const isFemale = row.sex === 'Female';
      const isBlack = row.race_ethnicity === 'Black or African American';
      group.employees += employees;
      group.women += isFemale ? employees : 0;
      group.blackWomen += isFemale && isBlack ? employees : 0;
      group.leaders += leadership(row) ? employees : 0;
      group.femaleLeaders += leadership(row) && isFemale ? employees : 0;
      group.blackWomenLeaders += leadership(row) && isFemale && isBlack ? employees : 0;
      group.rowCount += 1;
    });
    return [...groups.values()].map((group) => ({
      ...group,
      womenShare: group.employees ? group.women / group.employees * 100 : 0,
      blackWomenShare: group.employees ? group.blackWomen / group.employees * 100 : 0,
      leadershipShare: group.employees ? group.leaders / group.employees * 100 : 0,
      femaleLeadershipShare: group.leaders ? group.femaleLeaders / group.leaders * 100 : 0,
      blackWomenLeadershipShare: group.leaders ? group.blackWomenLeaders / group.leaders * 100 : 0
    }));
  }

  function summarize(rows) {
    return aggregate(rows, 'sex').reduce((summary, group) => {
      summary.employees += group.employees;
      summary.women += group.women;
      summary.blackWomen += group.blackWomen;
      summary.leaders += group.leaders;
      return summary;
    }, { employees: 0, women: 0, blackWomen: 0, leaders: 0 });
  }

  function setHTML(selector, html) {
    const target = document.querySelector(selector);
    if (target) target.innerHTML = html;
  }

  function chartFrame(width, height, content) {
    return `<svg viewBox="0 0 ${width} ${height}" role="img">${content}</svg>`;
  }

  function barChart(target, rows, options = {}) {
    if (!target || !rows.length) return setHTML(`#${target.id}`, '<div class="chart-empty">No data for these filters.</div>');
    const width = 820;
    const rowHeight = options.rowHeight || 38;
    const height = Math.max(155, rows.length * rowHeight + 33);
    const left = options.left || 190;
    const right = 85;
    const plotWidth = width - left - right;
    const max = options.max || Math.max(...rows.map((row) => row.value), 1);
    let content = '';
    [0, .25, .5, .75, 1].forEach((tick) => {
      const x = left + plotWidth * tick;
      content += `<line class="grid-line" x1="${x}" y1="5" x2="${x}" y2="${height - 22}" />`;
      content += `<text class="axis-label" x="${x}" y="${height - 5}" text-anchor="middle">${esc(options.tickFormat(max * tick))}</text>`;
    });
    rows.forEach((row, index) => {
      const y = index * rowHeight + 10;
      const barWidth = Math.max(row.value > 0 ? 2 : 0, plotWidth * row.value / max);
      const color = row.color || options.color || ['#087f68', '#ff6e62', '#f6c94d', '#8b70de', '#6fc5e9'][index % 5];
      const title = `${row.label}: ${options.valueFormat(row.value)}`;
      content += `<g class="interactive-bar" tabindex="0" data-key="${esc(row.key)}" aria-label="${esc(title)}">`;
      content += `<title>${esc(title)} — click to filter</title>`;
      content += `<text class="bar-label" x="${left - 11}" y="${y + 19}" text-anchor="end">${esc(label(row.label))}</text>`;
      content += `<rect x="${left}" y="${y}" width="${barWidth}" height="22" rx="11" fill="${color}" opacity=".9" />`;
      content += `<text class="bar-value" x="${Math.min(left + barWidth + 9, width - 74)}" y="${y + 17}">${esc(options.valueFormat(row.value))}</text>`;
      content += '</g>';
    });
    target.innerHTML = chartFrame(width, height, content);
    target.querySelectorAll('.interactive-bar').forEach((bar) => {
      const apply = () => applyBreakdownFilter(bar.dataset.key);
      bar.addEventListener('click', apply);
      bar.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); apply(); } });
    });
  }

  function lineChart(target, rows) {
    if (!target || !rows.length) return setHTML(`#${target.id}`, '<div class="chart-empty">No time series for these filters.</div>');
    const width = 760;
    const height = 275;
    const left = 50;
    const right = 20;
    const top = 18;
    const bottom = 35;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const x = (index) => left + (rows.length === 1 ? plotWidth / 2 : index * plotWidth / (rows.length - 1));
    const y = (value) => top + (100 - value) * plotHeight / 100;
    let content = '';
    [0, 25, 50, 75, 100].forEach((value) => {
      const yPos = y(value);
      content += `<line class="grid-line" x1="${left}" y1="${yPos}" x2="${width - right}" y2="${yPos}" />`;
      content += `<text class="axis-label" x="${left - 8}" y="${yPos + 4}" text-anchor="end">${value}%</text>`;
    });
    [['womenShare', 'line-one', 'point-one'], ['blackWomenShare', 'line-two', 'point-two']].forEach(([key, lineClass, pointClass]) => {
      const points = rows.map((row, index) => `${x(index)},${y(row[key])}`).join(' ');
      content += `<polyline class="${lineClass}" points="${points}" />`;
      rows.forEach((row, index) => { content += `<circle class="${pointClass}" cx="${x(index)}" cy="${y(row[key])}" r="4"><title>${row.year}: ${percent(row[key])}</title></circle>`; });
    });
    rows.forEach((row, index) => { content += `<text class="axis-label" x="${x(index)}" y="${height - 11}" text-anchor="middle">${esc(row.year)}</text>`; });
    target.innerHTML = chartFrame(width, height, content);
  }

  function renderKPIs(rows) {
    const summary = summarize(rows);
    document.querySelector('#kpiEmployees').textContent = integer(summary.employees);
    document.querySelector('#kpiWomen').textContent = percent(summary.employees ? summary.women / summary.employees * 100 : 0);
    document.querySelector('#kpiBlackWomen').textContent = percent(summary.employees ? summary.blackWomen / summary.employees * 100 : 0);
    document.querySelector('#kpiLeadership').textContent = percent(summary.employees ? summary.leaders / summary.employees * 100 : 0);
    const status = document.querySelector('#statusLine');
    status.textContent = `${integer(summary.employees)} employees across ${integer(rows.length)} tidy rows · ${Object.values(state.filters).filter(Boolean).length || 'no'} active filters · ${state.measure.replaceAll('_', ' ')}, by ${state.breakdown.replaceAll('_', ' ')}`;
  }

  function measureValue(group, total) {
    if (state.measure === 'share_view') return total ? group.employees / total * 100 : 0;
    if (state.measure === 'women_share') return group.womenShare;
    if (state.measure === 'black_women_share') return group.blackWomenShare;
    if (state.measure === 'leadership_share') return group.leadershipShare;
    return group.employees;
  }

  function measureFormat(value) {
    return state.measure === 'employees' ? integer(value) : percent(value);
  }

  function measureMax(rows) {
    return state.measure === 'employees' ? Math.max(...rows.map((row) => row.value), 1) : 100;
  }

  function renderPrimary(rows) {
    const groups = aggregate(rows, state.breakdown);
    const total = summarize(rows).employees;
    const chartRows = groups.map((group) => ({ key: group.key, label: group.key, value: measureValue(group, total) })).sort((a, b) => b.value - a.value);
    const title = document.querySelector('#primaryTitle');
    const breakdownNames = { job_category: 'job category', state: 'state', year: 'year', race_ethnicity: 'race / ethnicity', sex: 'sex', region: 'region' };
    const measureNames = { employees: 'Employees', share_view: 'Share of current view', women_share: 'Women’s share', black_women_share: 'Black women’s share', leadership_share: 'Leadership share' };
    title.textContent = `${measureNames[state.measure]} by ${breakdownNames[state.breakdown]}`;
    document.querySelector('#primarySubhead').textContent = 'Click a bar to apply that filter. Values recalculate from the current view.';
    barChart(document.querySelector('#primaryChart'), chartRows, { max: measureMax(chartRows), valueFormat: measureFormat, tickFormat: measureFormat, left: state.breakdown === 'job_category' ? 245 : 180, rowHeight: state.breakdown === 'job_category' ? 40 : 35 });
  }

  function renderTrend(rows) {
    const groups = aggregate(rows, 'year');
    const trend = groups.map((group) => ({ year: group.key, womenShare: group.womenShare, blackWomenShare: group.blackWomenShare })).sort((a, b) => Number(a.year) - Number(b.year));
    lineChart(document.querySelector('#trendChart'), trend);
  }

  function renderComposition(rows) {
    const groups = aggregate(rows, 'job_category').map((group) => ({ key: group.key, label: group.key, value: group.womenShare })).sort((a, b) => b.value - a.value);
    barChart(document.querySelector('#compositionChart'), groups, { max: 100, valueFormat: percent, tickFormat: (value) => `${Math.round(value)}%`, left: 245, color: '#8b70de', rowHeight: 40 });
  }

  function renderRace(rows) {
    const groups = aggregate(rows, 'race_ethnicity').map((group) => ({ key: group.key, label: group.key, value: measureValue(group, summarize(rows).employees) })).sort((a, b) => b.value - a.value);
    barChart(document.querySelector('#raceChart'), groups, { max: measureMax(groups), valueFormat: measureFormat, tickFormat: measureFormat, left: 245, rowHeight: 38 });
  }

  function renderTable(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const key = `${row.year}|${row.job_category}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    const tableRows = [...groups.entries()].map(([key, groupRows]) => {
      const group = aggregate(groupRows, 'year')[0];
      return { year: key.split('|')[0], job: key.split('|').slice(1).join('|'), ...group };
    }).sort((a, b) => Number(b.year) - Number(a.year) || b.employees - a.employees);
    const capped = tableRows.slice(0, 200);
    const html = capped.length ? capped.map((row) => `<tr><td class="table-key">${esc(row.year)}</td><td>${esc(label(row.job))}</td><td>${integer(row.employees)}</td><td>${percent(row.womenShare)}</td><td>${percent(row.blackWomenShare)}</td><td>${percent(row.leadershipShare)}</td></tr>`).join('') : '<tr><td colspan="6">No rows match these filters.</td></tr>';
    document.querySelector('#dataTable').innerHTML = html;
    document.querySelector('#tableNote').textContent = tableRows.length > capped.length ? `Showing the first ${integer(capped.length)} of ${integer(tableRows.length)} year × job summaries.` : `${integer(tableRows.length)} year × job summaries in view.`;
  }

  function renderLadder(rows) {
    const rungNames = ['Administrative support', 'Professionals', 'Mid-level officials and managers', 'Senior officials and managers'];
    const groups = aggregate(rows, 'job_category');
    const byJob = new Map(groups.map((group) => [group.key, group]));
    const colors = ['#ff6e62', '#f6c94d', '#8b70de', '#6fc5e9'];
    const stage = document.querySelector('#ladderStage');
    const html = rungNames.map((job, index) => {
      const group = byJob.get(job) || { employees: 0, womenShare: 0 };
      const height = Math.max(58, 65 + group.womenShare * 1.55);
      return `<div class="ladder-step" tabindex="0" data-job="${esc(job)}"><div class="step-column" style="height:${height}px;background:${colors[index]}"><strong>${percent(group.womenShare)}</strong></div><div class="step-label">${esc(label(job))}</div><div class="step-value">${integer(group.employees)} people</div></div>`;
    }).join('');
    stage.innerHTML = html;
    stage.querySelectorAll('.ladder-step').forEach((step) => {
      const apply = () => {
        document.querySelector('#jobFilter').value = step.dataset.job;
        state.filters.job_category = step.dataset.job;
        render();
      };
      step.addEventListener('click', apply);
      step.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); apply(); } });
    });
    const message = document.querySelector('#ladderMessage');
    message.textContent = `Rung height = women’s share · ${state.filters.job_category ? `focused on ${label(state.filters.job_category)}` : 'click a rung to focus'}`;
  }

  function applyBreakdownFilter(value) {
    const targetMap = { year: 'yearFilter', state: 'stateFilter', region: 'regionFilter', job_category: 'jobFilter', race_ethnicity: 'raceFilter', sex: 'sexFilter' };
    const key = state.breakdown;
    const select = document.querySelector(`#${targetMap[key]}`);
    if (!select) return;
    select.value = String(value);
    state.filters[key] = String(value);
    render();
  }

  function render() {
    state.filtered = filterRows();
    renderKPIs(state.filtered);
    renderPrimary(state.filtered);
    renderTrend(state.filtered);
    renderComposition(state.filtered);
    renderRace(state.filtered);
    renderTable(state.filtered);
    renderLadder(state.filtered);
  }

  function populateFilters() {
    filterConfig.forEach(([id, key, allLabel]) => {
      const select = document.querySelector(`#${id}`);
      const values = [...new Set(state.rows.map((row) => row[key]))].filter((value) => value !== '' && value !== undefined && value !== null).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      select.innerHTML = `<option value="">${allLabel}</option>${values.map((value) => `<option value="${esc(value)}">${esc(label(value))}</option>`).join('')}`;
      select.addEventListener('change', () => { state.filters[key] = select.value; render(); });
    });
  }

  function setupSwitches() {
    document.querySelectorAll('#measureSwitch button').forEach((button) => button.addEventListener('click', () => {
      state.measure = button.dataset.measure;
      document.querySelectorAll('#measureSwitch button').forEach((item) => item.classList.toggle('active', item === button));
      render();
    }));
    document.querySelectorAll('#breakdownSwitch button').forEach((button) => button.addEventListener('click', () => {
      state.breakdown = button.dataset.breakdown;
      document.querySelectorAll('#breakdownSwitch button').forEach((item) => item.classList.toggle('active', item === button));
      render();
    }));
    document.querySelector('#resetFilters').addEventListener('click', () => {
      state.filters = { year: '', state: '', region: '', job_category: '', race_ethnicity: '', sex: '' };
      filterConfig.forEach(([id]) => { document.querySelector(`#${id}`).value = ''; });
      render();
    });
  }

  fetch('data/finance_diversity.csv')
    .then((response) => response.text())
    .then((text) => {
      state.rows = parseCSV(text);
      populateFilters();
      setupSwitches();
      render();
    })
    .catch((error) => { document.querySelector('#statusLine').textContent = `Could not load the CSV: ${error.message}`; });
})();
