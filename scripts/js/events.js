// ===== FUNÇÕES DE EVENTOS =====

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

    document.getElementById('logo').addEventListener('click', function (e) {
        e.preventDefault();
        navigateTo('dashboard');
    });
}

// ===== DASHBOARD =====
function initDashboardEvents() {
    // Gráficos — aguarda o DOM estar pronto
    setTimeout(() => initDashboardCharts(AppState.currentTimeRange), 50);

    // Botões de range do gráfico de tráfego
    document.querySelectorAll('.chart-range-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.chart-range-btn').forEach(b => {
                b.classList.remove('active', 'btn-secondary');
                b.style.background = 'transparent';
                b.style.borderColor = '#334155';
                b.style.color = '#94a3b8';
            });
            this.classList.add('active', 'btn-secondary');
            this.style.background = '';
            this.style.borderColor = '';
            this.style.color = '';
            AppState.currentTimeRange = this.getAttribute('data-range');
            renderTrafficChart(AppState.currentTimeRange);
        });
    });

    // Botão adicionar dispositivo
    const addDeviceBtn = document.getElementById('add-device-btn');
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', () => openAddDeviceModal());
    }
}

// ===== DISPOSITIVOS =====
function initDevicesEvents() {
    const addDeviceBtn = document.getElementById('add-device-btn-page');
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', () => openAddDeviceModal());
    }

    // Busca em tempo real
    const searchInput = document.getElementById('device-search');
    const typeFilter  = document.getElementById('device-filter-type');
    const statusFilter = document.getElementById('device-filter-status');

    const applyDeviceFilters = () => {
        const query  = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const type   = typeFilter ? typeFilter.value : '';
        const status = statusFilter ? statusFilter.value : '';

        let devices = DeviceStorage.getAll();

        if (query) {
            devices = devices.filter(d =>
                d.name.toLowerCase().includes(query) ||
                d.ip.toLowerCase().includes(query) ||
                d.type.toLowerCase().includes(query)
            );
        }
        if (type)   devices = devices.filter(d => d.type === type);
        if (status) devices = devices.filter(d => d.status === status);

        const tbody = document.getElementById('devices-table-body');
        const count = document.getElementById('devices-count');

        if (tbody) tbody.innerHTML = renderDeviceRows(devices);
        if (count) count.innerHTML = `Mostrando <strong>${devices.length}</strong> dispositivo(s)`;
    };

    if (searchInput)  searchInput.addEventListener('input', applyDeviceFilters);
    if (typeFilter)   typeFilter.addEventListener('change', applyDeviceFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyDeviceFilters);
}

// ===== ALERTAS =====
function initAlertsEvents() {
    // Filtros por severidade
    document.querySelectorAll('.filter-bar .filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            AppState.currentAlertFilter = this.getAttribute('data-filter');
            applyAlertFilters();
        });
    });

    // Busca textual
    const alertSearch = document.getElementById('alert-search');
    if (alertSearch) alertSearch.addEventListener('input', applyAlertFilters);
}

function applyAlertFilters() {
    const filter = AppState.currentAlertFilter;
    const query  = (document.getElementById('alert-search')?.value || '').toLowerCase().trim();

    let alerts = AlertStorage.getAll();

    if (filter !== 'all') {
        alerts = alerts.filter(a => a.severity === filter);
    }

    if (query) {
        alerts = alerts.filter(a =>
            a.title.toLowerCase().includes(query) ||
            a.description.toLowerCase().includes(query) ||
            a.device.toLowerCase().includes(query)
        );
    }

    const tbody = document.getElementById('alerts-table-body');
    const count = document.getElementById('alerts-count');
    const critBadge = document.getElementById('alerts-critical-count');

    if (tbody) tbody.innerHTML = renderAlertRows(alerts);
    if (count) count.innerHTML = `Mostrando <strong>${alerts.length}</strong> alerta(s)`;
    if (critBadge) {
        const critCount = AlertStorage.getAll().filter(a => a.severity === 'critical').length;
        critBadge.textContent = `${critCount} Críticos`;
    }
}

// ===== ANÁLISE =====
function initAnalysisEvents() {
    document.querySelectorAll('.time-range-selector .time-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.time-range-selector .time-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            AppState.currentTimeRange = this.getAttribute('data-range');
        });
    });

    const runAnalysisBtn = document.getElementById('run-analysis-btn');
    if (runAnalysisBtn) {
        runAnalysisBtn.addEventListener('click', function () {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analisando...';
            this.disabled = true;
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-play"></i> Executar Análise';
                this.disabled = false;
                openModal('Análise Concluída', `
                    <div style="text-align: center; padding: 1rem;">
                        <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success-color); margin-bottom: 1rem;"></i>
                        <h3 style="margin-bottom: 1rem;">Análise de IA Concluída</h3>
                        <div style="color: #94a3b8;">
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

// ===== CONFIGURAÇÕES =====
function initSettingsEvents() {
    document.querySelectorAll('.settings-nav .settings-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');
            document.querySelectorAll('.settings-nav .settings-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`settings-${tabName}`).classList.add('active');
            AppState.currentSettingsTab = tabName;
        });
    });

    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function () {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

            // Coletar todos os valores dos campos
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

            // Remove chaves undefined (campos não visíveis na aba atual)
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
}

// ===== HISTÓRICO =====
function initHistoryEvents() {
    const exportBtn = document.getElementById('export-history-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function () {
            openModal('Exportar Histórico', `
                <div class="form-group">
                    <label class="form-label">Formato de Exportação</label>
                    <select class="form-control" id="export-format">
                        <option value="csv">CSV (Excel)</option>
                        <option value="json">JSON</option>
                        <option value="pdf">PDF</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Período</label>
                    <select class="form-control" id="export-period">
                        <option value="7d">Últimos 7 dias</option>
                        <option value="30d" selected>Últimos 30 dias</option>
                        <option value="90d">Últimos 90 dias</option>
                        <option value="all">Todo o histórico</option>
                    </select>
                </div>
                <div style="color: #94a3b8; font-size: 0.875rem; margin-top: 1rem;">
                    O arquivo será baixado automaticamente após a geração.
                </div>
            `, 'Exportar', function () {
                showToast('Histórico exportado com sucesso!', 'success');
                closeModal();
            });
        });
    }
}

// ===== HELPERS DE MODAIS DE DISPOSITIVO =====
function openAddDeviceModal() {
    openModal('Adicionar Novo Dispositivo', getAddDeviceForm(), 'Adicionar', function () {
        const name  = document.getElementById('device-name')?.value?.trim();
        const ip    = document.getElementById('device-ip')?.value?.trim();
        const type  = document.getElementById('device-type')?.value;
        const snmp  = document.getElementById('device-snmp')?.value?.trim();

        if (!name || !ip) {
            showToast('Preencha ao menos Nome e IP.', 'warning');
            return;
        }

        DeviceStorage.add({ name, ip, type, snmp });
        showToast(`Dispositivo "${name}" adicionado com sucesso!`, 'success');
        closeModal();

        // Recarregar página de dispositivos se estiver nela
        if (AppState.currentPage === 'devices') navigateTo('devices');
    });
}

function getAddDeviceForm() {
    return `
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
    `;
}