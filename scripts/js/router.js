// ===== FUNÇÕES DE NAVEGAÇÃO =====
        function navigateTo(page) {
            currentPage = page;
            
            // Atualizar navegação ativa
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-page') === page) {
                    item.classList.add('active');
                }
            });
            
            // Carregar conteúdo da página
            loadPageContent(page);
            
            // Atualizar título
            updatePageTitle(page);
        }
        
        function updatePageTitle(page) {
            const titles = {
                dashboard: 'Dashboard',
                devices: 'Dispositivos',
                alerts: 'Alertas',
                analysis: 'Análise',
                settings: 'Configurações',
                history: 'Histórico'
            };
            
            document.title = `SINAPSE - ${titles[page] || 'Dashboard'}`;
        }
        
        function loadPageContent(page) {
            const contentDiv = document.getElementById('main-content');
            
            switch(page) {
                case 'dashboard':
                    contentDiv.innerHTML = getDashboardContent();
                    break;
                case 'devices':
                    contentDiv.innerHTML = getDevicesContent();
                    break;
                case 'alerts':
                    contentDiv.innerHTML = getAlertsContent();
                    break;
                case 'analysis':
                    contentDiv.innerHTML = getAnalysisContent();
                    break;
                case 'settings':
                    contentDiv.innerHTML = getSettingsContent();
                    break;
                case 'history':
                    contentDiv.innerHTML = getHistoryContent();
                    break;
                default:
                    contentDiv.innerHTML = getDashboardContent();
            }
            
            // Inicializar eventos específicos da página
            initPageEvents(page);
        }