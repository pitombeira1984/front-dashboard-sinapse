// ===== CAMADA DE CACHE LOCAL (localStorage) =====
// O servidor é a fonte de verdade. O localStorage serve apenas como
// cache para leitura rápida entre sincronizações.
// Todas as escritas passam pela API primeiro, depois atualizam o cache.
//
// Mapeamento de endpoints (server.js):
//   Dispositivos : GET/POST/PUT/DELETE /api/devices/:id
//   Alertas      : GET /api/alerts/all  POST /api/alerts/add
//                  PUT /api/alerts/:id/resolve  DELETE /api/alerts/:id
//   Regras       : GET/POST /api/rules  PUT /api/rules/:id  DELETE /api/rules/:id
//                  PUT /api/rules/:id/toggle
//   Histórico    : GET/POST /api/history
//   Backups      : GET/POST /api/backups
//                  POST /api/backups/:id/restore  DELETE /api/backups/:id
//   Settings     : GET /api/settings  PUT /api/settings

const Storage = {
    PREFIX: 'sinapse_',
    set(key, value)  { try { localStorage.setItem(this.PREFIX + key, JSON.stringify(value)); return true; } catch(e) { return false; } },
    get(key, fallback = null) { try { const r = localStorage.getItem(this.PREFIX + key); return r !== null ? JSON.parse(r) : fallback; } catch(e) { return fallback; } },
    remove(key)      { localStorage.removeItem(this.PREFIX + key); },
    clear()          { Object.keys(localStorage).filter(k => k.startsWith(this.PREFIX)).forEach(k => localStorage.removeItem(k)); },
};

// ── Dispositivos ──────────────────────────────────────────────────────────────
const DeviceStorage = {
    KEY: 'devices',
    getAll() { return Storage.get(this.KEY, sampleData.devices); },

    async add(device) {
        const item = await API.addDevice(device);                    // POST /api/devices
        if (item) { const list = this.getAll(); list.push(item); Storage.set(this.KEY, list); }
        return item;
    },
    async update(id, fields) {
        const item = await API.updateDevice(id, fields);             // PUT /api/devices/:id
        if (item) Storage.set(this.KEY, this.getAll().map(d => d.id === id ? item : d));
        return item;
    },
    async remove(id) {
        await API.deleteDevice(id);                                  // DELETE /api/devices/:id
        Storage.set(this.KEY, this.getAll().filter(d => d.id !== id));
    },
    reset() { Storage.remove(this.KEY); },
};

// ── Alertas ───────────────────────────────────────────────────────────────────
const AlertStorage = {
    KEY: 'alerts',
    getAll() { return Storage.get(this.KEY, sampleData.alerts); },

    async resolve(id) {
        await API.resolveAlert(id);                                  // PUT /api/alerts/:id/resolve
        Storage.set(this.KEY, this.getAll().map(a =>
            a.id === id ? { ...a, severity: 'resolved', resolvedAt: new Date().toLocaleString('pt-BR') } : a
        ));
    },
    async ignore(id) {
        await API.deleteAlert(id);                                   // DELETE /api/alerts/:id
        Storage.set(this.KEY, this.getAll().filter(a => a.id !== id));
    },
    async add(alert) {
        const item = await API.addAlert(alert);                      // POST /api/alerts/add
        if (item) { const list = this.getAll(); list.unshift(item); Storage.set(this.KEY, list); }
        return item;
    },
    reset() { Storage.remove(this.KEY); },
};

// ── Regras de Alerta ──────────────────────────────────────────────────────────
const AlertRulesStorage = {
    KEY: 'alert_rules',
    defaults: [
        { id: 1, name: 'ONU Offline',          condition: 'ONU status = offline',          action: 'Alerta Dashboard + Telegram', severity: 'critical', active: true },
        { id: 2, name: 'Sinal Óptico Crítico', condition: 'RxPower < -27 dBm (ITU G.984)', action: 'SMS + Email + Telegram',      severity: 'critical', active: true },
        { id: 3, name: 'Sinal Óptico Baixo',   condition: 'RxPower < -24 dBm',             action: 'Alerta Dashboard + Telegram', severity: 'warning',  active: true },
        { id: 4, name: 'Latência Alta',        condition: 'Latência > 50ms por 5 min',     action: 'Email + Telegram',            severity: 'warning',  active: true },
        { id: 5, name: 'CPU OLT Alta',         condition: 'CPU OLT > 80%',                 action: 'Email',                       severity: 'warning',  active: true },
    ],
    getAll() { return Storage.get(this.KEY, this.defaults); },

    async add(rule) {
        const item = await API.addRule(rule);                        // POST /api/rules
        if (item) { const list = this.getAll(); list.push(item); Storage.set(this.KEY, list); }
        return item;
    },
    async toggle(id) {
        const item = await API.toggleRule(id);                       // PUT /api/rules/:id/toggle
        if (item) Storage.set(this.KEY, this.getAll().map(r => r.id === id ? item : r));
    },
    async update(id, fields) {
        const item = await API.updateRule(id, fields);               // PUT /api/rules/:id
        if (item) Storage.set(this.KEY, this.getAll().map(r => r.id === id ? item : r));
        return item;
    },
    async remove(id) {
        await API.deleteRule(id);                                    // DELETE /api/rules/:id
        Storage.set(this.KEY, this.getAll().filter(r => r.id !== id));
    },
    reset() { Storage.remove(this.KEY); },
};

