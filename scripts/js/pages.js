      
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