// ===== PERSISTÊNCIA DE DADOS (localStorage) =====
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
            console.warn('Storage.get error:', e);
            return fallback;
        }
    },

    remove(key) {
        localStorage.removeItem(this.PREFIX + key);
    },

    clear() {
        Object.keys(localStorage)
            .filter(k => k.startsWith(this.PREFIX))
            .forEach(k => localStorage.removeItem(k));
    }
};

// ===== GERENCIAMENTO DE DISPOSITIVOS PERSISTIDOS =====
const DeviceStorage = {
    KEY: 'devices',

    getAll() {
        return Storage.get(this.KEY, sampleData.devices);
    },

    save(devices) {
        return Storage.set(this.KEY, devices);
    },

    add(device) {
        const devices = this.getAll();
        const newDevice = {
            ...device,
            id: Date.now(),
            status: 'online',
        };
        devices.push(newDevice);
        this.save(devices);
        return newDevice;
    },

    update(id, fields) {
        const devices = this.getAll();
        const idx = devices.findIndex(d => d.id === id);
        if (idx === -1) return false;
        devices[idx] = { ...devices[idx], ...fields };
        this.save(devices);
        return true;
    },

    remove(id) {
        const devices = this.getAll().filter(d => d.id !== id);
        this.save(devices);
    },

    reset() {
        Storage.remove(this.KEY);
    }
};

// ===== GERENCIAMENTO DE ALERTAS PERSISTIDOS =====
const AlertStorage = {
    KEY: 'alerts',

    getAll() {
        return Storage.get(this.KEY, sampleData.alerts);
    },

    save(alerts) {
        return Storage.set(this.KEY, alerts);
    },

    resolve(id) {
        const alerts = this.getAll().map(a =>
            a.id === id ? { ...a, severity: 'resolved', resolvedAt: new Date().toLocaleString('pt-BR') } : a
        );
        this.save(alerts);
    },

    ignore(id) {
        const alerts = this.getAll().filter(a => a.id !== id);
        this.save(alerts);
    },

    add(alert) {
        const alerts = this.getAll();
        const newAlert = { ...alert, id: Date.now() };
        alerts.unshift(newAlert);
        this.save(alerts);
        return newAlert;
    },

    reset() {
        Storage.remove(this.KEY);
    }
};

// ===== SETTINGS PERSISTIDOS =====
const SettingsStorage = {
    KEY: 'settings',

    defaults: {
        nodeName: 'SINAPSE-Node-01',
        timezone: 'America/Fortaleza (UTC-3)',
        language: 'Português (Brasil)',
        pollingInterval: '5 minutos',
        dataRetention: '6 meses',
        advancedMetrics: true,
        notifyEmail: true,
        notifyTelegram: true,
        notifySMS: false,
        email: 'ti@empresa.com',
        ip: '192.168.1.100',
        mask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns1: '8.8.8.8',
        dns2: '8.8.4.4',
    },

    get() {
        return Storage.get(this.KEY, this.defaults);
    },

    save(settings) {
        return Storage.set(this.KEY, { ...this.get(), ...settings });
    },

    reset() {
        Storage.remove(this.KEY);
    }
};