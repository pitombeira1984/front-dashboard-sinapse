// ===== CATÁLOGO DE TIPOS DE PARÂMETRO DE MONITORAMENTO =====
// Espelha os TRAP_TYPES do trap-engine.js — mesmos parâmetros, configuráveis pelo operador.
const MONITORING_PARAM_TYPES = {
    opticalDegradation: {
        label:            'Sinal Óptico (RxPower)',
        icon:             'fa-satellite-dish',
        hasThreshold:     true,
        operator:         '<',
        unit:             'dBm',
        defaultThreshold: -24,
        defaultSeverity:  'critical',
        description:      'Dispara quando RxPower cai abaixo do limiar. Valor típico de operação: acima de -22 dBm.',
        dataKey:          'avgRxPower',
    },
    highTemperature: {
        label:            'Temperatura Alta',
        icon:             'fa-thermometer-full',
        hasThreshold:     true,
        operator:         '>',
        unit:             '°C',
        defaultThreshold: 65,
        defaultSeverity:  'warning',
        description:      'Dispara quando a temperatura interna ultrapassa o limiar operacional.',
        dataKey:          'temperature',
    },
    highCPU: {
        label:            'CPU Alta',
        icon:             'fa-microchip',
        hasThreshold:     true,
        operator:         '>',
        unit:             '%',
        defaultThreshold: 80,
        defaultSeverity:  'warning',
        description:      'Dispara quando a utilização de CPU ultrapassa o limiar por tempo configurado.',
        dataKey:          'cpu',
    },
    latencyHigh: {
        label:            'Latência Alta',
        icon:             'fa-clock',
        hasThreshold:     true,
        operator:         '>',
        unit:             'ms',
        defaultThreshold: 50,
        defaultSeverity:  'warning',
        description:      'Dispara quando a latência média das ONUs supera o limiar configurado.',
        dataKey:          'avgLatency',
    },
    onuOffline: {
        label:            'ONU Offline',
        icon:             'fa-network-wired',
        hasThreshold:     false,
        defaultSeverity:  'critical',
        description:      'Dispara quando uma ou mais ONUs passam para o estado offline.',
        dataKey:          'onusOnline',
    },
    linkDown: {
        label:            'Link Down',
        icon:             'fa-unlink',
        hasThreshold:     false,
        defaultSeverity:  'critical',
        description:      'Dispara quando uma interface de rede fica inativa (via SNMP Trap).',
        dataKey:          null,
    },
    highBandwidth: {
        label:            'Saturação de Banda',
        icon:             'fa-tachometer-alt',
        hasThreshold:     true,
        operator:         '>',
        unit:             '%',
        defaultThreshold: 85,
        defaultSeverity:  'warning',
        description:      'Dispara quando a utilização de banda supera o limiar configurado.',
        dataKey:          'bandwidthPercent',
    },
    authenticationFailure: {
        label:            'Falha de Autenticação SNMP',
        icon:             'fa-shield-alt',
        hasThreshold:     false,
        defaultSeverity:  'critical',
        description:      'Dispara quando ocorre falha de autenticação SNMP (via Trap).',
        dataKey:          null,
    },
};

// Rastreia quando cada condição foi detectada pela primeira vez (para duração mínima)
const _conditionStartMap = {};

// ===== INICIALIZAÇÃO DE EVENTOS POR PÁGINA =====
let _timeInterval = null;

function initPageEvents(page) {
    initCommonEvents();
    switch (page) {
        case 'dashboard':   initDashboardEvents();  break;
        case 'devices':     initDevicesEvents();    break;
        case 'alerts':      initAlertsEvents();     break;
        case 'analysis':    initAnalysisEvents();   break;
        case 'settings':    initSettingsEvents();   break;
        case 'history':     initHistoryEvents();    break;
    }
}

// ===== EVENTOS COMUNS =====
function initCommonEvents() {
    updateTime();
    if (_timeInterval) clearInterval(_timeInterval);
    _timeInterval = setInterval(updateTime, 1000);

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
                this.style.backgroundColor = 'var(--success-color)';
                setTimeout(() => { this.style.backgroundColor = ''; }, 500);
                if (AppState.currentPage === 'dashboard') updateDashboardData();
            }, 800);
        });
    }

    document.getElementById('logo').addEventListener('click', e => { e.preventDefault(); navigateTo('dashboard'); });
}

