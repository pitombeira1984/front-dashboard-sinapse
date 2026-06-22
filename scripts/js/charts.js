// ===== GRÁFICOS COM CHART.JS =====
// Gráficos inicializados com dados da API e atualizados em tempo real a cada poll.

const ChartRegistry = {};

function destroyChart(id) {
    if (ChartRegistry[id]) {
        ChartRegistry[id].destroy();
        delete ChartRegistry[id];
    }
}

// ===== LABELS =====
function generateHourlyLabels(hours = 24) {
    const labels = [];
    const now    = new Date();
    for (let i = hours - 1; i >= 0; i--) {
        const d = new Date(now - i * 3600000);
        labels.push(d.getHours().toString().padStart(2, '0') + ':00');
    }
    return labels;
}

function generateDailyLabels(days = 7) {
    const labels = [];
    const now    = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    }
    return labels;
}

function generateMonthlyLabels(count = 30) {
    const labels = [];
    const now    = new Date();
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    }
    return labels;
}

function randomSeries(count, min, max, smooth = false) {
    const data = [];
    let prev = (min + max) / 2;
    for (let i = 0; i < count; i++) {
        if (smooth) {
            prev = Math.min(max, Math.max(min, prev + (Math.random() - 0.5) * ((max - min) * 0.15)));
            data.push(parseFloat(prev.toFixed(2)));
        } else {
            data.push(parseFloat((Math.random() * (max - min) + min).toFixed(2)));
        }
    }
    return data;
}

function nowLabel() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ===== CONFIGURAÇÃO GLOBAL =====
function getChartDefaults() {
    const cs   = getComputedStyle(document.documentElement);
    const cv   = (v) => cs.getPropertyValue(v).trim();
    const grid = cv('--chart-grid') || 'rgba(51,65,85,0.4)';
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: 'easeInOutQuart' },
        plugins: {
            legend: {
                labels: { color: cv('--text-secondary'), font: { size: 12 }, boxWidth: 14 }
            },
            tooltip: {
                backgroundColor: cv('--bg-card'),
                borderColor:     cv('--border-color'),
                borderWidth: 1,
                titleColor:  cv('--text-primary'),
                bodyColor:   cv('--text-secondary'),
            }
        },
        scales: {
            x: {
                ticks: { color: cv('--text-muted'), maxRotation: 0, maxTicksLimit: 8 },
                grid:  { color: grid }
            },
            y: {
                ticks: { color: cv('--text-muted') },
                grid:  { color: grid }
            }
        }
    };
}

const getCssVar = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

const MAX_LIVE_POINTS = 30;

// ===== GRÁFICO DE DISPONIBILIDADE =====
function renderAvailabilityChart() {
    destroyChart('availability');
    const canvas = document.getElementById('chart-availability');
    if (!canvas) return;

    const labels = generateDailyLabels(14);
    const data   = randomSeries(14, 99.1, 100.0, true);

    ChartRegistry['availability'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Disponibilidade (%)',
                data,
                backgroundColor: data.map(v =>
                    v >= 99.9 ? 'rgba(16,185,129,0.7)' : v >= 99.0 ? 'rgba(245,158,11,0.7)' : 'rgba(220,38,38,0.7)'
                ),
                borderColor: data.map(v =>
                    v >= 99.9 ? '#10b981' : v >= 99.0 ? '#f59e0b' : '#dc2626'
                ),
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            ...getChartDefaults(),
            plugins: {
                ...getChartDefaults().plugins,
                tooltip: {
                    ...getChartDefaults().plugins.tooltip,
                    callbacks: { label: ctx => ` Disponibilidade: ${ctx.parsed.y.toFixed(3)}%` }
                }
            },
            scales: {
                ...getChartDefaults().scales,
                y: { ...getChartDefaults().scales.y, min: 98.5, max: 100.05, title: { display: true, text: '%', color: getCssVar('--text-muted') } }
            }
        }
    });
}

// ===== GRÁFICO DE LATÊNCIA — FALLBACK SIMULADO =====
function renderLatencyChart() {
    destroyChart('latency');
    const canvas = document.getElementById('chart-latency');
    if (!canvas) return;

    const labels = generateHourlyLabels(24);
    const data   = randomSeries(24, 8, 55, true);

    ChartRegistry['latency'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Latência (ms)',
                data,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245,158,11,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
            }]
        },
        options: {
            ...getChartDefaults(),
            plugins: {
                ...getChartDefaults().plugins,
                tooltip: {
                    ...getChartDefaults().plugins.tooltip,
                    callbacks: { label: ctx => ` Latência: ${ctx.parsed.y} ms` }
                }
            },
            scales: {
                ...getChartDefaults().scales,
                y: { ...getChartDefaults().scales.y, title: { display: true, text: 'ms', color: getCssVar('--text-muted') } }
            }
        }
    });
}

