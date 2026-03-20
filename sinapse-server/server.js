// ===== SINAPSE MOCK SERVER =====
// Servidor Express que expõe uma API REST simulando respostas SNMP reais
// de um Home Gateway / ONU com fibra óptica (Wi-Fi 6).
//
// Quando o Orange Pi chegar, este servidor será substituído por um
// agente SNMP real — o frontend não precisará de nenhuma alteração.
//
// Endpoints:
//   GET /api/status          → status do servidor
//   GET /api/device          → snapshot completo do dispositivo (poll único)
//   GET /api/device/history  → histórico dos últimos 120 pontos (~10 min)
//   GET /api/device/optical  → apenas dados ópticos GPON
//   GET /api/device/system   → apenas CPU / memória / uptime
//   GET /api/device/wifi     → apenas dados Wi-Fi
//   GET /api/device/interfaces→ apenas interfaces de rede
//   GET /api/alerts          → alertas ativos gerados automaticamente
//   GET /api/metrics/live    → métricas mínimas para atualização em tempo real
//   GET /api/oids            → lista de OIDs utilizados (documentação)

'use strict';

const express      = require('express');
const cors         = require('cors');
const { getSnapshot, getHistory, OIDs } = require('./mock-engine');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Log de requests
app.use((req, _res, next) => {
    console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${req.method} ${req.path}`);
    next();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function send(res, data) {
    res.json({ ok: true, ...data });
}

// Cache do último snapshot (evita re-gerar a cada sub-rota)
let lastSnapshot   = null;
let lastSnapshotAt = 0;

function getCachedSnapshot() {
    const now = Date.now();
    // Regenerar a cada 2 segundos no máximo
    if (!lastSnapshot || now - lastSnapshotAt > 2000) {
        lastSnapshot   = getSnapshot();
        lastSnapshotAt = now;
    }
    return lastSnapshot;
}

// ── Rotas ─────────────────────────────────────────────────────────────────────

// Status do servidor
app.get('/api/status', (_req, res) => {
    send(res, {
        server:    'SINAPSE Mock Server',
        version:   '1.0.0',
        mode:      'mock',
        uptime:    process.uptime(),
        timestamp: new Date().toISOString(),
        message:   'Servidor mock ativo. Substitua mock-engine.js por snmp-engine.js quando o Orange Pi estiver disponível.',
    });
});

// Snapshot completo
app.get('/api/device', (_req, res) => {
    send(res, { data: getCachedSnapshot() });
});

// Dados ópticos GPON
app.get('/api/device/optical', (_req, res) => {
    const { optical, device } = getCachedSnapshot();
    send(res, { device: device.name, data: optical });
});

// CPU, Memória, Uptime
app.get('/api/device/system', (_req, res) => {
    const { system, device } = getCachedSnapshot();
    send(res, { device: device.name, data: system });
});

// Wi-Fi
app.get('/api/device/wifi', (_req, res) => {
    const { wifi, device } = getCachedSnapshot();
    send(res, { device: device.name, data: wifi });
});

// Interfaces
app.get('/api/device/interfaces', (_req, res) => {
    const { interfaces, device } = getCachedSnapshot();
    send(res, { device: device.name, data: interfaces });
});

// Histórico para gráficos
app.get('/api/device/history', (_req, res) => {
    send(res, { data: getHistory() });
});

// Métricas mínimas para polling rápido (frontend atualiza a cada 5s)
app.get('/api/metrics/live', (_req, res) => {
    const snap = getCachedSnapshot();
    send(res, {
        data: {
            timestamp:   snap.timestamp,
            cpu:         snap.system.cpu,
            memPercent:  snap.system.memPercent,
            temperature: snap.system.temperature,
            rxPower:     snap.optical.rxPower,
            txPower:     snap.optical.txPower,
            opticalStatus: snap.optical.status,
            wanInRate:   snap.interfaces[0]?.inRate  || 0,
            wanOutRate:  snap.interfaces[0]?.outRate || 0,
            wifiClients: snap.wifi.band24.clients + snap.wifi.band5.clients,
            uptime:      snap.device.uptime,
            anomaly:     snap.anomaly,
        }
    });
});

// Alertas gerados automaticamente a partir das métricas
app.get('/api/alerts', (_req, res) => {
    const snap   = getCachedSnapshot();
    const alerts = [];

    // Alerta de sinal óptico baixo
    if (snap.optical.rxPower < snap.optical.thresholds.rxMin + 3) {
        alerts.push({
            id:          `optical-rx-${Date.now()}`,
            severity:    snap.optical.rxPower < snap.optical.thresholds.rxMin ? 'critical' : 'warning',
            title:       'Sinal Óptico Baixo',
            description: `RxPower: ${snap.optical.rxPower} dBm (mínimo: ${snap.optical.thresholds.rxMin} dBm)`,
            device:      snap.device.name,
            oid:         OIDs.gpon.onuRxPower,
            value:       snap.optical.rxPowerRaw,
            time:        new Date().toLocaleString('pt-BR'),
        });
    }

    // Alerta de CPU alta
    if (snap.system.cpu > 80) {
        alerts.push({
            id:          `cpu-${Date.now()}`,
            severity:    snap.system.cpu > 90 ? 'critical' : 'warning',
            title:       'CPU Elevada',
            description: `CPU em ${snap.system.cpu}%`,
            device:      snap.device.name,
            oid:         OIDs.host.hrProcessorLoad,
            value:       snap.system.cpu,
            time:        new Date().toLocaleString('pt-BR'),
        });
    }

    // Alerta de temperatura
    if (snap.system.temperature > 70) {
        alerts.push({
            id:          `temp-${Date.now()}`,
            severity:    'warning',
            title:       'Temperatura Elevada',
            description: `Sistema em ${snap.system.temperature.toFixed(1)}°C`,
            device:      snap.device.name,
            oid:         OIDs.gpon.onuTemperature,
            value:       Math.round(snap.system.temperature * 256),
            time:        new Date().toLocaleString('pt-BR'),
        });
    }

    // Anomalia ativa
    if (snap.anomaly) {
        alerts.push({
            id:          `anomaly-${snap.anomaly.startedAt}`,
            severity:    snap.anomaly.severity,
            title:       'Anomalia Detectada',
            description: snap.anomaly.description,
            device:      snap.device.name,
            time:        new Date().toLocaleString('pt-BR'),
        });
    }

    send(res, { count: alerts.length, data: alerts });
});

// Lista de OIDs utilizados
app.get('/api/oids', (_req, res) => {
    send(res, { data: OIDs });
});

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        ok:      false,
        error:   'Endpoint não encontrado',
        path:    req.path,
        available: [
            'GET /api/status',
            'GET /api/device',
            'GET /api/device/optical',
            'GET /api/device/system',
            'GET /api/device/wifi',
            'GET /api/device/interfaces',
            'GET /api/device/history',
            'GET /api/metrics/live',
            'GET /api/alerts',
            'GET /api/oids',
        ]
    });
});

// ── Iniciar ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║         SINAPSE — Mock SNMP Server               ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Rodando em:  http://localhost:${PORT}               ║`);
    console.log('║  Modo:        Mock (dados simulados)             ║');
    console.log('║  Dispositivo: Huawei HG8145X6 (ONU Wi-Fi 6)     ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  Endpoints disponíveis:                          ║');
    console.log('║  /api/status          → Status do servidor       ║');
    console.log('║  /api/device          → Snapshot completo        ║');
    console.log('║  /api/device/optical  → Dados ópticos GPON       ║');
    console.log('║  /api/device/system   → CPU / Memória / Uptime   ║');
    console.log('║  /api/device/wifi     → Wi-Fi 2.4 e 5 GHz        ║');
    console.log('║  /api/metrics/live    → Poll rápido (5s)         ║');
    console.log('║  /api/alerts          → Alertas automáticos      ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
});