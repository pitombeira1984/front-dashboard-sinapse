// ===== ENGINE DE DADOS MOCK =====
// Simula leituras SNMP reais de um Home Gateway / ONU fibra óptica.
// Os valores derivam suavemente ao longo do tempo, com picos e anomalias
// ocasionais — comportamento idêntico ao de um equipamento real.

const { OIDs } = require('./oids');

// ── Estado interno persistente entre polls ──────────────────────────────────
const state = {
    // Contadores de tráfego (crescem continuamente como em equipamento real)
    ifInOctets:   Math.floor(Math.random() * 1e10),
    ifOutOctets:  Math.floor(Math.random() * 5e9),
    ipInReceives: Math.floor(Math.random() * 5e8),
    ipOutRequests:Math.floor(Math.random() * 5e8),

    // Uptime em centésimos de segundo (cresce 100/s)
    uptime: Math.floor(Math.random() * 864000 * 100),

    // Sinais ópticos base (variam levemente)
    rxPowerBase: -18.5,   // dBm — valor típico ONU com boa fibra
    txPowerBase:  2.5,    // dBm — potência de transmissão ONU

    // CPU e Memória
    cpuBase: 15,
    memUsed: 180,   // MB

    // Wi-Fi
    clients24: 3,
    clients5:  2,

    // Timestamp do último ciclo
    lastTick: Date.now(),

    // Histórico dos últimos 120 pontos (10 min a 5s/ponto) para sparklines
    history: {
        rxPower:   [],
        txPower:   [],
        cpu:       [],
        traffic:   [],
        clients:   [],
    },

    // Anomalia ativa (null ou objeto descrevendo o problema)
    anomaly: null,
    anomalyTimer: 0,
};

// Inicializar histórico com 120 pontos realistas
function initHistory() {
    for (let i = 0; i < 120; i++) {
        state.history.rxPower.push(jitter(state.rxPowerBase, 0.3));
        state.history.txPower.push(jitter(state.txPowerBase, 0.2));
        state.history.cpu.push(jitter(state.cpuBase, 5));
        state.history.traffic.push({ in: jitter(50, 30), out: jitter(20, 15) });
        state.history.clients.push(state.clients24 + state.clients5);
    }
}
initHistory();

// ── Funções auxiliares ──────────────────────────────────────────────────────
function jitter(base, range) {
    return parseFloat((base + (Math.random() - 0.5) * 2 * range).toFixed(3));
}

function drift(current, base, speed = 0.05, range = 0.5) {
    // Deriva gradualmente em direção à base, com pequeno ruído
    const delta = (base - current) * speed + (Math.random() - 0.5) * range;
    return parseFloat((current + delta).toFixed(3));
}

function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
}