// ===== GRÁFICO DE LATÊNCIA COM DADOS REAIS =====
function renderLatencyChartFromHistory(history) {
    destroyChart('latency');
    const canvas = document.getElementById('chart-latency');
    if (!canvas) return;

    const count    = (history.latency || history.traffic).length;
    const interval = (history.intervalSeconds || 5) * 1000;
    const now      = Date.now();
    const labels   = Array.from({ length: count }, (_, i) => {
        const t = new Date(now - (count - 1 - i) * interval);
        return t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    const data = (history.latency || []).map(p => parseFloat(p.toFixed(1)));

    ChartRegistry['latency'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Latência (ms)',
                data,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245,158,11,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            }]
        },
        options: {
            ...getChartDefaults(),
            plugins: {
                ...getChartDefaults().plugins,
                tooltip: {
                    ...getChartDefaults().plugins.tooltip,
                    callbacks: { label: ctx => ` Latência: ${ctx.parsed.y} ms` }
                }
            },
            scales: {
                ...getChartDefaults().scales,
                y: { ...getChartDefaults().scales.y, title: { display: true, text: 'ms', color: getCssVar('--text-muted') } }
            }
        }
    });
}

// ===== GRÁFICOS GPON =====

// LINHA — Latência média ao longo do tempo
function renderLatencyGPONChart(history) {
    destroyChart('latencyGpon');
    const canvas = document.getElementById('chart-latency-gpon');
    if (!canvas) return;

    const count    = history?.latency?.length || 120;
    const interval = (history?.intervalSeconds || 5) * 1000;
    const now      = Date.now();
    const labels   = Array.from({length: count}, (_, i) => {
        const t = new Date(now - (count - 1 - i) * interval);
        return t.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    });

    const data = history?.latency || Array.from({length:120}, () => 10 + Math.random() * 8);

    ChartRegistry['latencyGpon'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Latência Média (ms)',
                data,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245,158,11,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            }]
        },
        options: {
            ...getChartDefaults(),
            plugins: { ...getChartDefaults().plugins, tooltip: { ...getChartDefaults().plugins.tooltip, callbacks: { label: ctx => ` Latência: ${ctx.parsed.y} ms` } } },
            scales: { ...getChartDefaults().scales, y: { ...getChartDefaults().scales.y, title: { display:true, text:'ms', color: getCssVar('--text-muted') } } }
        }
    });
}

// Push de dados GPON em tempo real
function pushGPONChartPoints(liveData) {
    const label = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

    const latChart = ChartRegistry['latencyGpon'];
    if (latChart && liveData.avgLatency) {
        latChart.data.labels.push(label);
        latChart.data.datasets[0].data.push(parseFloat(liveData.avgLatency));
        if (latChart.data.labels.length > 30) { latChart.data.labels.shift(); latChart.data.datasets[0].data.shift(); }
        latChart.update('none');
    }
}

// ===== INICIALIZAR GRÁFICO VAZIO — LATÊNCIA GPON =====
function initLatencyGPONChartEmpty() {
    destroyChart('latencyGpon');
    const canvas = document.getElementById('chart-latency-gpon');
    if (!canvas) return;
    ChartRegistry['latencyGpon'] = new Chart(canvas, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Latência Média (ms)', data: [], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 }] },
        options: {
            ...getChartDefaults(),
            plugins: { ...getChartDefaults().plugins, tooltip: { ...getChartDefaults().plugins.tooltip, callbacks: { label: ctx => ` Latência: ${ctx.parsed.y} ms` } } },
            scales: { ...getChartDefaults().scales, y: { ...getChartDefaults().scales.y, title: { display: true, text: 'ms', color: getCssVar('--text-muted') } } }
        }
    });
}

