// ===== INICIALIZAÇÃO DE EVENTOS POR PÁGINA =====

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
    setInterval(updateTime, 1000);

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
    setTimeout(() => initDashboardCharts(AppState.currentTimeRange), 50);

    document.querySelectorAll('.chart-range-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.chart-range-btn').forEach(b => {
                b.className = 'chart-range-btn btn';
                b.style.cssText = 'background:transparent;border:1px solid #334155;color:#94a3b8;';
            });
            this.className = 'chart-range-btn btn btn-secondary';
            this.style.cssText = '';
            AppState.currentTimeRange = this.getAttribute('data-range');
            renderTrafficChart(AppState.currentTimeRange);
        });
    });

    const addBtn = document.getElementById('add-device-btn');
    if (addBtn) addBtn.addEventListener('click', openAddDeviceModal);
}

// ===== DISPOSITIVOS =====
function initDevicesEvents() {
    const addBtn = document.getElementById('add-device-btn-page');
    if (addBtn) addBtn.addEventListener('click', openAddDeviceModal);

    // Filtros em tempo real
    const searchInput  = document.getElementById('device-search');
    const typeFilter   = document.getElementById('device-filter-type');
    const statusFilter = document.getElementById('device-filter-status');

    const applyDeviceFilters = () => {
        const query  = (searchInput?.value || '').toLowerCase().trim();
        const type   = typeFilter?.value   || '';
        const status = statusFilter?.value || '';
        let devices  = DeviceStorage.getAll();
        if (query)  devices = devices.filter(d => d.name.toLowerCase().includes(query) || d.ip.toLowerCase().includes(query) || d.type.toLowerCase().includes(query));
        if (type)   devices = devices.filter(d => d.type === type);
        if (status) devices = devices.filter(d => d.status === status);
        const tbody = document.getElementById('devices-table-body');
        const count = document.getElementById('devices-count');
        if (tbody) tbody.innerHTML = renderDeviceRows(devices);
        if (count) count.innerHTML = `Mostrando <strong>${devices.length}</strong> dispositivo(s)`;
    };

    searchInput?.addEventListener('input', applyDeviceFilters);
    typeFilter?.addEventListener('change', applyDeviceFilters);
    statusFilter?.addEventListener('change', applyDeviceFilters);

    // ① ESCANEAR REDE
    const scanBtn = document.getElementById('scan-btn');
    if (scanBtn) {
        scanBtn.addEventListener('click', function () {
            const range    = document.getElementById('scan-range')?.value?.trim() || '10.0.1.0/24';
            const protocol = document.getElementById('scan-protocol')?.value || 'ping';
            const resultsEl = document.getElementById('scan-results');

            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Escaneando...';
            this.disabled  = true;
            if (resultsEl) {
                resultsEl.style.display = 'block';
                resultsEl.innerHTML = `
                    <div style="color:#94a3b8;font-size:0.875rem;margin-bottom:1rem;">
                        <i class="fas fa-search" style="color:var(--primary-color);margin-right:0.5rem;"></i>
                        Escaneando ${range} via ${protocol.toUpperCase()}...
                    </div>
                    <div id="scan-progress" style="width:100%;height:6px;background:#334155;border-radius:3px;overflow:hidden;">
                        <div id="scan-bar" style="width:0%;height:100%;background:var(--primary-color);border-radius:3px;transition:width 0.3s;"></div>
                    </div>`;
            }

            // Simular progresso
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress = Math.min(progress + Math.random() * 15, 95);
                const bar = document.getElementById('scan-bar');
                if (bar) bar.style.width = `${progress}%`;
            }, 300);

            // Gerar dispositivos descobertos simulados
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
        container.innerHTML += `<div style="color:#94a3b8;font-size:0.875rem;margin-top:1rem;">Nenhum dispositivo novo encontrado na faixa.</div>`;
        return;
    }
    container.innerHTML = `
        <div style="margin-top:1rem;">
            <div style="font-weight:600;margin-bottom:0.75rem;color:#e2e8f0;">
                <i class="fas fa-check-circle" style="color:var(--success-color);margin-right:0.5rem;"></i>
                ${devices.length} dispositivo(s) encontrado(s)
            </div>
            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                ${devices.map(d => `
                    <div style="display:flex;align-items:center;justify-content:space-between;background:#0f172a;padding:0.75rem 1rem;border-radius:8px;gap:1rem;flex-wrap:wrap;">
                        <div style="display:flex;align-items:center;gap:1rem;">
                            <div class="device-status status-${d.status}" style="justify-content:flex-start;">
                                <i class="fas fa-circle" style="font-size:0.6rem;"></i>
                            </div>
                            <div>
                                <div style="font-weight:600;font-size:0.9rem;">${d.ip}</div>
                                <div style="color:#94a3b8;font-size:0.8rem;">${d.name} • ${d.type} • Latência: ${d.latency}</div>
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

function openAddDeviceModal() {
    openModal('Adicionar Novo Dispositivo', `
        <div class="form-group">
            <label class="form-label">Nome do Dispositivo *</label>
            <input type="text" class="form-control" id="device-name" placeholder="Ex: OLT-01">
        </div>
        <div class="form-group">
            <label class="form-label">Endereço IP *</label>
            <input type="text" class="form-control" id="device-ip" placeholder="Ex: 10.0.1.10">
        </div>
        <div class="form-group">
            <label class="form-label">Tipo de Dispositivo</label>
            <select class="form-control" id="device-type">
                <option value="OLT">OLT (GPON/XGS-PON)</option>
                <option value="Router">Roteador</option>
                <option value="Switch">Switch Gerenciável</option>
                <option value="Radio">Rádio Wireless</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Comunidade SNMP</label>
            <input type="text" class="form-control" id="device-snmp" value="public">
        </div>
    `, 'Adicionar', () => {
        const name = document.getElementById('device-name')?.value?.trim();
        const ip   = document.getElementById('device-ip')?.value?.trim();
        const type = document.getElementById('device-type')?.value;
        if (!name || !ip) { showToast('Preencha Nome e IP.', 'warning'); return; }
        DeviceStorage.add({ name, ip, type });
        showToast(`"${name}" adicionado com sucesso!`, 'success');
        closeModal();
        if (AppState.currentPage === 'devices') navigateTo('devices');
    });
}

// ===== ALERTAS =====
function initAlertsEvents() {
    // Filtros de severidade
    document.querySelectorAll('.filter-bar .filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            AppState.currentAlertFilter = this.getAttribute('data-filter');
            applyAlertFilters();
        });
    });

    // Busca
    document.getElementById('alert-search')?.addEventListener('input', applyAlertFilters);

    // ② NOVA REGRA
    const newRuleBtn = document.getElementById('new-alert-rule-btn');
    if (newRuleBtn) {
        newRuleBtn.addEventListener('click', () => openAlertRuleModal());
    }
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

