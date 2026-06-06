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

// ── Tabela de OLTs do provedor ────────────────────────────────────────────────
const OLTS = [
    { id:'OLT-01', name:'OLT-01', ip:'10.0.1.10', model:'MA5800-X2',  vendor:'Huawei', capacity:2500,  location:'POP Central',      maxONUs:128 },
    { id:'OLT-02', name:'OLT-02', ip:'10.0.2.10', model:'ZXA10 C600', vendor:'ZTE',    capacity:2500,  location:'POP Bairro Norte',  maxONUs:128 },
    { id:'OLT-03', name:'OLT-03', ip:'10.0.3.10', model:'7360 FX-4',  vendor:'Nokia',  capacity:10000, location:'POP Bairro Sul',    maxONUs:256 },
];

// ── Portas GPON disponíveis (todas as OLTs) ───────────────────────────────────
const GPON_PORTS = [
    // OLT-01
    { id:'0/1/0', oltId:'OLT-01', name:'OLT-01 / GPON 0/1/0', description:'Bloco A — Andares 1 e 2', maxONUs:8 },
    { id:'0/1/1', oltId:'OLT-01', name:'OLT-01 / GPON 0/1/1', description:'Bloco A — Andares 2 e 3', maxONUs:8 },
    { id:'0/1/2', oltId:'OLT-01', name:'OLT-01 / GPON 0/1/2', description:'Bloco B',                  maxONUs:8 },
    { id:'0/1/3', oltId:'OLT-01', name:'OLT-01 / GPON 0/1/3', description:'Bloco C (reserva)',         maxONUs:8 },
    // OLT-02
    { id:'0/2/0', oltId:'OLT-02', name:'OLT-02 / GPON 0/2/0', description:'Zona Norte — Setor 1',     maxONUs:8 },
    { id:'0/2/1', oltId:'OLT-02', name:'OLT-02 / GPON 0/2/1', description:'Zona Norte — Setor 2',     maxONUs:8 },
    // OLT-03
    { id:'0/3/0', oltId:'OLT-03', name:'OLT-03 / GPON 0/3/0', description:'Zona Sul — Setor 1',       maxONUs:8 },
    { id:'0/3/1', oltId:'OLT-03', name:'OLT-03 / GPON 0/3/1', description:'Zona Sul — Setor 2',       maxONUs:8 },
];

