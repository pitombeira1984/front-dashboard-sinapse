// ===== DADOS DE EXEMPLO =====
        const sampleData = {
            metrics: {
                availability: 99.87,
                latency: 24.3,
                onus: 1247,
                cpu_usage: 34,
                memory_usage: 68,
                storage_used: 42
            },
            
            alerts: [
                { id: 1, title: "Degradação Óptica Detectada", description: "OLT-01 • Porta 1/0/8 • Sinal caindo -1.2dB/dia", severity: "critical", time: "há 2 horas", device: "OLT-01" },
                { id: 2, title: "Alta Utilização de CPU", description: "Switch Core • CPU em 92% por 30min", severity: "warning", time: "há 5 horas", device: "Switch Core" },
                { id: 3, title: "Link Próximo da Saturação", description: "Rádio Backhaul • 85% utilizado • Previsão: 3 dias", severity: "info", time: "há 1 dia", device: "Rádio Backhaul" },
                { id: 4, title: "Perda de Pacotes Elevada", description: "OLT-02 • Porta 1/0/12 • 5% packet loss", severity: "warning", time: "há 3 horas", device: "OLT-02" }
            ],
            
            devices: [
                { id: 1, name: "OLT Huawei MA5800", ip: "10.0.1.10", type: "OLT", status: "online", cpu: 42, memory: 67, temperature: 48, onus_active: 312, onus_total: 320 },
                { id: 2, name: "MikroTik CCR2004", ip: "10.0.1.1", type: "Router", status: "online", traffic_in: 850, traffic_out: 920, packets: 42000, uptime: "45 dias" },
                { id: 3, name: "Switch Cisco Catalyst", ip: "10.0.1.20", type: "Switch", status: "online", cpu: 28, memory: 45, temperature: 42, ports_active: 18, ports_total: 24 },
                { id: 4, name: "Rádio Ubiquiti PtP", ip: "10.0.1.30", type: "Radio", status: "offline", signal: -78, capacity: 750, distance: "2.3km", last_seen: "há 15min" }
            ],
            
            history: [
                { id: 1, event: "Falha de Link Restaurada", device: "Rádio Backhaul", time: "2024-01-15 14:30", duration: "45min", action: "Auto-recuperação" },
                { id: 2, event: "Manutenção Programada", device: "OLT-01", time: "2024-01-14 03:00", duration: "30min", action: "Atualização de firmware" },
                { id: 3, event: "Alerta de Temperatura", device: "Switch Core", time: "2024-01-13 22:15", duration: "15min", action: "Resfriamento ativado" }
            ]
        };
        
        // ===== GERENCIAMENTO DE ESTADO =====
        let currentPage = 'dashboard';
        let currentAlertFilter = 'all';
        let currentTimeRange = '24h';
        let currentSettingsTab = 'general';
        
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
        
        // ===== CONTEÚDO DAS PÁGINAS =====
        
        // PÁGINA: DASHBOARD
        function getDashboardContent() {
            return `
                <header class="header">
                    <div class="header-title">
                        <h1>Dashboard de Monitoramento</h1>
                        <p>Monitoramento preditivo em tempo real • Edge Computing</p>
                    </div>
                    
                    <div class="header-actions">
                        <div class="time-display">
                            <i class="far fa-clock"></i>
                            <span id="current-time">--:--:--</span>
                        </div>
                        <button class="btn btn-primary" id="refresh-btn">
                            <i class="fas fa-sync-alt"></i>
                            Atualizar
                        </button>
                    </div>
                </header>
                
                <section class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-header">
                            <div class="kpi-title">Disponibilidade</div>
                            <i class="fas fa-signal kpi-icon"></i>
                        </div>
                        <div class="kpi-value" id="availability">${sampleData.metrics.availability}%</div>
                        <div class="kpi-trend trend-up">
                            <i class="fas fa-arrow-up"></i>
                            <span>+0.12% (24h)</span>
                        </div>
                    </div>
                    
                    <div class="kpi-card">
                        <div class="kpi-header">
                            <div class="kpi-title">Latência Média</div>
                            <i class="fas fa-bolt kpi-icon"></i>
                        </div>
                        <div class="kpi-value" id="latency">${sampleData.metrics.latency}<span style="font-size: 1rem;">ms</span></div>
                        <div class="kpi-trend trend-down">
                            <i class="fas fa-arrow-down"></i>
                            <span>-2.1ms (24h)</span>
                        </div>
                    </div>
                    
                    <div class="kpi-card">
                        <div class="kpi-header">
                            <div class="kpi-title">ONUs Online</div>
                            <i class="fas fa-wifi kpi-icon"></i>
                        </div>
                        <div class="kpi-value" id="onus">${sampleData.metrics.onus.toLocaleString()}</div>
                        <div class="kpi-trend">
                            <i class="fas fa-minus"></i>
                            <span>Estável (24h)</span>
                        </div>
                    </div>
                    
                    <div class="kpi-card">
                        <div class="kpi-header">
                            <div class="kpi-title">CPU Orange Pi</div>
                            <i class="fas fa-microchip kpi-icon"></i>
                        </div>
                        <div class="kpi-value" id="cpu-usage">${sampleData.metrics.cpu_usage}%</div>
                        <div class="kpi-trend">
                            <div style="width: 100%; height: 6px; background: #334155; border-radius: 3px; margin-top: 0.5rem;">
                                <div style="width: ${sampleData.metrics.cpu_usage}%; height: 100%; background: var(--success-color); border-radius: 3px;"></div>
                            </div>
                        </div>
                    </div>
                </section>
                
                <div class="card">
                    <div class="section-header">
                        <h2 class="section-title">Alertas Ativos</h2>
                        <div class="badge badge-critical">${sampleData.alerts.filter(a => a.severity === 'critical').length} Críticos</div>
                    </div>
                    
                    <div class="alerts-list" id="alerts-list">
                        ${sampleData.alerts.map(alert => `
                            <div class="alert-item alert-${alert.severity}">
                                <i class="fas ${alert.severity === 'critical' ? 'fa-exclamation-circle' : alert.severity === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'} alert-icon"></i>
                                <div class="alert-content">
                                    <div class="alert-title">${alert.title}</div>
                                    <div class="alert-description">${alert.description}</div>
                                </div>
                                <div class="alert-time">${alert.time}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="card">
                    <div class="section-header">
                        <h2 class="section-title">Dispositivos Monitorados</h2>
                        <button class="btn btn-secondary" id="add-device-btn">
                            <i class="fas fa-plus"></i>
                            Adicionar Dispositivo
                        </button>
                    </div>
                    
                    <div class="devices-grid" id="devices-grid">
                        ${sampleData.devices.map(device => `
                            <div class="device-card">
                                <div class="device-header">
                                    <div class="device-name">${device.name}</div>
                                    <div class="device-status status-${device.status}">
                                        <i class="fas fa-circle"></i>
                                        <span>${device.status === 'online' ? 'Online' : 'Offline'}</span>
                                    </div>
                                </div>
                                <div>IP: ${device.ip} • ${device.type}</div>
                                
                                <div class="device-metrics">
                                    ${device.type === 'OLT' ? `
                                        <div class="metric">
                                            <div class="metric-label">CPU</div>
                                            <div class="metric-value">${device.cpu}%</div>
                                        </div>
                                        <div class="metric">
                                            <div class="metric-label">Memória</div>
                                            <div class="metric-value">${device.memory}%</div>
                                        </div>
                                        <div class="metric">
                                            <div class="metric-label">Temperatura</div>
                                            <div class="metric-value">${device.temperature}°C</div>
                                        </div>
                                        <div class="metric">
                                            <div class="metric-label">ONUs Ativas</div>
                                            <div class="metric-value">${device.onus_active}/${device.onus_total}</div>
                                        </div>
                                    ` : device.type === 'Router' ? `
                                        <div class="metric">
                                            <div class="metric-label">Tráfego IN</div>
                                            <div class="metric-value">${device.traffic_in} Mbps</div>
                                        </div>
                                        <div class="metric">
                                            <div class="metric-label">Tráfego OUT</div>
                                            <div class="metric-value">${device.traffic_out} Mbps</div>
                                        </div>
                                        <div class="metric">
                                            <div class="metric-label">Pacotes/s</div>
                                            <div class="metric-value">${device.packets.toLocaleString()}</div>
                                        </div>
                                        <div class="metric">
                                            <div class="metric-label">Uptime</div>
                                            <div class="metric-value">${device.uptime}</div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="card">
                    <div class="section-header">
                        <h2 class="section-title">Tráfego de Rede (Últimas 24h)</h2>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary" style="font-size: 0.875rem;">24h</button>
                            <button class="btn" style="background: transparent; border: 1px solid #334155; color: #94a3b8; font-size: 0.875rem;">7d</button>
                            <button class="btn" style="background: transparent; border: 1px solid #334155; color: #94a3b8; font-size: 0.875rem;">30d</button>
                        </div>
                    </div>
                    <div class="chart-placeholder">
                        <div style="text-align: center;">
                            <i class="fas fa-chart-area" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                            <div>Gráfico interativo carregado via Chart.js</div>
                            <div style="font-size: 0.875rem; margin-top: 0.5rem;">Integração com TimescaleDB para dados em tempo real</div>
                        </div>
                    </div>
                </div>
                
                <footer class="footer">
                    <div class="node-info">
                        <i class="fas fa-microchip"></i>
                        <span>SINAPSE Node • Orange Pi 3B • 192.168.1.100</span>
                    </div>
                    <div>
                        <span id="data-update">Última atualização: --:--:--</span>
                    </div>
                </footer>
            `;
        }
        
        // PÁGINA: DISPOSITIVOS
        function getDevicesContent() {
            return `
                <header class="header">
                    <div class="header-title">
                        <h1>Gerenciamento de Dispositivos</h1>
                        <p>Adicione, configure e monitore equipamentos de rede</p>
                    </div>
                    
                    <div class="header-actions">
                        <button class="btn btn-primary" id="add-device-btn-page">
                            <i class="fas fa-plus"></i>
                            Novo Dispositivo
                        </button>
                    </div>
                </header>
                
                <div class="card">
                    <div class="section-header">
                        <h2 class="section-title">Todos os Dispositivos</h2>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" class="form-control" placeholder="Buscar dispositivo..." style="width: 200px;">
                            <button class="btn btn-secondary">
                                <i class="fas fa-filter"></i>
                                Filtrar
                            </button>
                        </div>
                    </div>
                    
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>IP</th>
                                    <th>Tipo</th>
                                    <th>Status</th>
                                    <th>Última Verificação</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sampleData.devices.map(device => `
                                    <tr>
                                        <td>
                                            <div style="font-weight: 600;">${device.name}</div>
                                            <div style="font-size: 0.875rem; color: #94a3b8;">ID: ${device.id}</div>
                                        </td>
                                        <td>${device.ip}</td>
                                        <td>
                                            <span class="badge ${device.type === 'OLT' ? 'badge-warning' : device.type === 'Router' ? 'badge-success' : 'badge-critical'}" style="font-size: 0.75rem;">
                                                ${device.type}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="device-status status-${device.status}" style="justify-content: flex-start;">
                                                <i class="fas fa-circle"></i>
                                                <span>${device.status === 'online' ? 'Online' : 'Offline'}</span>
                                            </div>
                                        </td>
                                        <td>${device.status === 'online' ? 'Agora' : 'há 15min'}</td>
                                        <td>
                                            <div class="device-actions">
                                                <button class="action-btn" title="Editar" onclick="editDevice(${device.id})">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="action-btn" title="Ver Métricas" onclick="viewDeviceMetrics(${device.id})">
                                                    <i class="fas fa-chart-bar"></i>
                                                </button>
                                                <button class="action-btn" title="Testar Conexão" onclick="testDevice(${device.id})">
                                                    <i class="fas fa-plug"></i>
                                                </button>
                                                <button class="action-btn" title="Remover" onclick="removeDevice(${device.id})" style="color: var(--danger-color);">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem;">
                        <div style="color: #94a3b8; font-size: 0.875rem;">
                            Mostrando ${sampleData.devices.length} dispositivos
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn" style="background: transparent; border: 1px solid #334155; color: #94a3b8;">Anterior</button>
                            <button class="btn btn-secondary">1</button>
                            <button class="btn" style="background: transparent; border: 1px solid #334155; color: #94a3b8;">2</button>
                            <button class="btn" style="background: transparent; border: 1px solid #334155; color: #94a3b8;">Próximo</button>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="section-header">
                        <h2 class="section-title">Descoberta Automática</h2>
                    </div>
                    
                    <div style="background-color: rgba(30, 41, 59, 0.5); padding: 1.5rem; border-radius: var(--border-radius);">
                        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
                            <input type="text" class="form-control" placeholder="Faixa de IP (ex: 10.0.1.0/24)" value="10.0.1.0/24">
                            <button class="btn btn-success">
                                <i class="fas fa-search"></i>
                                Escanear Rede
                            </button>
                        </div>
                        <div style="color: #94a3b8; font-size: 0.875rem;">
                            O SINAPSE pode escanear sua rede para encontrar dispositivos compatíveis automaticamente
                        </div>
                    </div>
                </div>
            `;
        }
        
        // PÁGINA: ALERTAS
        function getAlertsContent() {
            return `
                <header class="header">
                    <div class="header-title">
                        <h1>Sistema de Alertas</h1>
                        <p>Configure e gerencie notificações e regras de alerta</p>
                    </div>
                    
                    <div class="header-actions">
                        <button class="btn btn-primary" id="new-alert-rule-btn">
                            <i class="fas fa-plus"></i>
                            Nova Regra
                        </button>
                    </div>
                </header>
                
                <div class="filter-bar">
                    <button class="filter-btn ${currentAlertFilter === 'all' ? 'active' : ''}" data-filter="all">
                        Todos
                    </button>
                    <button class="filter-btn ${currentAlertFilter === 'critical' ? 'active' : ''}" data-filter="critical">
                        <i class="fas fa-exclamation-circle"></i>
                        Críticos
                    </button>
                    <button class="filter-btn ${currentAlertFilter === 'warning' ? 'active' : ''}" data-filter="warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        Avisos
                    </button>
                    <button class="filter-btn ${currentAlertFilter === 'resolved' ? 'active' : ''}" data-filter="resolved">
                        <i class="fas fa-check-circle"></i>
                        Resolvidos
                    </button>
                </div>
                
                <div class="card">
                    <div class="section-header">
                        <h2 class="section-title">Alertas Ativos</h2>
                        <div class="badge badge-critical">${sampleData.alerts.filter(a => a.severity === 'critical').length} Críticos</div>
                    </div>
                    
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Severidade</th>
                                    <th>Descrição</th>
                                    <th>Dispositivo</th>
                                    <th>Início</th>
                                    <th>Duração</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sampleData.alerts.map(alert => `
                                    <tr>
                                        <td>
                                            <span class="badge ${alert.severity === 'critical' ? 'badge-critical' : alert.severity === 'warning' ? 'badge-warning' : 'badge-success'}">
                                                ${alert.severity === 'critical' ? 'Crítico' : alert.severity === 'warning' ? 'Aviso' : 'Info'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style="font-weight: 600;">${alert.title}</div>
                                            <div style="font-size: 0.875rem; color: #94a3b8;">${alert.description}</div>
                                        </td>
                                        <td>${alert.device}</td>
                                        <td>${alert.time}</td>
                                        <td>--</td>
                                        <td>
                                            <div class="device-actions">
                                                <button class="action-btn" title="Resolver" onclick="resolveAlert(${alert.id})">
                                                    <i class="fas fa-check"></i>
                                                </button>
                                                <button class="action-btn" title="Ignorar" onclick="ignoreAlert(${alert.id})">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                                <button class="action-btn" title="Detalhes" onclick="viewAlertDetails(${alert.id})">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="card">
                    <div class="section-header">
                        <h2 class="section-title">Regras de Alerta</h2>
                    </div>
                    
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome da Regra</th>
                                    <th>Condição</th>
                                    <th>Ação</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Alta CPU</td>
                                    <td>CPU > 90% por 5 min</td>
                                    <td>Email + Telegram</td>
                                    <td><span class="badge badge-success">Ativa</span></td>
                                    <td>
                                        <div class="device-actions">
                                            <button class="action-btn" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn" title="Desativar">
                                                <i class="fas fa-toggle-on"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Degradação Óptica</td>
                                    <td>Sinal < -30dBm ou queda > 1dB/dia</td>
                                    <td>Alerta Dashboard + Telegram</td>
                                    <td><span class="badge badge-success">Ativa</span></td>
                                    <td>
                                        <div class="device-actions">
                                            <button class="action-btn" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn" title="Desativar">
                                                <i class="fas fa-toggle-on"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        // PÁGINA: ANÁLISE
        function getAnalysisContent() {
            return `
                <header class="header">
                    <div class="header-title">
                        <h1>Análise e Predição</h1>
                        <p>Inteligência Artificial para detecção proativa de falhas</p>
                    </div>
                    
                    <div class="header-actions">
                        <button class="btn btn-primary" id="run-analysis-btn">
                            <i class="fas fa-play"></i>
                            Executar Análise
                        </button>
                    </div>
                </header>
                
                <div class="time-range-selector">
                    <button class="time-btn ${currentTimeRange === '24h' ? 'active' : ''}" data-range="24h">
                        24 Horas
                    </button>
                    <button class="time-btn ${currentTimeRange === '7d' ? 'active' : ''}" data-range="7d">
                        7 Dias
                    </button>
                    <button class="time-btn ${currentTimeRange === '30d' ? 'active' : ''}" data-range="30d">
                        30 Dias
                    </button>
                    <button class="time-btn ${currentTimeRange === 'custom' ? 'active' : ''}" data-range="custom">
                        Personalizado
                    </button>
                </div>
                
                <div class="card">
                    <div class="section-header">
                        <h2 class="section-title">Previsões de Falhas</h2>
                        <div class="badge badge-warning">3 Previsões Ativas</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <div>
                            <h3 style="margin-bottom: 1rem; font-size: 1.125rem;">Próximas Falhas Previstas</h3>
                            <div class="alerts-list">
                                <div class="alert-item alert-warning">
                                    <i class="fas fa-exclamation-triangle alert-icon"></i>
                                    <div class="alert-content">
                                        <div class="alert-title">Falha Óptica em OLT-01</div>
                                        <div class="alert-description">Previsão: 3-5 dias • Confiança: 87%</div>
                                    </div>
                                </div>
                                <div class="alert-item alert-warning">
                                    <i class="fas fa-exclamation-triangle alert-icon"></i>
                                    <div class="alert-content">
                                        <div class="alert-title">Saturação de Link em Rádio</div>
                                        <div class="alert-description">Previsão: 7-10 dias • Confiança: 72%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h3 style="margin-bottom: 1rem; font-size: 1.125rem;">Recomendações de Ação</h3>
                            <div style="background-color: rgba(30, 41, 59, 0.5); padding: 1rem; border-radius: var(--border-radius);">
                                <div style="font-weight: 600; margin-bottom: 0.5rem;">Para OLT-01:</div>
                                <div style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1rem;">
                                    1. Verificar fusão na porta 1/0/8<br>
                                    2. Limpar conectores ópticos<br>
                                    3. Agendar manutenção para amanhã
                                </div>
                                <button class="btn btn-secondary" style="font-size: 0.875rem;">
                                    <i class="fas fa-calendar-check"></i>
                                    Agendar Manutenção
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="section-header">
                        <h2 class="section-title">Modelos de IA Ativos</h2>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                        <div style="background-color: rgba(30, 41, 59, 0.5); padding: 1.5rem; border-radius: var(--border-radius);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <div style="font-weight: 600;">Isolation Forest</div>
                                <span class="badge badge-success">Ativo</span>
                            </div>
                            <div style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1rem;">
                                Detecção de anomalias em séries temporais
                            </div>
                            <div style="font-size: 0.875rem;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                    <span>Precisão:</span>
                                    <span>92.3%</span>
                                </div>
                                <div style="width: 100%; height: 6px; background: #334155; border-radius: 3px;">
                                    <div style="width: 92.3%; height: 100%; background: var(--success-color); border-radius: 3px;"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background-color: rgba(30, 41, 59, 0.5); padding: 1.5rem; border-radius: var(--border-radius);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <div style="font-weight: 600;">Regressão Linear</div>
                                <span class="badge badge-success">Ativo</span>
                            </div>
                            <div style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1rem;">
                                Predição de degradação óptica
                            </div>
                            <div style="font-size: 0.875rem;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                    <span>Precisão:</span>
                                    <span>88.7%</span>
                                </div>
                                <div style="width: 100%; height: 6px; background: #334155; border-radius: 3px;">
                                    <div style="width: 88.7%; height: 100%; background: var(--success-color); border-radius: 3px;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // PÁGINA: CONFIGURAÇÕES
        function getSettingsContent() {
            return `
                <header class="header">
                    <div class="header-title">
                        <h1>Configurações do Sistema</h1>
                        <p>Personalize e configure o SINAPSE para sua operação</p>
                    </div>
                    
                    <div class="header-actions">
                        <button class="btn btn-success" id="save-settings-btn">
                            <i class="fas fa-save"></i>
                            Salvar Configurações
                        </button>
                    </div>
                </header>
                
                <div class="settings-nav">
                    <button class="settings-tab ${currentSettingsTab === 'general' ? 'active' : ''}" data-tab="general">
                        <i class="fas fa-cog"></i>
                        Geral
                    </button>
                    <button class="settings-tab ${currentSettingsTab === 'monitoring' ? 'active' : ''}" data-tab="monitoring">
                        <i class="fas fa-eye"></i>
                        Monitoramento
                    </button>
                    <button class="settings-tab ${currentSettingsTab === 'notifications' ? 'active' : ''}" data-tab="notifications">
                        <i class="fas fa-bell"></i>
                        Notificações
                    </button>
                    <button class="settings-tab ${currentSettingsTab === 'system' ? 'active' : ''}" data-tab="system">
                        <i class="fas fa-server"></i>
                        Sistema
                    </button>
                </div>
                
                <!-- ABA: GERAL -->
                <div class="settings-section ${currentSettingsTab === 'general' ? 'active' : ''}" id="settings-general">
                    <div class="card">
                        <h3 style="margin-bottom: 1.5rem;">Configurações Gerais</h3>
                        
                        <div class="form-group">
                            <label class="form-label">Nome do Nó</label>
                            <input type="text" class="form-control" value="SINAPSE-Node-01">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Fuso Horário</label>
                            <select class="form-control">
                                <option selected>America/Fortaleza (UTC-3)</option>
                                <option>America/Sao_Paulo (UTC-3)</option>
                                <option>UTC</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Idioma</label>
                            <select class="form-control">
                                <option selected>Português (Brasil)</option>
                                <option>English</option>
                                <option>Español</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- ABA: MONITORAMENTO -->
                <div class="settings-section ${currentSettingsTab === 'monitoring' ? 'active' : ''}" id="settings-monitoring">
                    <div class="card">
                        <h3 style="margin-bottom: 1.5rem;">Configurações de Monitoramento</h3>
                        
                        <div class="form-group">
                            <label class="form-label">Intervalo de Polling (SNMP)</label>
                            <select class="form-control">
                                <option>1 minuto</option>
                                <option selected>5 minutos</option>
                                <option>10 minutos</option>
                                <option>15 minutos</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Retenção de Dados</label>
                            <select class="form-control">
                                <option>3 meses</option>
                                <option selected>6 meses</option>
                                <option>12 meses</option>
                                <option>24 meses</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                            <label class="toggle-switch">
                                <input type="checkbox" checked>
                                <span class="toggle-slider"></span>
                            </label>
                            <div>
                                <div style="font-weight: 600;">Coleta Avançada de Métricas</div>
                                <div style="color: #94a3b8; font-size: 0.875rem;">Coleta detalhada de métricas de performance</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- ABA: NOTIFICAÇÕES -->
                <div class="settings-section ${currentSettingsTab === 'notifications' ? 'active' : ''}" id="settings-notifications">
                    <div class="card">
                        <h3 style="margin-bottom: 1.5rem;">Configurações de Notificação</h3>
                        
                        <div class="form-group">
                            <label class="form-label">Métodos de Notificação</label>
                            <div style="display: flex; flex-direction: column; gap: 1rem;">
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <label class="toggle-switch">
                                        <input type="checkbox" checked>
                                        <span class="toggle-slider"></span>
                                    </label>
                                    <div>
                                        <div style="font-weight: 600;">Email</div>
                                        <div style="color: #94a3b8; font-size: 0.875rem;">Alertas por email</div>
                                    </div>
                                </div>
                                
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <label class="toggle-switch">
                                        <input type="checkbox" checked>
                                        <span class="toggle-slider"></span>
                                    </label>
                                    <div>
                                        <div style="font-weight: 600;">Telegram Bot</div>
                                        <div style="color: #94a3b8; font-size: 0.875rem;">Notificações no Telegram</div>
                                    </div>
                                </div>
                                
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <label class="toggle-switch">
                                        <input type="checkbox">
                                        <span class="toggle-slider"></span>
                                    </label>
                                    <div>
                                        <div style="font-weight: 600;">SMS</div>
                                        <div style="color: #94a3b8; font-size: 0.875rem;">Alertas por SMS (críticos apenas)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Email para Notificações</label>
                            <input type="email" class="form-control" value="ti@empresa.com">
                        </div>
                    </div>
                </div>
                
                <!-- ABA: SISTEMA -->
                <div class="settings-section ${currentSettingsTab === 'system' ? 'active' : ''}" id="settings-system">
                    <div class="card">
                        <h3 style="margin-bottom: 1.5rem;">Configurações do Sistema</h3>
                        
                        <div class="form-group">
                            <label class="form-label">Endereço IP do Nó</label>
                            <div class="form-row">
                                <input type="text" class="form-control" value="192.168.1.100" placeholder="Endereço IP">
                                <input type="text" class="form-control" value="255.255.255.0" placeholder="Máscara de Rede">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Gateway Padrão</label>
                            <input type="text" class="form-control" value="192.168.1.1">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Servidores DNS</label>
                            <div class="form-row">
                                <input type="text" class="form-control" value="8.8.8.8" placeholder="DNS Primário">
                                <input type="text" class="form-control" value="8.8.4.4" placeholder="DNS Secundário">
                            </div>
                        </div>
                        
                        <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #334155;">
                            <h3 style="margin-bottom: 1rem; color: var(--danger-color);">Zona de Perigo</h3>
                            
                            <button class="btn btn-danger" style="margin-right: 1rem;">
                                <i class="fas fa-redo"></i>
                                Reiniciar Serviços
                            </button>
                            
                            <button class="btn btn-danger">
                                <i class="fas fa-power-off"></i>
                                Reiniciar Sistema
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // PÁGINA: HISTÓRICO
        function getHistoryContent() {
            return `
                <header class="header">
                    <div class="header-title">
                        <h1>Histórico de Eventos</h1>
                        <p>Registro completo de todas as atividades do sistema</p>
                    </div>
                    
                    <div class="header-actions">
                        <button class="btn btn-secondary" id="export-history-btn">
                            <i class="fas fa-download"></i>
                            Exportar
                        </button>
                    </div>
                </header>
                
                <div class="search-bar">
                    <input type="text" class="search-input" placeholder="Buscar no histórico...">
                    <button class="btn btn-primary">
                        <i class="fas fa-search"></i>
                        Buscar
                    </button>
                </div>
                
                <div class="card">
                    <div class="section-header">
                        <h2 class="section-title">Eventos Recentes</h2>
                        <div style="display: flex; gap: 0.5rem;">
                            <select class="form-control" style="width: auto;">
                                <option>Todos os Eventos</option>
                                <option>Somente Alertas</option>
                                <option>Somente Manutenções</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Data/Hora</th>
                                    <th>Evento</th>
                                    <th>Dispositivo</th>
                                    <th>Duração</th>
                                    <th>Ação</th>
                                    <th>Usuário</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sampleData.history.map(event => `
                                    <tr>
                                        <td>${event.time}</td>
                                        <td>
                                            <div style="font-weight: 600;">${event.event}</div>
                                            <div style="font-size: 0.875rem; color: #94a3b8;">ID: ${event.id}</div>
                                        </td>
                                        <td>${event.device}</td>
                                        <td>${event.duration}</td>
                                        <td>${event.action}</td>
                                        <td>Sistema</td>
                                    </tr>
                                `).join('')}
                                
                                <tr>
                                    <td>2024-01-12 18:45</td>
                                    <td>
                                        <div style="font-weight: 600;">Dispositivo Adicionado</div>
                                        <div style="font-size: 0.875rem; color: #94a3b8;">ID: SW-001</div>
                                    </td>
                                    <td>Switch Core</td>
                                    <td>--</td>
                                    <td>Adição Manual</td>
                                    <td>admin</td>
                                </tr>
                                
                                <tr>
                                    <td>2024-01-10 09:15</td>
                                    <td>
                                        <div style="font-weight: 600;">Atualização de Sistema</div>
                                        <div style="font-size: 0.875rem; color: #94a3b8;">Versão 1.0.1 → 1.0.2</div>
                                    </td>
                                    <td>SINAPSE Node</td>
                                    <td>5min</td>
                                    <td>Update Automático</td>
                                    <td>Sistema</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem;">
                        <div style="color: #94a3b8; font-size: 0.875rem;">
                            Mostrando 10 de 1.247 eventos
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn" style="background: transparent; border: 1px solid #334155; color: #94a3b8;">« Anterior</button>
                            <button class="btn btn-secondary">1</button>
                            <button class="btn" style="background: transparent; border: 1px solid #334155; color: #94a3b8;">2</button>
                            <button class="btn" style="background: transparent; border: 1px solid #334155; color: #94a3b8;">3</button>
                            <button class="btn" style="background: transparent; border: 1px solid #334155; color: #94a3b8;">Próximo »</button>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="section-header">
                        <h2 class="section-title">Backup e Restauração</h2>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <div style="background-color: rgba(30, 41, 59, 0.5); padding: 1.5rem; border-radius: var(--border-radius);">
                            <h3 style="margin-bottom: 1rem;">Backup</h3>
                            <div style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem;">
                                Crie um backup completo da configuração e dados
                            </div>
                            <button class="btn btn-primary">
                                <i class="fas fa-database"></i>
                                Criar Backup Agora
                            </button>
                        </div>
                        
                        <div style="background-color: rgba(30, 41, 59, 0.5); padding: 1.5rem; border-radius: var(--border-radius);">
                            <h3 style="margin-bottom: 1rem;">Restauração</h3>
                            <div style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1rem;">
                                Selecione um backup para restaurar
                            </div>
                            <select class="form-control" style="margin-bottom: 1rem;">
                                <option>backup-2024-01-15.zip</option>
                                <option>backup-2024-01-08.zip</option>
                                <option>backup-2024-01-01.zip</option>
                            </select>
                            <button class="btn btn-warning">
                                <i class="fas fa-undo"></i>
                                Restaurar Backup
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // ===== FUNÇÕES DE EVENTOS =====
        function initPageEvents(page) {
            // Eventos comuns a todas as páginas
            initCommonEvents();
            
            // Eventos específicos por página
            switch(page) {
                case 'dashboard':
                    initDashboardEvents();
                    break;
                case 'devices':
                    initDevicesEvents();
                    break;
                case 'alerts':
                    initAlertsEvents();
                    break;
                case 'analysis':
                    initAnalysisEvents();
                    break;
                case 'settings':
                    initSettingsEvents();
                    break;
                case 'history':
                    initHistoryEvents();
                    break;
            }
        }
        
        function initCommonEvents() {
            // Atualizar tempo
            updateTime();
            setInterval(updateTime, 1000);
            
            // Botão de atualização (se existir)
            const refreshBtn = document.getElementById('refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', function() {
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
                    
                    setTimeout(() => {
                        this.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
                        this.style.backgroundColor = 'var(--success-color)';
                        
                        setTimeout(() => {
                            this.style.backgroundColor = '';
                        }, 500);
                        
                        // Simular atualização de dados
                        if (currentPage === 'dashboard') {
                            updateDashboardData();
                        }
                    }, 800);
                });
            }
            
            // Logo clicável (volta para dashboard)
            document.getElementById('logo').addEventListener('click', function(e) {
                e.preventDefault();
                navigateTo('dashboard');
            });
        }
        
        function initDashboardEvents() {
            // Botão para adicionar dispositivo
            const addDeviceBtn = document.getElementById('add-device-btn');
            if (addDeviceBtn) {
                addDeviceBtn.addEventListener('click', function() {
                    openModal('Adicionar Novo Dispositivo', `
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
                    `, 'Adicionar', function() {
                        alert('Dispositivo adicionado com sucesso!');
                        closeModal();
                    });
                });
            }
        }
        
        function initDevicesEvents() {
            // Botão para adicionar dispositivo (página de dispositivos)
            const addDeviceBtn = document.getElementById('add-device-btn-page');
            if (addDeviceBtn) {
                addDeviceBtn.addEventListener('click', function() {
                    openModal('Adicionar Novo Dispositivo', `
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
                    `, 'Adicionar', function() {
                        alert('Dispositivo adicionado com sucesso!');
                        closeModal();
                    });
                });
            }
        }
        
        function initAlertsEvents() {
            // Filtros de alertas
            document.querySelectorAll('.filter-bar .filter-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const filter = this.getAttribute('data-filter');
                    
                    // Atualizar botões ativos
                    document.querySelectorAll('.filter-bar .filter-btn').forEach(b => {
                        b.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    currentAlertFilter = filter;
                    alert(`Filtro aplicado: ${filter}`);
                });
            });
        }
        
        function initAnalysisEvents() {
            // Seletor de período
            document.querySelectorAll('.time-range-selector .time-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const range = this.getAttribute('data-range');
                    
                    // Atualizar botões ativos
                    document.querySelectorAll('.time-range-selector .time-btn').forEach(b => {
                        b.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    currentTimeRange = range;
                    alert(`Período selecionado: ${range}`);
                });
            });
            
            // Botão de executar análise
            const runAnalysisBtn = document.getElementById('run-analysis-btn');
            if (runAnalysisBtn) {
                runAnalysisBtn.addEventListener('click', function() {
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
            // Navegação entre abas
            document.querySelectorAll('.settings-nav .settings-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabName = this.getAttribute('data-tab');
                    
                    // Atualizar abas ativas
                    document.querySelectorAll('.settings-nav .settings-tab').forEach(t => {
                        t.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    // Mostrar seção correspondente
                    document.querySelectorAll('.settings-section').forEach(section => {
                        section.classList.remove('active');
                    });
                    document.getElementById(`settings-${tabName}`).classList.add('active');
                    
                    currentSettingsTab = tabName;
                });
            });
            
            // Botão de salvar configurações
            const saveSettingsBtn = document.getElementById('save-settings-btn');
            if (saveSettingsBtn) {
                saveSettingsBtn.addEventListener('click', function() {
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                    
                    setTimeout(() => {
                        this.innerHTML = '<i class="fas fa-save"></i> Salvar Configurações';
                        this.style.backgroundColor = 'var(--success-color)';
                        
                        setTimeout(() => {
                            this.style.backgroundColor = '';
                        }, 1000);
                        
                        alert('Configurações salvas com sucesso!');
                    }, 1000);
                });
            }
        }
        
        function initHistoryEvents() {
            // Botão de exportar histórico
            const exportBtn = document.getElementById('export-history-btn');
            if (exportBtn) {
                exportBtn.addEventListener('click', function() {
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
                    `, 'Exportar', function() {
                        alert('Histórico exportado com sucesso! O download começará automaticamente.');
                        closeModal();
                    });
                });
            }
        }
        
        // ===== FUNÇÕES AUXILIARES =====
        function updateTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('pt-BR');
            const dateString = now.toLocaleDateString('pt-BR');
            
            const timeElement = document.getElementById('current-time');
            const updateElement = document.getElementById('data-update');
            
            if (timeElement) timeElement.textContent = timeString;
            if (updateElement) {
                updateElement.textContent = `Última atualização: ${dateString} ${timeString}`;
            }
        }
        
        function updateDashboardData() {
            // Simulação de atualização de dados
            const availability = document.getElementById('availability');
            const latency = document.getElementById('latency');
            const onus = document.getElementById('onus');
            const cpu = document.getElementById('cpu-usage');
            
            if (availability) {
                const current = parseFloat(availability.textContent);
                const newVal = (current + (Math.random() - 0.5) * 0.1).toFixed(2);
                availability.textContent = `${newVal}%`;
            }
            
            if (latency) {
                const current = parseFloat(latency.textContent);
                const newVal = (current + (Math.random() - 0.5) * 2).toFixed(1);
                latency.textContent = `${newVal}ms`;
            }
            
            if (onus) {
                const current = parseInt(onus.textContent.replace(/,/g, ''));
                const change = Math.floor(Math.random() * 10) - 5;
                const newVal = Math.max(0, current + change);
                onus.textContent = newVal.toLocaleString();
            }
            
            if (cpu) {
                const newVal = 30 + Math.floor(Math.random() * 20);
                cpu.textContent = `${newVal}%`;
                
                // Atualizar barra
                const cpuBar = document.querySelector('.kpi-card:nth-child(4) .kpi-trend div div');
                if (cpuBar) {
                    cpuBar.style.width = `${newVal}%`;
                    cpuBar.style.backgroundColor = newVal > 70 ? 'var(--warning-color)' : 
                                                    newVal > 90 ? 'var(--danger-color)' : 
                                                    'var(--success-color)';
                }
            }
        }
        
        function openModal(title, content, confirmText, confirmCallback) {
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-body').innerHTML = content;
            document.getElementById('modal-confirm').textContent = confirmText;
            
            document.getElementById('modal').style.display = 'flex';
            
            // Configurar callbacks
            const modal = document.getElementById('modal');
            const closeBtn = document.getElementById('close-modal');
            const cancelBtn = document.getElementById('modal-cancel');
            const confirmBtn = document.getElementById('modal-confirm');
            
            const closeModalFunc = function() {
                modal.style.display = 'none';
                closeBtn.removeEventListener('click', closeModalFunc);
                cancelBtn.removeEventListener('click', closeModalFunc);
                confirmBtn.removeEventListener('click', confirmHandler);
                modal.removeEventListener('click', outsideClick);
            };
            
            const confirmHandler = function() {
                if (confirmCallback) confirmCallback();
                closeModalFunc();
            };
            
            const outsideClick = function(e) {
                if (e.target === modal) {
                    closeModalFunc();
                }
            };
            
            closeBtn.addEventListener('click', closeModalFunc);
            cancelBtn.addEventListener('click', closeModalFunc);
            confirmBtn.addEventListener('click', confirmHandler);
            modal.addEventListener('click', outsideClick);
        }
        
        function closeModal() {
            document.getElementById('modal').style.display = 'none';
        }
        
        // Funções para ações (exemplos)
        function editDevice(id) {
            openModal(`Editar Dispositivo #${id}`, `
                <div class="form-group">
                    <label class="form-label">Nome do Dispositivo</label>
                    <input type="text" class="form-control" value="Dispositivo ${id}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Endereço IP</label>
                    <input type="text" class="form-control" value="10.0.1.${id}">
                </div>
            `, 'Salvar Alterações', function() {
                alert(`Dispositivo #${id} atualizado!`);
            });
        }
        
        function viewDeviceMetrics(id) {
            alert(`Visualizando métricas do dispositivo #${id}`);
        }
        
        function testDevice(id) {
            const btn = event.target.closest('button');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-plug"></i>';
                btn.disabled = false;
                alert(`Teste de conexão com dispositivo #${id} concluído!`);
            }, 1500);
        }
        
        function removeDevice(id) {
            if (confirm(`Tem certeza que deseja remover o dispositivo #${id}?`)) {
                alert(`Dispositivo #${id} removido!`);
            }
        }
        
        function resolveAlert(id) {
            alert(`Alerta #${id} marcado como resolvido!`);
        }
        
        function ignoreAlert(id) {
            alert(`Alerta #${id} ignorado!`);
        }
        
        function viewAlertDetails(id) {
            openModal(`Detalhes do Alerta #${id}`, `
                <div style="margin-bottom: 1rem;">
                    <div style="font-weight: 600; color: #cbd5e1;">Descrição Completa</div>
                    <div style="color: #94a3b8;">Este é um exemplo detalhado do alerta #${id}. Aqui você veria informações técnicas completas sobre o problema detectado.</div>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <div style="font-weight: 600; color: #cbd5e1;">Recomendações</div>
                    <div style="color: #94a3b8;">
                        1. Verificar conexões físicas<br>
                        2. Reiniciar o equipamento<br>
                        3. Contatar suporte técnico se persistir
                    </div>
                </div>
                
                <div>
                    <div style="font-weight: 600; color: #cbd5e1;">Histórico</div>
                    <div style="color: #94a3b8;">
                        • Detectado: 15/01/2024 14:30<br>
                        • Última verificação: Agora<br>
                        • Número de ocorrências: 3
                    </div>
                </div>
            `, 'Fechar', closeModal);
        }
        
        // ===== INICIALIZAÇÃO =====
        document.addEventListener('DOMContentLoaded', function() {
            // Inicializar navegação
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    const page = this.getAttribute('data-page');
                    navigateTo(page);
                });
            });
            
            // Carregar página inicial
            navigateTo('dashboard');
            
            // Eventos de teclado (atalhos)
            document.addEventListener('keydown', function(e) {
                // F5 para atualizar
                if (e.key === 'F5') {
                    e.preventDefault();
                    const refreshBtn = document.querySelector('.btn-primary');
                    if (refreshBtn) refreshBtn.click();
                }
                
                // Ctrl+1 a Ctrl+6 para navegação
                if (e.ctrlKey && e.key >= '1' && e.key <= '6') {
                    e.preventDefault();
                    const pages = ['dashboard', 'devices', 'alerts', 'analysis', 'settings', 'history'];
                    const index = parseInt(e.key) - 1;
                    if (pages[index]) navigateTo(pages[index]);
                }
            });
            
            // Simular modo offline/online
            window.addEventListener('offline', function() {
                alert('⚠️ Conexão perdida. Modo offline ativado.');
            });
            
            window.addEventListener('online', function() {
                alert('✅ Conexão restaurada. Sincronizando dados...');
            });
        });