// ===== DASHBOARD =====
function initDashboardEvents() {
    // Latência GPON inicializada antes do polling para garantir estado vazio
    initLatencyGPONChartEmpty();
    // Gráfico de consumo de banda por OLT — carregado de forma assíncrona
    (async () => {
        try {
            const oltBw = await API.getOLTsBandwidth();
            const olts  = oltBw?.data ?? oltBw;
            if (olts && olts.length) renderOLTBandwidthChart(olts);
        } catch(e) {}
    })();

    // Polling principal: KPIs + gráficos + dispositivos em tempo real
    API.startPolling(async (data) => {
        applyLiveData(data);
        if (typeof pushGPONChartPoints === 'function') pushGPONChartPoints(data);
        // Barra de disponibilidade
        const availBar = document.getElementById('avail-bar');
        if (availBar && data.availability !== undefined) {
            availBar.style.width = `${Math.min(data.availability, 100)}%`;
            availBar.style.backgroundColor = data.availability >= 99 ? 'var(--success-color)' : data.availability >= 90 ? 'var(--warning-color)' : 'var(--danger-color)';
        }
        // Trend de ONUs
        const trend = document.getElementById('onus-trend');
        if (trend && data.onusOnline !== undefined) {
            const offline = (data.onusTotal ?? 8) - data.onusOnline;
            trend.innerHTML = offline > 0
                ? `<i class="fas fa-exclamation-triangle" style="color:var(--danger-color);"></i> <span style="color:var(--danger-color);">${offline} offline</span>`
                : `<i class="fas fa-check-circle" style="color:var(--success-color);"></i> <span>Todas online</span>`;
        }
        // Sincronizar Dispositivos Monitorados e gráfico de banda por OLT
        try {
            const [onus, oltBw] = await Promise.all([
                API.getONUs(AppState.currentGponPort),
                API.getOLTsBandwidth(),
            ]);
            const grid = document.getElementById('devices-grid-dashboard');
            if (grid) {
                const oltDevice = {
                    id: 100, name: 'OLT Huawei MA5800-X2', ip: '10.0.1.10',
                    type: 'OLT', status: 'online',
                    cpu: data.cpu, memory: data.memPercent, temperature: data.temperature,
                    onus_active: data.onusOnline, onus_total: data.onusTotal,
                };
                if (onus && onus.length) {
                    const onuDevices = onus.map(o => ({ ...o, name: `ONU — ${o.apt}`, type: 'ONU' }));
                    grid.innerHTML = renderDeviceCards([oltDevice, ...onuDevices]);
                } else {
                    grid.innerHTML = renderDeviceCards([oltDevice]);
                }
            }
            const olts = oltBw?.data ?? oltBw;
            if (olts && olts.length) {
                if (typeof ChartRegistry !== 'undefined' && ChartRegistry['oltBandwidth']) updateOLTBandwidthChart(olts);
                else renderOLTBandwidthChart(olts);
            }
        } catch(e) {}
    });

    // FIX 4: Trap polling — atualiza badge, toast E o card no dashboard
    API.startTrapPolling((stats, lastTrap) => {
        updateTrapBadge(stats);
        showTrapToast(lastTrap);
        // Atualiza o card de traps seja ele placeholder ou já renderizado
        const trapCard = document.getElementById('trap-summary-card') || document.getElementById('trap-summary-placeholder');
        if (trapCard) trapCard.outerHTML = renderTrapSummaryCard(stats);
    });

    // Carga inicial do card de Traps
    (async () => {
        const res   = await API.getTrapStats();
        const stats = res?.data ?? res;
        if (stats) {
            updateTrapBadge(stats);
            const placeholder = document.getElementById('trap-summary-placeholder');
            if (placeholder) placeholder.outerHTML = renderTrapSummaryCard(stats);
        }
    })();

    // FIX 2: Seletor de portas GPON
    (async () => {
        try {
            const ports   = await API.getGponPorts();
            const select  = document.getElementById('gpon-port-selector');
            if (select && ports && ports.length) {
                select.innerHTML = ports.map(p => {
                    const onuInfo = p.onusTotal > 0 ? ` (${p.onusOnline}/${p.onusTotal} ONUs)` : ' (sem ONUs)';
                    return `<option value="${p.id}" ${p.id === AppState.currentGponPort ? 'selected' : ''}>${p.name}${onuInfo}</option>`;
                }).join('');

                select.addEventListener('change', async function() {
                    AppState.currentGponPort = this.value;

                    // Resetar gráficos de linha GPON para a nova porta
                    initOpticalSignalChartEmpty();
                    initLatencyGPONChartEmpty();

                    // Buscar dados em paralelo para a nova porta
                    const [liveData, onus] = await Promise.all([
                        API.getLive(AppState.currentGponPort),
                        API.getONUs(AppState.currentGponPort),
                    ]);

                    // Atualizar KPIs e gráficos com dados da nova porta
                    if (liveData) {
                        applyLiveData(liveData);
                        if (typeof pushGPONChartPoints === 'function') pushGPONChartPoints(liveData);
                        // Barra de disponibilidade
                        const availBar = document.getElementById('avail-bar');
                        if (availBar && liveData.availability !== undefined) {
                            availBar.style.width = `${Math.min(liveData.availability, 100)}%`;
                            availBar.style.backgroundColor = liveData.availability >= 99 ? 'var(--success-color)' : liveData.availability >= 90 ? 'var(--warning-color)' : 'var(--danger-color)';
                        }
                        // Trend de ONUs
                        const trend = document.getElementById('onus-trend');
                        if (trend) {
                            const offline = (liveData.onusTotal ?? 0) - (liveData.onusOnline ?? 0);
                            trend.innerHTML = offline > 0
                                ? `<i class="fas fa-exclamation-triangle" style="color:var(--danger-color);"></i> <span style="color:var(--danger-color);">${offline} offline</span>`
                                : `<i class="fas fa-check-circle" style="color:var(--success-color);"></i> <span>Todas online</span>`;
                        }
                    }

                    // Atualizar gráfico de barras RxPower e Dispositivos Monitorados para nova porta
                    const grid = document.getElementById('devices-grid-dashboard');
                    if (grid && liveData) {
                        const oltDevice = {
                            id: 100, name: 'OLT Huawei MA5800-X2', ip: '10.0.1.10',
                            type: 'OLT', status: 'online',
                            cpu: liveData.cpu, memory: liveData.memPercent, temperature: liveData.temperature,
                            onus_active: liveData.onusOnline, onus_total: liveData.onusTotal,
                        };
                        if (onus && onus.length) {
                            renderONURxPowerChart(onus);
                            const onuDevices = onus.map(o => ({ ...o, name: `ONU — ${o.apt}`, type: 'ONU' }));
                            grid.innerHTML = renderDeviceCards([oltDevice, ...onuDevices]);
                        } else {
                            grid.innerHTML = renderDeviceCards([oltDevice]);
                        }
                    }

                    // Feedback visual
                    const portObj = ports.find(p => p.id === AppState.currentGponPort);
                    showToast(`Monitorando porta ${portObj?.name || AppState.currentGponPort}`, 'info');
                });
            }
        } catch(e) {}
    })();

    // Botões de range do gráfico de tráfego — reinicializa vazio (dados chegam pelo polling)
    document.querySelectorAll('.chart-range-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.chart-range-btn').forEach(b => {
                b.className = 'chart-range-btn btn';
                b.style.cssText = 'background:transparent;border:1px solid var(--border-color);color:var(--text-secondary);';
            });
            this.className = 'chart-range-btn btn btn-secondary';
            this.style.cssText = '';
            AppState.currentTimeRange = this.getAttribute('data-range');
            // Re-inicializa o gráfico vazio — polling preencherá novamente
            initTrafficChartEmpty();
            initOpticalSignalChartEmpty();
            initLatencyGPONChartEmpty();
        });
    });

    const addBtn = document.getElementById('add-device-btn');
    if (addBtn) addBtn.addEventListener('click', openAddDeviceModal);
}

// ===== DISPOSITIVOS =====
let _mgmtDevices = [];

async function _loadMgmtDevices() {
    const devices = await API.getDevices();
    if (devices) {
        _mgmtDevices = devices;
        _applyMgmtFilters();
    }
}

function _applyMgmtFilters() {
    const query  = (document.getElementById('device-search')?.value  || '').toLowerCase().trim();
    const type   = document.getElementById('device-filter-type')?.value  || '';
    const status = document.getElementById('device-filter-status')?.value || '';
    let list     = _mgmtDevices;
    if (query)  list = list.filter(d =>
        (d.name   || '').toLowerCase().includes(query) ||
        (d.ip     || '').toLowerCase().includes(query) ||
        (d.client || '').toLowerCase().includes(query) ||
        (d.type   || '').toLowerCase().includes(query)
    );
    if (type)   list = list.filter(d => d.type   === type);
    if (status) list = list.filter(d => d.status === status);
    const tbody = document.getElementById('devices-table-body');
    const count = document.getElementById('devices-count');
    if (tbody) tbody.innerHTML = renderDeviceRows(list);
    if (count) count.innerHTML = `Mostrando <strong>${list.length}</strong> de <strong>${_mgmtDevices.length}</strong> dispositivo(s)`;
}

