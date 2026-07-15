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
        position:fixed; bottom:2rem; right:2rem; z-index:199;
        background:var(--bg-card); border:1px solid var(--border-color);
        border-left:4px solid ${colors[type] || colors.success};
        border-radius:8px; padding:1rem 1.25rem;
        display:flex; align-items:center; gap:0.75rem;
        color:var(--text-primary); font-size:0.9rem; font-weight:500;
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
let _modalDestroy = null;

function openModal(title, content, confirmText, confirmCallback) {
    if (_modalDestroy) _modalDestroy();

    document.getElementById('modal-title').textContent   = title;
    document.getElementById('modal-body').innerHTML      = content;
    document.getElementById('modal-confirm').textContent = confirmText;
    document.getElementById('modal').style.display       = 'flex';

    const modal      = document.getElementById('modal');
    const closeBtn   = document.getElementById('close-modal');
    const cancelBtn  = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');

    const destroy = () => {
        _modalDestroy = null;
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

    _modalDestroy = destroy;
}

function closeModal() {
    if (_modalDestroy) _modalDestroy();
    else document.getElementById('modal').style.display = 'none';
}

// ----- Escape HTML -----
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ----- Análise preditiva -----
// Regressão linear simples (mínimos quadrados) sobre uma série de valores igualmente espaçados.
// Retorna a inclinação (slope, unidade/amostra), o intercepto e o R² (qualidade do ajuste 0-1).
function linearRegression(values) {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (i - xMean) * (values[i] - yMean); den += (i - xMean) ** 2; }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) { const pred = slope * i + intercept; ssRes += (values[i] - pred) ** 2; ssTot += (values[i] - yMean) ** 2; }
    const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
    return { slope, intercept, r2 };
}

// Formata uma duração em segundos como texto legível (s / min / h / dias)
function formatDuration(seconds) {
    if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = minutes / 60;
    if (hours < 48) return `${hours.toFixed(1)} h`;
    return `${(hours / 24).toFixed(1)} dias`;
}

// ===== AÇÕES — DISPOSITIVOS =====

function _findDevice(id) {
    return (typeof _mgmtDevices !== 'undefined' && _mgmtDevices.length
        ? _mgmtDevices
        : DeviceStorage.getAll()
    ).find(d => d.id === id);
}

function editDevice(id) {
    const device = _findDevice(id);
    if (!device) return;
    openModal(`Editar — ${device.name}`, `
        <div class="form-group">
            <label class="form-label">Nome</label>
            <input type="text" class="form-control" id="edit-name" value="${escHtml(device.name)}">
        </div>
        <div class="form-group">
            <label class="form-label">IP</label>
            <input type="text" class="form-control" id="edit-ip" value="${escHtml(device.ip || '')}">
        </div>
        <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" id="edit-status">
                <option value="online"  ${device.status === 'online'  ? 'selected' : ''}>Online</option>
                <option value="offline" ${device.status === 'offline' ? 'selected' : ''}>Offline</option>
            </select>
        </div>
    `, 'Salvar', () => {
        const fields = {
            name:   document.getElementById('edit-name').value.trim(),
            ip:     document.getElementById('edit-ip').value.trim(),
            status: document.getElementById('edit-status').value,
        };
        API.updateDevice(id, fields);
        showToast('Dispositivo atualizado!', 'success');
        closeModal();
        setTimeout(() => { if (typeof _loadMgmtDevices === 'function') _loadMgmtDevices(); }, 300);
    });
}

