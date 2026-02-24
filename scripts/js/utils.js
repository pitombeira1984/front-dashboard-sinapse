// ===== FUNÇÕES AUXILIARES =====

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR');
    const dateString = now.toLocaleDateString('pt-BR');

    const timeElement   = document.getElementById('current-time');
    const updateElement = document.getElementById('data-update');

    if (timeElement)   timeElement.textContent = timeString;
    if (updateElement) updateElement.textContent = `Última atualização: ${dateString} ${timeString}`;
}

function updateDashboardData() {
    const availability = document.getElementById('availability');
    const latency      = document.getElementById('latency');
    const onus         = document.getElementById('onus');
    const cpu          = document.getElementById('cpu-usage');

    if (availability) {
        const v = (parseFloat(availability.textContent) + (Math.random() - 0.5) * 0.1).toFixed(2);
        availability.textContent = `${v}%`;
    }
    if (latency) {
        const v = (parseFloat(latency.textContent) + (Math.random() - 0.5) * 2).toFixed(1);
        latency.textContent = `${v}ms`;
    }
    if (onus) {
        const current = parseInt(onus.textContent.replace(/\D/g, ''));
        onus.textContent = Math.max(0, current + Math.floor(Math.random() * 10) - 5).toLocaleString();
    }
    if (cpu) {
        const newVal = 30 + Math.floor(Math.random() * 20);
        cpu.textContent = `${newVal}%`;
        const bar = document.getElementById('cpu-bar');
        if (bar) {
            bar.style.width = `${newVal}%`;
            bar.style.backgroundColor = newVal > 90 ? 'var(--danger-color)'
                : newVal > 70 ? 'var(--warning-color)'
                : 'var(--success-color)';
        }
    }
}

// ===== MODAL =====
function openModal(title, content, confirmText, confirmCallback) {
    document.getElementById('modal-title').textContent  = title;
    document.getElementById('modal-body').innerHTML     = content;
    document.getElementById('modal-confirm').textContent = confirmText;
    document.getElementById('modal').style.display      = 'flex';

    const modal      = document.getElementById('modal');
    const closeBtn   = document.getElementById('close-modal');
    const cancelBtn  = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');

    const closeModalFunc = () => {
        modal.style.display = 'none';
        closeBtn.removeEventListener('click', closeModalFunc);
        cancelBtn.removeEventListener('click', closeModalFunc);
        confirmBtn.removeEventListener('click', confirmHandler);
        modal.removeEventListener('click', outsideClick);
    };

    const confirmHandler = () => {
        if (confirmCallback) confirmCallback();
    };

    const outsideClick = (e) => {
        if (e.target === modal) closeModalFunc();
    };

    closeBtn.addEventListener('click', closeModalFunc);
    cancelBtn.addEventListener('click', closeModalFunc);
    confirmBtn.addEventListener('click', confirmHandler);
    modal.addEventListener('click', outsideClick);
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// ===== TOAST =====
function showToast(message, type = 'success') {
    const existing = document.getElementById('sinapse-toast');
    if (existing) existing.remove();

    const colors = {
        success: 'var(--success-color)',
        warning: 'var(--warning-color)',
        error:   'var(--danger-color)',
        info:    'var(--secondary-color)',
    };
    const icons = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error:   'fa-times-circle',
        info:    'fa-info-circle',
    };

    const toast = document.createElement('div');
    toast.id = 'sinapse-toast';
    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;
        background: #1e293b; border: 1px solid #334155;
        border-left: 4px solid ${colors[type] || colors.success};
        border-radius: 8px; padding: 1rem 1.25rem;
        display: flex; align-items: center; gap: 0.75rem;
        color: #e2e8f0; font-size: 0.9rem; font-weight: 500;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        animation: toastIn 0.3s ease;
        max-width: 380px;
    `;
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.success}" style="color: ${colors[type]}; font-size: 1.1rem;"></i>
        <span>${message}</span>
    `;

    // Injetar keyframe se não existir
    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `
            @keyframes toastIn  { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
            @keyframes toastOut { from { opacity:1; transform: translateY(0); }   to { opacity:0; transform: translateY(12px); } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== AÇÕES DE DISPOSITIVOS =====
function editDevice(id) {
    const devices = DeviceStorage.getAll();
    const device  = devices.find(d => d.id === id);
    if (!device) return;

    openModal(`Editar Dispositivo — ${device.name}`, `
        <div class="form-group">
            <label class="form-label">Nome do Dispositivo</label>
            <input type="text" class="form-control" id="edit-device-name" value="${device.name}">
        </div>
        <div class="form-group">
            <label class="form-label">Endereço IP</label>
            <input type="text" class="form-control" id="edit-device-ip" value="${device.ip}">
        </div>
        <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" id="edit-device-status">
                <option value="online"  ${device.status === 'online'  ? 'selected' : ''}>Online</option>
                <option value="offline" ${device.status === 'offline' ? 'selected' : ''}>Offline</option>
            </select>
        </div>
    `, 'Salvar Alterações', function () {
        DeviceStorage.update(id, {
            name:   document.getElementById('edit-device-name').value.trim(),
            ip:     document.getElementById('edit-device-ip').value.trim(),
            status: document.getElementById('edit-device-status').value,
        });
        showToast(`Dispositivo atualizado com sucesso!`, 'success');
        closeModal();
        if (AppState.currentPage === 'devices') navigateTo('devices');
    });
}

function viewDeviceMetrics(id) {
    const device = DeviceStorage.getAll().find(d => d.id === id);
    if (!device) return;
    const metricsHtml = device.cpu !== undefined
        ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            ${[['CPU', device.cpu + '%'], ['Memória', device.memory + '%'], ['Temperatura', (device.temperature || '-') + '°C']].map(([k,v]) => `
              <div style="background:#0f172a;padding:1rem;border-radius:8px;">
                <div style="color:#94a3b8;font-size:0.8rem;">${k}</div>
                <div style="font-size:1.5rem;font-weight:700;">${v}</div>
              </div>`).join('')}
           </div>`
        : `<p style="color:#94a3b8;">Métricas detalhadas não disponíveis para este tipo de dispositivo.</p>`;

    openModal(`Métricas — ${device.name}`, metricsHtml, 'Fechar', closeModal);
}

