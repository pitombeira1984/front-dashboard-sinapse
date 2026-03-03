// ===== CAMADA BASE DE STORAGE =====
const Storage = {
    PREFIX: 'sinapse_',

    set(key, value) {
        try {
            localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Storage.set error:', e);
            return false;
        }
    },

    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(this.PREFIX + key);
            return raw !== null ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    },

    remove(key) { localStorage.removeItem(this.PREFIX + key); },

    clear() {
        Object.keys(localStorage)
            .filter(k => k.startsWith(this.PREFIX))
            .forEach(k => localStorage.removeItem(k));
    }
};

// ===== DISPOSITIVOS =====
const DeviceStorage = {
    KEY: 'devices',
    getAll()      { return Storage.get(this.KEY, sampleData.devices); },
    save(d)       { return Storage.set(this.KEY, d); },
    add(device) {
        const list = this.getAll();
        const item = { ...device, id: Date.now(), status: device.status || 'online' };
        list.push(item);
        this.save(list);
        return item;
    },
    update(id, fields) {
        const list = this.getAll();
        const idx  = list.findIndex(d => d.id === id);
        if (idx === -1) return false;
        list[idx] = { ...list[idx], ...fields };
        this.save(list);
        return true;
    },
    remove(id) { this.save(this.getAll().filter(d => d.id !== id)); },
    reset()    { Storage.remove(this.KEY); }
};

// ===== ALERTAS =====
const AlertStorage = {
    KEY: 'alerts',
    getAll()    { return Storage.get(this.KEY, sampleData.alerts); },
    save(a)     { return Storage.set(this.KEY, a); },
    resolve(id) {
        this.save(this.getAll().map(a =>
            a.id === id ? { ...a, severity: 'resolved', resolvedAt: new Date().toLocaleString('pt-BR') } : a
        ));
    },
    ignore(id)  { this.save(this.getAll().filter(a => a.id !== id)); },
    add(alert) {
        const list = this.getAll();
        const item = { ...alert, id: Date.now() };
        list.unshift(item);
        this.save(list);
        return item;
    },
    reset()     { Storage.remove(this.KEY); }
};

// ===== REGRAS DE ALERTA =====
const AlertRulesStorage = {
    KEY: 'alert_rules',
    defaults: [
        { id: 1, name: 'Alta CPU',           condition: 'CPU > 90% por 5 min',               action: 'Email + Telegram',              active: true },
        { id: 2, name: 'Degradação Óptica',  condition: 'Sinal < -30dBm ou queda > 1dB/dia', action: 'Alerta Dashboard + Telegram',   active: true },
    ],
    getAll()    { return Storage.get(this.KEY, this.defaults); },
    save(r)     { return Storage.set(this.KEY, r); },
    add(rule) {
        const list = this.getAll();
        const item = { ...rule, id: Date.now(), active: true };
        list.push(item);
        this.save(list);
        return item;
    },
    toggle(id) {
        this.save(this.getAll().map(r => r.id === id ? { ...r, active: !r.active } : r));
    },
    update(id, fields) {
        this.save(this.getAll().map(r => r.id === id ? { ...r, ...fields } : r));
    },
    remove(id)  { this.save(this.getAll().filter(r => r.id !== id)); },
    reset()     { Storage.remove(this.KEY); }
};

// ===== MANUTENÇÕES AGENDADAS =====
const MaintenanceStorage = {
    KEY: 'maintenances',
    getAll()    { return Storage.get(this.KEY, []); },
    save(items) { return Storage.set(this.KEY, items); },
    add(item) {
        const list    = this.getAll();
        const newItem = { ...item, id: Date.now(), status: 'agendado' };
        list.unshift(newItem);
        this.save(list);
        HistoryStorage.add({
            event:    'Manutenção Agendada',
            device:   item.device,
            duration: item.duration || '--',
            action:   item.description || 'Manutenção programada',
            user:     'admin',
            type:     'maintenance'
        });
        return newItem;
    },
    remove(id)  { this.save(this.getAll().filter(i => i.id !== id)); },
    reset()     { Storage.remove(this.KEY); }
};

// ===== HISTÓRICO =====
const HistoryStorage = {
    KEY: 'history',
    getAll() {
        return Storage.get(this.KEY, sampleData.history.map(h => ({
            ...h,
            user: 'Sistema',
            type: 'alert'
        })));
    },
    save(items) { return Storage.set(this.KEY, items); },
    add(item) {
        const list    = this.getAll();
        const newItem = {
            ...item,
            id:   Date.now(),
            time: new Date().toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }).replace(',', '')
        };
        list.unshift(newItem);
        this.save(list);
        return newItem;
    },
    reset() { Storage.remove(this.KEY); }
};

// ===== BACKUPS =====
const BackupStorage = {
    KEY: 'backups',
    getAll()       { return Storage.get(this.KEY, []); },
    save(backups)  { return Storage.set(this.KEY, backups); },

    create() {
        const now     = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const snapshot = {
            id:       Date.now(),
            filename: `backup-${dateStr}_${timeStr.replace(':', 'h')}.zip`,
            date:     `${dateStr} ${timeStr}`,
            size:     `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
            devices:  JSON.parse(JSON.stringify(DeviceStorage.getAll())),
            alerts:   JSON.parse(JSON.stringify(AlertStorage.getAll())),
            rules:    JSON.parse(JSON.stringify(AlertRulesStorage.getAll())),
            settings: JSON.parse(JSON.stringify(SettingsStorage.get())),
            history:  JSON.parse(JSON.stringify(HistoryStorage.getAll())),
        };

        const backups = this.getAll();
        backups.unshift(snapshot);
        this.save(backups.slice(0, 10)); // manter últimos 10

        HistoryStorage.add({
            event:    'Backup Criado',
            device:   'SINAPSE Node',
            duration: '--',
            action:   `Backup manual — ${snapshot.filename}`,
            user:     'admin',
            type:     'backup'
        });

        return snapshot;
    },

    restore(id) {
        const backup = this.getAll().find(b => b.id === id);
        if (!backup) return false;

        DeviceStorage.save(backup.devices);
        AlertStorage.save(backup.alerts);
        AlertRulesStorage.save(backup.rules);
        if (backup.settings) SettingsStorage.save(backup.settings);

        HistoryStorage.add({
            event:    'Backup Restaurado',
            device:   'SINAPSE Node',
            duration: '--',
            action:   `Restauração de ${backup.filename}`,
            user:     'admin',
            type:     'backup'
        });

        return true;
    },

    remove(id) { this.save(this.getAll().filter(b => b.id !== id)); }
};

// ===== CONFIGURAÇÕES =====
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
        email:           'ti@empresa.com',
        ip:              '192.168.1.100',
        mask:            '255.255.255.0',
        gateway:         '192.168.1.1',
        dns1:            '8.8.8.8',
        dns2:            '8.8.4.4',
    },
    get()          { return Storage.get(this.KEY, this.defaults); },
    save(settings) { return Storage.set(this.KEY, { ...this.get(), ...settings }); },
    reset()        { Storage.remove(this.KEY); }
};