function initDevicesEvents() {
    const addBtn = document.getElementById('add-device-btn-page');
    if (addBtn) addBtn.addEventListener('click', openAddDeviceModal);

    // Carregar dispositivos do monitoramento via API e iniciar polling
    (async () => {
        await _loadMgmtDevices();
        API.startPolling(async () => { await _loadMgmtDevices(); });
    })();

    // Filtros em tempo real
    document.getElementById('device-search')?.addEventListener('input', _applyMgmtFilters);
    document.getElementById('device-filter-type')?.addEventListener('change', _applyMgmtFilters);
    document.getElementById('device-filter-status')?.addEventListener('change', _applyMgmtFilters);

    // ① ESCANEAR REDE
    const scanBtn = document.getElementById('scan-btn');
    if (scanBtn) {
        scanBtn.addEventListener('click', function () {
            const range    = document.getElementById('scan-range')?.value?.trim() || '10.0.1.0/24';
            const protocol = document.getElementById('scan-protocol')?.value || 'ping';
            const resultsEl = document.getElementById('scan-results');

            if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(range)) {
                showToast('Faixa de IP inválida. Use o formato 192.168.1.0/24', 'warning');
                return;
            }

            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Escaneando...';
            this.disabled  = true;
            if (resultsEl) {
                resultsEl.style.display = 'block';
                resultsEl.innerHTML = `
                    <div style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:1rem;">
                        <i class="fas fa-search" style="color:var(--primary-color);margin-right:0.5rem;"></i>
                        Escaneando ${range} via ${protocol.toUpperCase()}...
                    </div>
                    <div id="scan-progress" style="width:100%;height:6px;background:var(--bg-elevated);border-radius:3px;overflow:hidden;">
                        <div id="scan-bar" style="width:0%;height:100%;background:var(--primary-color);border-radius:3px;transition:width 0.3s;"></div>
                    </div>`;
            }

            let progress = 0;
            const progressInterval = setInterval(() => {
                progress = Math.min(progress + Math.random() * 15, 95);
                const bar = document.getElementById('scan-bar');
                if (bar) bar.style.width = `${progress}%`;
            }, 300);

            setTimeout(() => {
                clearInterval(progressInterval);
                const bar = document.getElementById('scan-bar');
                if (bar) bar.style.width = '100%';
                const discovered = generateScannedDevices(range);
                renderScanResults(discovered, resultsEl);
                this.innerHTML = '<i class="fas fa-search"></i> Escanear Rede';
                this.disabled  = false;
            }, 3000);
        });
    }
}

function generateScannedDevices(range) {
    const base   = range.split('.').slice(0, 3).join('.');
    const types  = ['Switch', 'Router', 'OLT', 'Radio'];
    const names  = ['Switch HP 2530', 'MikroTik hAP', 'Huawei SmartAX', 'Ubiquiti AirMax', 'TP-Link TL-SG', 'ZTE ZXA10'];
    const count  = 3 + Math.floor(Math.random() * 5);
    const used   = DeviceStorage.getAll().map(d => d.ip);
    const result = [];

    for (let i = 0; i < count; i++) {
        const ip   = `${base}.${10 + Math.floor(Math.random() * 240)}`;
        if (used.includes(ip)) continue;
        result.push({
            ip,
            name:    names[Math.floor(Math.random() * names.length)],
            type:    types[Math.floor(Math.random() * types.length)],
            latency: `${Math.floor(Math.random() * 20) + 1}ms`,
            status:  Math.random() > 0.2 ? 'online' : 'offline',
        });
    }
    return result;
}

function renderScanResults(devices, container) {
    if (!container) return;
    if (!devices.length) {
        container.innerHTML += `<div style="color:var(--text-secondary);font-size:0.875rem;margin-top:1rem;">Nenhum dispositivo novo encontrado na faixa.</div>`;
        return;
    }
    container.innerHTML = `
        <div style="margin-top:1rem;">
            <div style="font-weight:600;margin-bottom:0.75rem;color:var(--text-primary);">
                <i class="fas fa-check-circle" style="color:var(--success-color);margin-right:0.5rem;"></i>
                ${devices.length} dispositivo(s) encontrado(s)
            </div>
            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                ${devices.map(d => `
                    <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-base);padding:0.75rem 1rem;border-radius:8px;gap:1rem;flex-wrap:wrap;">
                        <div style="display:flex;align-items:center;gap:1rem;">
                            <div class="device-status status-${d.status}" style="justify-content:flex-start;">
                                <i class="fas fa-circle" style="font-size:0.6rem;"></i>
                            </div>
                            <div>
                                <div style="font-weight:600;font-size:0.9rem;">${d.ip}</div>
                                <div style="color:var(--text-secondary);font-size:0.8rem;">${d.name} • ${d.type} • Latência: ${d.latency}</div>
                            </div>
                        </div>
                        <button class="btn btn-secondary" style="font-size:0.8rem;padding:0.35rem 0.75rem;"
                            onclick="addScannedDevice('${d.ip}','${d.name}','${d.type}','${d.status}',this)">
                            <i class="fas fa-plus"></i> Adicionar
                        </button>
                    </div>`).join('')}
            </div>
        </div>`;
}

function addScannedDevice(ip, name, type, status, btn) {
    DeviceStorage.add({ ip, name, type, status });
    btn.innerHTML  = '<i class="fas fa-check"></i> Adicionado';
    btn.disabled   = true;
    btn.style.backgroundColor = 'var(--success-color)';
    showToast(`"${name}" (${ip}) adicionado com sucesso!`, 'success');
}

function updateDeviceFormFields() {
    const type = document.getElementById('new-device-type')?.value;
    const oltSection     = document.getElementById('new-device-olt-fields');
    const onuSection     = document.getElementById('new-device-onu-fields');
    const genericSection = document.getElementById('new-device-generic-fields');
    if (oltSection)     oltSection.style.display     = type === 'OLT' ? '' : 'none';
    if (onuSection)     onuSection.style.display     = type === 'ONU' ? '' : 'none';
    if (genericSection) genericSection.style.display = (type !== 'OLT' && type !== 'ONU') ? '' : 'none';
}