function testDevice(id) {
    const btn = event.target.closest('button');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = original;
        btn.disabled  = false;
        const device  = DeviceStorage.getAll().find(d => d.id === id);
        showToast(`Ping para ${device?.ip || 'dispositivo'}: OK — 12ms`, 'success');
    }, 1500);
}

function removeDevice(id) {
    const device = DeviceStorage.getAll().find(d => d.id === id);
    if (!device) return;
    openModal('Confirmar Remoção', `
        <div style="text-align:center; padding: 1rem;">
            <i class="fas fa-trash" style="font-size:2.5rem; color:var(--danger-color); margin-bottom:1rem;"></i>
            <p>Tem certeza que deseja remover <strong>${device.name}</strong>?</p>
            <p style="color:#94a3b8; font-size:0.875rem; margin-top:0.5rem;">Esta ação não pode ser desfeita.</p>
        </div>
    `, 'Remover', function () {
        DeviceStorage.remove(id);
        showToast(`Dispositivo "${device.name}" removido.`, 'warning');
        closeModal();
        if (AppState.currentPage === 'devices') navigateTo('devices');
    });
}

function resetDevices() {
    openModal('Resetar Dispositivos', `
        <p>Isso restaurará os dispositivos para os dados originais de exemplo.</p>
        <p style="color:#94a3b8; font-size:0.875rem; margin-top:0.5rem;">Todos os dispositivos adicionados manualmente serão removidos.</p>
    `, 'Resetar', function () {
        DeviceStorage.reset();
        showToast('Dispositivos restaurados para o padrão.', 'info');
        closeModal();
        navigateTo('devices');
    });
}

// ===== AÇÕES DE ALERTAS =====
function resolveAlert(id) {
    AlertStorage.resolve(id);
    showToast('Alerta marcado como resolvido.', 'success');
    applyAlertFilters();

    // Atualizar badge do dashboard se visível
    const badge = document.getElementById('dashboard-critical-count');
    if (badge) {
        const count = AlertStorage.getAll().filter(a => a.severity === 'critical').length;
        badge.textContent = `${count} Críticos`;
    }
}

function ignoreAlert(id) {
    AlertStorage.ignore(id);
    showToast('Alerta removido da lista.', 'warning');
    applyAlertFilters();
}

function viewAlertDetails(id) {
    const alert = AlertStorage.getAll().find(a => a.id === id);
    if (!alert) return;
    openModal(`Detalhes do Alerta`, `
        <div style="margin-bottom: 1rem;">
            <div style="font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem;">Título</div>
            <div>${alert.title}</div>
        </div>
        <div style="margin-bottom: 1rem;">
            <div style="font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem;">Descrição</div>
            <div style="color: #94a3b8;">${alert.description}</div>
        </div>
        <div style="margin-bottom: 1rem;">
            <div style="font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem;">Dispositivo</div>
            <div>${alert.device}</div>
        </div>
        <div style="margin-bottom: 1rem;">
            <div style="font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem;">Status</div>
            <span class="badge ${alert.severity === 'critical' ? 'badge-critical' : alert.severity === 'warning' ? 'badge-warning' : 'badge-success'}">
                ${alert.severity === 'resolved' ? 'Resolvido' : alert.severity === 'critical' ? 'Crítico' : alert.severity === 'warning' ? 'Aviso' : 'Info'}
            </span>
        </div>
        <div>
            <div style="font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem;">Recomendações</div>
            <div style="color: #94a3b8;">
                1. Verificar conexões físicas<br>
                2. Reiniciar o equipamento se necessário<br>
                3. Contatar suporte técnico se persistir
            </div>
        </div>
    `, 'Fechar', closeModal);
}

function resetAlerts() {
    openModal('Resetar Alertas', `
        <p>Isso restaurará os alertas para os dados originais de exemplo.</p>
    `, 'Resetar', function () {
        AlertStorage.reset();
        showToast('Alertas restaurados para o padrão.', 'info');
        closeModal();
        navigateTo('alerts');
    });
}