// ── ONUs — distribuídas entre as 3 OLTs ──────────────────────────────────────
const ONU_PROFILES = [
    // OLT-01
    { id:1, client:'João Silva',                     apt:'Apto 101',  serial:'HW-ONU-A1B2C301', ip:'10.0.1.101', model:'HG8245Q2',  distance:0.3, rxBase:-17.2, gponPort:'0/1/0', portSlot:0 },
    { id:2, client:'Maria Oliveira',                 apt:'Apto 102',  serial:'HW-ONU-A1B2C302', ip:'10.0.1.102', model:'HG8245Q2',  distance:0.5, rxBase:-18.1, gponPort:'0/1/0', portSlot:1 },
    { id:3, client:'Carlos Santos Consultoria Ltda.',apt:'Apto 103',  serial:'HW-ONU-A1B2C303', ip:'10.0.1.103', model:'HG8245Q2',  distance:0.7, rxBase:-19.3, gponPort:'0/1/0', portSlot:2 },
    { id:4, client:'Ana Costa',                      apt:'Apto 201',  serial:'HW-ONU-A1B2C304', ip:'10.0.1.104', model:'HG8245Q2',  distance:0.9, rxBase:-20.5, gponPort:'0/1/0', portSlot:3 },
    { id:5, client:'Clínica Saúde Vida',             apt:'Apto 202',  serial:'HW-ONU-A1B2C305', ip:'10.0.1.105', model:'HG8245Q2',  distance:1.1, rxBase:-21.8, gponPort:'0/1/1', portSlot:0 },
    { id:6, client:'Centro de Ensino Avançado',      apt:'Apto 203',  serial:'HW-ONU-A1B2C306', ip:'10.0.1.106', model:'HG8245Q2',  distance:1.3, rxBase:-22.4, gponPort:'0/1/1', portSlot:1 },
    { id:7, client:'Roberto Lima',                   apt:'Apto 204',  serial:'HW-ONU-A1B2C307', ip:'10.0.1.107', model:'HG8245Q2',  distance:1.5, rxBase:-23.1, gponPort:'0/1/1', portSlot:2 },
    { id:8, client:'Fernanda Rocha',                 apt:'Apto 301',  serial:'HW-ONU-A1B2C308', ip:'10.0.1.108', model:'HG8245Q2',  distance:1.8, rxBase:-24.2, gponPort:'0/1/2', portSlot:0 },
    // OLT-02
    { id:9,  client:'Lucas Ferreira',                apt:'Casa 01',   serial:'ZTE-ONU-B1C2D301', ip:'10.0.2.101', model:'F660',     distance:0.4, rxBase:-17.5, gponPort:'0/2/0', portSlot:0 },
    { id:10, client:'Beatriz Santos',                apt:'Casa 02',   serial:'ZTE-ONU-B1C2D302', ip:'10.0.2.102', model:'F660',     distance:0.6, rxBase:-18.8, gponPort:'0/2/0', portSlot:1 },
    { id:11, client:'Marcelo Gomes',                 apt:'Apto 201',  serial:'ZTE-ONU-B1C2D303', ip:'10.0.2.103', model:'F660',     distance:0.9, rxBase:-20.2, gponPort:'0/2/0', portSlot:2 },
    { id:12, client:'Provedor Norte Ltda.',           apt:'Sala 01',   serial:'ZTE-ONU-B1C2D304', ip:'10.0.2.104', model:'F660',     distance:1.1, rxBase:-21.4, gponPort:'0/2/1', portSlot:0 },
    { id:13, client:'Sirlene Cavalcante',             apt:'Apto 305',  serial:'ZTE-ONU-B1C2D305', ip:'10.0.2.105', model:'F660',     distance:1.3, rxBase:-22.6, gponPort:'0/2/1', portSlot:1 },
    // OLT-03
    { id:14, client:'Hospital Regional',              apt:'Ala A',     serial:'NOK-ONU-C1D2E301', ip:'10.0.3.101', model:'G-010G-T', distance:0.5, rxBase:-16.8, gponPort:'0/3/0', portSlot:0 },
    { id:15, client:'Prefeitura Municipal',           apt:'Setor TI',  serial:'NOK-ONU-C1D2E302', ip:'10.0.3.102', model:'G-010G-T', distance:0.7, rxBase:-18.3, gponPort:'0/3/0', portSlot:1 },
    { id:16, client:'TechCenter Sul',                 apt:'Sala 302',  serial:'NOK-ONU-C1D2E303', ip:'10.0.3.103', model:'G-010G-T', distance:1.0, rxBase:-20.1, gponPort:'0/3/0', portSlot:2 },
    { id:17, client:'Escola Estadual Norte',          apt:'Bloco B',   serial:'NOK-ONU-C1D2E304', ip:'10.0.3.104', model:'G-010G-T', distance:1.2, rxBase:-21.5, gponPort:'0/3/1', portSlot:0 },
    { id:18, client:'Supermercado Alfa',              apt:'Caixa TI',  serial:'NOK-ONU-C1D2E305', ip:'10.0.3.105', model:'G-010G-T', distance:1.4, rxBase:-22.9, gponPort:'0/3/1', portSlot:1 },
];