function openAlertRuleModal(ruleId = null) {
    const rule    = ruleId ? AlertRulesStorage.getAll().find(r => r.id === ruleId) : null;
    const isEdit  = !!rule;
    openModal(isEdit ? 'Editar Regra' : 'Nova Regra de Alerta', `
        <div class="form-group">
            <label class="form-label">Nome da Regra *</label>
            <input type="text" class="form-control" id="rule-name" placeholder="Ex: Temperatura Alta" value="${rule?.name || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Condição *</label>
            <input type="text" class="form-control" id="rule-condition" placeholder="Ex: Temperatura > 70°C por 5 min" value="${rule?.condition || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Ação</label>
            <select class="form-control" id="rule-action">
                ${['Email','Telegram','Email + Telegram','Dashboard','Alerta Dashboard + Telegram','SMS','Email + SMS + Telegram'].map(a =>
                    `<option ${rule?.action === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Severidade do Alerta</label>
            <select class="form-control" id="rule-severity">
                <option value="critical" ${rule?.severity === 'critical' ? 'selected' : ''}>Crítico</option>
                <option value="warning"  ${rule?.severity === 'warning'  ? 'selected' : ''}>Aviso</option>
                <option value="info"     ${rule?.severity === 'info'     ? 'selected' : ''}>Info</option>
            </select>
        </div>
    `, isEdit ? 'Salvar Alterações' : 'Criar Regra', () => {
        const name      = document.getElementById('rule-name')?.value?.trim();
        const condition = document.getElementById('rule-condition')?.value?.trim();
        const action    = document.getElementById('rule-action')?.value;
        const severity  = document.getElementById('rule-severity')?.value;
        if (!name || !condition) { showToast('Preencha Nome e Condição.', 'warning'); return; }
        if (isEdit) {
            AlertRulesStorage.update(ruleId, { name, condition, action, severity });
            showToast('Regra atualizada!', 'success');
        } else {
            AlertRulesStorage.add({ name, condition, action, severity });
            showToast(`Regra "${name}" criada!`, 'success');
        }
        closeModal();
        // Atualizar tabela de regras inline
        const tbody = document.getElementById('alert-rules-body');
        if (tbody) tbody.innerHTML = renderAlertRuleRows(AlertRulesStorage.getAll());
    });
}

function editAlertRule(id)   { openAlertRuleModal(id); }

function toggleAlertRule(id) {
    AlertRulesStorage.toggle(id);
    const tbody = document.getElementById('alert-rules-body');
    if (tbody) tbody.innerHTML = renderAlertRuleRows(AlertRulesStorage.getAll());
    showToast('Status da regra atualizado.', 'info');
}

function removeAlertRule(id) {
    openModal('Remover Regra', `<p>Tem certeza que deseja remover esta regra de alerta?</p>`, 'Remover', () => {
        AlertRulesStorage.remove(id);
        closeModal();
        const tbody = document.getElementById('alert-rules-body');
        if (tbody) tbody.innerHTML = renderAlertRuleRows(AlertRulesStorage.getAll());
        showToast('Regra removida.', 'warning');
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
                        <div style="color:#94a3b8;line-height:2;">
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
            <div style="color:#94a3b8;font-size:0.875rem;margin-top:1rem;">
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
    document.getElementById('create-backup-btn')?.addEventListener('click', function () {
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando backup...';
        this.disabled  = true;
        setTimeout(() => {
            const backup = BackupStorage.create();
            this.innerHTML = '<i class="fas fa-database"></i> Criar Backup Agora';
            this.disabled  = false;
            showToast(`Backup criado: ${backup.filename} (${backup.size})`, 'success');
            // Recarregar a página de histórico para mostrar o novo backup na lista
            navigateTo('history');
        }, 1200);
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
                <p style="color:#94a3b8;font-size:0.875rem;margin-top:0.5rem;">
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
            <p style="color:#94a3b8;font-size:0.875rem;margin-top:0.5rem;">Esta ação substituirá os dados atuais.</p>
        </div>
    `, 'Restaurar', () => {
        BackupStorage.restore(id);
        showToast(`Backup restaurado com sucesso!`, 'success');
        closeModal();
        navigateTo('history');
    });
}

function removeBackup(id) {
    openModal('Remover Backup', `<p>Tem certeza que deseja remover este backup?</p><p style="color:#94a3b8;font-size:0.875rem;">Esta ação não pode ser desfeita.</p>`, 'Remover', () => {
        BackupStorage.remove(id);
        showToast('Backup removido.', 'warning');
        closeModal();
        navigateTo('history');
    });
}