function openAddDeviceModal() {
    openModal('Adicionar Novo Dispositivo', `
        <div class="form-group">
            <label class="form-label">Tipo de Dispositivo</label>
            <select class="form-control" id="new-device-type" onchange="updateDeviceFormFields()">
                <option value="OLT">OLT (GPON/XGS-PON)</option>
                <option value="ONU">ONU (Terminal de Assinante)</option>
                <option value="Router">Roteador</option>
                <option value="Switch">Switch Gerenciável</option>
                <option value="Radio">Rádio Wireless</option>
            </select>
        </div>

        <!-- Campos para OLT -->
        <div id="new-device-olt-fields">
            <div class="form-group">
                <label class="form-label">Nome / ID *</label>
                <input type="text" class="form-control" id="olt-name" placeholder="Ex: OLT-04">
            </div>
            <div class="form-group">
                <label class="form-label">Endereço IP *</label>
                <input type="text" class="form-control" id="olt-ip" placeholder="Ex: 10.0.4.10">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Fabricante</label>
                    <select class="form-control" id="olt-vendor">
                        <option>Huawei</option><option>ZTE</option><option>Nokia</option><option>Fiberhome</option><option>Datacom</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Modelo</label>
                    <input type="text" class="form-control" id="olt-model" placeholder="Ex: MA5800-X2">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Localização (POP)</label>
                <input type="text" class="form-control" id="olt-location" placeholder="Ex: POP Bairro Leste">
            </div>
            <div class="form-group">
                <label class="form-label">Capacidade (Mbps)</label>
                <input type="number" class="form-control" id="olt-capacity" value="2500" min="100">
            </div>
        </div>

        <!-- Campos para ONU -->
        <div id="new-device-onu-fields" style="display:none;">
            <div class="form-group">
                <label class="form-label">Porta GPON *</label>
                <select class="form-control" id="onu-gpon-port">
                    <option value="">Carregando portas...</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Apto / Unidade *</label>
                    <input type="text" class="form-control" id="onu-apt" placeholder="Ex: Apto 401">
                </div>
                <div class="form-group">
                    <label class="form-label">Endereço IP</label>
                    <input type="text" class="form-control" id="onu-ip" placeholder="Ex: 10.0.1.110">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Nome do Cliente</label>
                <input type="text" class="form-control" id="onu-client" placeholder="Ex: José Alves">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Serial ONU</label>
                    <input type="text" class="form-control" id="onu-serial" placeholder="Ex: HW-ONU-000019">
                </div>
                <div class="form-group">
                    <label class="form-label">Modelo</label>
                    <select class="form-control" id="onu-model">
                        <option value="HG8245Q2">HG8245Q2 (Huawei)</option>
                        <option value="F660">F660 (ZTE)</option>
                        <option value="G-010G-T">G-010G-T (Nokia)</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Distância da OLT (km)</label>
                <input type="number" class="form-control" id="onu-distance" value="0.5" step="0.1" min="0.1" max="20">
            </div>
        </div>

        <!-- Campos genéricos (Router/Switch/Radio) -->
        <div id="new-device-generic-fields" style="display:none;">
            <div class="form-group">
                <label class="form-label">Nome do Dispositivo *</label>
                <input type="text" class="form-control" id="generic-name" placeholder="Ex: Switch Sala 03">
            </div>
            <div class="form-group">
                <label class="form-label">Endereço IP *</label>
                <input type="text" class="form-control" id="generic-ip" placeholder="Ex: 10.0.1.50">
            </div>
            <div class="form-group">
                <label class="form-label">Comunidade SNMP</label>
                <input type="text" class="form-control" id="device-snmp" value="public">
            </div>
        </div>
    `, 'Adicionar', async () => {
        const type = document.getElementById('new-device-type')?.value;

        if (type === 'OLT') {
            const ip       = document.getElementById('olt-ip')?.value?.trim();
            const name     = document.getElementById('olt-name')?.value?.trim();
            const vendor   = document.getElementById('olt-vendor')?.value;
            const model    = document.getElementById('olt-model')?.value?.trim();
            const location = document.getElementById('olt-location')?.value?.trim();
            const capacity = document.getElementById('olt-capacity')?.value;
            if (!ip) { showToast('Preencha o endereço IP da OLT.', 'warning'); return; }
            API.addOLT({ name: name || undefined, ip, vendor, model, location, capacity });
            showToast(`OLT adicionada ao monitoramento!`, 'success');

        } else if (type === 'ONU') {
            const gponPort = document.getElementById('onu-gpon-port')?.value;
            const apt      = document.getElementById('onu-apt')?.value?.trim();
            const ip       = document.getElementById('onu-ip')?.value?.trim();
            const client   = document.getElementById('onu-client')?.value?.trim();
            const serial   = document.getElementById('onu-serial')?.value?.trim();
            const model    = document.getElementById('onu-model')?.value;
            const distance = document.getElementById('onu-distance')?.value;
            if (!gponPort) { showToast('Selecione a Porta GPON.', 'warning'); return; }
            if (!apt)      { showToast('Preencha o Apto / Unidade.', 'warning'); return; }
            API.addONU({ gponPort, apt, ip, client, serial, model, distance });
            showToast(`ONU "${apt}" adicionada à porta ${gponPort}!`, 'success');

        } else {
            const name = document.getElementById('generic-name')?.value?.trim();
            const ip   = document.getElementById('generic-ip')?.value?.trim();
            if (!name || !ip) { showToast('Preencha Nome e IP.', 'warning'); return; }
            DeviceStorage.add({ name, ip, type });
            showToast(`"${name}" adicionado com sucesso!`, 'success');
        }

        closeModal();
        setTimeout(() => _loadMgmtDevices(), 400);
    });

    // Carregar portas GPON para o seletor da ONU
    API.getGponPorts().then(ports => {
        const sel = document.getElementById('onu-gpon-port');
        if (sel && ports && ports.length) {
            sel.innerHTML = ports.map(p =>
                `<option value="${p.id}">${p.name} (${p.onusOnline}/${p.onusTotal} ONUs • max ${p.maxONUs})</option>`
            ).join('');
        }
    }).catch(() => {});
}

// ===== ALERTAS =====
function initAlertsEvents() {
    // Carregar seção de Traps
    (async () => {
        const [traps, statsRes] = await Promise.all([API.getTraps(), API.getTrapStats()]);
        const stats = statsRes?.data ?? statsRes;
        const placeholder = document.getElementById('traps-section-placeholder');
        if (placeholder) {
            placeholder.outerHTML = renderTrapsSection(traps, stats);
            document.getElementById('trap-filter-severity')?.addEventListener('change', filterTraps);
            document.getElementById('trap-filter-type')?.addEventListener('change', filterTraps);
        }
        if (stats) updateTrapBadge(stats);
    })();

    // Filtros de severidade
    document.querySelectorAll('.filter-bar .filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            AppState.currentAlertFilter = this.getAttribute('data-filter');
            applyAlertFilters();
        });
    });

    document.getElementById('alert-search')?.addEventListener('input', applyAlertFilters);

    document.getElementById('new-monitoring-param-btn')
        ?.addEventListener('click', () => openMonitoringParamModal());
}

function applyAlertFilters() {
    const filter = AppState.currentAlertFilter;
    const query  = (document.getElementById('alert-search')?.value || '').toLowerCase().trim();
    let alerts   = AlertStorage.getAll();
    if (filter !== 'all') alerts = alerts.filter(a => a.severity === filter);
    if (query)            alerts = alerts.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.device.toLowerCase().includes(query)
    );
    const tbody = document.getElementById('alerts-table-body');
    const count = document.getElementById('alerts-count');
    const badge = document.getElementById('alerts-critical-count');
    if (tbody) tbody.innerHTML = renderAlertRows(alerts);
    if (count) count.innerHTML = `Mostrando <strong>${alerts.length}</strong> alerta(s)`;
    if (badge) badge.textContent = `${AlertStorage.getAll().filter(a => a.severity === 'critical').length} Críticos`;
}

// ── Parâmetros de Monitoramento ───────────────────────────────────────────────

