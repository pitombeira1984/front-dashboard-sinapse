// ── Renderizar tabela de ONUs ─────────────────────────────────────────────────
function renderONURows(onus) {
    if (!onus || !onus.length) return `<tr><td colspan="9" style="text-align:center;color:#64748b;padding:2rem;">Nenhuma ONU encontrada.</td></tr>`;
    return onus.map(o => {
        const rxColor = o.rxPower < -27 ? 'var(--danger-color)' : o.rxPower < -24 ? 'var(--warning-color)' : 'var(--success-color)';
        const statusBg = o.status === 'online' ? 'rgba(16,185,129,0.1)' : 'rgba(220,38,38,0.1)';
        const statusColor = o.status === 'online' ? 'var(--success-color)' : 'var(--danger-color)';
        return `
        <tr>
            <td>
                <div style="font-weight:600;">${o.apt}</div>
                <div style="font-size:0.8rem;color:#94a3b8;">${o.client}</div>
                <div style="font-size:0.75rem;color:#64748b;">${o.model}</div>
            </td>
            <td>
                <div style="font-size:0.875rem;">${o.ip}</div>
                <div style="font-size:0.7rem;color:#64748b;font-family:monospace;">${o.serial}</div>
            </td>
            <td style="font-family:monospace;font-size:0.875rem;">${o.port}</td>
            <td>
                <span style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.25rem 0.75rem;background:${statusBg};color:${statusColor};border-radius:9999px;font-size:0.8rem;font-weight:600;">
                    <i class="fas fa-circle" style="font-size:0.5rem;"></i>
                    ${o.status === 'online' ? 'Online' : 'Offline'}
                    ${o.degraded ? '<i class="fas fa-exclamation-triangle" style="color:var(--warning-color);font-size:0.7rem;" title="Sinal degradado"></i>' : ''}
                </span>
            </td>
            <td style="font-weight:600;color:${rxColor};">${o.status === 'online' ? o.rxPower + ' dBm' : '--'}</td>
            <td style="color:#94a3b8;">${o.status === 'online' ? o.txPower + ' dBm' : '--'}</td>
            <td style="color:${o.latency > 50 ? 'var(--warning-color)' : '#e2e8f0'};">${o.status === 'online' ? o.latency + ' ms' : '--'}</td>
            <td style="font-size:0.875rem;color:#94a3b8;">${o.distance}</td>
            <td style="font-size:0.8rem;color:#94a3b8;">${o.status === 'online' ? o.uptime : '<span style="color:var(--danger-color);">Offline desde ' + o.lastSeen + '</span>'}</td>
        </tr>`;
    }).join('');
}

// ===== CONTEÚDO DAS PÁGINAS =====

// ---------- HELPERS DE RENDERIZAÇÃO ----------

function renderAlertItems(alerts) {
    const active = alerts.filter(a => a.severity !== 'resolved');
    if (!active.length) return `<div style="text-align:center;color:#64748b;padding:2rem;">Nenhum alerta ativo.</div>`;
    return active.map(a => `
        <div class="alert-item alert-${a.severity}">
            <i class="fas ${a.severity === 'critical' ? 'fa-exclamation-circle' : a.severity === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'} alert-icon"></i>
            <div class="alert-content">
                <div class="alert-title">${a.title}</div>
                <div class="alert-description">${a.description}</div>
            </div>
            <div class="alert-time">${a.time}</div>
        </div>`).join('');
}

function renderDeviceCards(devices) {
    return devices.map(d => `
        <div class="device-card">
            <div class="device-header">
                <div class="device-name">${d.name}</div>
                <div class="device-status status-${d.status}">
                    <i class="fas fa-circle"></i>
                    <span>${d.status === 'online' ? 'Online' : 'Offline'}</span>
                </div>
            </div>
            <div style="color:#94a3b8;font-size:0.875rem;">IP: ${d.ip} • ${d.type}</div>
            <div class="device-metrics">
                ${d.type === 'OLT' ? `
                    <div class="metric"><div class="metric-label">CPU</div><div class="metric-value">${d.cpu}%</div></div>
                    <div class="metric"><div class="metric-label">Memória</div><div class="metric-value">${d.memory}%</div></div>
                    <div class="metric"><div class="metric-label">Temperatura</div><div class="metric-value">${d.temperature}°C</div></div>
                    <div class="metric"><div class="metric-label">ONUs Ativas</div><div class="metric-value">${d.onus_active}/${d.onus_total}</div></div>
                ` : d.type === 'Router' ? `
                    <div class="metric"><div class="metric-label">Tráfego IN</div><div class="metric-value">${d.traffic_in} Mbps</div></div>
                    <div class="metric"><div class="metric-label">Tráfego OUT</div><div class="metric-value">${d.traffic_out} Mbps</div></div>
                    <div class="metric"><div class="metric-label">Pacotes/s</div><div class="metric-value">${(d.packets || 0).toLocaleString()}</div></div>
                    <div class="metric"><div class="metric-label">Uptime</div><div class="metric-value">${d.uptime || '-'}</div></div>
                ` : ''}
            </div>
        </div>`).join('');
}

