// ===== CLIENTE DA API SINAPSE =====
// Consome o Mock Server (ou o servidor real no Orange Pi futuramente).
// Troque apenas API_BASE_URL para apontar para o hardware real.

const API = {
    // Local: Express na porta 3000. Railway/produção: mesmo origin (frontend + API juntos).
    BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000'
        : '',

    // Intervalo de polling em milissegundos
    POLL_INTERVAL: 5000,

    // Estado de conectividade
    connected: false,
    pollTimer: null,
    listeners: [],

    // ── Fetch base ─────────────────────────────────────────────────────────
    async _request(path, { raw = false } = {}) {
        try {
            const res  = await fetch(`${this.BASE_URL}${path}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (!this.connected) {
                this.connected = true;
                this._notify('connected', null);
                updateServerStatus(true);
            }
            return raw ? json : (json.data ?? json);
        } catch (err) {
            if (this.connected) {
                this.connected = false;
                this._notify('disconnected', err.message);
                updateServerStatus(false);
            }
            return null;
        }
    },
    _fetch(path)    { return this._request(path); },
    _fetchRaw(path) { return this._request(path, { raw: true }); },

    // ── Endpoints ──────────────────────────────────────────────────────────
    async getStatus()     { return this._fetch('/api/status'); },
    async getDevice()     { return this._fetch('/api/device'); },
    async getOptical()    { return this._fetch('/api/device/optical'); },
    async getSystem()     { return this._fetch('/api/device/system'); },
    async getWifi()       { return this._fetch('/api/device/wifi'); },
    async getInterfaces() { return this._fetch('/api/device/interfaces'); },
    async getHistory()    { return this._fetch('/api/device/history'); },
    async getLive(port)   { const qs = port ? `?port=${encodeURIComponent(port)}` : ''; return this._fetch(`/api/metrics/live${qs}`); },
    async getAlerts()     { return this._fetch('/api/alerts'); },


    // ── GPON / ONUs ────────────────────────────────────────────────────────
    async getTopology()          { return this._fetch('/api/topology'); },
    async getONUs(port)          { const qs = port ? `?port=${encodeURIComponent(port)}` : ''; return this._fetch(`/api/onus${qs}`); },
    async getONU(id)             { return this._fetch(`/api/onus/${id}`); },
    async getGponPorts()         { return this._fetch('/api/gpon/ports'); },
    async getGponKPIs()          { return this._fetch('/api/gpon/kpis'); },
    async getOLTs()              { return this._fetch('/api/olts'); },
    async getOLTsBandwidth()     { return this._fetch('/api/olts/bandwidth'); },

    // ── Clientes ───────────────────────────────────────────────────────────
    async getClients()  { return this._fetch('/api/clients'); },
    async getClient(id) { return this._fetch(`/api/clients/${id}`); },

    // ── SNMP Traps ─────────────────────────────────────────────────────────
    async getTraps(filters = {}) {
        const params = new URLSearchParams();
        if (filters.type)           params.set('type',           filters.type);
        if (filters.severity)       params.set('severity',       filters.severity);
        if (filters.unacknowledged) params.set('unacknowledged', 'true');
        if (filters.limit)          params.set('limit',          filters.limit);
        const qs = params.toString();
        const res = await this._fetchRaw(`/api/traps${qs ? '?' + qs : ''}`);
        return res?.data ?? [];
    },
    async getTrapStats()           {
        const res = await this._fetchRaw('/api/traps/stats');
        return res ?? null;
    },
    async getTrapTypes()           { return this._fetch('/api/traps/types'); },
    async acknowledgeTraps(ids)    { return this._fetchPut('/api/traps/acknowledge',     { ids }); },
    async acknowledgeAllTraps()    { return this._fetchPut('/api/traps/acknowledge-all', {}); },




    async _fetchPost(path, body) {
        try {
            const res  = await fetch(`${this.BASE_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) { console.warn('API POST error:', err); return null; }
    },
    async _fetchPut(path, body) {
        try {
            const res  = await fetch(`${this.BASE_URL}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) { console.warn('API PUT error:', err); return null; }
    },
    async _fetchDelete(path) {
        try {
            const res = await fetch(`${this.BASE_URL}${path}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) { console.warn('API DELETE error:', err); return null; }
    },

    // ── CRUD Dispositivos ──────────────────────────────────────────────────
    async getDevices()           { return this._fetch('/api/devices'); },
    async addDevice(d)           { const r = await this._fetchPost('/api/devices', d); return r?.data ?? null; },
    async updateDevice(id, f)    { const r = await this._fetchPut(`/api/devices/${id}`, f); return r?.data ?? null; },
    async deleteDevice(id)       { return this._fetchDelete(`/api/devices/${id}`); },

    // ── CRUD Alertas ───────────────────────────────────────────────────────
    async getAllAlerts()          { return this._fetch('/api/alerts/all'); },
    async addAlert(a)            { const r = await this._fetchPost('/api/alerts/add', a); return r?.data ?? null; },
    async resolveAlert(id)       { return this._fetchPut(`/api/alerts/${id}/resolve`, {}); },
    async deleteAlert(id)        { return this._fetchDelete(`/api/alerts/${id}`); },

    // ── CRUD Regras ────────────────────────────────────────────────────────
    async getRules()             { return this._fetch('/api/rules'); },
    async addRule(r)             { const res = await this._fetchPost('/api/rules', r); return res?.data ?? null; },
    async updateRule(id, f)      { const res = await this._fetchPut(`/api/rules/${id}`, f); return res?.data ?? null; },
    async toggleRule(id)         { const res = await this._fetchPut(`/api/rules/${id}/toggle`, {}); return res?.data ?? null; },
    async deleteRule(id)         { return this._fetchDelete(`/api/rules/${id}`); },

    // ── Histórico ──────────────────────────────────────────────────────────
    async addHistory(item)       { const r = await this._fetchPost('/api/history', item); return r?.data ?? null; },

    // ── Configurações ──────────────────────────────────────────────────────
    async getSettings()          { return this._fetch('/api/settings'); },
    async saveSettings(s)        { const r = await this._fetchPut('/api/settings', s); return r?.data ?? null; },

    // ── Backups ────────────────────────────────────────────────────────────
    async createBackup()         { const r = await this._fetchPost('/api/backups', {}); return r?.data ?? null; },
    async restoreBackup(id)      { return this._fetchPost(`/api/backups/${id}/restore`, {}); },
    async deleteBackup(id)       { return this._fetchDelete(`/api/backups/${id}`); },

    // ── Polling ────────────────────────────────────────────────────────────
    startPolling(callback) {
        this.stopPolling();
        const poll = async () => {
            const port = (typeof AppState !== 'undefined') ? AppState.currentGponPort : null;
            const data = await this.getLive(port);
            if (data) callback(data);
        };
        poll(); // imediato
        this.pollTimer = setInterval(poll, this.POLL_INTERVAL);
    },

    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    },


    // ── Trap Polling (5s) — separado do polling de métricas ───────────────
    trapTimer:   null,
    trapLastId:  null,

    startTrapPolling(callback) {
        this.stopTrapPolling();
        const poll = async () => {
            const res = await this.getTrapStats();
            if (!res) return;
            // getTrapStats retorna { ok, data: { total, unacknowledged, ... } }
            const stats   = res.data ?? res;
            const lastTrap = stats.lastTrap;
            if (lastTrap && lastTrap.id !== this.trapLastId) {
                this.trapLastId = lastTrap.id;
                callback(stats, lastTrap);
            }
        };
        poll();
        this.trapTimer = setInterval(poll, this.POLL_INTERVAL);
    },

    stopTrapPolling() {
        if (this.trapTimer) { clearInterval(this.trapTimer); this.trapTimer = null; }
    },



    // ── Eventos ────────────────────────────────────────────────────────────
    on(event, fn) { this.listeners.push({ event, fn }); },

    _notify(event, data) {
        this.listeners.filter(l => l.event === event).forEach(l => l.fn(data));
    },
};

// ── Atualizar indicador de status do servidor na sidebar ─────────────────────
function updateServerStatus(online) {
    const dot  = document.querySelector('.status-dot');
    const text = document.querySelector('.status-indicator span');
    if (dot) {
        dot.style.backgroundColor = online ? 'var(--success-color)' : 'var(--danger-color)';
    }
    if (text) {
        text.textContent = online ? 'Servidor Conectado' : 'Servidor Offline';
    }
}

// ── Aplicar dados live nos KPIs do dashboard ─────────────────────────────────
function applyLiveData(data) {
    if (!data) return;

    // ── Atualizar gráficos em tempo real ──────────────────────────────────
    if (typeof pushChartPoint === 'function') pushChartPoint(data);

    // KPIs
    const setCPU  = document.getElementById('cpu-usage');
    const setLat  = document.getElementById('latency');
    const setAvail = document.getElementById('availability');

    if (setCPU) {
        setCPU.textContent = `${data.cpu}%`;
        const bar = document.getElementById('cpu-bar');
        if (bar) {
            bar.style.width = `${data.cpu}%`;
            bar.style.backgroundColor =
                data.cpu > 90 ? 'var(--danger-color)' :
                data.cpu > 70 ? 'var(--warning-color)' :
                'var(--success-color)';
        }
    }

    // Disponibilidade baseada no status óptico (fallback enquanto avgLatency/availability não chegam)
    if (setAvail && data.availability === undefined) {
        const avail = data.opticalStatus === 'online' ? '99.97' : '98.50';
        setAvail.textContent = `${avail}%`;
    }

    // KPI: ONUs Ativas
    const onusEl = document.getElementById('onus');
    if (onusEl) {
        const active = data.onusOnline ?? data.wifiClients ?? '--';
        const total  = data.onusTotal  ?? 8;
        onusEl.textContent = `${active}/${total}`;
    }

    // KPI: Sinal Médio RxPower
    const rxEl = document.getElementById('avg-rxpower');
    if (rxEl) {
        if (data.avgRxPower != null && data.avgRxPower !== 0) {
            rxEl.textContent = `${data.avgRxPower} dBm`;
            rxEl.style.color = data.avgRxPower < -25 ? 'var(--danger-color)' : data.avgRxPower < -22 ? 'var(--warning-color)' : 'var(--success-color)';
        } else {
            rxEl.textContent = '-- dBm';
            rxEl.style.color = '';
        }
    }

    // KPI: Latência Média real das ONUs
    if (setLat) {
        if (data.avgLatency != null && data.avgLatency !== 0) {
            setLat.innerHTML = `${data.avgLatency}<span style="font-size:1rem;">ms</span>`;
        } else {
            setLat.innerHTML = `--<span style="font-size:1rem;">ms</span>`;
        }
    }

    // KPI: Disponibilidade real
    if (setAvail && data.availability !== undefined) {
        setAvail.textContent = `${data.availability}%`;
    }

    // Alerta de anomalia automático
    if (data.anomaly) {
        const alertsList = document.getElementById('alerts-list');
        if (alertsList) {
            // Verificar se já existe este alerta no topo
            const existingAnomaly = alertsList.querySelector('[data-anomaly]');
            if (!existingAnomaly) {
                const div = document.createElement('div');
                div.setAttribute('data-anomaly', 'true');
                div.className = `alert-item alert-${data.anomaly.severity}`;
                div.innerHTML = `
                    <i class="fas fa-exclamation-circle alert-icon"></i>
                    <div class="alert-content">
                        <div class="alert-title">${data.anomaly.description?.split('.')[0] || 'Anomalia detectada'}</div>
                        <div class="alert-description">Detectado automaticamente via API • ${new Date().toLocaleTimeString('pt-BR')}</div>
                    </div>
                    <div class="alert-time">agora</div>`;
                alertsList.prepend(div);
            }
        }
    }
}