function openMonitoringParamModal(paramId = null) {
    const param  = paramId ? MonitoringParamsStorage.getAll().find(p => p.id === paramId) : null;
    const isEdit = !!param;

    const typeOptions = Object.entries(MONITORING_PARAM_TYPES).map(([key, def]) =>
        `<option value="${key}" ${param?.paramType === key ? 'selected' : ''}>${def.label}</option>`
    ).join('');

    const devices  = DeviceStorage.getAll();
    const deviceOptions = ['all', ...devices.map(d => d.name)]
        .map(t => `<option value="${t}" ${(param?.target || 'all') === t ? 'selected' : ''}>${t === 'all' ? 'Todos os dispositivos' : t}</option>`)
        .join('');

    const actionOptions = ['Email','Telegram','Email + Telegram','Dashboard','Alerta Dashboard + Telegram','SMS','Email + SMS + Telegram']
        .map(a => `<option ${param?.action === a ? 'selected' : ''}>${a}</option>`).join('');

    openModal(isEdit ? 'Editar Parâmetro de Monitoramento' : 'Novo Parâmetro de Monitoramento', `
        <div class="form-group">
            <label class="form-label">Tipo de Parâmetro *</label>
            <select class="form-control" id="mp-type" onchange="onMonitoringParamTypeChange()">
                ${typeOptions}
            </select>
        </div>
        <div id="mp-type-desc" style="background:var(--bg-base);padding:0.65rem 0.85rem;border-radius:6px;margin-bottom:1rem;font-size:0.8rem;color:var(--text-secondary);border-left:3px solid var(--primary-color);">
            <i class="fas fa-info-circle" style="margin-right:0.4rem;"></i><span id="mp-type-desc-text"></span>
        </div>
        <div class="form-group">
            <label class="form-label">Nome *</label>
            <input type="text" class="form-control" id="mp-name" value="${param?.name || ''}" placeholder="Ex: Sinal Óptico Crítico">
        </div>
        <div class="form-group">
            <label class="form-label">Dispositivo Alvo</label>
            <select class="form-control" id="mp-target">${deviceOptions}</select>
        </div>
        <div id="mp-threshold-group" class="form-group">
            <label class="form-label">Limiar — <span id="mp-threshold-desc" style="color:var(--text-muted);font-weight:400;"></span></label>
            <div style="display:flex;align-items:center;gap:0.6rem;">
                <span id="mp-operator" style="font-family:monospace;font-size:1.25rem;font-weight:700;color:var(--text-secondary);min-width:18px;text-align:center;"></span>
                <input type="number" class="form-control" id="mp-threshold" value="${param?.threshold ?? ''}" step="0.1" style="flex:1;max-width:140px;">
                <span id="mp-unit" style="color:var(--text-secondary);white-space:nowrap;min-width:30px;font-weight:600;"></span>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Duração mínima</label>
            <div style="display:flex;align-items:center;gap:0.6rem;">
                <input type="number" class="form-control" id="mp-duration" value="${param?.duration ?? 0}" min="0" max="60" style="width:90px;">
                <span style="color:var(--text-secondary);font-size:0.875rem;">minutos &nbsp;·&nbsp; 0 = disparo imediato</span>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group" style="margin:0;">
                <label class="form-label">Severidade</label>
                <select class="form-control" id="mp-severity">
                    <option value="critical" ${param?.severity === 'critical' ? 'selected' : ''}>Crítico</option>
                    <option value="warning"  ${param?.severity === 'warning'  ? 'selected' : ''}>Aviso</option>
                    <option value="info"     ${param?.severity === 'info'     ? 'selected' : ''}>Info</option>
                </select>
            </div>
            <div class="form-group" style="margin:0;">
                <label class="form-label">Ação</label>
                <select class="form-control" id="mp-action">${actionOptions}</select>
            </div>
        </div>
    `, isEdit ? 'Salvar Alterações' : 'Criar Parâmetro', () => _saveMonitoringParam(paramId));

    // Inicializa campos baseados no tipo selecionado
    onMonitoringParamTypeChange(param);
}

function onMonitoringParamTypeChange(existingParam = null) {
    const typeEl = document.getElementById('mp-type');
    if (!typeEl) return;
    const def  = MONITORING_PARAM_TYPES[typeEl.value];
    if (!def) return;

    const descText      = document.getElementById('mp-type-desc-text');
    const threshGroup   = document.getElementById('mp-threshold-group');
    const threshDesc    = document.getElementById('mp-threshold-desc');
    const operatorEl    = document.getElementById('mp-operator');
    const thresholdEl   = document.getElementById('mp-threshold');
    const unitEl        = document.getElementById('mp-unit');
    const nameEl        = document.getElementById('mp-name');
    const severityEl    = document.getElementById('mp-severity');

    if (descText) descText.textContent = def.description;
    if (threshGroup) threshGroup.style.display = def.hasThreshold ? '' : 'none';

    if (def.hasThreshold) {
        if (operatorEl)  operatorEl.textContent  = def.operator;
        if (unitEl)      unitEl.textContent       = def.unit;
        if (threshDesc)  threshDesc.textContent   = `valor ${def.operator === '<' ? 'mínimo aceitável' : 'máximo aceitável'}`;
        // Preencher limiar apenas se campo vazio ou mudando de tipo (não edição)
        if (thresholdEl && !thresholdEl.value && !existingParam) {
            thresholdEl.value = def.defaultThreshold;
        }
    }

    // Preencher nome automaticamente se estiver vazio
    if (nameEl && !nameEl.value) nameEl.value = def.label;

    // Preencher severidade padrão se não for edição
    if (severityEl && !existingParam) severityEl.value = def.defaultSeverity;
}

function _saveMonitoringParam(paramId) {
    const type     = document.getElementById('mp-type')?.value;
    const name     = document.getElementById('mp-name')?.value?.trim();
    const target   = document.getElementById('mp-target')?.value || 'all';
    const duration = parseInt(document.getElementById('mp-duration')?.value || '0', 10);
    const severity = document.getElementById('mp-severity')?.value;
    const action   = document.getElementById('mp-action')?.value;

    if (!type || !name) { showToast('Preencha o tipo e o nome do parâmetro.', 'warning'); return; }

    const def = MONITORING_PARAM_TYPES[type];
    let threshold = null, operator = null, unit = null;

    if (def.hasThreshold) {
        threshold = parseFloat(document.getElementById('mp-threshold')?.value);
        if (isNaN(threshold)) { showToast('Informe um valor de limiar válido.', 'warning'); return; }
        operator = def.operator;
        unit     = def.unit;
    }

    const fields = { name, paramType: type, target, operator, threshold, unit, duration, severity, action };

    if (paramId) {
        MonitoringParamsStorage.update(paramId, fields);
        showToast(`Parâmetro "${name}" atualizado.`, 'success');
    } else {
        MonitoringParamsStorage.add(fields);
        showToast(`Parâmetro "${name}" criado.`, 'success');
    }

    closeModal();
    const tbody = document.getElementById('monitoring-params-body');
    if (tbody) tbody.innerHTML = renderMonitoringParamRows(MonitoringParamsStorage.getAll());
}

function editMonitoringParam(id)   { openMonitoringParamModal(id); }

function toggleMonitoringParam(id) {
    MonitoringParamsStorage.toggle(id);
    const tbody = document.getElementById('monitoring-params-body');
    if (tbody) tbody.innerHTML = renderMonitoringParamRows(MonitoringParamsStorage.getAll());
    showToast('Status do parâmetro atualizado.', 'info');
}

function removeMonitoringParam(id) {
    openModal('Remover Parâmetro', `<p>Tem certeza que deseja remover este parâmetro de monitoramento?</p>`, 'Remover', () => {
        MonitoringParamsStorage.remove(id);
        delete _conditionStartMap[id];
        closeModal();
        const tbody = document.getElementById('monitoring-params-body');
        if (tbody) tbody.innerHTML = renderMonitoringParamRows(MonitoringParamsStorage.getAll());
        showToast('Parâmetro removido.', 'warning');
    });
}

