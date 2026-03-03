// ===== UTILITÁRIOS =====

// ----- Tempo -----
function updateTime() {
    const now         = new Date();
    const timeEl      = document.getElementById('current-time');
    const updateEl    = document.getElementById('data-update');
    const timeString  = now.toLocaleTimeString('pt-BR');
    const dateString  = now.toLocaleDateString('pt-BR');
    if (timeEl)   timeEl.textContent   = timeString;
    if (updateEl) updateEl.textContent = `Última atualização: ${dateString} ${timeString}`;
}

function updateDashboardData() {
    const avail = document.getElementById('availability');
    const lat   = document.getElementById('latency');
    const onus  = document.getElementById('onus');
    const cpu   = document.getElementById('cpu-usage');

    if (avail) avail.textContent = `${(parseFloat(avail.textContent) + (Math.random() - 0.5) * 0.1).toFixed(2)}%`;
    if (lat)   lat.textContent   = `${(parseFloat(lat.textContent) + (Math.random() - 0.5) * 2).toFixed(1)}ms`;
    if (onus) {
        const cur = parseInt(onus.textContent.replace(/\D/g, ''));
        onus.textContent = Math.max(0, cur + Math.floor(Math.random() * 10) - 5).toLocaleString();
    }
    if (cpu) {
        const val = 30 + Math.floor(Math.random() * 20);
        cpu.textContent = `${val}%`;
        const bar = document.getElementById('cpu-bar');
        if (bar) {
            bar.style.width           = `${val}%`;
            bar.style.backgroundColor = val > 90 ? 'var(--danger-color)' : val > 70 ? 'var(--warning-color)' : 'var(--success-color)';
        }
    }
}

// ----- Toast -----
function showToast(message, type = 'success') {
    const existing = document.getElementById('sinapse-toast');
    if (existing) existing.remove();

    const colors = { success: 'var(--success-color)', warning: 'var(--warning-color)', error: 'var(--danger-color)', info: 'var(--secondary-color)' };
    const icons  = { success: 'fa-check-circle', warning: 'fa-exclamation-triangle', error: 'fa-times-circle', info: 'fa-info-circle' };

    if (!document.getElementById('toast-style')) {
        const s = document.createElement('style');
        s.id    = 'toast-style';
        s.textContent = `
            @keyframes toastIn  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
            @keyframes toastOut { from { opacity:1; transform:translateY(0);    } to { opacity:0; transform:translateY(12px); } }
        `;
        document.head.appendChild(s);
    }

    const toast = document.createElement('div');
    toast.id    = 'sinapse-toast';
    toast.style.cssText = `
        position:fixed; bottom:2rem; right:2rem; z-index:9999;
        background:#1e293b; border:1px solid #334155;
        border-left:4px solid ${colors[type] || colors.success};
        border-radius:8px; padding:1rem 1.25rem;
        display:flex; align-items:center; gap:0.75rem;
        color:#e2e8f0; font-size:0.9rem; font-weight:500;
        box-shadow:0 8px 24px rgba(0,0,0,0.4);
        animation:toastIn 0.3s ease; max-width:400px;
    `;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.success}" style="color:${colors[type]};font-size:1.1rem;"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ----- Modal -----
