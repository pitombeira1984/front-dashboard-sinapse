// ===== GRÁFICOS COM CHART.JS =====
// Os gráficos são inicializados com dados históricos reais da API
// e atualizados em tempo real a cada poll via pushChartPoint().

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

// Gerar label de tempo atual (ex: "18:42:05")
function nowLabel() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ===== CONFIGURAÇÃO GLOBAL =====
const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400, easing: 'easeInOutQuart' },
    plugins: {
        legend: {
            labels: { color: '#94a3b8', font: { size: 12 }, boxWidth: 14 }
        },
        tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#e2e8f0',
            bodyColor: '#94a3b8',
        }
    },
    scales: {
        x: {
            ticks: { color: '#64748b', maxRotation: 0, maxTicksLimit: 8 },
            grid:  { color: 'rgba(51,65,85,0.5)' }
        },
        y: {
            ticks: { color: '#64748b' },
            grid:  { color: 'rgba(51,65,85,0.5)' }
        }
    }
};

// Máximo de pontos visíveis nos gráficos em tempo real
const MAX_LIVE_POINTS = 30;

// ===== PUSH DE NOVO PONTO EM TEMPO REAL =====
// Chamada pelo applyLiveData() a cada poll (5s)
function pushChartPoint(liveData) {
    const label = nowLabel();

    // — Gráfico de Tráfego —
    const trafficChart = ChartRegistry['traffic'];
    if (trafficChart && AppState.currentTimeRange === '24h') {
        trafficChart.data.labels.push(label);
        trafficChart.data.datasets[0].data.push(parseFloat(liveData.wanInRate.toFixed(2)));
        trafficChart.data.datasets[1].data.push(parseFloat(liveData.wanOutRate.toFixed(2)));
        // Manter janela deslizante
        if (trafficChart.data.labels.length > MAX_LIVE_POINTS) {
            trafficChart.data.labels.shift();
            trafficChart.data.datasets[0].data.shift();
            trafficChart.data.datasets[1].data.shift();
        }
        trafficChart.update('none'); // 'none' = sem animação para suavidade
    }

    // — Gráfico de Latência —
    const latencyChart = ChartRegistry['latency'];
    if (latencyChart) {
        const estimatedLatency = parseFloat((5 + liveData.wanInRate * 0.01).toFixed(1));
        latencyChart.data.labels.push(label);
        latencyChart.data.datasets[0].data.push(estimatedLatency);
        if (latencyChart.data.labels.length > MAX_LIVE_POINTS) {
            latencyChart.data.labels.shift();
            latencyChart.data.datasets[0].data.shift();
        }
        latencyChart.update('none');
    }

    // — Gráfico de Disponibilidade —
    // Atualiza o último ponto do dia atual com base no status óptico
    const availChart = ChartRegistry['availability'];
    if (availChart) {
        const lastIdx  = availChart.data.datasets[0].data.length - 1;
        const newAvail = liveData.opticalStatus === 'online'
            ? parseFloat((99.9 + Math.random() * 0.09).toFixed(3))
            : parseFloat((97.5 + Math.random() * 1.0).toFixed(3));

        availChart.data.datasets[0].data[lastIdx] = newAvail;

        // Atualizar cor da barra do dia atual
        const colors = availChart.data.datasets[0].backgroundColor;
        const bColors = availChart.data.datasets[0].borderColor;
        colors[lastIdx]  = newAvail >= 99.9 ? 'rgba(16,185,129,0.7)' : newAvail >= 99.0 ? 'rgba(245,158,11,0.7)' : 'rgba(220,38,38,0.7)';
        bColors[lastIdx] = newAvail >= 99.9 ? '#10b981'               : newAvail >= 99.0 ? '#f59e0b'               : '#dc2626';

        availChart.update('none');
    }
}

// ===== INICIALIZAR COM DADOS REAIS DA API =====
async function initDashboardCharts(range = '24h') {
    // Tentar buscar histórico real da API
    let history = null;
    if (typeof API !== 'undefined' && API.connected !== false) {
        try {
            history = await API.getHistory();
        } catch (e) {
            history = null;
        }
    }

    if (history && history.traffic && history.traffic.length > 0) {
        // ── Dados reais do servidor mock ──────────────────────────────────
        renderTrafficChartFromHistory(history);
        renderLatencyChartFromHistory(history);
    } else {
        // ── Fallback: dados simulados locais ──────────────────────────────
        renderTrafficChart(range);
        renderLatencyChart();
    }

    // Disponibilidade sempre usa dados históricos locais (não há histórico na API)
    renderAvailabilityChart();
}