// ===== GRÁFICO DE BARRAS — CONSUMO DE BANDA POR OLT =====
function renderOLTBandwidthChart(olts) {
    destroyChart('oltBandwidth');
    const canvas = document.getElementById('chart-olt-bandwidth');
    if (!canvas || !olts || !olts.length) return;

    const _inColor   = pct => pct >= 80 ? 'rgba(220,38,38,0.75)'  : pct >= 50 ? 'rgba(245,158,11,0.75)' : 'rgba(37,99,235,0.75)';
    const _inBorder  = pct => pct >= 80 ? '#dc2626'                : pct >= 50 ? '#f59e0b'               : '#2563eb';
    const _outColor  = pct => pct >= 80 ? 'rgba(220,38,38,0.65)'  : pct >= 50 ? 'rgba(245,158,11,0.65)' : 'rgba(16,185,129,0.65)';
    const _outBorder = pct => pct >= 80 ? '#dc2626'                : pct >= 50 ? '#f59e0b'               : '#10b981';

    const inData     = olts.map(o => o.inRate);
    const outData    = olts.map(o => o.outRate);
    const inColors   = olts.map(o => _inColor(o.inPct   ?? (o.inRate  / o.capacity * 100)));
    const inBorders  = olts.map(o => _inBorder(o.inPct  ?? (o.inRate  / o.capacity * 100)));
    const outColors  = olts.map(o => _outColor(o.outPct  ?? (o.outRate / o.capacity * 100)));
    const outBorders = olts.map(o => _outBorder(o.outPct ?? (o.outRate / o.capacity * 100)));

    ChartRegistry['oltBandwidth'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: olts.map(o => o.name),
            datasets: [
                {
                    label: 'Tráfego IN (Mbps)',
                    data: inData,
                    backgroundColor: inColors,
                    borderColor: inBorders,
                    borderWidth: 1,
                    borderRadius: 4,
                },
                {
                    label: 'Tráfego OUT (Mbps)',
                    data: outData,
                    backgroundColor: outColors,
                    borderColor: outBorders,
                    borderWidth: 1,
                    borderRadius: 4,
                },
            ]
        },
        options: {
            ...getChartDefaults(),
            plugins: {
                ...getChartDefaults().plugins,
                tooltip: {
                    ...getChartDefaults().plugins.tooltip,
                    callbacks: {
                        label: ctx => {
                            const olt = olts[ctx.dataIndex];
                            const pct = ((ctx.parsed.y / olt.capacity) * 100).toFixed(1);
                            return ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('pt-BR')} Mbps (${pct}% de ${(olt.capacity / 1000).toFixed(1)} Gbps)`;
                        },
                        afterBody: ctx => {
                            if (!ctx.length) return [];
                            const olt = olts[ctx[0].dataIndex];
                            return [`  Capacidade total: ${(olt.capacity / 1000).toFixed(1)} Gbps  •  ${olt.model}`];
                        }
                    }
                }
            },
            scales: {
                ...getChartDefaults().scales,
                y: {
                    ...getChartDefaults().scales.y,
                    title: { display: true, text: 'Mbps', color: getCssVar('--text-muted') },
                    ticks: {
                        color: getCssVar('--text-muted'),
                        callback: v => v >= 1000 ? `${(v / 1000).toFixed(1)} Gbps` : `${v} Mbps`
                    }
                }
            }
        }
    });
}

function updateOLTBandwidthChart(olts) {
    const chart = ChartRegistry['oltBandwidth'];
    if (!chart || !olts || !olts.length) return;

    const _inColor  = pct => pct >= 80 ? 'rgba(220,38,38,0.75)'  : pct >= 50 ? 'rgba(245,158,11,0.75)' : 'rgba(37,99,235,0.75)';
    const _outColor = pct => pct >= 80 ? 'rgba(220,38,38,0.65)'  : pct >= 50 ? 'rgba(245,158,11,0.65)' : 'rgba(16,185,129,0.65)';

    chart.data.datasets[0].data            = olts.map(o => o.inRate);
    chart.data.datasets[0].backgroundColor = olts.map(o => _inColor(o.inPct   ?? (o.inRate  / o.capacity * 100)));
    chart.data.datasets[1].data            = olts.map(o => o.outRate);
    chart.data.datasets[1].backgroundColor = olts.map(o => _outColor(o.outPct ?? (o.outRate / o.capacity * 100)));
    chart.update('none');
}

// ===== INICIALIZAR TODOS OS GRÁFICOS DO DASHBOARD =====
async function initDashboardCharts() {
    initLatencyGPONChartEmpty();

    if (typeof API !== 'undefined') {
        try {
            const oltBw = await API.getOLTsBandwidth();
            const olts  = oltBw?.data ?? oltBw;
            if (olts && olts.length) renderOLTBandwidthChart(olts);
        } catch(e) {}
    }
}
