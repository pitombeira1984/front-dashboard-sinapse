// ===== CLIENTE DA API SINAPSE =====
// Consome o Mock Server (ou o servidor real no Orange Pi futuramente).
// Troque apenas API_BASE_URL para apontar para o hardware real.

const API = {
    BASE_URL: 'http://localhost:3000',

    // Intervalo de polling em milissegundos
    POLL_INTERVAL: 5000,

    // Estado de conectividade
    connected: false,
    pollTimer: null,
    listeners: [],

    // ── Fetch base ─────────────────────────────────────────────────────────
    async _fetch(path) {
        try {
            const res  = await fetch(`${this.BASE_URL}${path}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (!this.connected) {
                this.connected = true;
                this._notify('connected', null);
                updateServerStatus(true);
            }
            return json.data ?? json;
        } catch (err) {
            if (this.connected) {
                this.connected = false;
                this._notify('disconnected', err.message);
                updateServerStatus(false);
            }
            return null;
        }
    },

    // ── Endpoints ──────────────────────────────────────────────────────────
    async getStatus()     { return this._fetch('/api/status'); },
    async getDevice()     { return this._fetch('/api/device'); },
    async getOptical()    { return this._fetch('/api/device/optical'); },
    async getSystem()     { return this._fetch('/api/device/system'); },
    async getWifi()       { return this._fetch('/api/device/wifi'); },
    async getInterfaces() { return this._fetch('/api/device/interfaces'); },
    async getHistory()    { return this._fetch('/api/device/history'); },
    async getLive()       { return this._fetch('/api/metrics/live'); },
    async getAlerts()     { return this._fetch('/api/alerts'); },

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




    async _fetchRaw(path) {
        try {
            const res  = await fetch(`${this.BASE_URL}${path}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (!this.connected) { this.connected = true; this._notify('connected', null); updateServerStatus(true); }
            return json;
        } catch (err) {
            if (this.connected) { this.connected = false; this._notify('disconnected', err.message); updateServerStatus(false); }
            return null;
        }
    },
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

    // ── Polling ────────────────────────────────────────────────────────────
    startPolling(callback) {
        this.stopPolling();
        const poll = async () => {
            const data = await this.getLive();
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

    // Latência estimada a partir do inRate (simulação realista)
    if (setLat) {
        const estimatedLatency = (5 + data.wanInRate * 0.01).toFixed(1);
        setLat.innerHTML = `${estimatedLatency}<span style="font-size:1rem;">ms</span>`;
    }

    // Disponibilidade baseada no status óptico
    if (setAvail) {
        const avail = data.opticalStatus === 'online' ? '99.97' : '98.50';
        setAvail.textContent = `${avail}%`;
    }

    // Clientes Wi-Fi no lugar de "ONUs" (adaptado para Home Gateway)
    const onusEl = document.getElementById('onus');
    if (onusEl) onusEl.textContent = data.wifiClients;

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

// ── Enriquecer o card de dispositivo no dashboard com dados reais ─────────────
async function enrichDeviceCards() {
    const snap = await API.getDevice();
    if (!snap || !snap.data) return;
    const d = snap.data;

    // Atualizar o primeiro device-card com dados reais do Home Gateway
    const cards = document.querySelectorAll('.device-card');
    if (!cards.length) return;

    const card = cards[0];
    const metricsEl = card.querySelector('.device-metrics');
    if (metricsEl) {
        metricsEl.innerHTML = `
            <div class="metric">
                <div class="metric-label">CPU</div>
                <div class="metric-value">${d.system.cpu}%</div>
            </div>
            <div class="metric">
                <div class="metric-label">Memória</div>
                <div class="metric-value">${d.system.memPercent}%</div>
            </div>
            <div class="metric">
                <div class="metric-label">RX Óptico</div>
                <div class="metric-value" style="color:${d.optical.rxPower < -25 ? 'var(--danger-color)' : d.optical.rxPower < -22 ? 'var(--warning-color)' : 'var(--success-color)'}">
                    ${d.optical.rxPower} dBm
                </div>
            </div>
            <div class="metric">
                <div class="metric-label">Clientes Wi-Fi</div>
                <div class="metric-value">${d.wifi.band24.clients + d.wifi.band5.clients}</div>
            </div>`;
    }
}