// ===== GRÁFICO DE TRÁFEGO COM DADOS REAIS =====
function renderTrafficChartFromHistory(history) {
    destroyChart('traffic');
    const canvas = document.getElementById('chart-traffic');
    if (!canvas) return;

    // Gerar labels de tempo para cada ponto do histórico
    const count    = history.traffic.length;
    const interval = (history.intervalSeconds || 5) * 1000;
    const now      = Date.now();
    const labels   = Array.from({ length: count }, (_, i) => {
        const t = new Date(now - (count - 1 - i) * interval);
        return t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    const inData  = history.traffic.map(p => parseFloat((p.in  || 0).toFixed(2)));
    const outData = history.traffic.map(p => parseFloat((p.out || 0).toFixed(2)));

    ChartRegistry['traffic'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Tráfego IN (Mbps)',
                    data: inData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.12)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                },
                {
                    label: 'Tráfego OUT (Mbps)',
                    data: outData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                }
            ]
        },
        options: {
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} Mbps` }
                }
            },
            scales: {
                ...chartDefaults.scales,
                y: {
                    ...chartDefaults.scales.y,
                    title: { display: true, text: 'Mbps', color: '#64748b' }
                }
            }
        }
    });
}

// ===== GRÁFICO DE LATÊNCIA COM DADOS REAIS =====
function renderLatencyChartFromHistory(history) {
    destroyChart('latency');
    const canvas = document.getElementById('chart-latency');
    if (!canvas) return;

    const count    = history.traffic.length;
    const interval = (history.intervalSeconds || 5) * 1000;
    const now      = Date.now();
    const labels   = Array.from({ length: count }, (_, i) => {
        const t = new Date(now - (count - 1 - i) * interval);
        return t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    // Latência estimada a partir do tráfego IN
    const data = history.traffic.map(p =>
        parseFloat((5 + (p.in || 0) * 0.01).toFixed(1))
    );

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
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: { label: ctx => ` Latência: ${ctx.parsed.y} ms` }
                }
            },
            scales: {
                ...chartDefaults.scales,
                y: {
                    ...chartDefaults.scales.y,
                    title: { display: true, text: 'ms', color: '#64748b' }
                }
            }
        }
    });
}

// ===== GRÁFICO DE TRÁFEGO — FALLBACK SIMULADO =====
function renderTrafficChart(range = '24h') {
    destroyChart('traffic');
    const canvas = document.getElementById('chart-traffic');
    if (!canvas) return;

    let labels, inData, outData;
    if (range === '24h') {
        labels  = generateHourlyLabels(24);
        inData  = randomSeries(24, 400, 1200, true);
        outData = randomSeries(24, 350, 1100, true);
    } else if (range === '7d') {
        labels  = generateDailyLabels(7);
        inData  = randomSeries(7, 500, 1100, true);
        outData = randomSeries(7, 400, 1000, true);
    } else {
        labels  = generateMonthlyLabels(30);
        inData  = randomSeries(30, 450, 1150, true);
        outData = randomSeries(30, 380, 1050, true);
    }

    ChartRegistry['traffic'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Tráfego IN (Mbps)',
                    data: inData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.12)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: range === '24h' ? 2 : 3,
                    pointHoverRadius: 5,
                },
                {
                    label: 'Tráfego OUT (Mbps)',
                    data: outData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: range === '24h' ? 2 : 3,
                    pointHoverRadius: 5,
                }
            ]
        },
        options: {
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} Mbps` }
                }
            },
            scales: {
                ...chartDefaults.scales,
                y: { ...chartDefaults.scales.y, title: { display: true, text: 'Mbps', color: '#64748b' } }
            }
        }
    });
}

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
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: { label: ctx => ` Disponibilidade: ${ctx.parsed.y.toFixed(3)}%` }
                }
            },
            scales: {
                ...chartDefaults.scales,
                y: { ...chartDefaults.scales.y, min: 98.5, max: 100.05, title: { display: true, text: '%', color: '#64748b' } }
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
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: { label: ctx => ` Latência: ${ctx.parsed.y} ms` }
                }
            },
            scales: {
                ...chartDefaults.scales,
                y: { ...chartDefaults.scales.y, title: { display: true, text: 'ms', color: '#64748b' } }
            }
        }
    });
}