// ── Estado dinâmico das ONUs ──────────────────────────────────────────────────
const onuState = ONU_PROFILES.map(p => ({
    ...p,
    status:          'online',
    rxPower:         p.rxBase,
    txPower:         2.5,
    sfpTemp:         parseFloat(jitter(45, 3).toFixed(1)),
    sfpVoltage:      parseFloat(jitter(3.3, 0.05).toFixed(3)),
    ber:             parseFloat((Math.random() * 5e-11).toFixed(15)),
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
    // Banda por OLT: índice 0=OLT-01 (sincronizado), 1=OLT-02, 2=OLT-03 (simulados)
    olts: [
        { inRate:150, outRate:55  },
        { inRate:280, outRate:95  },
        { inRate:620, outRate:210 },
    ],
};

// Histórico inicial (baseado apenas nas ONUs da OLT-01 para os KPIs principais)
const OLT01_PROFILES = ONU_PROFILES.filter(p => p.gponPort.startsWith('0/1/'));
(function() {
    const avgRx  = OLT01_PROFILES.reduce((s,p) => s + p.rxBase, 0) / OLT01_PROFILES.length;
    const avgLat = OLT01_PROFILES.reduce((s,p) => s + (5 + p.distance*3), 0) / OLT01_PROFILES.length;
    for (let i = 0; i < 120; i++) {
        snmpState.history.rxPowerAvg.push(jitter(avgRx, 0.3));
        snmpState.history.latencyAvg.push(jitter(avgLat, 1.5));
        snmpState.history.traffic.push({ in:jitter(150,60), out:jitter(50,25) });
        snmpState.history.onusOnline.push(OLT01_PROFILES.length);
    }
})();

// ── Estado da aplicação ───────────────────────────────────────────────────────
const appState = {
    devices: [
        { id:100, name:'OLT-01 — MA5800-X2',  ip:'10.0.1.10', type:'OLT', status:'online', cpu:12, memory:45, temperature:48, onus_active:8, onus_total:8,  vendor:'Huawei', location:'POP Central',     firmware:'V100R019C10SPC200', uptime:'0d 00:00:00' },
        { id:200, name:'OLT-02 — ZXA10 C600', ip:'10.0.2.10', type:'OLT', status:'online', cpu:8,  memory:38, temperature:45, onus_active:5, onus_total:5,  vendor:'ZTE',    location:'POP Bairro Norte', firmware:'V1.2.3',             uptime:'0d 00:00:00' },
        { id:300, name:'OLT-03 — 7360 FX-4',  ip:'10.0.3.10', type:'OLT', status:'online', cpu:15, memory:52, temperature:51, onus_active:5, onus_total:5,  vendor:'Nokia',  location:'POP Bairro Sul',   firmware:'FP4R1.2.1',          uptime:'0d 00:00:00' },
        ...ONU_PROFILES.map(p => ({
            id:p.id, name:`ONU — ${p.apt}`, client:p.client, apt:p.apt,
            ip:p.ip, serial:p.serial, model:p.model, type:'ONU',
            status:'online', rxPower:p.rxBase, txPower:2.5,
            latency:parseFloat((5+p.distance*3).toFixed(1)),
            distance:`${p.distance} km`, uptime:'0d 00:00:00',
            gponPort:p.gponPort, port:`${p.gponPort}:${p.portSlot}`,
        })),
    ],
    alerts: [
        { id:1, title:'Sistema GPON Inicializado', description:`3 OLTs ativas — ${ONU_PROFILES.length} ONUs monitoradas`, severity:'info', time:nowStr(), device:'SINAPSE-NMS', source:'system' },
    ],
    rules: [
        { id:1, name:'ONU Offline',          condition:'ONU status = offline',          action:'Alerta Dashboard + Telegram', severity:'critical', active:true },
        { id:2, name:'Sinal Óptico Crítico', condition:'RxPower < -27 dBm (ITU G.984)', action:'SMS + Email + Telegram',      severity:'critical', active:true },
        { id:3, name:'Sinal Óptico Baixo',   condition:'RxPower < -24 dBm',             action:'Alerta Dashboard + Telegram', severity:'warning',  active:true },
        { id:4, name:'Latência Alta',        condition:'Latência > 50ms por 5 min',     action:'Email + Telegram',            severity:'warning',  active:true },
        { id:5, name:'CPU OLT Alta',         condition:'CPU OLT > 80%',                 action:'Email',                       severity:'warning',  active:true },
    ],
    history: [
        { id:1, event:'OLT-01 MA5800-X2 Online', device:'OLT-01', time:nowStr(), duration:'--', action:'Boot automático',           user:'Sistema', type:'system' },
        { id:2, event:'OLT-02 ZXA10 C600 Online',device:'OLT-02', time:nowStr(), duration:'--', action:'Boot automático',           user:'Sistema', type:'system' },
        { id:3, event:'OLT-03 7360 FX-4 Online', device:'OLT-03', time:nowStr(), duration:'--', action:'Boot automático',           user:'Sistema', type:'system' },
        { id:4, event:`${ONU_PROFILES.length} ONUs Registradas`, device:'SINAPSE-NMS', time:nowStr(), duration:'--', action:'Descoberta GPON — 3 OLTs', user:'Sistema', type:'device' },
        { id:5, event:'Topografia Carregada',    device:'SINAPSE Node', time:nowStr(), duration:'--', action:'NMS → 3 POPs → 3 OLTs → ONUs', user:'Sistema', type:'system' },
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
            // TxPower varia suavemente em torno de 2.5 dBm (faixa normal GPON: 0.5–5 dBm)
            onu.txPower = parseFloat(clamp(drift(onu.txPower, 2.5, 0.05, 0.08), 0.5, 5.0).toFixed(2));
            // Temperatura do módulo SFP/GBIC — base 45°C, spikes ocasionais de carga
            const tempSpike = Math.random() < 0.03 ? 15 + Math.random() * 15 : 0;
            onu.sfpTemp = parseFloat(clamp(drift(onu.sfpTemp, 45 + tempSpike, 0.08, 0.5), 25, 85).toFixed(1));
            // Tensão de alimentação do módulo SFP — base 3.3V, faixa normal 3.1–3.5V
            onu.sfpVoltage = parseFloat(clamp(drift(onu.sfpVoltage, 3.3, 0.05, 0.003), 2.8, 3.8).toFixed(3));
            // BER — normalmente < 1e-10; spikes ocasionais simulam ruído de fibra
            const berSpike = Math.random() < 0.04 ? Math.random() * 1e-7 : 0;
            onu.ber = parseFloat(Math.max(0, drift(onu.ber, 1e-11 + berSpike, 0.1, 5e-12)).toExponential(2));
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

    const olt01Total  = onuState.filter(o => o.gponPort.startsWith('0/1/')).length;
    const olt01Online = onuState.filter(o => o.gponPort.startsWith('0/1/') && o.status === 'online').length;
    const inRate  = Math.floor(jitter(15000000,8000000) * elapsed * (olt01Online / Math.max(olt01Total, 1)));
    const outRate = Math.floor(jitter(5000000, 3000000) * elapsed * (olt01Online / Math.max(olt01Total, 1)));
    snmpState.ifInOctets    = (snmpState.ifInOctets  + inRate)  % 4294967295;
    snmpState.ifOutOctets   = (snmpState.ifOutOctets + outRate) % 4294967295;
    snmpState.ipInReceives  = (snmpState.ipInReceives  + Math.floor(inRate /1400)) % 4294967295;
    snmpState.ipOutRequests = (snmpState.ipOutRequests + Math.floor(outRate/1400)) % 4294967295;

    // Sincronizar OLT-01 com tráfego real (só atualiza com elapsed real > 0.5s para evitar zero)
    if (elapsed > 0.5) {
        snmpState.olts[0].inRate  = parseFloat((inRate  / 125000).toFixed(2));
        snmpState.olts[0].outRate = parseFloat((outRate / 125000).toFixed(2));
    }
    snmpState.olts[1].inRate  = parseFloat(clamp(drift(snmpState.olts[1].inRate,  280, 0.05, 30), 10, 2450).toFixed(2));
    snmpState.olts[1].outRate = parseFloat(clamp(drift(snmpState.olts[1].outRate,  95, 0.05, 15),  5, 2450).toFixed(2));
    snmpState.olts[2].inRate  = parseFloat(clamp(drift(snmpState.olts[2].inRate,  620, 0.05, 80), 10, 9950).toFixed(2));
    snmpState.olts[2].outRate = parseFloat(clamp(drift(snmpState.olts[2].outRate, 210, 0.05, 40),  5, 9950).toFixed(2));

    const push = (arr,val) => { arr.push(val); if (arr.length > 120) arr.shift(); };
    push(snmpState.history.rxPowerAvg, avgRxPower);
    push(snmpState.history.latencyAvg, avgLatency);
    push(snmpState.history.traffic, { in:parseFloat((inRate/125000).toFixed(2)), out:parseFloat((outRate/125000).toFixed(2)) });
    push(snmpState.history.onusOnline, onusOnline);

    // Sync devices
    const oltDev = appState.devices.find(d => d.id === 100);
    if (oltDev) { oltDev.cpu=cpuNow; oltDev.memory=Math.round((snmpState.memUsed/512)*100); oltDev.temperature=Math.round(jitter(48,2)); oltDev.uptime=uptimeToString(snmpState.uptime); oltDev.onus_active=olt01Online; oltDev.onus_total=olt01Total; }
    onuState.forEach(onu => {
        const dev = appState.devices.find(d => d.id === onu.id);
        if (dev) { dev.status=onu.status; dev.rxPower=onu.rxPower; dev.txPower=onu.txPower; dev.sfpTemp=onu.sfpTemp; dev.sfpVoltage=onu.sfpVoltage; dev.ber=onu.ber; dev.latency=onu.latency; dev.uptime=uptimeToString(onu.uptimeTicks); }
    });

    return { cpuNow, inRate, outRate, onusOnline, avgRxPower, avgLatency };
}

function _triggerAutoAlert(event) {
    if (event.type === 'onuOffline') {
        const title = `ONU Offline — ${event.onu.apt}`;
        if (appState.alerts.find(a => a.title === title && a.severity !== 'resolved')) return;
        appState.alerts.unshift({ id:Date.now(), title, source:'auto', description:`${event.onu.client} • ${event.onu.ip} • Porta ${event.onu.gponPort}:${event.onu.portSlot}`, severity:'critical', time:nowStr(), device:'OLT-01' });
    }
    if (event.type === 'onuOnline') {
        appState.alerts = appState.alerts.map(a => a.title === `ONU Offline — ${event.onu.apt}` ? {...a, severity:'resolved', resolvedAt:nowStr()} : a);
    }
}

// ── Snapshot ──────────────────────────────────────────────────────────────────
function getOLTsBandwidth() {
    return OLTS.map((olt, i) => {
        const inRate  = snmpState.olts[i].inRate;
        const outRate = snmpState.olts[i].outRate;
        return {
            id:       olt.id,
            name:     olt.name,
            model:    olt.model,
            ip:       olt.ip,
            capacity: olt.capacity,
            location: olt.location,
            vendor:   olt.vendor,
            inRate,
            outRate,
            inPct:  parseFloat((inRate  / olt.capacity * 100).toFixed(1)),
            outPct: parseFloat((outRate / olt.capacity * 100).toFixed(1)),
        };
    });
}

function getSnapshot() {
    const live = tick();
    const olt01Total  = onuState.filter(o => o.gponPort.startsWith('0/1/')).length;
    const avail = parseFloat(((live.onusOnline / onuState.length) * 100).toFixed(2));
    return {
        timestamp: new Date().toISOString(),
        topology: {
            nms:      GPON_TOPOLOGY.nms,
            olt:      { ...GPON_TOPOLOGY.olt, cpu:live.cpuNow, memory:Math.round((snmpState.memUsed/512)*100), uptime:uptimeToString(snmpState.uptime) },
            splitter: GPON_TOPOLOGY.splitter,
            onus:     onuState.map(o => ({ id:o.id, apt:o.apt, client:o.client, serial:o.serial, ip:o.ip, model:o.model, gponPort:o.gponPort, port:`${o.gponPort}:${o.portSlot}`, status:o.status, rxPower:o.rxPower, txPower:o.txPower, sfpTemp:o.sfpTemp, sfpVoltage:o.sfpVoltage, ber:o.ber, latency:o.latency, distance:`${o.distance} km`, uptime:uptimeToString(o.uptimeTicks), degraded:o.degraded, lastSeen:o.lastSeen })),
        },
        device: { name:'OLT Huawei MA5800-X2', model:'MA5800-X2', firmware:GPON_TOPOLOGY.olt.firmware, serial:GPON_TOPOLOGY.olt.serial, uptime:uptimeToString(snmpState.uptime), uptimeTicks:snmpState.uptime, location:'POP — Av. Principal, 1234', contact:'ti@provedor.com.br' },
        system:  { cpu:live.cpuNow, memUsed:Math.round(snmpState.memUsed), memTotal:512, memPercent:Math.round((snmpState.memUsed/512)*100), temperature:jitter(48,2) },
        optical: { rxPower:live.avgRxPower, txPower:jitter(2.5,0.15), rxPowerRaw:Math.round(live.avgRxPower*100), txPowerRaw:250, temperature:jitter(45,2), voltage:jitter(3295,15), status:live.onusOnline>=6?'online':live.onusOnline>=4?'degraded':'critical', thresholds:{rxMin:-27,rxMax:-5,txMin:0.5,txMax:5}, ber:parseFloat((Math.random()*1e-10).toExponential(2)) },
        gpon:    { onusOnline:live.onusOnline, onusTotal:onuState.length, onusOffline:onuState.length-live.onusOnline, avgRxPower:live.avgRxPower, avgLatency:live.avgLatency, availability:avail, splitterLoss:GPON_TOPOLOGY.splitter.loss },
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

function getONUs(port) {
    const all = onuState.map(o => ({ id:o.id, apt:o.apt, client:o.client, serial:o.serial, ip:o.ip, model:o.model, gponPort:o.gponPort, port:`${o.gponPort}:${o.portSlot}`, status:o.status, rxPower:o.rxPower, txPower:o.txPower, sfpTemp:o.sfpTemp, sfpVoltage:o.sfpVoltage, ber:o.ber, latency:o.latency, distance:`${o.distance} km`, uptime:uptimeToString(o.uptimeTicks), degraded:o.degraded, lastSeen:o.lastSeen }));
    return port ? all.filter(o => o.gponPort === port) : all;
}

function getGponPorts() {
    const byPort = {};
    onuState.forEach(o => {
        const p = o.gponPort;
        if (!byPort[p]) byPort[p] = { online:0, total:0, rxSum:0, rxCount:0, latSum:0, latCount:0 };
        byPort[p].total++;
        if (o.status === 'online') {
            byPort[p].online++;
            byPort[p].rxSum  += o.rxPower;
            byPort[p].rxCount++;
            byPort[p].latSum  += o.latency;
            byPort[p].latCount++;
        }
    });
    return GPON_PORTS.map(p => {
        const s = byPort[p.id] || { online:0, total:0, rxSum:0, rxCount:0, latSum:0, latCount:0 };
        return {
            ...p,
            onusOnline:  s.online,
            onusTotal:   s.total,
            avgRxPower:  s.rxCount  ? parseFloat((s.rxSum  / s.rxCount).toFixed(2)) : null,
            avgLatency:  s.latCount ? parseFloat((s.latSum / s.latCount).toFixed(1)) : null,
        };
    });
}

// ── Cadastro de Clientes ──────────────────────────────────────────────────────
const CLIENT_PROFILES = [
    { id:1, onuId:1,  nome:'João Silva',                   tipo_documento:'cpf',  documento:'123.456.789-01',   telefone:'(85) 9 9801-1011', email:'joao.silva@email.com',       endereco:{ rua:'Av. Senador Virgílio Távora', numero:'1234', complemento:'Apto 101',            bairro:'Aldeota', cidade:'Fortaleza', estado:'CE', cep:'60170-251' }, localizacao:{ lat:-3.7372, lng:-38.5120 }, criticidade:'comum',      categoria:'Residencial', plano:'100 Mbps',  data_instalacao:'15/03/2023', contrato:'CTR-2023-001' },
    { id:2, onuId:2,  nome:'Maria Oliveira',               tipo_documento:'cpf',  documento:'234.567.890-12',   telefone:'(85) 9 9802-1012', email:'maria.oliveira@email.com',   endereco:{ rua:'Av. Senador Virgílio Távora', numero:'1234', complemento:'Apto 102',            bairro:'Aldeota', cidade:'Fortaleza', estado:'CE', cep:'60170-251' }, localizacao:{ lat:-3.7374, lng:-38.5118 }, criticidade:'comum',      categoria:'Residencial', plano:'200 Mbps',  data_instalacao:'20/04/2023', contrato:'CTR-2023-002' },
    { id:3, onuId:3,  nome:'Carlos Santos Consultoria Ltda.', tipo_documento:'cnpj', documento:'12.345.678/0001-90', telefone:'(85) 3301-1234', email:'ti@carlossantos.com.br',  endereco:{ rua:'Av. Senador Virgílio Távora', numero:'1234', complemento:'Apto 103 — Escritório', bairro:'Aldeota', cidade:'Fortaleza', estado:'CE', cep:'60170-251' }, localizacao:{ lat:-3.7376, lng:-38.5116 }, criticidade:'prioritário', categoria:'Empresa',     plano:'500 Mbps',  data_instalacao:'10/11/2022', contrato:'CTR-2022-003' },
    { id:4, onuId:4,  nome:'Ana Costa',                    tipo_documento:'cpf',  documento:'345.678.901-23',   telefone:'(85) 9 9804-1014', email:'ana.costa@email.com',        endereco:{ rua:'Av. Senador Virgílio Távora', numero:'1234', complemento:'Apto 201',            bairro:'Aldeota', cidade:'Fortaleza', estado:'CE', cep:'60170-251' }, localizacao:{ lat:-3.7378, lng:-38.5114 }, criticidade:'comum',      categoria:'Residencial', plano:'100 Mbps',  data_instalacao:'01/06/2023', contrato:'CTR-2023-004' },
    { id:5, onuId:5,  nome:'Clínica Saúde Vida',           tipo_documento:'cnpj', documento:'23.456.789/0001-01', telefone:'(85) 3302-5050', email:'contato@saudevida.med.br',   endereco:{ rua:'Av. Senador Virgílio Távora', numero:'1234', complemento:'Apto 202 — Clínica',  bairro:'Aldeota', cidade:'Fortaleza', estado:'CE', cep:'60170-251' }, localizacao:{ lat:-3.7380, lng:-38.5112 }, criticidade:'crítico',    categoria:'Saúde',       plano:'1 Gbps',    data_instalacao:'23/05/2022', contrato:'CTR-2022-005' },
    { id:6, onuId:6,  nome:'Centro de Ensino Avançado',    tipo_documento:'cnpj', documento:'34.567.890/0001-12', telefone:'(85) 3303-6060', email:'ti@ensinoavancado.edu.br',    endereco:{ rua:'Av. Senador Virgílio Távora', numero:'1234', complemento:'Apto 203 — Instituto', bairro:'Aldeota', cidade:'Fortaleza', estado:'CE', cep:'60170-251' }, localizacao:{ lat:-3.7382, lng:-38.5110 }, criticidade:'crítico',    categoria:'Educação',    plano:'500 Mbps',  data_instalacao:'14/07/2022', contrato:'CTR-2022-006' },
    { id:7, onuId:7,  nome:'Roberto Lima',                 tipo_documento:'cpf',  documento:'456.789.012-34',   telefone:'(85) 9 9807-1017', email:'roberto.lima@email.com',     endereco:{ rua:'Av. Senador Virgílio Távora', numero:'1234', complemento:'Apto 204',            bairro:'Aldeota', cidade:'Fortaleza', estado:'CE', cep:'60170-251' }, localizacao:{ lat:-3.7384, lng:-38.5108 }, criticidade:'comum',      categoria:'Residencial', plano:'300 Mbps',  data_instalacao:'30/09/2023', contrato:'CTR-2023-007' },
    { id:8, onuId:8,  nome:'Fernanda Rocha',               tipo_documento:'cpf',  documento:'567.890.123-45',   telefone:'(85) 9 9808-1018', email:'fernanda.rocha@email.com',   endereco:{ rua:'Av. Senador Virgílio Távora', numero:'1234', complemento:'Apto 301',            bairro:'Aldeota', cidade:'Fortaleza', estado:'CE', cep:'60170-251' }, localizacao:{ lat:-3.7386, lng:-38.5106 }, criticidade:'comum',      categoria:'Residencial', plano:'100 Mbps',  data_instalacao:'08/01/2024', contrato:'CTR-2024-008' },
];

function getClients()      { return CLIENT_PROFILES; }
function getClientById(id) { return CLIENT_PROFILES.find(c => c.id === parseInt(id)) || null; }

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
function restoreBackup(id)  { const b=appState.backups.find(x=>x.id===id); if(!b) return false; appState.devices=b.devices; appState.alerts=b.alerts; appState.rules=b.rules; appState.settings=b.settings; if(b.history) appState.history=b.history; return true; }
function removeBackup(id)   { appState.backups=appState.backups.filter(b=>b.id!==id); }
function getSettings()      { return appState.settings; }
function saveSettings(s)    { appState.settings={...appState.settings,...s}; return appState.settings; }

module.exports = {
    getSnapshot, getHistory, getONUs, getGponPorts, getOLTsBandwidth,
    OIDs, GPON_TOPOLOGY, GPON_PORTS, OLTS,
    getDevices, addDevice, updateDevice, removeDevice,
    getAlerts, resolveAlert, ignoreAlert, addAlert,
    getRules, addRule, updateRule, toggleRule, removeRule,
    getAppHistory, addHistory,
    getBackups, createBackup, restoreBackup, removeBackup,
    getSettings, saveSettings,
    getClients, getClientById,
};