function openModal(title, content, confirmText, confirmCallback) {
    document.getElementById('modal-title').textContent   = title;
    document.getElementById('modal-body').innerHTML      = content;
    document.getElementById('modal-confirm').textContent = confirmText;
    document.getElementById('modal').style.display       = 'flex';

    const modal      = document.getElementById('modal');
    const closeBtn   = document.getElementById('close-modal');
    const cancelBtn  = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');

    const destroy = () => {
        modal.style.display = 'none';
        closeBtn.removeEventListener('click', destroy);
        cancelBtn.removeEventListener('click', destroy);
        confirmBtn.removeEventListener('click', onConfirm);
        modal.removeEventListener('click', onOutside);
    };
    const onConfirm = () => { if (confirmCallback) confirmCallback(); };
    const onOutside = (e) => { if (e.target === modal) destroy(); };

    closeBtn.addEventListener('click', destroy);
    cancelBtn.addEventListener('click', destroy);
    confirmBtn.addEventListener('click', onConfirm);
    modal.addEventListener('click', onOutside);
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// ===== AÇÕES — DISPOSITIVOS =====

function editDevice(id) {
    const device = DeviceStorage.getAll().find(d => d.id === id);
    if (!device) return;
    openModal(`Editar — ${device.name}`, `
        <div class="form-group">
            <label class="form-label">Nome</label>
            <input type="text" class="form-control" id="edit-name" value="${device.name}">
        </div>
        <div class="form-group">
            <label class="form-label">IP</label>
            <input type="text" class="form-control" id="edit-ip" value="${device.ip}">
        </div>
        <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" id="edit-status">
                <option value="online"  ${device.status === 'online'  ? 'selected' : ''}>Online</option>
                <option value="offline" ${device.status === 'offline' ? 'selected' : ''}>Offline</option>
            </select>
        </div>
    `, 'Salvar', () => {
        DeviceStorage.update(id, {
            name:   document.getElementById('edit-name').value.trim(),
            ip:     document.getElementById('edit-ip').value.trim(),
            status: document.getElementById('edit-status').value,
        });
        showToast('Dispositivo atualizado!', 'success');
        closeModal();
        if (AppState.currentPage === 'devices') navigateTo('devices');
    });
}

function viewDeviceMetrics(id) {
    const d = DeviceStorage.getAll().find(x => x.id === id);
    if (!d) return;
    const rows = d.cpu !== undefined
        ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            ${[['CPU', d.cpu + '%'], ['Memória', d.memory + '%'], ['Temperatura', (d.temperature || '-') + '°C']].map(([k, v]) => `
                <div style="background:#0f172a;padding:1rem;border-radius:8px;">
                    <div style="color:#94a3b8;font-size:0.8rem;">${k}</div>
                    <div style="font-size:1.5rem;font-weight:700;">${v}</div>
                </div>`).join('')}
           </div>`
        : `<p style="color:#94a3b8;">Métricas detalhadas não disponíveis para este tipo.</p>`;
    openModal(`Métricas — ${d.name}`, rows, 'Fechar', closeModal);
}

function testDevice(id) {
    const btn = event.target.closest('button');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = original;
        btn.disabled  = false;
        const d = DeviceStorage.getAll().find(x => x.id === id);
        showToast(`Ping para ${d?.ip || 'dispositivo'}: OK — ${Math.floor(Math.random() * 20) + 5}ms`, 'success');
    }, 1500);
}

function removeDevice(id) {
    const d = DeviceStorage.getAll().find(x => x.id === id);
    if (!d) return;
    openModal('Confirmar Remoção', `
        <div style="text-align:center;padding:1rem;">
            <i class="fas fa-trash" style="font-size:2.5rem;color:var(--danger-color);margin-bottom:1rem;display:block;"></i>
            <p>Tem certeza que deseja remover <strong>${d.name}</strong>?</p>
            <p style="color:#94a3b8;font-size:0.875rem;margin-top:0.5rem;">Esta ação não pode ser desfeita.</p>
        </div>
    `, 'Remover', () => {
        DeviceStorage.remove(id);
        showToast(`"${d.name}" removido.`, 'warning');
        closeModal();
        if (AppState.currentPage === 'devices') navigateTo('devices');
    });
}

function resetDevices() {
    openModal('Resetar Dispositivos', `<p>Restaurará os dispositivos para os dados originais de exemplo.</p>`, 'Resetar', () => {
        DeviceStorage.reset();
        showToast('Dispositivos restaurados.', 'info');
        closeModal();
        navigateTo('devices');
    });
}

// ===== AÇÕES — ALERTAS =====

function resolveAlert(id) {
    AlertStorage.resolve(id);
    showToast('Alerta resolvido.', 'success');
    applyAlertFilters();
}

function ignoreAlert(id) {
    AlertStorage.ignore(id);
    showToast('Alerta removido.', 'warning');
    applyAlertFilters();
}

function viewAlertDetails(id) {
    const a = AlertStorage.getAll().find(x => x.id === id);
    if (!a) return;
    openModal('Detalhes do Alerta', `
        <div style="display:flex;flex-direction:column;gap:1rem;">
            <div><div style="color:#94a3b8;font-size:0.8rem;margin-bottom:0.25rem;">TÍTULO</div><div style="font-weight:600;">${a.title}</div></div>
            <div><div style="color:#94a3b8;font-size:0.8rem;margin-bottom:0.25rem;">DESCRIÇÃO</div><div>${a.description}</div></div>
            <div><div style="color:#94a3b8;font-size:0.8rem;margin-bottom:0.25rem;">DISPOSITIVO</div><div>${a.device}</div></div>
            <div><div style="color:#94a3b8;font-size:0.8rem;margin-bottom:0.25rem;">STATUS</div>
                <span class="badge ${a.severity === 'critical' ? 'badge-critical' : a.severity === 'warning' ? 'badge-warning' : 'badge-success'}">
                    ${a.severity === 'resolved' ? 'Resolvido' : a.severity === 'critical' ? 'Crítico' : a.severity === 'warning' ? 'Aviso' : 'Info'}
                </span>
            </div>
            <div><div style="color:#94a3b8;font-size:0.8rem;margin-bottom:0.5rem;">RECOMENDAÇÕES</div>
                <div style="background:#0f172a;padding:1rem;border-radius:8px;color:#94a3b8;font-size:0.875rem;line-height:1.8;">
                    1. Verificar conexões físicas<br>
                    2. Reiniciar o equipamento se necessário<br>
                    3. Contatar suporte técnico se persistir
                </div>
            </div>
        </div>
    `, 'Fechar', closeModal);
}

function resetAlerts() {
    openModal('Resetar Alertas', `<p>Restaurará os alertas para os dados originais.</p>`, 'Resetar', () => {
        AlertStorage.reset();
        showToast('Alertas restaurados.', 'info');
        closeModal();
        navigateTo('alerts');
    });
}

// ===== AÇÕES — MANUTENÇÃO =====

function cancelMaintenance(id) {
    MaintenanceStorage.remove(id);
    showToast('Manutenção cancelada.', 'warning');
    // Atualizar tabela inline sem reload de página
    const row = document.querySelector(`tr[data-maintenance-id="${id}"]`);
    if (row) row.remove();
    updateMaintenanceCount();
}

function updateMaintenanceCount() {
    const el = document.getElementById('maintenance-count');
    if (el) el.textContent = MaintenanceStorage.getAll().length;
}

// ===== EXPORTAÇÃO =====

function exportData(format, period, type = 'history') {
    let data = [];

    if (type === 'history') {
        data = HistoryStorage.getAll();
        if (period !== 'all') {
            const days = parseInt(period);
            const cutoff = Date.now() - days * 86400000;
            data = data.filter(item => {
                // Tentar parsear a data do item
                const t = new Date(item.time);
                return isNaN(t.getTime()) || t.getTime() >= cutoff;
            });
        }
    }

    if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `sinapse-historico-${Date.now()}.json`);
    } else if (format === 'csv') {
        const headers = ['ID', 'Data/Hora', 'Evento', 'Dispositivo', 'Duração', 'Ação', 'Usuário'];
        const rows    = data.map(item => [
            item.id, item.time, item.event, item.device,
            item.duration || '--', item.action || '--', item.user || 'Sistema'
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `sinapse-historico-${Date.now()}.csv`);
    } else if (format === 'pdf') {
        // Fallback: abrir janela de impressão com dados formatados
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>SINAPSE — Histórico</title>
            <style>body{font-family:sans-serif;padding:2rem;}table{width:100%;border-collapse:collapse;}
            th,td{border:1px solid #ccc;padding:0.5rem;text-align:left;}th{background:#f0f0f0;}</style>
            </head><body>
            <h2>SINAPSE — Histórico de Eventos</h2>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <table>
                <thead><tr><th>Data/Hora</th><th>Evento</th><th>Dispositivo</th><th>Duração</th><th>Ação</th><th>Usuário</th></tr></thead>
                <tbody>${data.map(item => `
                    <tr>
                        <td>${item.time}</td><td>${item.event}</td><td>${item.device}</td>
                        <td>${item.duration || '--'}</td><td>${item.action || '--'}</td><td>${item.user || 'Sistema'}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            </body></html>
        `);
        win.document.close();
        win.print();
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}