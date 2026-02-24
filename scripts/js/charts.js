// ===== GRÁFICOS COM CHART.JS =====
// Requer Chart.js carregado antes deste script.
// Registra os gráficos ativos para destruí-los antes de recriar.
const ChartRegistry = {};

function destroyChart(id) {
    if (ChartRegistry[id]) {
        ChartRegistry[id].destroy();
        delete ChartRegistry[id];
    }
}

// ===== GERAÇÃO DE DADOS SIMULADOS =====
function generateHourlyLabels(hours = 24) {
    const labels = [];
    const now = new Date();
    for (let i = hours - 1; i >= 0; i--) {
        const d = new Date(now - i * 3600000);
        labels.push(d.getHours().toString().padStart(2, '0') + ':00');
    }
    return labels;
}

function generateDailyLabels(days = 7) {
    const labels = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    }
    return labels;
}

function generateMonthlyLabels(months = 30) {
    const labels = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
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

// ===== CONFIGURAÇÃO GLOBAL DOS GRÁFICOS =====
const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeInOutQuart' },
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
            ticks: { color: '#64748b', maxRotation: 0 },
            grid: { color: 'rgba(51,65,85,0.5)' }
        },
        y: {
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(51,65,85,0.5)' }
        }
    }
};

// ===== GRÁFICO DE TRÁFEGO (DASHBOARD) =====
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
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} Mbps`
                    }
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

// ===== GRÁFICO DE DISPONIBILIDADE (DASHBOARD) =====
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
                    v >= 99.9 ? 'rgba(16,185,129,0.7)' :
                    v >= 99.0 ? 'rgba(245,158,11,0.7)' :
                                'rgba(220,38,38,0.7)'
                ),
                borderColor: data.map(v =>
                    v >= 99.9 ? '#10b981' :
                    v >= 99.0 ? '#f59e0b' :
                                '#dc2626'
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
                    callbacks: {
                        label: ctx => ` Disponibilidade: ${ctx.parsed.y.toFixed(3)}%`
                    }
                }
            },
            scales: {
                ...chartDefaults.scales,
                y: {
                    ...chartDefaults.scales.y,
                    min: 98.5,
                    max: 100.05,
                    title: { display: true, text: '%', color: '#64748b' }
                }
            }
        }
    });
}

// ===== GRÁFICO DE LATÊNCIA (DASHBOARD) =====
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
                y: {
                    ...chartDefaults.scales.y,
                    title: { display: true, text: 'ms', color: '#64748b' }
                }
            }
        }
    });
}

// ===== INICIALIZAR TODOS OS GRÁFICOS DO DASHBOARD =====
function initDashboardCharts(range = '24h') {
    renderTrafficChart(range);
    renderAvailabilityChart();
    renderLatencyChart();
}