// ── Atualiza as views de alertas em qualquer página que esteja ativa ──────────
function _refreshAlertViews() {
    const alerts = AlertStorage.getAll();

    // Tabela na página Alertas
    const tbody = document.getElementById('alerts-table-body');
    if (tbody) {
        tbody.innerHTML = renderAlertRows(alerts);
        const count = document.getElementById('alerts-count');
        const badge = document.getElementById('alerts-critical-count');
        if (count) count.innerHTML = `Mostrando <strong>${alerts.length}</strong> alerta(s)`;
        if (badge) badge.textContent = `${alerts.filter(a => a.severity === 'critical').length} Críticos`;
    }

    // Card "Alertas Ativos" no Dashboard
    const alertsList = document.querySelector('.alerts-list');
    if (alertsList && !alertsList.closest('#traps-section')) {
        alertsList.innerHTML = renderAlertItems(alerts);
        const critBadge = alertsList.closest('.card')?.querySelector('.badge-critical');
        if (critBadge) critBadge.textContent = `${alerts.filter(a => a.severity === 'critical').length} Críticos`;
    }
}

// ── Motor de avaliação dos parâmetros (chamado a cada tick de polling) ─────────
function evaluateMonitoringParams(data) {
    if (!data) return;

    const params = MonitoringParamsStorage.getAll().filter(p => p.active);
    const now    = Date.now();

    params.forEach(param => {
        const def = MONITORING_PARAM_TYPES[param.paramType];
        if (!def || !def.dataKey) return; // Tipos event-based (linkDown, authFailure) dependem de Trap

        const value = data[def.dataKey];
        if (value === undefined || value === null) return;

        // Avaliar condição
        let conditionMet = false;
        if (def.hasThreshold) {
            const threshold = parseFloat(param.threshold);
            if (param.operator === '<') conditionMet = value < threshold;
            else if (param.operator === '>') conditionMet = value > threshold;
        } else if (param.paramType === 'onuOffline') {
            const total = data.onusTotal || 0;
            conditionMet = total > 0 && value < total;
        }

        if (conditionMet) {
            // Registrar quando a condição começou (para suporte à duração mínima)
            if (!_conditionStartMap[param.id]) _conditionStartMap[param.id] = now;

            const elapsed    = now - _conditionStartMap[param.id];
            const durationMs = (param.duration || 0) * 60 * 1000;
            if (elapsed < durationMs) return; // Condição ainda não persistiu tempo suficiente

            // Throttle: não re-disparar dentro de 5 minutos
            if (param.lastTriggered && now - param.lastTriggered < 300000) return;

            // Gerar alerta
            const descricao = def.hasThreshold
                ? `Valor atual: ${value}${param.unit} (limiar: ${param.operator} ${param.threshold}${param.unit})`
                : `Condição detectada em: ${param.target === 'all' ? 'todos os dispositivos' : param.target}`;

            AlertStorage.add({
                title:       param.name,
                description: descricao,
                severity:    param.severity,
                device:      param.target === 'all' ? 'Rede' : param.target,
                time:        new Date().toLocaleString('pt-BR'),
            });

            MonitoringParamsStorage.recordTrigger(param.id);
            _refreshAlertViews();
            showToast(`[${param.severity === 'critical' ? 'CRÍTICO' : 'AVISO'}] ${param.name}`, param.severity === 'critical' ? 'error' : 'warning');

        } else {
            // Condição resolvida — resetar temporizador de duração
            delete _conditionStartMap[param.id];
        }
    });
}

// ===== ANÁLISE =====
function initAnalysisEvents() {
    // ④ FILTRO DE PERÍODO
    document.querySelectorAll('.time-range-selector .time-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.time-range-selector .time-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            AppState.currentTimeRange = this.getAttribute('data-range');

            // Mostrar/ocultar painel de range customizado
            const customCard = document.getElementById('custom-range-card');
            if (customCard) customCard.style.display = AppState.currentTimeRange === 'custom' ? '' : 'none';
            showToast(`Período alterado para: ${this.textContent.trim()}`, 'info');
        });
    });

    // Aplicar range customizado
    document.getElementById('apply-custom-range')?.addEventListener('click', () => {
        const start = document.getElementById('custom-start')?.value;
        const end   = document.getElementById('custom-end')?.value;
        if (!start || !end) { showToast('Selecione as datas de início e fim.', 'warning'); return; }
        if (new Date(start) > new Date(end)) { showToast('A data de início deve ser anterior à data fim.', 'warning'); return; }
        showToast(`Filtro aplicado: ${start} até ${end}`, 'success');
    });

    // Executar análise
    const runBtn = document.getElementById('run-analysis-btn');
    if (runBtn) {
        runBtn.addEventListener('click', function () {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analisando...';
            this.disabled  = true;
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-play"></i> Executar Análise';
                this.disabled  = false;
                openModal('Análise Concluída', `
                    <div style="text-align:center;padding:1rem;">
                        <i class="fas fa-check-circle" style="font-size:3rem;color:var(--success-color);margin-bottom:1rem;display:block;"></i>
                        <h3 style="margin-bottom:1rem;">Análise de IA Concluída</h3>
                        <div style="color:var(--text-secondary);line-height:2;">
                            <div>• 3 novas previsões identificadas</div>
                            <div>• 2 recomendações geradas</div>
                            <div>• Modelos atualizados com novos dados</div>
                        </div>
                    </div>
                `, 'Fechar', closeModal);
            }, 2000);
        });
    }
}

// ③ AGENDAR MANUTENÇÃO
function openScheduleMaintenanceModal(devicePreset = '') {
    const devices  = DeviceStorage.getAll();
    const today    = new Date().toISOString().split('T')[0];
    openModal('Agendar Manutenção', `
        <div class="form-group">
            <label class="form-label">Dispositivo *</label>
            <select class="form-control" id="maint-device">
                ${devices.map(d => `<option value="${d.name}" ${d.name === devicePreset ? 'selected' : ''}>${d.name}</option>`).join('')}
                ${!devices.find(d => d.name === devicePreset) && devicePreset ? `<option value="${devicePreset}" selected>${devicePreset}</option>` : ''}
            </select>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Data *</label>
                <input type="date" class="form-control" id="maint-date" value="${today}" min="${today}">
            </div>
            <div class="form-group">
                <label class="form-label">Horário *</label>
                <input type="time" class="form-control" id="maint-time" value="03:00">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Duração Estimada</label>
            <select class="form-control" id="maint-duration">
                <option>15 min</option><option>30 min</option><option selected>1 hora</option>
                <option>2 horas</option><option>4 horas</option><option>8 horas</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Descrição da Manutenção *</label>
            <input type="text" class="form-control" id="maint-description" placeholder="Ex: Limpeza de conectores ópticos" value="${devicePreset ? 'Manutenção preventiva — ' + devicePreset : ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Responsável</label>
            <input type="text" class="form-control" id="maint-responsible" placeholder="Nome do técnico">
        </div>
    `, 'Agendar', () => {
        const device      = document.getElementById('maint-device')?.value;
        const date        = document.getElementById('maint-date')?.value;
        const time        = document.getElementById('maint-time')?.value;
        const duration    = document.getElementById('maint-duration')?.value;
        const description = document.getElementById('maint-description')?.value?.trim();
        const responsible = document.getElementById('maint-responsible')?.value?.trim();
        if (!device || !date || !description) { showToast('Preencha Dispositivo, Data e Descrição.', 'warning'); return; }

        MaintenanceStorage.add({ device, date, time, duration, description, responsible: responsible || 'admin' });
        showToast(`Manutenção agendada para ${device} em ${date} às ${time}!`, 'success');
        closeModal();

        // Atualizar tabela e contador inline se estiver na página de análise
        const tbody = document.getElementById('maintenance-table-body');
        if (tbody) tbody.innerHTML = renderMaintenanceRows(MaintenanceStorage.getAll());
        updateMaintenanceCount();
    });
}