// ── Manutenções ───────────────────────────────────────────────────────────────
// Manutenções ficam no localStorage — não há endpoint dedicado no servidor
const MaintenanceStorage = {
    KEY: 'maintenances',
    getAll()    { return Storage.get(this.KEY, []); },
    save(items) { return Storage.set(this.KEY, items); },
    add(item) {
        const list    = this.getAll();
        const newItem = { ...item, id: Date.now(), status: 'agendado' };
        list.unshift(newItem);
        this.save(list);
        // Registrar no histórico do servidor
        if (typeof API !== 'undefined') {
            API.addHistory({                                         // POST /api/history
                event:    'Manutenção Agendada',
                device:   item.device,
                duration: item.duration || '--',
                action:   item.description || 'Manutenção programada',
                user:     'admin',
                type:     'maintenance',
            });
        }
        return newItem;
    },
    remove(id) { this.save(this.getAll().filter(i => i.id !== id)); },
    reset()    { Storage.remove(this.KEY); },
};

// ── Histórico ─────────────────────────────────────────────────────────────────
const HistoryStorage = {
    KEY: 'history',
    getAll() {
        return Storage.get(this.KEY, sampleData.history.map(h => ({ ...h, user: 'Sistema', type: 'alert' })));
    },
    async add(item) {
        const newItem = await API.addHistory(item);                  // POST /api/history
        if (newItem) { const list = this.getAll(); list.unshift(newItem); Storage.set(this.KEY, list); }
        return newItem;
    },
    reset() { Storage.remove(this.KEY); },
};

// ── Backups ───────────────────────────────────────────────────────────────────
const BackupStorage = {
    KEY: 'backups',
    getAll() { return Storage.get(this.KEY, []); },

    async create() {
        const snap = await API.createBackup();                       // POST /api/backups
        if (snap) { const list = this.getAll(); list.unshift(snap); Storage.set(this.KEY, list.slice(0, 10)); }
        return snap;
    },
    async restore(id) {
        const result = await API.restoreBackup(id);                  // POST /api/backups/:id/restore
        if (result) {
            // Após restauração, recarregar dados do servidor no cache local
            const [devices, alerts, rules, settings] = await Promise.all([
                API.getDevices(), API.getAlerts(), API.getRules(), API.getSettings()
            ]);
            if (devices)  Storage.set('devices',     devices);
            if (alerts)   Storage.set('alerts',      alerts);
            if (rules)    Storage.set('alert_rules', rules);
            if (settings) Storage.set('settings',    settings);
        }
        return result;
    },
    async remove(id) {
        await API.deleteBackup(id);                                  // DELETE /api/backups/:id
        Storage.set(this.KEY, this.getAll().filter(b => b.id !== id));
    },
};

// ── Configurações ─────────────────────────────────────────────────────────────
const SettingsStorage = {
    KEY: 'settings',
    defaults: {
        nodeName:        'SINAPSE-Node-01',
        timezone:        'America/Fortaleza (UTC-3)',
        language:        'Português (Brasil)',
        pollingInterval: '5 minutos',
        dataRetention:   '6 meses',
        advancedMetrics: true,
        notifyEmail:     true,
        notifyTelegram:  true,
        notifySMS:       false,
        email:           'pitombeira1984@gmail.com.br',
        ip:              '192.168.1.100',
        mask:            '255.255.255.0',
        gateway:         '192.168.1.1',
        dns1:            '8.8.8.8',
        dns2:            '8.8.4.4',
    },
    get() { return Storage.get(this.KEY, this.defaults); },

    async save(s) {
        const updated = await API.saveSettings(s);                   // PUT /api/settings
        if (updated) Storage.set(this.KEY, updated);
        return updated;
    },
    reset() { Storage.remove(this.KEY); },
};