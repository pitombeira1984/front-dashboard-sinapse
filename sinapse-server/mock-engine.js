// ===== ENGINE DE DADOS MOCK — TOPOGRAFIA GPON =====
// Orange Pi (NMS) → POP → OLT → CTO/Splitter 1:8 → 8 ONUs → Clientes
'use strict';

const { OIDs } = require('./oids');

// ── Helpers ───────────────────────────────────────────────────────────────────
function jitter(base, range) { return parseFloat((base + (Math.random() - 0.5) * 2 * range).toFixed(3)); }
function drift(cur, base, speed = 0.05, range = 0.5) { return parseFloat((cur + (base - cur) * speed + (Math.random() - 0.5) * range).toFixed(3)); }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function uptimeToString(t) { const s = Math.floor(t/100); return `${Math.floor(s/86400)}d ${String(Math.floor((s%86400)/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function nowStr() { return new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).replace(',',''); }

// ── Topografia GPON ───────────────────────────────────────────────────────────
const GPON_TOPOLOGY = {
    nms:      { name:'Orange Pi 3B — NMS', ip:'192.168.1.100', role:'NMS', os:'Ubuntu 24.04 LTS' },
    olt:      { id:'OLT-01', name:'OLT Huawei MA5800-X2', ip:'10.0.1.10', model:'MA5800-X2', firmware:'V100R019C10SPC200', serial:'HW-OLT-A3F2C100', port:'0/1/0', maxONUs:128 },
    splitter: { id:'CTO-01', name:'CTO/Splitter 1:8', type:'1x8 SC/APC', location:'Caixa de Emenda — Poste 42', loss:3.5 },
};

// ── 8 ONUs — perfis realistas (sinal diminui com distância) ───────────────────
const ONU_PROFILES = [
    { id:1, client:'João Silva',     apt:'Apto 101', serial:'HW-ONU-A1B2C301', ip:'10.0.1.101', model:'HG8245Q2', distance:0.3, rxBase:-17.2 },
    { id:2, client:'Maria Oliveira', apt:'Apto 102', serial:'HW-ONU-A1B2C302', ip:'10.0.1.102', model:'HG8245Q2', distance:0.5, rxBase:-18.1 },
    { id:3, client:'Carlos Santos',  apt:'Apto 103', serial:'HW-ONU-A1B2C303', ip:'10.0.1.103', model:'HG8245Q2', distance:0.7, rxBase:-19.3 },
    { id:4, client:'Ana Costa',      apt:'Apto 201', serial:'HW-ONU-A1B2C304', ip:'10.0.1.104', model:'HG8245Q2', distance:0.9, rxBase:-20.5 },
    { id:5, client:'Pedro Ferreira', apt:'Apto 202', serial:'HW-ONU-A1B2C305', ip:'10.0.1.105', model:'HG8245Q2', distance:1.1, rxBase:-21.8 },
    { id:6, client:'Lucia Mendes',   apt:'Apto 203', serial:'HW-ONU-A1B2C306', ip:'10.0.1.106', model:'HG8245Q2', distance:1.3, rxBase:-22.4 },
    { id:7, client:'Roberto Lima',   apt:'Apto 204', serial:'HW-ONU-A1B2C307', ip:'10.0.1.107', model:'HG8245Q2', distance:1.5, rxBase:-23.1 },
    { id:8, client:'Fernanda Rocha', apt:'Apto 301', serial:'HW-ONU-A1B2C308', ip:'10.0.1.108', model:'HG8245Q2', distance:1.8, rxBase:-24.2 },
];

// ── Estado dinâmico das ONUs ──────────────────────────────────────────────────
const onuState = ONU_PROFILES.map(p => ({
    ...p,
    status:          'online',
    rxPower:         p.rxBase,
    txPower:         2.5,
    latency:         parseFloat((5 + p.distance * 3).toFixed(1)),
    uptimeTicks:     Math.floor(Math.random() * 864000 * 100),
    offlineTimer:    0,
    offlineCooldown: Math.random() * 60, // stagger inicial
    degraded:        false,
    lastSeen:        nowStr(),
    history: {
        rxPower: Array.from({length:120}, () => jitter(p.rxBase, 0.4)),
        latency: Array.from({length:120}, () => jitter(5 + p.distance * 3, 1.5)),
    },
}));

// ── Estado SNMP da OLT ────────────────────────────────────────────────────────
const snmpState = {
    ifInOctets:    Math.floor(Math.random() * 1e10),
    ifOutOctets:   Math.floor(Math.random() * 5e9),
    ipInReceives:  Math.floor(Math.random() * 5e8),
    ipOutRequests: Math.floor(Math.random() * 5e8),
    uptime:        Math.floor(Math.random() * 864000 * 100) + 864000 * 200,
    cpuBase:       12,
    memUsed:       230,
    lastTick:      Date.now(),
    history: { rxPowerAvg:[], latencyAvg:[], traffic:[], onusOnline:[] },
    anomaly: null, anomalyTimer: 0,
};

// Histórico inicial
(function() {
    const avgRx  = ONU_PROFILES.reduce((s,p) => s + p.rxBase, 0) / ONU_PROFILES.length;
    const avgLat = ONU_PROFILES.reduce((s,p) => s + (5 + p.distance*3), 0) / ONU_PROFILES.length;
    for (let i = 0; i < 120; i++) {
        snmpState.history.rxPowerAvg.push(jitter(avgRx, 0.3));
        snmpState.history.latencyAvg.push(jitter(avgLat, 1.5));
        snmpState.history.traffic.push({ in:jitter(150,60), out:jitter(50,25) });
        snmpState.history.onusOnline.push(8);
    }
})();

// ── Estado da aplicação ───────────────────────────────────────────────────────
const appState = {
    devices: [
        { id:100, name:'OLT Huawei MA5800-X2', ip:'10.0.1.10', type:'OLT', status:'online', cpu:12, memory:45, temperature:48, onus_active:8, onus_total:8, firmware:'V100R019C10SPC200', uptime:'0d 00:00:00' },
        ...ONU_PROFILES.map(p => ({
            id:p.id, name:`ONU — ${p.apt}`, client:p.client, apt:p.apt,
            ip:p.ip, serial:p.serial, model:p.model, type:'ONU',
            status:'online', rxPower:p.rxBase, txPower:2.5,
            latency:parseFloat((5+p.distance*3).toFixed(1)),
            distance:`${p.distance} km`, uptime:'0d 00:00:00',
            port:`0/1/0:${p.id-1}`,
        })),
    ],
    alerts: [
        { id:1, title:'Sistema GPON Inicializado', description:'OLT MA5800-X2 ativa — 8 ONUs monitoradas', severity:'info', time:nowStr(), device:'OLT-01', source:'system' },
    ],
    rules: [
        { id:1, name:'ONU Offline',          condition:'ONU status = offline',          action:'Alerta Dashboard + Telegram', severity:'critical', active:true },
        { id:2, name:'Sinal Óptico Crítico', condition:'RxPower < -27 dBm (ITU G.984)', action:'SMS + Email + Telegram',      severity:'critical', active:true },
        { id:3, name:'Sinal Óptico Baixo',   condition:'RxPower < -24 dBm',             action:'Alerta Dashboard + Telegram', severity:'warning',  active:true },
        { id:4, name:'Latência Alta',        condition:'Latência > 50ms por 5 min',     action:'Email + Telegram',            severity:'warning',  active:true },
        { id:5, name:'CPU OLT Alta',         condition:'CPU OLT > 80%',                 action:'Email',                       severity:'warning',  active:true },
    ],
    history: [
        { id:1, event:'OLT MA5800-X2 Online',  device:'OLT-01',          time:nowStr(), duration:'--', action:'Boot automático',            user:'Sistema', type:'system' },
        { id:2, event:'8 ONUs Registradas',    device:'OLT-01 / CTO-01', time:nowStr(), duration:'--', action:'Descoberta GPON automática',  user:'Sistema', type:'device' },
        { id:3, event:'Topografia Carregada',  device:'SINAPSE Node',    time:nowStr(), duration:'--', action:'NMS → POP → OLT → CTO → ONUs', user:'Sistema', type:'system' },
    ],
    backups: [],
    settings: {
        nodeName:'SINAPSE-Node-01', timezone:'America/Fortaleza (UTC-3)', language:'Português (Brasil)',
        pollingInterval:'5 minutos', dataRetention:'6 meses', advancedMetrics:true,
        notifyEmail:true, notifyTelegram:true, notifySMS:false,
        email:'ti@provedor.com.br', ip:'192.168.1.100', mask:'255.255.255.0',
        gateway:'192.168.1.1', dns1:'8.8.8.8', dns2:'8.8.4.4',
    },
};

// ── Tick das ONUs ─────────────────────────────────────────────────────────────
function tickONUs(elapsed) {
    let onlineCount = 0;
    onuState.forEach(onu => {
        onu.uptimeTicks += Math.floor(elapsed * 100);

        if (onu.offlineTimer > 0) {
            onu.offlineTimer -= elapsed;
            if (onu.offlineTimer <= 0) {
                onu.status = 'online';
                onu.offlineTimer = 0;
                onu.offlineCooldown = 30 + Math.random() * 60;
                onu.lastSeen = nowStr();
                _triggerAutoAlert({ type:'onuOnline', onu });
            }
        } else {
            const offlineCount = onuState.filter(o => o.status === 'offline').length;
            if (onu.status === 'online' && onu.offlineCooldown <= 0 && offlineCount < 2 && Math.random() < 0.012) {
                onu.status = 'offline';
                onu.offlineTimer = 15 + Math.random() * 25;
                onu.lastSeen = nowStr();
                _triggerAutoAlert({ type:'onuOffline', onu });
            }
            if (onu.offlineCooldown > 0) onu.offlineCooldown -= elapsed;
        }

        if (onu.status === 'online') {
            onlineCount++;
            // Degradação óptica ocasional — simula sujeira no conector ou curvatura de fibra
            const degradeChance = Math.random();
            const targetRx = degradeChance < 0.04
                ? onu.rxBase - (4 + Math.random() * 4)   // degradação severa: -4 a -8 dBm extra
                : degradeChance < 0.10
                ? onu.rxBase - (1 + Math.random() * 2)   // degradação leve: -1 a -3 dBm extra
                : onu.rxBase;                              // nominal
            onu.rxPower = clamp(drift(onu.rxPower, targetRx, 0.12, 0.25 + onu.distance * 0.1), -30, -10);
            onu.latency  = parseFloat(clamp(jitter(5 + onu.distance * 3, 1.5), 2, 80).toFixed(1));
            onu.degraded = onu.rxPower < -24;
            const push = (arr, val) => { arr.push(val); if (arr.length > 120) arr.shift(); };
            push(onu.history.rxPower, onu.rxPower);
            push(onu.history.latency, onu.latency);
        }
    });
    return onlineCount;
}

// ── Tick principal ────────────────────────────────────────────────────────────
function tick() {
    const now = Date.now(), elapsed = (now - snmpState.lastTick) / 1000;
    snmpState.lastTick = now;
    snmpState.uptime  += Math.floor(elapsed * 100);

    snmpState.anomalyTimer -= elapsed;
    if (snmpState.anomalyTimer <= 0) {
        if (snmpState.anomaly) { snmpState.anomaly = null; snmpState.anomalyTimer = 120 + Math.random()*180; }
        else if (Math.random() < 0.04) { snmpState.anomaly = { type:'cpuSpike', startedAt:new Date().toISOString() }; snmpState.anomalyTimer = 15 + Math.random()*30; }
        else { snmpState.anomalyTimer = 30; }
    }

    const cpuTarget = snmpState.anomaly?.type === 'cpuSpike' ? 88 + Math.random() * 10 : 12;
    snmpState.cpuBase = clamp(drift(snmpState.cpuBase, cpuTarget, 0.08, 3), 5, 95);
    const cpuNow = Math.round(jitter(snmpState.cpuBase, 3));
    snmpState.memUsed = clamp(drift(snmpState.memUsed, 230, 0.02, 8), 150, 500);

    const onusOnline = tickONUs(elapsed);
    const onlineONUs = onuState.filter(o => o.status === 'online');
    const avgRxPower = onlineONUs.length > 0 ? parseFloat((onlineONUs.reduce((s,o) => s+o.rxPower,0)/onlineONUs.length).toFixed(2)) : -25;
    const avgLatency = onlineONUs.length > 0 ? parseFloat((onlineONUs.reduce((s,o) => s+o.latency,0)/onlineONUs.length).toFixed(1)) : 50;

    const inRate  = Math.floor(jitter(15000000,8000000) * elapsed * (onusOnline/8));
    const outRate = Math.floor(jitter(5000000, 3000000) * elapsed * (onusOnline/8));
    snmpState.ifInOctets    = (snmpState.ifInOctets  + inRate)  % 4294967295;
    snmpState.ifOutOctets   = (snmpState.ifOutOctets + outRate) % 4294967295;
    snmpState.ipInReceives  = (snmpState.ipInReceives  + Math.floor(inRate /1400)) % 4294967295;
    snmpState.ipOutRequests = (snmpState.ipOutRequests + Math.floor(outRate/1400)) % 4294967295;

    const push = (arr,val) => { arr.push(val); if (arr.length > 120) arr.shift(); };
    push(snmpState.history.rxPowerAvg, avgRxPower);
    push(snmpState.history.latencyAvg, avgLatency);
    push(snmpState.history.traffic, { in:parseFloat((inRate/125000).toFixed(2)), out:parseFloat((outRate/125000).toFixed(2)) });
    push(snmpState.history.onusOnline, onusOnline);

    // Sync devices
    const oltDev = appState.devices.find(d => d.id === 100);
    if (oltDev) { oltDev.cpu=cpuNow; oltDev.memory=Math.round((snmpState.memUsed/512)*100); oltDev.temperature=Math.round(jitter(48,2)); oltDev.uptime=uptimeToString(snmpState.uptime); oltDev.onus_active=onusOnline; }
    onuState.forEach(onu => {
        const dev = appState.devices.find(d => d.id === onu.id);
        if (dev) { dev.status=onu.status; dev.rxPower=onu.rxPower; dev.txPower=onu.txPower; dev.latency=onu.latency; dev.uptime=uptimeToString(onu.uptimeTicks); }
    });

    return { cpuNow, inRate, outRate, onusOnline, avgRxPower, avgLatency };
}

function _triggerAutoAlert(event) {
    if (event.type === 'onuOffline') {
        const title = `ONU Offline — ${event.onu.apt}`;
        if (appState.alerts.find(a => a.title === title && a.severity !== 'resolved')) return;
        appState.alerts.unshift({ id:Date.now(), title, source:'auto', description:`${event.onu.client} • ${event.onu.ip} • Porta 0/1/0:${event.onu.id-1}`, severity:'critical', time:nowStr(), device:'OLT-01' });
    }
    if (event.type === 'onuOnline') {
        appState.alerts = appState.alerts.map(a => a.title === `ONU Offline — ${event.onu.apt}` ? {...a, severity:'resolved', resolvedAt:nowStr()} : a);
    }
}

// ── Snapshot ──────────────────────────────────────────────────────────────────
function getSnapshot() {
    const live = tick();
    const avail = parseFloat(((live.onusOnline / 8) * 100).toFixed(2));
    return {
        timestamp: new Date().toISOString(),
        topology: {
            nms:      GPON_TOPOLOGY.nms,
            olt:      { ...GPON_TOPOLOGY.olt, cpu:live.cpuNow, memory:Math.round((snmpState.memUsed/512)*100), uptime:uptimeToString(snmpState.uptime) },
            splitter: GPON_TOPOLOGY.splitter,
            onus:     onuState.map(o => ({ id:o.id, apt:o.apt, client:o.client, serial:o.serial, ip:o.ip, model:o.model, port:`0/1/0:${o.id-1}`, status:o.status, rxPower:o.rxPower, txPower:o.txPower, latency:o.latency, distance:`${o.distance} km`, uptime:uptimeToString(o.uptimeTicks), degraded:o.degraded, lastSeen:o.lastSeen })),
        },
        device: { name:'OLT Huawei MA5800-X2', model:'MA5800-X2', firmware:GPON_TOPOLOGY.olt.firmware, serial:GPON_TOPOLOGY.olt.serial, uptime:uptimeToString(snmpState.uptime), uptimeTicks:snmpState.uptime, location:'POP — Av. Principal, 1234', contact:'ti@provedor.com.br' },
        system:  { cpu:live.cpuNow, memUsed:Math.round(snmpState.memUsed), memTotal:512, memPercent:Math.round((snmpState.memUsed/512)*100), temperature:jitter(48,2) },
        optical: { rxPower:live.avgRxPower, txPower:jitter(2.5,0.15), rxPowerRaw:Math.round(live.avgRxPower*100), txPowerRaw:250, temperature:jitter(45,2), voltage:jitter(3295,15), status:live.onusOnline>=6?'online':live.onusOnline>=4?'degraded':'critical', thresholds:{rxMin:-27,rxMax:-5,txMin:0.5,txMax:5}, ber:parseFloat((Math.random()*1e-10).toExponential(2)) },
        gpon:    { onusOnline:live.onusOnline, onusTotal:8, onusOffline:8-live.onusOnline, avgRxPower:live.avgRxPower, avgLatency:live.avgLatency, availability:avail, splitterLoss:GPON_TOPOLOGY.splitter.loss },
        interfaces: [
            { index:1, name:'gpon0/1/0', descr:'GPON Uplink — OLT Porta 0/1/0', type:'gpon', speed:'2.5 Gbps', status:'up', inOctets:snmpState.ifInOctets, outOctets:snmpState.ifOutOctets, inRate:parseFloat((live.inRate/125000).toFixed(2)), outRate:parseFloat((live.outRate/125000).toFixed(2)), inErrors:0, outErrors:0 },
            { index:2, name:'ge0/0/0',   descr:'Uplink GbE — Core Router',       type:'ethernet', speed:'1 Gbps', status:'up', inRate:jitter(80,40), outRate:jitter(30,15) },
        ],
        anomaly: snmpState.anomaly ? { ...snmpState.anomaly, description:`CPU OLT em ${live.cpuNow}% — atualização de tabela MAC`, severity:'warning' } : null,
        ip: { wan:'189.112.xx.xx', gateway:'189.112.xx.1', dns1:'8.8.8.8', dns2:'1.1.1.1', inPackets:snmpState.ipInReceives, outPackets:snmpState.ipOutRequests },
        wifi: { band24:{clients:0}, band5:{clients:0} },
    };
}

function getHistory() {
    return {
        timestamp:       new Date().toISOString(),
        points:          snmpState.history.rxPowerAvg.length,
        intervalSeconds: 5,
        rxPower:         [...snmpState.history.rxPowerAvg],
        latency:         [...snmpState.history.latencyAvg],
        traffic:         [...snmpState.history.traffic],
        onusOnline:      [...snmpState.history.onusOnline],
        onuRxHistory:    onuState.map(o => ({ id:o.id, apt:o.apt, client:o.client, current:o.rxPower, history:[...o.history.rxPower] })),
    };
}

function getONUs() {
    return onuState.map(o => ({ id:o.id, apt:o.apt, client:o.client, serial:o.serial, ip:o.ip, model:o.model, port:`0/1/0:${o.id-1}`, status:o.status, rxPower:o.rxPower, txPower:o.txPower, latency:o.latency, distance:`${o.distance} km`, uptime:uptimeToString(o.uptimeTicks), degraded:o.degraded, lastSeen:o.lastSeen }));
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
function getDevices()       { return appState.devices; }
function addDevice(d)       { const item={...d,id:Date.now(),status:d.status||'online'}; appState.devices.push(item); _addHistory({event:'Dispositivo Adicionado',device:d.name,duration:'--',action:`IP: ${d.ip}`,user:'admin',type:'device'}); return item; }
function updateDevice(id,f) { appState.devices=appState.devices.map(d=>d.id===id?{...d,...f}:d); return appState.devices.find(d=>d.id===id); }
function removeDevice(id)   { const d=appState.devices.find(x=>x.id===id); appState.devices=appState.devices.filter(d=>d.id!==id); if(d) _addHistory({event:'Dispositivo Removido',device:d.name,duration:'--',action:`IP: ${d.ip}`,user:'admin',type:'device'}); }
function getAlerts()        { return appState.alerts; }
function resolveAlert(id)   { appState.alerts=appState.alerts.map(a=>a.id===id?{...a,severity:'resolved',resolvedAt:nowStr()}:a); }
function ignoreAlert(id)    { appState.alerts=appState.alerts.filter(a=>a.id!==id); }
function addAlert(a)        { const item={...a,id:Date.now(),time:nowStr()}; appState.alerts.unshift(item); return item; }
function getRules()         { return appState.rules; }
function addRule(r)         { const item={...r,id:Date.now(),active:true}; appState.rules.push(item); return item; }
function updateRule(id,f)   { appState.rules=appState.rules.map(r=>r.id===id?{...r,...f}:r); return appState.rules.find(r=>r.id===id); }
function toggleRule(id)     { appState.rules=appState.rules.map(r=>r.id===id?{...r,active:!r.active}:r); return appState.rules.find(r=>r.id===id); }
function removeRule(id)     { appState.rules=appState.rules.filter(r=>r.id!==id); }
function getAppHistory()    { return appState.history; }
function _addHistory(item)  { appState.history.unshift({...item,id:Date.now(),time:nowStr()}); }
function addHistory(item)   { _addHistory(item); return appState.history[0]; }
function getBackups()       { return appState.backups; }
function createBackup() {
    const now=new Date(), dateStr=now.toISOString().slice(0,10), timeStr=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const snap={id:Date.now(),filename:`backup-${dateStr}_${timeStr.replace(':','h')}.zip`,date:`${dateStr} ${timeStr}`,size:`${(Math.random()*2+0.5).toFixed(1)} MB`,devices:JSON.parse(JSON.stringify(appState.devices)),alerts:JSON.parse(JSON.stringify(appState.alerts)),rules:JSON.parse(JSON.stringify(appState.rules)),settings:JSON.parse(JSON.stringify(appState.settings)),history:JSON.parse(JSON.stringify(appState.history))};
    appState.backups.unshift(snap); appState.backups=appState.backups.slice(0,10);
    _addHistory({event:'Backup Criado',device:'SINAPSE Node',duration:'--',action:snap.filename,user:'admin',type:'backup'});
    return snap;
}
function restoreBackup(id)  { const b=appState.backups.find(x=>x.id===id); if(!b) return false; appState.devices=b.devices; appState.alerts=b.alerts; appState.rules=b.rules; appState.settings=b.settings; return true; }
function removeBackup(id)   { appState.backups=appState.backups.filter(b=>b.id!==id); }
function getSettings()      { return appState.settings; }
function saveSettings(s)    { appState.settings={...appState.settings,...s}; return appState.settings; }

module.exports = {
    getSnapshot, getHistory, getONUs, OIDs, GPON_TOPOLOGY,
    getDevices, addDevice, updateDevice, removeDevice,
    getAlerts, resolveAlert, ignoreAlert, addAlert,
    getRules, addRule, updateRule, toggleRule, removeRule,
    getAppHistory, addHistory,
    getBackups, createBackup, restoreBackup, removeBackup,
    getSettings, saveSettings,
};