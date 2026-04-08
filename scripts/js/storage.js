// ===== CAMADA DE CACHE LOCAL (localStorage) =====
// O servidor é a fonte de verdade. O localStorage serve apenas como
// cache para leitura rápida entre sincronizações (a cada 30s).
// Todas as escritas passam pela API primeiro, depois atualizam o cache.

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
    getAll()           { return Storage.get(this.KEY, sampleData.devices); },
    // Escrita: API primeiro, cache depois
    async add(device) {
        const item = await API.addDevice(device);
        if (item) { const list = this.getAll(); list.push(item); Storage.set(this.KEY, list); }
        return item;
    },
    async update(id, fields) {
        const item = await API.updateDevice(id, fields);
        if (item) Storage.set(this.KEY, this.getAll().map(d => d.id === id ? item : d));
        return item;
    },
    async remove(id) {
        await API.deleteDevice(id);
        Storage.set(this.KEY, this.getAll().filter(d => d.id !== id));
    },
    reset() { Storage.remove(this.KEY); },
};

// ── Alertas ───────────────────────────────────────────────────────────────────
const AlertStorage = {
    KEY: 'alerts',
    getAll()        { return Storage.get(this.KEY, sampleData.alerts); },
    async resolve(id) {
        await API.resolveAlert(id);
        Storage.set(this.KEY, this.getAll().map(a => a.id === id ? { ...a, severity: 'resolved', resolvedAt: new Date().toLocaleString('pt-BR') } : a));
    },
    async ignore(id) {
        await API.deleteAlert(id);
        Storage.set(this.KEY, this.getAll().filter(a => a.id !== id));
    },
    async add(alert) {
        const item = await API.addAlert(alert);
        if (item) { const list = this.getAll(); list.unshift(item); Storage.set(this.KEY, list); }
        return item;
    },
    reset() { Storage.remove(this.KEY); },
};

// ── Regras de Alerta ──────────────────────────────────────────────────────────
const AlertRulesStorage = {
    KEY: 'alert_rules',
    defaults: [
        { id: 1, name: 'Sinal Óptico Baixo', condition: 'RxPower < -24 dBm',   action: 'Alerta Dashboard + Telegram', severity: 'critical', active: true },
        { id: 2, name: 'CPU Alta',            condition: 'CPU > 80% por 5 min', action: 'Email + Telegram',            severity: 'warning',  active: true },
    ],
    getAll() { return Storage.get(this.KEY, this.defaults); },
    async add(rule) {
        const item = await API.addRule(rule);
        if (item) { const list = this.getAll(); list.push(item); Storage.set(this.KEY, list); }
        return item;
    },
    async toggle(id) {
        const item = await API.toggleRule(id);
        if (item) Storage.set(this.KEY, this.getAll().map(r => r.id === id ? item : r));
    },
    async update(id, fields) {
        const item = await API.updateRule(id, fields);
        if (item) Storage.set(this.KEY, this.getAll().map(r => r.id === id ? item : r));
        return item;
    },
    async remove(id) {
        await API.deleteRule(id);
        Storage.set(this.KEY, this.getAll().filter(r => r.id !== id));
    },
    reset() { Storage.remove(this.KEY); },
};

// ── Manutenções ───────────────────────────────────────────────────────────────
// Manutenções continuam no localStorage (não há endpoint no servidor para elas)
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
        API.addHistory({ event: 'Manutenção Agendada', device: item.device, duration: item.duration || '--', action: item.description || 'Manutenção programada', user: 'admin', type: 'maintenance' });
        return newItem;
    },
    remove(id) { this.save(this.getAll().filter(i => i.id !== id)); },
    reset()    { Storage.remove(this.KEY); },
};

// ── Histórico ─────────────────────────────────────────────────────────────────
const HistoryStorage = {
    KEY: 'history',
    getAll() { return Storage.get(this.KEY, sampleData.history.map(h => ({ ...h, user: 'Sistema', type: 'alert' }))); },
    async add(item) {
        const newItem = await API.addHistory(item);
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
        const snap = await API.createBackup();
        if (snap) { const list = this.getAll(); list.unshift(snap); Storage.set(this.KEY, list.slice(0, 10)); }
        return snap;
    },
    async restore(id) {
        const result = await API.restoreBackup(id);
        if (result) await syncFromServer(); // recarregar tudo do servidor
        return result;
    },
    async remove(id) {
        await API.deleteBackup(id);
        Storage.set(this.KEY, this.getAll().filter(b => b.id !== id));
    },
};

// ── Configurações ─────────────────────────────────────────────────────────────
const SettingsStorage = {
    KEY: 'settings',
    defaults: {
        nodeName: 'SINAPSE-Node-01', timezone: 'America/Fortaleza (UTC-3)', language: 'Português (Brasil)',
        pollingInterval: '5 minutos', dataRetention: '6 meses', advancedMetrics: true,
        notifyEmail: true, notifyTelegram: true, notifySMS: false,
        email: 'ti@empresa.com', ip: '192.168.1.100', mask: '255.255.255.0',
        gateway: '192.168.1.1', dns1: '8.8.8.8', dns2: '8.8.4.4',
    },
    get()           { return Storage.get(this.KEY, this.defaults); },
    async save(s)   {
        const updated = await API.saveSettings(s);
        if (updated) Storage.set(this.KEY, updated);
        return updated;
    },
    reset()         { Storage.remove(this.KEY); },
};