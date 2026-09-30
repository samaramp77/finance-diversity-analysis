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

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function empty(target, message) {
    target.innerHTML = `<div class="chart-empty">${esc(message)}</div>`;
  }

  function chartFrame(width, height, content) {
    return `<svg viewBox="0 0 ${width} ${height}" role="img">${content}</svg>`;
  }

  function barChart(target, rows, options = {}) {
    if (!target || !rows.length) return empty(target, 'No data available for this chart.');
    const width = 720;
    const rowHeight = options.rowHeight || 34;
    const height = Math.max(150, rows.length * rowHeight + 28);
    const left = options.left || 190;
    const right = 60;
    const plotWidth = width - left - right;
    const max = options.max || Math.max(...rows.map((row) => Number(row.value) || 0), 1);
    const color = options.color || '#087f68';
    const label = options.label || ((row) => row.label);
    let content = '';
    [0, .25, .5, .75, 1].forEach((tick) => {
      const x = left + plotWidth * tick;
      content += `<line class="grid-line" x1="${x}" y1="5" x2="${x}" y2="${height - 18}" />`;
      content += `<text class="axis-label" x="${x}" y="${height - 3}" text-anchor="middle">${esc(options.tickFormat ? options.tickFormat(max * tick) : Math.round(max * tick))}</text>`;
    });
    rows.forEach((row, index) => {
      const y = index * rowHeight + 9;
      const value = Number(row.value) || 0;
      const barWidth = Math.max(2, plotWidth * value / max);
      const fill = row.color || (Array.isArray(color) ? color[index % color.length] : color);
      content += `<text class="bar-label" x="${left - 10}" y="${y + 17}" text-anchor="end">${esc(label(row))}</text>`;
      content += `<rect x="${left}" y="${y}" width="${barWidth}" height="20" rx="10" fill="${fill}" opacity=".9" />`;
      content += `<text class="bar-value" x="${Math.min(left + barWidth + 8, width - 52)}" y="${y + 15}">${esc(options.valueFormat ? options.valueFormat(value) : value)}</text>`;
    });
    target.innerHTML = chartFrame(width, height, content);
  }

  function lineChart(target, rows, options = {}) {
    if (!target || !rows.length) return empty(target, 'No data available for this chart.');
    const width = 720;
    const height = 260;
    const left = 48;
    const right = 18;
    const top = 18;
    const bottom = 34;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const values = rows.map((row) => Number(row.value) || 0);
    const min = options.min ?? Math.min(...values, 0);
    const max = options.max ?? Math.max(...values, 1);
    const spread = max - min || 1;
    const x = (index) => left + (rows.length === 1 ? plotWidth / 2 : index * plotWidth / (rows.length - 1));
    const y = (value) => top + (max - value) * plotHeight / spread;
    let content = '';
    [0, .25, .5, .75, 1].forEach((tick) => {
      const value = max - spread * tick;
      const yPos = top + plotHeight * tick;
      content += `<line class="grid-line" x1="${left}" y1="${yPos}" x2="${width - right}" y2="${yPos}" />`;
      content += `<text class="axis-label" x="${left - 8}" y="${yPos + 4}" text-anchor="end">${esc(options.tickFormat ? options.tickFormat(value) : Math.round(value))}</text>`;
    });
    const points = rows.map((row, index) => `${x(index)},${y(Number(row.value) || 0)}`).join(' ');
    content += `<polyline class="${options.lineClass || 'line-one'}" points="${points}" />`;
    rows.forEach((row, index) => {
      const px = x(index);
      const py = y(Number(row.value) || 0);
      content += `<circle class="${options.pointClass || 'point-one'}" cx="${px}" cy="${py}" r="4" />`;
      content += `<text class="axis-label" x="${px}" y="${height - 10}" text-anchor="middle">${esc(row.label)}</text>`;
    });
    target.innerHTML = chartFrame(width, height, content);
  }

  function multiLineChart(target, rows, series) {
    if (!target || !rows.length) return empty(target, 'No data available for this chart.');
    const width = 720;
    const height = 270;
    const left = 48;
    const right = 18;
    const top = 18;
    const bottom = 34;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const allValues = series.flatMap((item) => rows.map((row) => Number(row[item.key]) || 0));
    const max = Math.max(...allValues, 1);
    const x = (index) => left + (rows.length === 1 ? plotWidth / 2 : index * plotWidth / (rows.length - 1));
    const y = (value) => top + (max - value) * plotHeight / max;
    let content = '';
    [0, .25, .5, .75, 1].forEach((tick) => {
      const value = max * (1 - tick);
      const yPos = top + plotHeight * tick;
      content += `<line class="grid-line" x1="${left}" y1="${yPos}" x2="${width - right}" y2="${yPos}" />`;
      content += `<text class="axis-label" x="${left - 8}" y="${yPos + 4}" text-anchor="end">${esc(value.toFixed(0))}%</text>`;
    });
    series.forEach((item) => {
      const points = rows.map((row, index) => `${x(index)},${y(Number(row[item.key]) || 0)}`).join(' ');
      content += `<polyline class="${item.lineClass}" points="${points}" />`;
      rows.forEach((row, index) => {
        content += `<circle class="${item.pointClass}" cx="${x(index)}" cy="${y(Number(row[item.key]) || 0)}" r="4" />`;
      });
    });
    rows.forEach((row, index) => {
      content += `<text class="axis-label" x="${x(index)}" y="${height - 10}" text-anchor="middle">${esc(row.year)}</text>`;
    });
    target.innerHTML = chartFrame(width, height, content);
  }

  function render(summary) {
    setText('[data-stat="women_share"]', percent(summary.latest_women_share));
    setText('[data-stat="black_women_share"]', percent(summary.latest_black_women_share));
    setText('[data-stat="black_women_leader_share"]', percent(summary.latest_black_women_leader_share));
    setText('[data-stat="latest_total"]', integer(summary.latest_total));

    const jobOrder = ['Administrative support', 'Professionals', 'Mid-level officials and managers', 'Senior officials and managers'];
    const jobs = jobOrder.map((job) => summary.job_sex.find((row) => row.job === job)).filter(Boolean);
    barChart(document.querySelector('#genderLadderChart'), jobs.map((row) => ({ label: row.job.replace('officials and ', ''), value: row.female_share })), {
      max: 100, color: ['#b6ef76', '#6fc5e9', '#f6c94d', '#ff6e62'], valueFormat: percent, tickFormat: (value) => `${Math.round(value)}%`, left: 230
    });
    barChart(document.querySelector('#blackWomenChart'), [
      { label: 'Entire workforce', value: summary.latest_black_women_share, color: '#087f68' },
      { label: 'Leadership', value: summary.latest_black_women_leader_share, color: '#ff6e62' }
    ], { max: 12, valueFormat: percent, tickFormat: (value) => `${Math.round(value)}%`, left: 160 });
    barChart(document.querySelector('#jobGenderChart'), summary.job_sex.map((row) => ({ label: row.job.replace(' officials and ', ' / '), value: row.female_share })), {
      max: 100, color: '#8b70de', valueFormat: percent, tickFormat: (value) => `${Math.round(value)}%`, left: 220
    });
    multiLineChart(document.querySelector('#timeChart'), summary.year_rows, [
      { key: 'black_women_share', lineClass: 'line-one', pointClass: 'point-one' },
      { key: 'black_women_leader_share', lineClass: 'line-two', pointClass: 'point-two' }
    ]);
    barChart(document.querySelector('#regionChart'), summary.regions.map((row) => ({ label: row.region, value: row.black_women_share })), {
      max: 16, color: ['#ff6e62', '#f6c94d', '#087f68', '#8b70de'], valueFormat: percent, tickFormat: (value) => `${Math.round(value)}%`, left: 125
    });
    const leadershipLabels = { 'White|Male': 'White men', 'White|Female': 'White women', 'Black or African American|Male': 'Black men', 'Black or African American|Female': 'Black women', 'Hispanic|Male': 'Hispanic men', 'Hispanic|Female': 'Hispanic women', 'Asian|Male': 'Asian men', 'Asian|Female': 'Asian women', 'American Indian or Alaska Native|Male': 'AIAN men', 'American Indian or Alaska Native|Female': 'AIAN women', 'Native Hawaiian or Other Pacific Islander|Male': 'NHOPI men', 'Native Hawaiian or Other Pacific Islander|Female': 'NHOPI women', 'Two or more races|Male': 'Two+ men', 'Two or more races|Female': 'Two+ women' };
    const leadershipTotal = summary.latest_leadership_total;
    const leadershipRows = summary.leadership.map((row) => ({
      label: leadershipLabels[`${row.race}|${row.sex}`] || `${row.race} ${row.sex.toLowerCase()}`,
      value: row.employees / leadershipTotal * 100
    })).sort((a, b) => b.value - a.value);
    barChart(document.querySelector('#leadershipChart'), leadershipRows, { max: 40, valueFormat: percent, tickFormat: (value) => `${Math.round(value)}%`, left: 150, rowHeight: 30, color: ['#087f68', '#6fc5e9', '#ff6e62', '#f6c94d', '#8b70de'] });
    const topStates = summary.states.slice(0, 5).map((row) => ({ label: row.state, value: row.black_women_share, color: '#087f68' }));
    const bottomStates = [...summary.states].sort((a, b) => a.black_women_share - b.black_women_share).slice(0, 5).map((row) => ({ label: row.state, value: row.black_women_share, color: '#ff6e62' }));
    barChart(document.querySelector('#stateChart'), [...topStates, ...bottomStates], { max: 25, valueFormat: percent, tickFormat: (value) => `${Math.round(value)}%`, left: 130, rowHeight: 30 });
    lineChart(document.querySelector('#scopeChart'), summary.year_rows.map((row) => ({ label: row.year, value: row.finance_total / 1000000 })), { min: 0, lineClass: 'line-two', pointClass: 'point-two', tickFormat: (value) => `${value.toFixed(1)}m` });
  }

  fetch('data/finance_summary.json')
    .then((response) => response.json())
    .then(render)
    .catch((error) => document.querySelectorAll('.chart-wrap').forEach((target) => empty(target, `Could not load the summary data: ${error.message}`)));
})();
