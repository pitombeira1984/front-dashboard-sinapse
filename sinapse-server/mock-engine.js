// ===== ENGINE DE DADOS MOCK =====
'use strict';

const { OIDs } = require('./oids');

// ── Estado SNMP ───────────────────────────────────────────────────────────────
const snmpState = {
    ifInOctets: Math.floor(Math.random() * 1e10), ifOutOctets: Math.floor(Math.random() * 5e9),
    ipInReceives: Math.floor(Math.random() * 5e8), ipOutRequests: Math.floor(Math.random() * 5e8),
    uptime: Math.floor(Math.random() * 864000 * 100),
    rxPowerBase: -18.5, txPowerBase: 2.5, cpuBase: 15, memUsed: 180,
    clients24: 3, clients5: 2, lastTick: Date.now(),
    history: { rxPower: [], txPower: [], cpu: [], traffic: [], clients: [] },
    anomaly: null, anomalyTimer: 0,
};

// ── Estado da aplicação ───────────────────────────────────────────────────────
const appState = {
    devices: [
        { id: 1, name: 'Home Gateway HG8145X6', ip: '192.168.1.1',  type: 'Router', status: 'online', cpu: 15, memory: 36, temperature: 52, uptime: '0d 00:00:00' },
        { id: 2, name: 'ONU Huawei HG8245Q2',   ip: '192.168.1.2',  type: 'OLT',    status: 'online', cpu: 8,  memory: 22, temperature: 44, onus_active: 1, onus_total: 1 },
        { id: 3, name: 'Switch TP-Link TL-SG',  ip: '192.168.1.10', type: 'Switch', status: 'online', cpu: 5,  memory: 18, temperature: 38, ports_active: 4, ports_total: 8 },
        { id: 4, name: 'Rádio Ubiquiti UAP',    ip: '192.168.1.20', type: 'Radio',  status: 'online', signal: -52, capacity: 574, distance: '0m' },
    ],
    alerts: [
        { id: 1, title: 'Sistema Inicializado',      description: 'SINAPSE Mock Server ativo e conectado', severity: 'info', time: nowStr(), device: 'SINAPSE Node', source: 'system' },
        { id: 2, title: 'Sinal Óptico Estável',      description: 'RxPower: -18.5 dBm — dentro do nominal (-27 a -5 dBm)', severity: 'info', time: nowStr(), device: 'Home Gateway HG8145X6', source: 'snmp' },
        { id: 3, title: 'Clientes Wi-Fi Conectados', description: '5 clientes ativos nas bandas 2.4 GHz e 5 GHz', severity: 'info', time: nowStr(), device: 'Home Gateway HG8145X6', source: 'snmp' },
    ],
    rules: [
        { id: 1, name: 'Sinal Óptico Baixo',     condition: 'RxPower < -24 dBm',       action: 'Alerta Dashboard + Telegram', severity: 'critical', active: true },
        { id: 2, name: 'CPU Alta',                condition: 'CPU > 80% por 5 min',     action: 'Email + Telegram',            severity: 'warning',  active: true },
        { id: 3, name: 'Temperatura Elevada',     condition: 'Temperatura > 70°C',      action: 'Email',                       severity: 'warning',  active: true },
        { id: 4, name: 'Queda de Clientes Wi-Fi', condition: 'Clientes Wi-Fi = 0',      action: 'Alerta Dashboard',            severity: 'warning',  active: true },
        { id: 5, name: 'Anomalia Óptica Crítica', condition: 'RxPower < -27 dBm (ITU)', action: 'SMS + Email + Telegram',      severity: 'critical', active: true },
    ],
    history: [
        { id: 1, event: 'Servidor Mock Iniciado',   device: 'SINAPSE Mock Server',   time: nowStr(), duration: '--', action: 'Boot automático',      user: 'Sistema', type: 'system' },
        { id: 2, event: 'Dispositivos Carregados',  device: 'Home Gateway HG8145X6', time: nowStr(), duration: '--', action: 'Poll SNMP inicial OK', user: 'Sistema', type: 'device' },
        { id: 3, event: 'Regras de Alerta Ativas',  device: 'SINAPSE Node',          time: nowStr(), duration: '--', action: '5 regras carregadas',  user: 'Sistema', type: 'system' },
    ],
    backups:  [],
    settings: {
        nodeName: 'SINAPSE-Node-01', timezone: 'America/Fortaleza (UTC-3)', language: 'Português (Brasil)',
        pollingInterval: '5 minutos', dataRetention: '6 meses', advancedMetrics: true,
        notifyEmail: true, notifyTelegram: true, notifySMS: false,
        email: 'ti@empresa.com', ip: '192.168.1.100', mask: '255.255.255.0',
        gateway: '192.168.1.1', dns1: '8.8.8.8', dns2: '8.8.4.4',
    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function jitter(base, range) { return parseFloat((base + (Math.random() - 0.5) * 2 * range).toFixed(3)); }
function drift(cur, base, speed = 0.05, range = 0.5) { return parseFloat((cur + (base - cur) * speed + (Math.random() - 0.5) * range).toFixed(3)); }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function uptimeToString(t) { const s = Math.floor(t/100); return `${Math.floor(s/86400)}d ${String(Math.floor((s%86400)/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function nowStr() { return new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).replace(',',''); }

// Histórico inicial SNMP
(function() { for (let i = 0; i < 120; i++) { snmpState.history.rxPower.push(jitter(-18.5,0.3)); snmpState.history.txPower.push(jitter(2.5,0.2)); snmpState.history.cpu.push(jitter(15,5)); snmpState.history.traffic.push({ in: jitter(50,30), out: jitter(20,15) }); snmpState.history.clients.push(5); } })();

// ── Tick SNMP ─────────────────────────────────────────────────────────────────
function tick() {
    const now = Date.now(), elapsed = (now - snmpState.lastTick) / 1000;
    snmpState.lastTick = now;
    snmpState.uptime  += Math.floor(elapsed * 100);

    snmpState.anomalyTimer -= elapsed;
    if (snmpState.anomalyTimer <= 0) {
        if (snmpState.anomaly) {
            snmpState.anomaly = null;
            snmpState.anomalyTimer = 120 + Math.random() * 180;
            appState.alerts = appState.alerts.filter(a => a.source !== 'auto');
        } else if (Math.random() < 0.08) {
            const types = ['rxDrop','cpuSpike','clientDrop'];
            snmpState.anomaly = { type: types[Math.floor(Math.random()*types.length)], startedAt: new Date().toISOString() };
            snmpState.anomalyTimer = 15 + Math.random() * 45;
            _triggerAutoAlert(snmpState.anomaly);
        } else { snmpState.anomalyTimer = 20; }
    }

    const rxTarget = snmpState.anomaly?.type === 'rxDrop' ? snmpState.rxPowerBase - (4 + Math.random()*4) : -18.5;
    snmpState.rxPowerBase = drift(snmpState.rxPowerBase, rxTarget, 0.1, 0.15);
    const rxNow = jitter(snmpState.rxPowerBase, 0.2);
    const txNow = jitter(snmpState.txPowerBase, 0.15);

    const cpuTarget = snmpState.anomaly?.type === 'cpuSpike' ? 85 : 15;
    snmpState.cpuBase = clamp(drift(snmpState.cpuBase, cpuTarget, 0.08, 3), 5, 98);
    const cpuNow = Math.round(jitter(snmpState.cpuBase, 4));

    snmpState.memUsed = clamp(drift(snmpState.memUsed, 200, 0.02, 10), 80, 490);

    const inRate  = Math.floor(jitter(6000000, 3000000) * elapsed);
    const outRate = Math.floor(jitter(2000000, 1000000) * elapsed);
    snmpState.ifInOctets    = (snmpState.ifInOctets  + inRate)  % 4294967295;
    snmpState.ifOutOctets   = (snmpState.ifOutOctets + outRate) % 4294967295;
    snmpState.ipInReceives  = (snmpState.ipInReceives  + Math.floor(inRate /1400)) % 4294967295;
    snmpState.ipOutRequests = (snmpState.ipOutRequests + Math.floor(outRate/1400)) % 4294967295;

    if (snmpState.anomaly?.type === 'clientDrop') { snmpState.clients24 = Math.max(0, snmpState.clients24-1); snmpState.clients5 = Math.max(0, snmpState.clients5-1); }
    else { if (Math.random()<0.03) snmpState.clients24 = clamp(snmpState.clients24+(Math.random()>0.5?1:-1),0,20); if (Math.random()<0.03) snmpState.clients5 = clamp(snmpState.clients5+(Math.random()>0.5?1:-1),0,15); }

    const push = (arr,val) => { arr.push(val); if (arr.length > 120) arr.shift(); };
    push(snmpState.history.rxPower, rxNow); push(snmpState.history.txPower, txNow); push(snmpState.history.cpu, cpuNow);
    push(snmpState.history.traffic, { in: parseFloat((inRate/125000).toFixed(2)), out: parseFloat((outRate/125000).toFixed(2)) });
    push(snmpState.history.clients, snmpState.clients24 + snmpState.clients5);

    // Sync métricas no device 1
    appState.devices = appState.devices.map(d => d.id === 1 ? { ...d, cpu: cpuNow, memory: Math.round((snmpState.memUsed/512)*100), temperature: Math.round(jitter(52,2)), uptime: uptimeToString(snmpState.uptime), status: 'online' } : d);

    return { rxNow, txNow, cpuNow, inRate, outRate };
}

function _triggerAutoAlert(anomaly) {
    const map = {
        rxDrop:     { title: 'Degradação Óptica Detectada', description: 'RxPower caindo abaixo do nominal via SNMP', severity: 'critical' },
        cpuSpike:   { title: 'Pico de CPU Detectado',       description: 'CPU acima de 80% — processo intensivo', severity: 'warning' },
        clientDrop: { title: 'Queda de Clientes Wi-Fi',     description: 'Clientes desconectando — possível interferência', severity: 'warning' },
    };
    const info = map[anomaly.type];
    if (!info || appState.alerts.find(a => a.source === 'auto' && a.title === info.title)) return;
    appState.alerts.unshift({ id: Date.now(), ...info, device: 'Home Gateway HG8145X6', time: nowStr(), source: 'auto' });
}

// ── Snapshot SNMP ─────────────────────────────────────────────────────────────
function getSnapshot() {
    const live = tick();
    return {
        timestamp: new Date().toISOString(),
        device: { name: 'Home Gateway HG8145X6', model: 'Huawei EchoLife HG8145X6', firmware: 'V5R020C00SPC220', serial: 'HW-ONU-48A3F2C1', uptime: uptimeToString(snmpState.uptime), uptimeTicks: snmpState.uptime, location: 'Rack Principal — NOC', contact: 'suporte@provedor.com.br' },
        system:  { cpu: live.cpuNow, memUsed: Math.round(snmpState.memUsed), memTotal: 512, memPercent: Math.round((snmpState.memUsed/512)*100), temperature: jitter(52,3) },
        optical: { rxPower: live.rxNow, txPower: live.txNow, rxPowerRaw: Math.round(live.rxNow*100), txPowerRaw: Math.round(live.txNow*100), temperature: jitter(45,2), voltage: jitter(3295,15), status: snmpState.anomaly?.type === 'rxDrop' ? 'degraded' : 'online', thresholds: { rxMin: -27.0, rxMax: -5.0, txMin: 0.5, txMax: 5.0 }, ber: snmpState.anomaly?.type === 'rxDrop' ? parseFloat((Math.random()*1e-4).toExponential(2)) : parseFloat((Math.random()*1e-10).toExponential(2)) },
        interfaces: [
            { index:1, name:'eth0',  descr:'WAN — PON Uplink',         type:'gpon',     speed:'2.5 Gbps',  status:'up',   inOctets:snmpState.ifInOctets, outOctets:snmpState.ifOutOctets, inRate:parseFloat((live.inRate/125000).toFixed(2)), outRate:parseFloat((live.outRate/125000).toFixed(2)), inErrors:Math.floor(Math.random()*5), outErrors:0 },
            { index:2, name:'eth1',  descr:'LAN 1 — GbE',              type:'ethernet', speed:'1 Gbps',    status:Math.random()>0.1?'up':'down', inRate:jitter(30,20), outRate:jitter(15,10) },
            { index:3, name:'eth2',  descr:'LAN 2 — GbE',              type:'ethernet', speed:'1 Gbps',    status:'down', inRate:0, outRate:0 },
            { index:4, name:'wlan0', descr:'Wi-Fi 2.4 GHz (802.11n/ax)',type:'wifi',     speed:'574 Mbps',  status:'up',   inRate:jitter(20,15), outRate:jitter(10,8) },
            { index:5, name:'wlan1', descr:'Wi-Fi 5 GHz (802.11ac/ax)', type:'wifi',     speed:'2402 Mbps', status:'up',   inRate:jitter(60,40), outRate:jitter(25,20) },
        ],
        wifi: {
            band24: { ssid:'PROVEDOR-2G', channel:6,  standard:'802.11n/ax (Wi-Fi 6)',  txPower:20, clients:snmpState.clients24, avgRSSI:jitter(-55,8),  interference:jitter(30,15) },
            band5:  { ssid:'PROVEDOR-5G', channel:36, standard:'802.11ac/ax (Wi-Fi 6)', txPower:23, clients:snmpState.clients5,  avgRSSI:jitter(-50,6),  interference:jitter(15,10) },
        },
        anomaly: snmpState.anomaly ? { ...snmpState.anomaly, description: snmpState.anomaly.type==='rxDrop' ? `Degradação óptica detectada. RxPower: ${live.rxNow} dBm (nominal: -18.5 dBm)` : snmpState.anomaly.type==='cpuSpike' ? `CPU em ${live.cpuNow}% — processo de atualização de tabela ARP/MAC` : `Queda de clientes Wi-Fi — possível interferência de canal`, severity: snmpState.anomaly.type==='rxDrop' ? 'critical' : 'warning' } : null,
        ip: { wan:'189.112.xx.xx', gateway:'189.112.xx.1', dns1:'8.8.8.8', dns2:'1.1.1.1', inPackets:snmpState.ipInReceives, outPackets:snmpState.ipOutRequests },
    };
}

function getHistory() {
    return { timestamp: new Date().toISOString(), points: snmpState.history.rxPower.length, intervalSeconds: 5, rxPower:[...snmpState.history.rxPower], txPower:[...snmpState.history.txPower], cpu:[...snmpState.history.cpu], traffic:[...snmpState.history.traffic], clients:[...snmpState.history.clients] };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
function getDevices()          { return appState.devices; }
function addDevice(d)          { const item={...d,id:Date.now(),status:d.status||'online'}; appState.devices.push(item); _addHistory({event:'Dispositivo Adicionado',device:d.name,duration:'--',action:`IP: ${d.ip}`,user:'admin',type:'device'}); return item; }
function updateDevice(id,f)    { appState.devices=appState.devices.map(d=>d.id===id?{...d,...f}:d); _addHistory({event:'Dispositivo Atualizado',device:f.name||String(id),duration:'--',action:'Edição manual',user:'admin',type:'device'}); return appState.devices.find(d=>d.id===id); }
function removeDevice(id)      { const d=appState.devices.find(x=>x.id===id); appState.devices=appState.devices.filter(d=>d.id!==id); if(d) _addHistory({event:'Dispositivo Removido',device:d.name,duration:'--',action:`IP: ${d.ip}`,user:'admin',type:'device'}); }

function getAlerts()           { return appState.alerts; }
function resolveAlert(id)      { appState.alerts=appState.alerts.map(a=>a.id===id?{...a,severity:'resolved',resolvedAt:nowStr()}:a); }
function ignoreAlert(id)       { appState.alerts=appState.alerts.filter(a=>a.id!==id); }
function addAlert(a)           { const item={...a,id:Date.now(),time:nowStr()}; appState.alerts.unshift(item); return item; }

function getRules()            { return appState.rules; }
function addRule(r)            { const item={...r,id:Date.now(),active:true}; appState.rules.push(item); _addHistory({event:'Regra Criada',device:'SINAPSE Node',duration:'--',action:r.name,user:'admin',type:'system'}); return item; }
function updateRule(id,f)      { appState.rules=appState.rules.map(r=>r.id===id?{...r,...f}:r); return appState.rules.find(r=>r.id===id); }
function toggleRule(id)        { appState.rules=appState.rules.map(r=>r.id===id?{...r,active:!r.active}:r); return appState.rules.find(r=>r.id===id); }
function removeRule(id)        { appState.rules=appState.rules.filter(r=>r.id!==id); }

function getAppHistory()       { return appState.history; }
function _addHistory(item)     { appState.history.unshift({...item,id:Date.now(),time:nowStr()}); }
function addHistory(item)      { _addHistory(item); return appState.history[0]; }

function getBackups()          { return appState.backups; }
function createBackup() {
    const now=new Date(), dateStr=now.toISOString().slice(0,10), timeStr=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const snap={id:Date.now(),filename:`backup-${dateStr}_${timeStr.replace(':','h')}.zip`,date:`${dateStr} ${timeStr}`,size:`${(Math.random()*2+0.5).toFixed(1)} MB`,devices:JSON.parse(JSON.stringify(appState.devices)),alerts:JSON.parse(JSON.stringify(appState.alerts)),rules:JSON.parse(JSON.stringify(appState.rules)),settings:JSON.parse(JSON.stringify(appState.settings)),history:JSON.parse(JSON.stringify(appState.history))};
    appState.backups.unshift(snap); appState.backups=appState.backups.slice(0,10);
    _addHistory({event:'Backup Criado',device:'SINAPSE Node',duration:'--',action:snap.filename,user:'admin',type:'backup'});
    return snap;
}
function restoreBackup(id) {
    const b=appState.backups.find(x=>x.id===id); if(!b) return false;
    appState.devices=b.devices; appState.alerts=b.alerts; appState.rules=b.rules; appState.settings=b.settings;
    _addHistory({event:'Backup Restaurado',device:'SINAPSE Node',duration:'--',action:b.filename,user:'admin',type:'backup'});
    return true;
}
function removeBackup(id)      { appState.backups=appState.backups.filter(b=>b.id!==id); }

function getSettings()         { return appState.settings; }
function saveSettings(s)       { appState.settings={...appState.settings,...s}; _addHistory({event:'Configurações Salvas',device:'SINAPSE Node',duration:'--',action:'Atualização manual',user:'admin',type:'system'}); return appState.settings; }

module.exports = {
    getSnapshot, getHistory, OIDs,
    getDevices, addDevice, updateDevice, removeDevice,
    getAlerts, resolveAlert, ignoreAlert, addAlert,
    getRules, addRule, updateRule, toggleRule, removeRule,
    getAppHistory, addHistory,
    getBackups, createBackup, restoreBackup, removeBackup,
    getSettings, saveSettings,
};