function renderDeviceRows(devices) {
    if (!devices.length) return `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem;">Nenhum dispositivo encontrado.</td></tr>`;
    return devices.map(d => `
        <tr data-device-id="${d.id}">
            <td><div style="font-weight:600;">${d.name}</div><div style="font-size:0.875rem;color:#94a3b8;">ID: ${d.id}</div></td>
            <td>${d.ip}</td>
            <td><span class="badge ${d.type === 'OLT' ? 'badge-warning' : d.type === 'Router' ? 'badge-success' : 'badge-critical'}" style="font-size:0.75rem;">${d.type}</span></td>
            <td>
                <div class="device-status status-${d.status}" style="justify-content:flex-start;">
                    <i class="fas fa-circle"></i>
                    <span>${d.status === 'online' ? 'Online' : 'Offline'}</span>
                </div>
            </td>
            <td>${d.status === 'online' ? 'Agora' : d.last_seen || 'há 15min'}</td>
            <td>
                <div class="device-actions">
                    <button class="action-btn" title="Editar"          onclick="editDevice(${d.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn" title="Ver Métricas"    onclick="viewDeviceMetrics(${d.id})"><i class="fas fa-chart-bar"></i></button>
                    <button class="action-btn" title="Testar Conexão"  onclick="testDevice(${d.id})"><i class="fas fa-plug"></i></button>
                    <button class="action-btn" title="Remover" style="color:var(--danger-color);" onclick="removeDevice(${d.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`).join('');
}

function renderAlertRows(alerts) {
    if (!alerts.length) return `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem;">Nenhum alerta encontrado.</td></tr>`;
    return alerts.map(a => `
        <tr data-alert-id="${a.id}">
            <td><span class="badge ${a.severity === 'critical' ? 'badge-critical' : a.severity === 'warning' ? 'badge-warning' : a.severity === 'resolved' ? 'badge-success' : 'badge-success'}">
                ${a.severity === 'critical' ? 'Crítico' : a.severity === 'warning' ? 'Aviso' : a.severity === 'resolved' ? 'Resolvido' : 'Info'}
            </span></td>
            <td><div style="font-weight:600;">${a.title}</div><div style="font-size:0.875rem;color:#94a3b8;">${a.description}</div></td>
            <td>${a.device}</td>
            <td>${a.time}</td>
            <td>${a.resolvedAt || '--'}</td>
            <td>
                <div class="device-actions">
                    ${a.severity !== 'resolved' ? `
                        <button class="action-btn" title="Resolver" onclick="resolveAlert(${a.id})"><i class="fas fa-check"></i></button>
                        <button class="action-btn" title="Ignorar"  onclick="ignoreAlert(${a.id})"><i class="fas fa-times"></i></button>
                    ` : ''}
                    <button class="action-btn" title="Detalhes" onclick="viewAlertDetails(${a.id})"><i class="fas fa-eye"></i></button>
                </div>
            </td>
        </tr>`).join('');
}

