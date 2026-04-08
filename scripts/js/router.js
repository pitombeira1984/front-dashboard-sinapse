// ===== FUNÇÕES DE NAVEGAÇÃO =====

function navigateTo(page) {
    AppState.currentPage = page;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) item.classList.add('active');
    });

    loadPageContent(page);
    updatePageTitle(page);
}

function updatePageTitle(page) {
    const titles = {
        dashboard: 'Dashboard',
        devices:   'Dispositivos',
        alerts:    'Alertas',
        analysis:  'Análise',
        settings:  'Configurações',
        history:   'Histórico'
    };
    document.title = `SINAPSE - ${titles[page] || 'Dashboard'}`;
}

function loadPageContent(page) {
    const contentDiv = document.getElementById('main-content');

    const pageMap = {
        dashboard: getDashboardContent,
        devices:   getDevicesContent,
        alerts:    getAlertsContent,
        analysis:  getAnalysisContent,
        settings:  getSettingsContent,
        history:   getHistoryContent,
    };

    contentDiv.innerHTML = (pageMap[page] || getDashboardContent)();
    initPageEvents(page);
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            navigateTo(this.getAttribute('data-page'));
        });
    });

    navigateTo('dashboard');

    document.addEventListener('keydown', function (e) {
        if (e.key === 'F5') {
            e.preventDefault();
            const refreshBtn = document.getElementById('refresh-btn');
            if (refreshBtn) refreshBtn.click();
        }
        if (e.ctrlKey && e.key >= '1' && e.key <= '6') {
            e.preventDefault();
            const pages = ['dashboard', 'devices', 'alerts', 'analysis', 'settings', 'history'];
            const p = pages[parseInt(e.key) - 1];
            if (p) navigateTo(p);
        }
    });

    window.addEventListener('offline', () => showToast('⚠️ Conexão perdida. Modo offline ativado.', 'warning'));
    window.addEventListener('online',  () => showToast('✅ Conexão restaurada. Sincronizando dados...', 'success'));
});