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