function renderAlertRuleRows(rules) {
    if (!rules.length) return `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:2rem;">Nenhuma regra cadastrada.</td></tr>`;
    return rules.map(r => `
        <tr data-rule-id="${r.id}">
            <td><div style="font-weight:600;">${r.name}</div></td>
            <td style="font-size:0.875rem;color:#94a3b8;">${r.condition}</td>
            <td style="font-size:0.875rem;">${r.action}</td>
            <td><span class="badge ${r.active ? 'badge-success' : 'badge-critical'}">${r.active ? 'Ativa' : 'Inativa'}</span></td>
            <td>
                <div class="device-actions">
                    <button class="action-btn" title="Editar"   onclick="editAlertRule(${r.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn" title="${r.active ? 'Desativar' : 'Ativar'}" onclick="toggleAlertRule(${r.id})">
                        <i class="fas ${r.active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                    <button class="action-btn" title="Remover" style="color:var(--danger-color);" onclick="removeAlertRule(${r.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

function renderMaintenanceRows(items) {
    if (!items.length) return `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem;">Nenhuma manutenção agendada.</td></tr>`;
    return items.map(m => `
        <tr data-maintenance-id="${m.id}">
            <td><div style="font-weight:600;">${m.device}</div></td>
            <td style="font-size:0.875rem;">${m.date} ${m.time || ''}</td>
            <td style="font-size:0.875rem;color:#94a3b8;">${m.description}</td>
            <td>${m.duration || '--'}</td>
            <td><span class="badge ${m.status === 'agendado' ? 'badge-warning' : 'badge-success'}">${m.status}</span></td>
            <td>
                <div class="device-actions">
                    <button class="action-btn" title="Cancelar" style="color:var(--danger-color);" onclick="cancelMaintenance(${m.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

function renderHistoryRows(items) {
    if (!items.length) return `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem;">Nenhum evento encontrado.</td></tr>`;
    return items.map(item => `
        <tr>
            <td style="font-size:0.875rem;">${item.time}</td>
            <td><div style="font-weight:600;">${item.event}</div><div style="font-size:0.75rem;color:#64748b;">ID: ${item.id}</div></td>
            <td>${item.device}</td>
            <td>${item.duration || '--'}</td>
            <td style="font-size:0.875rem;color:#94a3b8;">${item.action || '--'}</td>
            <td>${item.user || 'Sistema'}</td>
        </tr>`).join('');
}

function renderBackupOptions(backups) {
    if (!backups.length) return `<option value="">Nenhum backup disponível</option>`;
    return backups.map(b => `<option value="${b.id}">${b.filename} — ${b.date} (${b.size})</option>`).join('');
}

// ---------- PÁGINAS ----------

// DASHBOARD
function getDashboardContent() {
    const m = sampleData.metrics;
    return `
        <header class="header">
            <div class="header-title">
                <h1>Dashboard de Monitoramento</h1>
                <p>Monitoramento preditivo em tempo real • Edge Computing</p>
            </div>
            <div class="header-actions">
                <div class="time-display"><i class="far fa-clock"></i> <span id="current-time">--:--:--</span></div>
                <button class="btn btn-primary" id="refresh-btn"><i class="fas fa-sync-alt"></i> Atualizar</button>
            </div>
        </header>

        <section class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-header"><div class="kpi-title">ONUs Ativas</div><i class="fas fa-wifi kpi-icon"></i></div>
                <div class="kpi-value" id="onus" style="font-size:1.75rem;">--/8</div>
                <div class="kpi-trend" id="onus-trend">
                    <i class="fas fa-spinner fa-spin" style="font-size:0.75rem;"></i>
                    <span>Carregando...</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header"><div class="kpi-title">Sinal Médio RxPower</div><i class="fas fa-satellite-dish kpi-icon"></i></div>
                <div class="kpi-value" id="avg-rxpower" style="font-size:1.5rem;">-- dBm</div>
                <div class="kpi-trend">
                    <span style="font-size:0.75rem;color:#64748b;">Limiar crítico: -27 dBm</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header"><div class="kpi-title">Latência Média</div><i class="fas fa-bolt kpi-icon"></i></div>
                <div class="kpi-value" id="latency">--<span style="font-size:1rem;">ms</span></div>
                <div class="kpi-trend" id="latency-trend">
                    <i class="fas fa-minus"></i> <span>Calculando...</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header"><div class="kpi-title">Disponibilidade</div><i class="fas fa-signal kpi-icon"></i></div>
                <div class="kpi-value" id="availability">--%</div>
                <div class="kpi-trend">
                    <div style="width:100%;height:6px;background:#334155;border-radius:3px;margin-top:0.5rem;">
                        <div id="avail-bar" style="width:0%;height:100%;background:var(--success-color);border-radius:3px;transition:width 0.6s;"></div>
                    </div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header"><div class="kpi-title">CPU OLT</div><i class="fas fa-microchip kpi-icon"></i></div>
                <div class="kpi-value" id="cpu-usage">--%</div>
                <div class="kpi-trend">
                    <div style="width:100%;height:6px;background:#334155;border-radius:3px;margin-top:0.5rem;">
                        <div id="cpu-bar" style="width:0%;height:100%;background:var(--success-color);border-radius:3px;transition:width 0.4s;"></div>
                    </div>
                </div>
            </div>
        </section>

        <div class="card">
            <div class="section-header">
                <h2 class="section-title">Tráfego de Rede</h2>
                <div style="display:flex;gap:0.5rem;">
                    <button class="chart-range-btn btn btn-secondary" data-range="24h">24h</button>
                    <button class="chart-range-btn btn" style="background:transparent;border:1px solid #334155;color:#94a3b8;">7d</button>
                    <button class="chart-range-btn btn" style="background:transparent;border:1px solid #334155;color:#94a3b8;">30d</button>
                </div>
            </div>
            <div style="height:280px;position:relative;"><canvas id="chart-traffic"></canvas></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
            <div class="card" style="margin-bottom:0;">
                <div class="section-header">
                    <h2 class="section-title">Sinal Óptico Médio</h2>
                    <span style="font-size:0.75rem;color:#64748b;">
                        <span style="color:var(--warning-color);">━━</span> -24 dBm &nbsp;
                        <span style="color:var(--danger-color);">━━</span> -27 dBm
                    </span>
                </div>
                <div style="height:220px;position:relative;"><canvas id="chart-optical-signal"></canvas></div>
            </div>
            <div class="card" style="margin-bottom:0;">
                <div class="section-header"><h2 class="section-title">Latência Média das ONUs</h2></div>
                <div style="height:220px;position:relative;"><canvas id="chart-latency-gpon"></canvas></div>
            </div>
        </div>

        <div class="card">
            <div class="section-header">
                <h2 class="section-title">RxPower por ONU</h2>
                <div style="display:flex;gap:1rem;font-size:0.8rem;">
                    <span><i class="fas fa-circle" style="color:var(--success-color);"></i> Normal (> -24 dBm)</span>
                    <span><i class="fas fa-circle" style="color:var(--warning-color);"></i> Aviso (-24 a -27 dBm)</span>
                    <span><i class="fas fa-circle" style="color:var(--danger-color);"></i> Crítico (< -27 dBm)</span>
                </div>
            </div>
            <div style="height:220px;position:relative;"><canvas id="chart-onu-rxpower"></canvas></div>
        </div>

        <div class="card">
            <div class="section-header">
                <h2 class="section-title">Alertas Ativos</h2>
                <div class="badge badge-critical">${AlertStorage.getAll().filter(a => a.severity === 'critical').length} Críticos</div>
            </div>
            <div class="alerts-list">${renderAlertItems(AlertStorage.getAll())}</div>
        </div>

        <div class="card">
            <div class="section-header">
                <h2 class="section-title">Dispositivos Monitorados</h2>
                <button class="btn btn-secondary" id="add-device-btn"><i class="fas fa-plus"></i> Adicionar Dispositivo</button>
            </div>
            <div class="devices-grid">${renderDeviceCards(DeviceStorage.getAll())}</div>
        </div>

        <!-- SNMP Traps Summary -->
        <div id="trap-summary-placeholder"></div>

        <footer class="footer">
            <div class="node-info"><i class="fas fa-microchip"></i> <span>SINAPSE Node • Orange Pi 3B • 192.168.1.100</span></div>
            <div><span id="data-update">Última atualização: --:--:--</span></div>
        </footer>`;
}

// DISPOSITIVOS
function getDevicesContent() {
    const devices = DeviceStorage.getAll();
    return `
        <header class="header">
            <div class="header-title">
                <h1>Gerenciamento de Dispositivos</h1>
                <p>Adicione, configure e monitore equipamentos de rede</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" id="add-device-btn-page"><i class="fas fa-plus"></i> Novo Dispositivo</button>
            </div>
        </header>

        <div class="card">
            <div class="section-header">
                <h2 class="section-title">Todos os Dispositivos</h2>
                <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
                    <input type="text" id="device-search" class="form-control" placeholder="Buscar por nome, IP ou tipo..." style="width:250px;">
                    <select id="device-filter-type" class="form-control" style="width:160px;">
                        <option value="">Todos os tipos</option>
                        <option value="OLT">OLT</option>
                        <option value="Router">Router</option>
                        <option value="Switch">Switch</option>
                        <option value="Radio">Rádio</option>
                    </select>
                    <select id="device-filter-status" class="form-control" style="width:160px;">
                        <option value="">Todos status</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                    </select>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr><th>Nome</th><th>IP</th><th>Tipo</th><th>Status</th><th>Última Verificação</th><th>Ações</th></tr>
                    </thead>
                    <tbody id="devices-table-body">${renderDeviceRows(devices)}</tbody>
                </table>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.5rem;">
                <div style="color:#94a3b8;font-size:0.875rem;" id="devices-count">Mostrando <strong>${devices.length}</strong> dispositivo(s)</div>
                <button class="btn btn-secondary" onclick="resetDevices()"><i class="fas fa-undo"></i> Resetar dados</button>
            </div>
        </div>

        <div class="card">
            <div class="section-header"><h2 class="section-title">Descoberta Automática</h2></div>
            <div style="background:rgba(30,41,59,0.5);padding:1.5rem;border-radius:var(--border-radius);">
                <div style="display:flex;gap:1rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
                    <input type="text" id="scan-range" class="form-control" placeholder="Faixa de IP (ex: 10.0.1.0/24)" value="10.0.1.0/24" style="flex:1;min-width:200px;">
                    <select id="scan-protocol" class="form-control" style="width:140px;">
                        <option value="ping">Ping (ICMP)</option>
                        <option value="snmp">SNMP v2c</option>
                        <option value="both">Ping + SNMP</option>
                    </select>
                    <button class="btn btn-success" id="scan-btn"><i class="fas fa-search"></i> Escanear Rede</button>
                </div>
                <div style="color:#94a3b8;font-size:0.875rem;">O SINAPSE escaneia sua rede para encontrar dispositivos compatíveis automaticamente.</div>
                <div id="scan-results" style="margin-top:1rem;display:none;"></div>
            </div>
        </div>`;
}

// ALERTAS
function getAlertsContent() {
    const alerts = AlertStorage.getAll();
    const rules  = AlertRulesStorage.getAll();
    return `
        <header class="header">
            <div class="header-title">
                <h1>Sistema de Alertas</h1>
                <p>Configure e gerencie notificações e regras de alerta</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" id="new-alert-rule-btn"><i class="fas fa-plus"></i> Nova Regra</button>
            </div>
        </header>

        <div class="filter-bar">
            ${['all','critical','warning','info','resolved'].map(f => `
                <button class="filter-btn ${AppState.currentAlertFilter === f ? 'active' : ''}" data-filter="${f}">
                    <i class="fas ${f === 'all' ? 'fa-list' : f === 'critical' ? 'fa-exclamation-circle' : f === 'warning' ? 'fa-exclamation-triangle' : f === 'info' ? 'fa-info-circle' : 'fa-check-circle'}"></i>
                    ${f === 'all' ? 'Todos' : f === 'critical' ? 'Críticos' : f === 'warning' ? 'Avisos' : f === 'info' ? 'Info' : 'Resolvidos'}
                    <span class="badge" style="margin-left:0.25rem;${f === 'critical' ? 'background:rgba(220,38,38,0.15);color:#dc2626;border:1px solid rgba(220,38,38,0.3);' : f === 'warning' ? 'background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);' : f === 'resolved' ? 'background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);' : 'background:#334155;color:#e2e8f0;'}">
                        ${f === 'all' ? alerts.length : alerts.filter(a => a.severity === f).length}
                    </span>
                </button>`).join('')}
        </div>

        <div class="card">
            <div class="section-header">
                <h2 class="section-title">Alertas</h2>
                <div style="display:flex;gap:0.75rem;align-items:center;">
                    <input type="text" id="alert-search" class="form-control" placeholder="Buscar alerta..." style="width:220px;">
                    <div class="badge badge-critical" id="alerts-critical-count">${alerts.filter(a => a.severity === 'critical').length} Críticos</div>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Severidade</th><th>Descrição</th><th>Dispositivo</th><th>Início</th><th>Resolvido em</th><th>Ações</th></tr></thead>
                    <tbody id="alerts-table-body">${renderAlertRows(alerts)}</tbody>
                </table>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.5rem;">
                <div style="color:#94a3b8;font-size:0.875rem;" id="alerts-count">Mostrando <strong>${alerts.length}</strong> alerta(s)</div>
                <button class="btn btn-secondary" onclick="resetAlerts()"><i class="fas fa-undo"></i> Resetar dados</button>
            </div>
        </div>

        <!-- SNMP Traps Section -->
        <div id="traps-section-placeholder"></div>

        <div class="card">
            <div class="section-header">
                <h2 class="section-title">Regras de Alerta</h2>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome da Regra</th><th>Condição</th><th>Ação</th><th>Status</th><th>Ações</th></tr></thead>
                    <tbody id="alert-rules-body">${renderAlertRuleRows(rules)}</tbody>
                </table>
            </div>
        </div>`;
}

// ANÁLISE
function getAnalysisContent() {
    const maintenances = MaintenanceStorage.getAll();
    return `
        <header class="header">
            <div class="header-title">
                <h1>Análise e Predição</h1>
                <p>Inteligência Artificial para detecção proativa de falhas</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" id="run-analysis-btn"><i class="fas fa-play"></i> Executar Análise</button>
            </div>
        </header>

        <div class="time-range-selector">
            ${['24h','7d','30d','custom'].map(r => `
                <button class="time-btn ${AppState.currentTimeRange === r ? 'active' : ''}" data-range="${r}">
                    ${r === '24h' ? '24 Horas' : r === '7d' ? '7 Dias' : r === '30d' ? '30 Dias' : 'Personalizado'}
                </button>`).join('')}
        </div>

        <div class="card" id="custom-range-card" style="${AppState.currentTimeRange === 'custom' ? '' : 'display:none;'}">
            <div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap;">
                <div class="form-group" style="margin:0;flex:1;min-width:150px;">
                    <label class="form-label">Data Início</label>
                    <input type="date" class="form-control" id="custom-start">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:150px;">
                    <label class="form-label">Data Fim</label>
                    <input type="date" class="form-control" id="custom-end">
                </div>
                <button class="btn btn-primary" id="apply-custom-range"><i class="fas fa-filter"></i> Aplicar</button>
            </div>
        </div>

        <div class="card">
            <div class="section-header">
                <h2 class="section-title">Previsões de Falhas</h2>
                <div class="badge badge-warning">3 Previsões Ativas</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
                <div>
                    <h3 style="margin-bottom:1rem;font-size:1.125rem;">Próximas Falhas Previstas</h3>
                    <div class="alerts-list">
                        <div class="alert-item alert-warning">
                            <i class="fas fa-exclamation-triangle alert-icon"></i>
                            <div class="alert-content">
                                <div class="alert-title">Falha Óptica em OLT-01</div>
                                <div class="alert-description">Previsão: 3-5 dias • Confiança: 87%</div>
                            </div>
                            <button class="btn btn-secondary" style="font-size:0.75rem;padding:0.25rem 0.75rem;" onclick="openScheduleMaintenanceModal('OLT-01')">
                                <i class="fas fa-calendar-check"></i> Agendar
                            </button>
                        </div>
                        <div class="alert-item alert-warning">
                            <i class="fas fa-exclamation-triangle alert-icon"></i>
                            <div class="alert-content">
                                <div class="alert-title">Saturação de Link em Rádio</div>
                                <div class="alert-description">Previsão: 7-10 dias • Confiança: 72%</div>
                            </div>
                            <button class="btn btn-secondary" style="font-size:0.75rem;padding:0.25rem 0.75rem;" onclick="openScheduleMaintenanceModal('Rádio Backhaul')">
                                <i class="fas fa-calendar-check"></i> Agendar
                            </button>
                        </div>
                        <div class="alert-item alert-info">
                            <i class="fas fa-info-circle alert-icon"></i>
                            <div class="alert-content">
                                <div class="alert-title">Memória Elevada no Switch Core</div>
                                <div class="alert-description">Previsão: 14 dias • Confiança: 61%</div>
                            </div>
                            <button class="btn btn-secondary" style="font-size:0.75rem;padding:0.25rem 0.75rem;" onclick="openScheduleMaintenanceModal('Switch Core')">
                                <i class="fas fa-calendar-check"></i> Agendar
                            </button>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 style="margin-bottom:1rem;font-size:1.125rem;">Recomendações de Ação</h3>
                    <div style="background:rgba(30,41,59,0.5);padding:1rem;border-radius:var(--border-radius);">
                        <div style="font-weight:600;margin-bottom:0.5rem;">Para OLT-01:</div>
                        <div style="color:#94a3b8;font-size:0.875rem;margin-bottom:1rem;">
                            1. Verificar fusão na porta 1/0/8<br>
                            2. Limpar conectores ópticos<br>
                            3. Agendar manutenção preventiva
                        </div>
                        <button class="btn btn-primary" style="font-size:0.875rem;" onclick="openScheduleMaintenanceModal('OLT-01')">
                            <i class="fas fa-calendar-check"></i> Agendar Manutenção
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="section-header">
                <h2 class="section-title">Manutenções Agendadas</h2>
                <span class="badge badge-warning" id="maintenance-count">${maintenances.length}</span>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Dispositivo</th><th>Data/Hora</th><th>Descrição</th><th>Duração</th><th>Status</th><th>Ações</th></tr></thead>
                    <tbody id="maintenance-table-body">${renderMaintenanceRows(maintenances)}</tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <div class="section-header"><h2 class="section-title">Modelos de IA Ativos</h2></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;">
                ${[['Isolation Forest','Detecção de anomalias em séries temporais','92.3'],
                   ['Regressão Linear','Predição de degradação óptica','88.7'],
                   ['LSTM Network','Previsão de tráfego de rede','85.1']].map(([name, desc, acc]) => `
                    <div style="background:rgba(30,41,59,0.5);padding:1.5rem;border-radius:var(--border-radius);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                            <div style="font-weight:600;">${name}</div>
                            <span class="badge badge-success">Ativo</span>
                        </div>
                        <div style="color:#94a3b8;font-size:0.875rem;margin-bottom:1rem;">${desc}</div>
                        <div style="font-size:0.875rem;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;"><span>Precisão:</span><span>${acc}%</span></div>
                            <div style="width:100%;height:6px;background:#334155;border-radius:3px;">
                                <div style="width:${acc}%;height:100%;background:var(--success-color);border-radius:3px;"></div>
                            </div>
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
}

// CONFIGURAÇÕES
function getSettingsContent() {
    const s = SettingsStorage.get();
    return `
        <header class="header">
            <div class="header-title">
                <h1>Configurações do Sistema</h1>
                <p>Personalize e configure o SINAPSE para sua operação</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-success" id="save-settings-btn"><i class="fas fa-save"></i> Salvar Configurações</button>
            </div>
        </header>

        <div class="settings-nav">
            ${['general','monitoring','notifications','system'].map(tab => `
                <button class="settings-tab ${AppState.currentSettingsTab === tab ? 'active' : ''}" data-tab="${tab}">
                    <i class="fas ${tab === 'general' ? 'fa-cog' : tab === 'monitoring' ? 'fa-eye' : tab === 'notifications' ? 'fa-bell' : 'fa-server'}"></i>
                    ${tab === 'general' ? 'Geral' : tab === 'monitoring' ? 'Monitoramento' : tab === 'notifications' ? 'Notificações' : 'Sistema'}
                </button>`).join('')}
        </div>

        <div class="settings-section ${AppState.currentSettingsTab === 'general' ? 'active' : ''}" id="settings-general">
            <div class="card">
                <h3 style="margin-bottom:1.5rem;">Configurações Gerais</h3>
                <div class="form-group"><label class="form-label">Nome do Nó</label><input type="text" class="form-control" id="cfg-nodeName" value="${s.nodeName}"></div>
                <div class="form-group"><label class="form-label">Fuso Horário</label>
                    <select class="form-control" id="cfg-timezone">
                        <option ${s.timezone.includes('Fortaleza') ? 'selected' : ''}>America/Fortaleza (UTC-3)</option>
                        <option ${s.timezone.includes('Paulo') ? 'selected' : ''}>America/Sao_Paulo (UTC-3)</option>
                        <option ${s.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Idioma</label>
                    <select class="form-control" id="cfg-language">
                        <option ${s.language.includes('Brasil') ? 'selected' : ''}>Português (Brasil)</option>
                        <option ${s.language === 'English' ? 'selected' : ''}>English</option>
                        <option ${s.language === 'Español' ? 'selected' : ''}>Español</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="settings-section ${AppState.currentSettingsTab === 'monitoring' ? 'active' : ''}" id="settings-monitoring">
            <div class="card">
                <h3 style="margin-bottom:1.5rem;">Configurações de Monitoramento</h3>
                <div class="form-group"><label class="form-label">Intervalo de Polling (SNMP)</label>
                    <select class="form-control" id="cfg-pollingInterval">
                        ${['1 minuto','5 minutos','10 minutos','15 minutos'].map(v => `<option ${s.pollingInterval === v ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Retenção de Dados</label>
                    <select class="form-control" id="cfg-dataRetention">
                        ${['3 meses','6 meses','12 meses','24 meses'].map(v => `<option ${s.dataRetention === v ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                </div>
                <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
                    <label class="toggle-switch"><input type="checkbox" id="cfg-advancedMetrics" ${s.advancedMetrics ? 'checked' : ''}><span class="toggle-slider"></span></label>
                    <div><div style="font-weight:600;">Coleta Avançada de Métricas</div><div style="color:#94a3b8;font-size:0.875rem;">Coleta detalhada de métricas de performance</div></div>
                </div>
            </div>
        </div>

        <div class="settings-section ${AppState.currentSettingsTab === 'notifications' ? 'active' : ''}" id="settings-notifications">
            <div class="card">
                <h3 style="margin-bottom:1.5rem;">Configurações de Notificação</h3>
                <div class="form-group">
                    <label class="form-label">Métodos de Notificação</label>
                    <div style="display:flex;flex-direction:column;gap:1rem;">
                        ${[['notifyEmail','Email','Alertas por email'],['notifyTelegram','Telegram Bot','Notificações no Telegram'],['notifySMS','SMS','Alertas por SMS (críticos apenas)']].map(([id,label,desc]) => `
                        <div style="display:flex;align-items:center;gap:1rem;">
                            <label class="toggle-switch"><input type="checkbox" id="cfg-${id}" ${s[id] ? 'checked' : ''}><span class="toggle-slider"></span></label>
                            <div><div style="font-weight:600;">${label}</div><div style="color:#94a3b8;font-size:0.875rem;">${desc}</div></div>
                        </div>`).join('')}
                    </div>
                </div>
                <div class="form-group"><label class="form-label">Email para Notificações</label><input type="email" class="form-control" id="cfg-email" value="${s.email}"></div>
            </div>
        </div>

        <div class="settings-section ${AppState.currentSettingsTab === 'system' ? 'active' : ''}" id="settings-system">
            <div class="card">
                <h3 style="margin-bottom:1.5rem;">Configurações do Sistema</h3>
                <div class="form-group"><label class="form-label">Endereço IP do Nó</label>
                    <div class="form-row">
                        <input type="text" class="form-control" id="cfg-ip"   value="${s.ip}"   placeholder="Endereço IP">
                        <input type="text" class="form-control" id="cfg-mask" value="${s.mask}" placeholder="Máscara de Rede">
                    </div>
                </div>
                <div class="form-group"><label class="form-label">Gateway Padrão</label><input type="text" class="form-control" id="cfg-gateway" value="${s.gateway}"></div>
                <div class="form-group"><label class="form-label">Servidores DNS</label>
                    <div class="form-row">
                        <input type="text" class="form-control" id="cfg-dns1" value="${s.dns1}" placeholder="DNS Primário">
                        <input type="text" class="form-control" id="cfg-dns2" value="${s.dns2}" placeholder="DNS Secundário">
                    </div>
                </div>
                <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #334155;">
                    <h3 style="margin-bottom:1rem;color:var(--danger-color);">Zona de Perigo</h3>
                    <button class="btn btn-danger" style="margin-right:1rem;"><i class="fas fa-redo"></i> Reiniciar Serviços</button>
                    <button class="btn btn-danger"><i class="fas fa-power-off"></i> Reiniciar Sistema</button>
                </div>
            </div>
        </div>`;
}

// HISTÓRICO
function getHistoryContent() {
    const history = HistoryStorage.getAll();
    const backups = BackupStorage.getAll();
    return `
        <header class="header">
            <div class="header-title">
                <h1>Histórico de Eventos</h1>
                <p>Registro completo de todas as atividades do sistema</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-secondary" id="export-history-btn"><i class="fas fa-download"></i> Exportar</button>
            </div>
        </header>

        <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;align-items:center;">
            <input type="text" id="history-search" class="form-control" placeholder="Buscar evento, dispositivo ou ação..." style="flex:1;min-width:250px;">
            <select id="history-filter-type" class="form-control" style="width:180px;">
                <option value="">Todos os tipos</option>
                <option value="alert">Alertas</option>
                <option value="maintenance">Manutenções</option>
                <option value="backup">Backups</option>
                <option value="device">Dispositivos</option>
            </select>
            <select id="history-filter-period" class="form-control" style="width:160px;">
                <option value="">Todo o período</option>
                <option value="today">Hoje</option>
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
            </select>
            <button class="btn btn-primary" id="apply-history-filters"><i class="fas fa-filter"></i> Filtrar</button>
        </div>

        <div class="card">
            <div class="section-header">
                <h2 class="section-title">Eventos</h2>
                <div style="color:#94a3b8;font-size:0.875rem;" id="history-count">Mostrando <strong>${history.length}</strong> evento(s)</div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Data/Hora</th><th>Evento</th><th>Dispositivo</th><th>Duração</th><th>Ação</th><th>Usuário</th></tr></thead>
                    <tbody id="history-table-body">${renderHistoryRows(history)}</tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <div class="section-header"><h2 class="section-title">Backup e Restauração</h2></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
                <div style="background:rgba(30,41,59,0.5);padding:1.5rem;border-radius:var(--border-radius);">
                    <h3 style="margin-bottom:0.75rem;">Criar Backup</h3>
                    <div style="color:#94a3b8;font-size:0.875rem;margin-bottom:1.25rem;">
                        Salva todos os dados do sistema: dispositivos, alertas, regras e configurações.
                        ${backups.length ? `<div style="margin-top:0.5rem;color:#64748b;">Último backup: ${backups[0].date} (${backups[0].size})</div>` : ''}
                    </div>
                    <button class="btn btn-primary" id="create-backup-btn"><i class="fas fa-database"></i> Criar Backup Agora</button>
                </div>
                <div style="background:rgba(30,41,59,0.5);padding:1.5rem;border-radius:var(--border-radius);">
                    <h3 style="margin-bottom:0.75rem;">Restaurar Backup</h3>
                    <div style="color:#94a3b8;font-size:0.875rem;margin-bottom:1rem;">Selecione um ponto de restauração:</div>
                    <select class="form-control" id="backup-select" style="margin-bottom:1rem;">
                        ${renderBackupOptions(backups)}
                    </select>
                    <button class="btn btn-warning" id="restore-backup-btn" ${!backups.length ? 'disabled' : ''}>
                        <i class="fas fa-undo"></i> Restaurar Backup
                    </button>
                </div>
            </div>
            ${backups.length ? `
            <div style="margin-top:1.5rem;">
                <h4 style="margin-bottom:1rem;color:#94a3b8;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;">Backups Disponíveis</h4>
                <div class="table-container">
                    <table>
                        <thead><tr><th>Arquivo</th><th>Data</th><th>Tamanho</th><th>Ações</th></tr></thead>
                        <tbody>
                            ${backups.map(b => `
                                <tr>
                                    <td><i class="fas fa-file-archive" style="color:#94a3b8;margin-right:0.5rem;"></i>${b.filename}</td>
                                    <td style="font-size:0.875rem;">${b.date}</td>
                                    <td style="font-size:0.875rem;">${b.size}</td>
                                    <td>
                                        <div class="device-actions">
                                            <button class="action-btn" title="Restaurar este backup" onclick="quickRestoreBackup(${b.id})"><i class="fas fa-undo"></i></button>
                                            <button class="action-btn" title="Remover" style="color:var(--danger-color);" onclick="removeBackup(${b.id})"><i class="fas fa-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>` : ''}
        </div>`;
}