function viewDeviceMetrics(id) {
    const d = _findDevice(id);
    if (!d) return;
    let rows;
    if (d.type === 'OLT') {
        rows = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            ${[['CPU', (d.cpu ?? '--') + '%'], ['Memória', (d.memory ?? '--') + '%'], ['Temperatura', (d.temperature ?? '--') + '°C'], ['ONUs Ativas', `${d.onus_active ?? '--'}/${d.onus_total ?? '--'}`]].map(([k, v]) => `
                <div style="background:var(--bg-base);padding:1rem;border-radius:8px;">
                    <div style="color:var(--text-secondary);font-size:0.8rem;">${k}</div>
                    <div style="font-size:1.4rem;font-weight:700;">${v}</div>
                </div>`).join('')}
           </div>`;
    } else if (d.type === 'ONU') {
        const rxColor = (d.rxPower ?? 0) < -27 ? 'var(--danger-color)' : (d.rxPower ?? 0) < -24 ? 'var(--warning-color)' : 'var(--success-color)';
        rows = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            ${[['RxPower', { val: (d.rxPower ?? '--') + ' dBm', color: rxColor }],
               ['TxPower', { val: (d.txPower ?? '--') + ' dBm', color: '' }],
               ['Latência', { val: (d.latency ?? '--') + ' ms', color: '' }],
               ['Distância', { val: d.distance ?? '--', color: '' }],
               ['Porta GPON', { val: d.gponPort ?? '--', color: '' }],
               ['Uptime', { val: d.uptime ?? '--', color: '' }]].map(([k, o]) => `
                <div style="background:var(--bg-base);padding:1rem;border-radius:8px;">
                    <div style="color:var(--text-secondary);font-size:0.8rem;">${k}</div>
                    <div style="font-size:1.1rem;font-weight:700;${o.color ? 'color:' + o.color + ';' : ''}">${o.val}</div>
                </div>`).join('')}
           </div>`;
    } else {
        rows = `<p style="color:var(--text-secondary);">Métricas detalhadas não disponíveis para este tipo.</p>`;
    }
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
        const d = _findDevice(id);
        showToast(`Ping para ${d?.ip || 'dispositivo'}: OK — ${Math.floor(Math.random() * 20) + 5}ms`, 'success');
    }, 1500);
}

function removeDevice(id) {
    const d = _findDevice(id);
    if (!d) return;
    openModal('Confirmar Remoção', `
        <div style="text-align:center;padding:1rem;">
            <i class="fas fa-trash" style="font-size:2.5rem;color:var(--danger-color);margin-bottom:1rem;display:block;"></i>
            <p>Tem certeza que deseja remover <strong>${escHtml(d.name)}</strong>?</p>
            <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.5rem;">Esta ação não pode ser desfeita.</p>
        </div>
    `, 'Remover', () => {
        API.deleteDevice(id);
        showToast(`"${d.name}" removido.`, 'warning');
        closeModal();
        setTimeout(() => { if (typeof _loadMgmtDevices === 'function') _loadMgmtDevices(); }, 300);
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
            <div><div style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:0.25rem;">TÍTULO</div><div style="font-weight:600;">${a.title}</div></div>
            <div><div style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:0.25rem;">DESCRIÇÃO</div><div>${a.description}</div></div>
            <div><div style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:0.25rem;">DISPOSITIVO</div><div>${a.device}</div></div>
            <div><div style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:0.25rem;">STATUS</div>
                <span class="badge ${a.severity === 'critical' ? 'badge-critical' : a.severity === 'warning' ? 'badge-warning' : 'badge-success'}">
                    ${a.severity === 'resolved' ? 'Resolvido' : a.severity === 'critical' ? 'Crítico' : a.severity === 'warning' ? 'Aviso' : 'Info'}
                </span>
            </div>
            <div><div style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:0.5rem;">RECOMENDAÇÕES</div>
                <div style="background:var(--bg-base);padding:1rem;border-radius:8px;color:var(--text-secondary);font-size:0.875rem;line-height:1.8;">
                    1. Verificar conexões físicas<br>
                    2. Reiniciar o equipamento se necessário<br>
                    3. Contatar suporte técnico se persistir
                </div>
            </div>
        </div>
    `, 'Fechar', closeModal);
}

function resetAlerts() {
    openModal('Limpar Alertas', `<p>Remove todos os alertas registrados. Novos alertas serão gerados automaticamente pelo monitoramento.</p>`, 'Limpar', () => {
        AlertStorage.reset();
        showToast('Alertas limpos.', 'info');
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

// ===== GERENCIADOR DE TEMA =====
const ThemeManager = {
    init() {
        const saved = Storage.get('theme', 'dark');
        this.apply(saved);
        this._updateBtn(saved);
        document.getElementById('theme-toggle-btn')
            ?.addEventListener('click', () => this.toggle());
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next    = current === 'dark' ? 'light' : 'dark';
        this.apply(next);
        Storage.set('theme', next);
        this._updateBtn(next);
    },

    apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    },

    _updateBtn(theme) {
        const icon  = document.getElementById('theme-icon');
        const label = document.getElementById('theme-label');
        if (!icon) return;
        if (theme === 'light') {
            icon.className          = 'fas fa-moon';
            if (label) label.textContent = 'Tema Escuro';
        } else {
            icon.className          = 'fas fa-sun';
            if (label) label.textContent = 'Tema Claro';
        }
    },
};