// ===== CONFIGURAÇÕES =====
function initSettingsEvents() {
    document.querySelectorAll('.settings-nav .settings-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.settings-nav .settings-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`settings-${this.getAttribute('data-tab')}`).classList.add('active');
            AppState.currentSettingsTab = this.getAttribute('data-tab');
        });
    });

    document.getElementById('save-settings-btn')?.addEventListener('click', function () {
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        const settings = {
            nodeName:        document.getElementById('cfg-nodeName')?.value,
            timezone:        document.getElementById('cfg-timezone')?.value,
            language:        document.getElementById('cfg-language')?.value,
            pollingInterval: document.getElementById('cfg-pollingInterval')?.value,
            dataRetention:   document.getElementById('cfg-dataRetention')?.value,
            advancedMetrics: document.getElementById('cfg-advancedMetrics')?.checked,
            notifyEmail:     document.getElementById('cfg-notifyEmail')?.checked,
            notifyTelegram:  document.getElementById('cfg-notifyTelegram')?.checked,
            notifySMS:       document.getElementById('cfg-notifySMS')?.checked,
            email:           document.getElementById('cfg-email')?.value,
            ip:              document.getElementById('cfg-ip')?.value,
            mask:            document.getElementById('cfg-mask')?.value,
            gateway:         document.getElementById('cfg-gateway')?.value,
            dns1:            document.getElementById('cfg-dns1')?.value,
            dns2:            document.getElementById('cfg-dns2')?.value,
        };
        Object.keys(settings).forEach(k => settings[k] === undefined && delete settings[k]);
        SettingsStorage.save(settings);
        setTimeout(() => {
            this.innerHTML = '<i class="fas fa-save"></i> Salvar Configurações';
            this.style.backgroundColor = 'var(--success-color)';
            setTimeout(() => { this.style.backgroundColor = ''; }, 1000);
            showToast('Configurações salvas com sucesso!', 'success');
        }, 800);
    });
}

// ===== HISTÓRICO =====
function initHistoryEvents() {
    // ⑥ BUSCA + ⑦ FILTROS
    const applyHistoryFilters = () => {
        const query  = (document.getElementById('history-search')?.value || '').toLowerCase().trim();
        const type   = document.getElementById('history-filter-type')?.value   || '';
        const period = document.getElementById('history-filter-period')?.value || '';
        let items    = HistoryStorage.getAll();

        if (query) items = items.filter(i =>
            (i.event  || '').toLowerCase().includes(query) ||
            (i.device || '').toLowerCase().includes(query) ||
            (i.action || '').toLowerCase().includes(query)
        );
        if (type) items = items.filter(i => i.type === type);
        if (period) {
            if (period === 'today') {
                const today = new Date().toLocaleDateString('pt-BR');
                items = items.filter(i => String(i.time).includes(today));
            } else {
                const cutoff = Date.now() - parseInt(period) * 86400000;
                items = items.filter(i => {
                    const d = new Date(i.time);
                    return isNaN(d.getTime()) || d.getTime() >= cutoff;
                });
            }
        }

        const tbody = document.getElementById('history-table-body');
        const count = document.getElementById('history-count');
        if (tbody) tbody.innerHTML = renderHistoryRows(items);
        if (count) count.innerHTML = `Mostrando <strong>${items.length}</strong> evento(s)`;
    };

    document.getElementById('history-search')?.addEventListener('input', applyHistoryFilters);
    document.getElementById('history-filter-type')?.addEventListener('change', applyHistoryFilters);
    document.getElementById('history-filter-period')?.addEventListener('change', applyHistoryFilters);
    document.getElementById('apply-history-filters')?.addEventListener('click', applyHistoryFilters);

    // ⑤ EXPORTAR
    document.getElementById('export-history-btn')?.addEventListener('click', () => {
        openModal('Exportar Histórico', `
            <div class="form-group">
                <label class="form-label">Formato</label>
                <select class="form-control" id="export-format">
                    <option value="csv">CSV (Excel)</option>
                    <option value="json">JSON</option>
                    <option value="pdf">PDF (Impressão)</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Período</label>
                <select class="form-control" id="export-period">
                    <option value="7">Últimos 7 dias</option>
                    <option value="30" selected>Últimos 30 dias</option>
                    <option value="90">Últimos 90 dias</option>
                    <option value="all">Todo o histórico</option>
                </select>
            </div>
            <div style="color:var(--text-secondary);font-size:0.875rem;margin-top:1rem;">
                <i class="fas fa-info-circle" style="margin-right:0.5rem;"></i>
                CSV e JSON serão baixados automaticamente. PDF abrirá para impressão.
            </div>
        `, 'Exportar', () => {
            const format = document.getElementById('export-format')?.value;
            const period = document.getElementById('export-period')?.value;
            exportData(format, period, 'history');
            showToast(`Exportação ${format.toUpperCase()} iniciada!`, 'success');
            closeModal();
        });
    });

    // ⑧ CRIAR BACKUP
    document.getElementById('create-backup-btn')?.addEventListener('click', async function () {
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando backup...';
        this.disabled  = true;
        const backup = await BackupStorage.create();
        this.innerHTML = '<i class="fas fa-database"></i> Criar Backup Agora';
        this.disabled  = false;
        if (backup) {
            showToast(`Backup criado: ${backup.filename} (${backup.size})`, 'success');
            navigateTo('history');
        } else {
            showToast('Erro ao criar backup. Verifique o servidor.', 'error');
        }
    });

    // ⑨ RESTAURAR BACKUP
    document.getElementById('restore-backup-btn')?.addEventListener('click', () => {
        const select   = document.getElementById('backup-select');
        const backupId = parseInt(select?.value);
        if (!backupId) { showToast('Selecione um backup para restaurar.', 'warning'); return; }
        const backup = BackupStorage.getAll().find(b => b.id === backupId);
        openModal('Confirmar Restauração', `
            <div style="text-align:center;padding:1rem;">
                <i class="fas fa-exclamation-triangle" style="font-size:2.5rem;color:var(--warning-color);margin-bottom:1rem;display:block;"></i>
                <p>Restaurar o backup <strong>${backup?.filename}</strong>?</p>
                <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.5rem;">
                    Os dados atuais de dispositivos, alertas, regras e configurações serão substituídos pelos dados do backup.
                </p>
            </div>
        `, 'Restaurar', () => {
            BackupStorage.restore(backupId);
            showToast(`Backup "${backup?.filename}" restaurado com sucesso!`, 'success');
            closeModal();
            navigateTo('history');
        });
    });
}