function uptimeToString(ticks) {
    const totalSec = Math.floor(ticks / 100);
    const days  = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins  = Math.floor((totalSec % 3600) / 60);
    const secs  = totalSec % 60;
    return `${days}d ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

// ── Ciclo de atualização ────────────────────────────────────────────────────
function tick() {
    const now     = Date.now();
    const elapsed = (now - state.lastTick) / 1000; // segundos
    state.lastTick = now;

    // Uptime cresce
    state.uptime += Math.floor(elapsed * 100);

    // ── Anomalia ocasional (simula degradação óptica real) ──────────────────
    state.anomalyTimer -= elapsed;
    if (state.anomalyTimer <= 0) {
        if (state.anomaly) {
            // Recuperação
            state.anomaly = null;
            state.anomalyTimer = 120 + Math.random() * 180; // próxima em 2-5 min
        } else if (Math.random() < 0.08) {
            // 8% de chance de disparar anomalia em cada ciclo sem anomalia
            const types = ['rxDrop', 'cpuSpike', 'clientDrop'];
            state.anomaly = { type: types[Math.floor(Math.random() * types.length)], startedAt: new Date().toISOString() };
            state.anomalyTimer = 15 + Math.random() * 45; // dura 15-60s
        } else {
            state.anomalyTimer = 20;
        }
    }

    // ── Sinal óptico RX ─────────────────────────────────────────────────────
    const rxTarget = state.anomaly?.type === 'rxDrop'
        ? state.rxPowerBase - (4 + Math.random() * 4)  // degradação: -4 a -8 dBm extra
        : state.rxPowerBase;
    state.rxPowerBase = drift(state.rxPowerBase, rxTarget, 0.1, 0.15);
    const rxNow = jitter(state.rxPowerBase, 0.2);

    // ── Sinal óptico TX ─────────────────────────────────────────────────────
    const txNow = jitter(state.txPowerBase, 0.15);

    // ── CPU ─────────────────────────────────────────────────────────────────
    const cpuTarget = state.anomaly?.type === 'cpuSpike' ? 85 : state.cpuBase;
    state.cpuBase = drift(state.cpuBase, cpuTarget, 0.08, 3);
    state.cpuBase = clamp(state.cpuBase, 5, 98);
    const cpuNow = Math.round(jitter(state.cpuBase, 4));

    // ── Memória ─────────────────────────────────────────────────────────────
    state.memUsed = drift(state.memUsed, 200, 0.02, 10);
    state.memUsed = clamp(state.memUsed, 80, 490);

    // ── Tráfego (bytes acumulados) ───────────────────────────────────────────
    const inRate  = Math.floor(jitter(6000000, 3000000) * elapsed); // ~6 MB/s base
    const outRate = Math.floor(jitter(2000000, 1000000) * elapsed);
    state.ifInOctets    = (state.ifInOctets  + inRate)  % 4294967295; // wrap 32-bit
    state.ifOutOctets   = (state.ifOutOctets + outRate) % 4294967295;
    state.ipInReceives  = (state.ipInReceives  + Math.floor(inRate  / 1400)) % 4294967295;
    state.ipOutRequests = (state.ipOutRequests + Math.floor(outRate / 1400)) % 4294967295;

    // ── Wi-Fi Clientes ───────────────────────────────────────────────────────
    if (state.anomaly?.type === 'clientDrop') {
        state.clients24 = Math.max(0, state.clients24 - 1);
        state.clients5  = Math.max(0, state.clients5  - 1);
    } else {
        if (Math.random() < 0.03) state.clients24 = clamp(state.clients24 + (Math.random() > 0.5 ? 1 : -1), 0, 20);
        if (Math.random() < 0.03) state.clients5  = clamp(state.clients5  + (Math.random() > 0.5 ? 1 : -1), 0, 15);
    }

    // ── Atualizar histórico (circular, mantém 120 pontos) ───────────────────
    const push = (arr, val) => { arr.push(val); if (arr.length > 120) arr.shift(); };
    push(state.history.rxPower,  rxNow);
    push(state.history.txPower,  txNow);
    push(state.history.cpu,      cpuNow);
    push(state.history.traffic,  { in: parseFloat((inRate / 125000).toFixed(2)), out: parseFloat((outRate / 125000).toFixed(2)) });
    push(state.history.clients,  state.clients24 + state.clients5);

    return {
        rxPower:    rxNow,
        txPower:    txNow,
        cpu:        cpuNow,
        memUsed:    Math.round(state.memUsed),
        inRate:     parseFloat((inRate / 125000).toFixed(2)),   // Mbps
        outRate:    parseFloat((outRate / 125000).toFixed(2)),  // Mbps
        clients24:  state.clients24,
        clients5:   state.clients5,
        ifInOctets: state.ifInOctets,
        ifOutOctets:state.ifOutOctets,
        uptime:     state.uptime,
        uptimeStr:  uptimeToString(state.uptime),
        anomaly:    state.anomaly,
    };
}

// ── Snapshot completo (retornado pela API /api/device) ───────────────────────
function getSnapshot() {
    const live = tick();

    return {
        timestamp: new Date().toISOString(),
        device: {
            // Informações do sistema (sysDescr, sysName)
            name:        'Home Gateway HG8145X6',
            model:       'Huawei EchoLife HG8145X6',
            firmware:    'V5R020C00SPC220',
            serial:      'HW-ONU-48A3F2C1',
            uptime:      live.uptimeStr,
            uptimeTicks: state.uptime,
            location:    'Rack Principal — NOC',
            contact:     'suporte@provedor.com.br',
        },

        // ── Métricas do sistema ──────────────────────────────────────────────
        system: {
            cpu:        live.cpu,           // %
            memUsed:    live.memUsed,       // MB
            memTotal:   512,                // MB
            memPercent: Math.round((live.memUsed / 512) * 100),
            temperature:jitter(52, 3),      // °C — temperatura interna
        },

        // ── Óptica GPON ──────────────────────────────────────────────────────
        optical: {
            rxPower:         live.rxPower,                              // dBm
            txPower:         live.txPower,                              // dBm
            rxPowerRaw:      Math.round(live.rxPower * 100),            // valor SNMP bruto
            txPowerRaw:      Math.round(live.txPower * 100),            // valor SNMP bruto
            temperature:     jitter(45, 2),                             // °C transceptor
            voltage:         jitter(3295, 15),                          // mV
            status:          live.anomaly?.type === 'rxDrop' ? 'degraded' : 'online',
            // Limites de alarme conforme ITU-T G.984 / G.987
            thresholds: {
                rxMin: -27.0,   // dBm — abaixo disso: alarme crítico
                rxMax:  -5.0,   // dBm — acima disso: saturação
                txMin:  0.5,    // dBm
                txMax:  5.0,    // dBm
            },
            ber: live.anomaly?.type === 'rxDrop'
                ? parseFloat((Math.random() * 1e-4).toExponential(2))
                : parseFloat((Math.random() * 1e-10).toExponential(2)),
        },

        // ── Interfaces de rede ───────────────────────────────────────────────
        interfaces: [
            {
                index:     1,
                name:      'eth0',
                descr:     'WAN — PON Uplink',
                type:      'gpon',
                speed:     '2.5 Gbps',
                status:    'up',
                inOctets:  state.ifInOctets,
                outOctets: state.ifOutOctets,
                inRate:    live.inRate,   // Mbps atual
                outRate:   live.outRate,  // Mbps atual
                inErrors:  Math.floor(Math.random() * 5),
                outErrors: 0,
            },
            {
                index:  2,
                name:   'eth1',
                descr:  'LAN 1 — GbE',
                type:   'ethernet',
                speed:  '1 Gbps',
                status: Math.random() > 0.1 ? 'up' : 'down',
                inRate:  jitter(30, 20),
                outRate: jitter(15, 10),
            },
            {
                index:  3,
                name:   'eth2',
                descr:  'LAN 2 — GbE',
                type:   'ethernet',
                speed:  '1 Gbps',
                status: 'down',
                inRate:  0,
                outRate: 0,
            },
            {
                index:  4,
                name:   'wlan0',
                descr:  'Wi-Fi 2.4 GHz (802.11n/ax)',
                type:   'wifi',
                speed:  '574 Mbps',
                status: 'up',
                inRate:  jitter(20, 15),
                outRate: jitter(10, 8),
            },
            {
                index:  5,
                name:   'wlan1',
                descr:  'Wi-Fi 5 GHz (802.11ac/ax)',
                type:   'wifi',
                speed:  '2402 Mbps',
                status: 'up',
                inRate:  jitter(60, 40),
                outRate: jitter(25, 20),
            },
        ],

        // ── Wi-Fi ────────────────────────────────────────────────────────────
        wifi: {
            band24: {
                ssid:        'PROVEDOR-2G',
                channel:     6,
                standard:    '802.11n/ax (Wi-Fi 6)',
                txPower:     20,   // dBm
                clients:     live.clients24,
                avgRSSI:     jitter(-55, 8),   // dBm
                interference:jitter(30, 15),   // %
            },
            band5: {
                ssid:        'PROVEDOR-5G',
                channel:     36,
                standard:    '802.11ac/ax (Wi-Fi 6)',
                txPower:     23,
                clients:     live.clients5,
                avgRSSI:     jitter(-50, 6),
                interference:jitter(15, 10),
            },
        },

        // ── Anomalia ativa (se houver) ───────────────────────────────────────
        anomaly: live.anomaly ? {
            ...live.anomaly,
            description: live.anomaly.type === 'rxDrop'
                ? `Degradação óptica detectada. RxPower: ${live.rxPower} dBm (nominal: -18.5 dBm)`
                : live.anomaly.type === 'cpuSpike'
                ? `CPU em ${live.cpu}% — processo de atualização de tabela ARP/MAC`
                : `Queda de clientes Wi-Fi — possível interferência de canal`,
            severity: live.anomaly.type === 'rxDrop' ? 'critical' : 'warning',
        } : null,

        // ── IP ───────────────────────────────────────────────────────────────
        ip: {
            wan:     '189.112.xx.xx',
            gateway: '189.112.xx.1',
            dns1:    '8.8.8.8',
            dns2:    '1.1.1.1',
            inPackets:  state.ipInReceives,
            outPackets: state.ipOutRequests,
        },
    };
}

// ── Histórico (para gráficos) ────────────────────────────────────────────────
function getHistory() {
    return {
        timestamp: new Date().toISOString(),
        points:    state.history.rxPower.length,
        intervalSeconds: 5,
        rxPower:   [...state.history.rxPower],
        txPower:   [...state.history.txPower],
        cpu:       [...state.history.cpu],
        traffic:   [...state.history.traffic],
        clients:   [...state.history.clients],
    };
}

module.exports = { getSnapshot, getHistory, OIDs };