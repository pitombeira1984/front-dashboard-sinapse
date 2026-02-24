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

function initDashboardEvents() {
    const addDeviceBtn = document.getElementById('add-device-btn');
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', function () {
            openModal('Adicionar Novo Dispositivo', getAddDeviceForm(), 'Adicionar', function () {
                alert('Dispositivo adicionado com sucesso!');
                closeModal();
            });
        });
    }
}

function initDevicesEvents() {
    const addDeviceBtn = document.getElementById('add-device-btn-page');
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', function () {
            openModal('Adicionar Novo Dispositivo', getAddDeviceForm(), 'Adicionar', function () {
                alert('Dispositivo adicionado com sucesso!');
                closeModal();
            });
        });
    }
}

function initAlertsEvents() {
    document.querySelectorAll('.filter-bar .filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            AppState.currentAlertFilter = this.getAttribute('data-filter');
            alert(`Filtro aplicado: ${AppState.currentAlertFilter}`);
        });
    });
}

function initAnalysisEvents() {
    document.querySelectorAll('.time-range-selector .time-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.time-range-selector .time-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            AppState.currentTimeRange = this.getAttribute('data-range');
            alert(`Período selecionado: ${AppState.currentTimeRange}`);
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
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-save"></i> Salvar Configurações';
                this.style.backgroundColor = 'var(--success-color)';
                setTimeout(() => { this.style.backgroundColor = ''; }, 1000);
                alert('Configurações salvas com sucesso!');
            }, 1000);
        });
    }
}

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
                alert('Histórico exportado com sucesso!');
                closeModal();
            });
        });
    }
}

// ===== HELPERS DE FORMULÁRIOS =====
function getAddDeviceForm() {
    return `
        <div class="form-group">
        
            <label class="form-label">Nome do Dispositivo</label>
            <input type="text" class="form-control" id="device-name" placeholder="Ex: OLT-01">
        </div>
        <div class="form-group">
            <label class="form-label">Endereço IP</label>
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