// Ação rápida de restaurar na tabela de backups
function quickRestoreBackup(id) {
    const backup = BackupStorage.getAll().find(b => b.id === id);
    openModal('Confirmar Restauração', `
        <div style="text-align:center;padding:1rem;">
            <i class="fas fa-exclamation-triangle" style="font-size:2.5rem;color:var(--warning-color);margin-bottom:1rem;display:block;"></i>
            <p>Restaurar <strong>${backup?.filename}</strong>?</p>
            <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.5rem;">Esta ação substituirá os dados atuais.</p>
        </div>
    `, 'Restaurar', () => {
        BackupStorage.restore(id);
        showToast(`Backup restaurado com sucesso!`, 'success');
        closeModal();
        navigateTo('history');
    });
}

// ===== DRAWER DE INFORMAÇÕES DO CLIENTE =====
function openClientDrawer(onuId) {
    const drawer  = document.getElementById('client-drawer');
    const overlay = document.getElementById('client-drawer-overlay');
    const body    = document.getElementById('client-drawer-body');
    const nameEl  = document.getElementById('drawer-client-name');
    const badge   = document.getElementById('drawer-criticality-badge');
    if (!drawer) return;

    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (nameEl) nameEl.textContent = 'Carregando...';
    if (badge)  badge.textContent  = '--';
    if (body)   body.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-muted);"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i></div>`;

    API.getClient(onuId).then(client => {
        if (!client) {
            if (body) body.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-muted);"><i class="fas fa-user-slash" style="font-size:2rem;margin-bottom:1rem;display:block;"></i>Cliente não encontrado.</div>`;
            return;
        }

        const critMap = {
            'comum':      { bg:'rgba(100,116,139,0.15)', color:'#94a3b8', icon:'fa-user',      label:'Comum' },
            'prioritário':{ bg:'rgba(245,158,11,0.15)',  color:'#f59e0b', icon:'fa-star',      label:'Prioritário' },
            'crítico':    { bg:'rgba(220,38,38,0.15)',   color:'#dc2626', icon:'fa-heartbeat', label:'Crítico' },
        };
        const catIcons = { 'Residencial':'fa-home', 'Empresa':'fa-building', 'Saúde':'fa-hospital', 'Educação':'fa-graduation-cap' };
        const crit    = critMap[client.criticidade] || critMap['comum'];
        const catIcon = catIcons[client.categoria] || 'fa-tag';

        if (nameEl) nameEl.textContent = client.nome;
        if (badge) {
            badge.textContent       = crit.label;
            badge.style.background  = crit.bg;
            badge.style.color       = crit.color;
            badge.style.border      = `1px solid ${crit.color}55`;
        }

        const critDesc = client.criticidade === 'crítico'
            ? `${client.categoria} — SLA prioritário, alertas imediatos`
            : client.criticidade === 'prioritário'
            ? `${client.categoria} — Atendimento preferencial`
            : `${client.categoria} — Atendimento padrão`;

        if (body) body.innerHTML = `
            <div class="drawer-section">
                <div class="drawer-section-title"><i class="fas fa-id-card"></i> Identificação</div>
                <div class="drawer-info-grid">
                    <div class="drawer-info-item">
                        <span class="drawer-info-label">${client.tipo_documento === 'cnpj' ? 'CNPJ' : 'CPF'}</span>
                        <span class="drawer-info-value">${client.documento}</span>
                    </div>
                    <div class="drawer-info-item">
                        <span class="drawer-info-label">Contrato</span>
                        <span class="drawer-info-value">${client.contrato}</span>
                    </div>
                    <div class="drawer-info-item">
                        <span class="drawer-info-label">Categoria</span>
                        <span class="drawer-info-value"><i class="fas ${catIcon}" style="margin-right:0.35rem;color:var(--text-secondary);"></i>${client.categoria}</span>
                    </div>
                    <div class="drawer-info-item">
                        <span class="drawer-info-label">Instalação</span>
                        <span class="drawer-info-value">${client.data_instalacao}</span>
                    </div>
                </div>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title"><i class="fas fa-shield-alt"></i> Criticidade</div>
                <div class="drawer-criticality-block" style="background:${crit.bg};border:1px solid ${crit.color}33;">
                    <i class="fas ${crit.icon}" style="color:${crit.color};font-size:1.5rem;flex-shrink:0;"></i>
                    <div>
                        <div style="font-weight:600;color:${crit.color};">${crit.label}</div>
                        <div style="font-size:0.8rem;color:var(--text-secondary);">${critDesc}</div>
                    </div>
                </div>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title"><i class="fas fa-map-marker-alt"></i> Endereço</div>
                <div class="drawer-address">
                    <div>${client.endereco.rua}, ${client.endereco.numero}</div>
                    <div>${client.endereco.complemento}</div>
                    <div>${client.endereco.bairro} — ${client.endereco.cidade} / ${client.endereco.estado}</div>
                    <div style="color:var(--text-muted);font-size:0.8rem;">CEP: ${client.endereco.cep}</div>
                </div>
                <div class="drawer-coords">
                    <i class="fas fa-crosshairs" style="color:var(--text-muted);margin-right:0.4rem;font-size:0.7rem;"></i>
                    <span style="font-family:monospace;font-size:0.72rem;color:var(--text-muted);">${client.localizacao.lat}, ${client.localizacao.lng}</span>
                </div>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title"><i class="fas fa-phone-alt"></i> Contato</div>
                <div class="drawer-info-grid">
                    <div class="drawer-info-item">
                        <span class="drawer-info-label">Telefone</span>
                        <span class="drawer-info-value">${client.telefone}</span>
                    </div>
                    <div class="drawer-info-item">
                        <span class="drawer-info-label">E-mail</span>
                        <span class="drawer-info-value" style="font-size:0.78rem;">${client.email}</span>
                    </div>
                </div>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title"><i class="fas fa-wifi"></i> Plano Contratado</div>
                <div class="drawer-plan-badge"><i class="fas fa-bolt"></i> ${client.plano}</div>
            </div>`;
    }).catch(() => {
        if (body) body.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-muted);">Erro ao carregar dados do cliente.</div>`;
    });
}

function closeClientDrawer() {
    const drawer  = document.getElementById('client-drawer');
    const overlay = document.getElementById('client-drawer-overlay');
    if (drawer)  drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}

function removeBackup(id) {
    openModal('Remover Backup', `<p>Tem certeza que deseja remover este backup?</p><p style="color:var(--text-secondary);font-size:0.875rem;">Esta ação não pode ser desfeita.</p>`, 'Remover', () => {
        BackupStorage.remove(id);
        showToast('Backup removido.', 'warning');
        closeModal();
        navigateTo('history');
    });
}