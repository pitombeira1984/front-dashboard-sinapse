// ===== SINAPSE — TRAP ENGINE =====
// Módulo responsável por gerar, armazenar e expor SNMP Traps simulados.
//
// Tipos suportados (conforme RFC 1157 + MIBs proprietários):
//   coldStart          — OID 1.3.6.1.6.3.1.1.5.1
//   warmStart          — OID 1.3.6.1.6.3.1.1.5.2
//   linkDown           — OID 1.3.6.1.6.3.1.1.5.3
//   linkUp             — OID 1.3.6.1.6.3.1.1.5.4
//   authenticationFail — OID 1.3.6.1.6.3.1.1.5.5
//   opticalDegradation — OID 1.3.6.1.4.1.2011.6.128.1.1.2.51 (Huawei)
//   highTemperature    — OID 1.3.6.1.4.1.2011.6.128.1.1.2.52 (Huawei)
//   highCPU            — OID 1.3.6.1.2.1.25.3.3.1.2

'use strict';

// ── Catálogo de tipos de Trap ─────────────────────────────────────────────────
const TRAP_TYPES = {
    coldStart: {
        oid:         '1.3.6.1.6.3.1.1.5.1',
        name:        'coldStart',
        label:       'Cold Start',
        description: 'Equipamento inicializou do zero (cold boot)',
        severity:    'warning',
        icon:        'fa-power-off',
        rfc:         'RFC 1157 — Generic Trap 0',
    },
    warmStart: {
        oid:         '1.3.6.1.6.3.1.1.5.2',
        name:        'warmStart',
        label:       'Warm Start',
        description: 'Equipamento reiniciou sem perda de configuração',
        severity:    'info',
        icon:        'fa-redo',
        rfc:         'RFC 1157 — Generic Trap 1',
    },
    linkDown: {
        oid:         '1.3.6.1.6.3.1.1.5.3',
        name:        'linkDown',
        label:       'Link Down',
        description: 'Interface de rede ficou inativa',
        severity:    'critical',
        icon:        'fa-unlink',
        rfc:         'RFC 1157 — Generic Trap 2',
    },
    linkUp: {
        oid:         '1.3.6.1.6.3.1.1.5.4',
        name:        'linkUp',
        label:       'Link Up',
        description: 'Interface de rede voltou a ficar ativa',
        severity:    'info',
        icon:        'fa-link',
        rfc:         'RFC 1157 — Generic Trap 3',
    },
    authenticationFailure: {
        oid:         '1.3.6.1.6.3.1.1.5.5',
        name:        'authenticationFailure',
        label:       'Authentication Failure',
        description: 'Falha de autenticação SNMP — community string incorreta',
        severity:    'critical',
        icon:        'fa-shield-alt',
        rfc:         'RFC 1157 — Generic Trap 4',
    },
    opticalDegradation: {
        oid:         '1.3.6.1.4.1.2011.6.128.1.1.2.51',
        name:        'opticalDegradation',
        label:       'Optical Degradation',
        description: 'Sinal óptico RxPower abaixo do limiar mínimo',
        severity:    'critical',
        icon:        'fa-satellite-dish',
        rfc:         'Huawei Enterprise MIB — hwGponOntOpticalInfo',
    },
    highTemperature: {
        oid:         '1.3.6.1.4.1.2011.6.128.1.1.2.52',
        name:        'highTemperature',
        label:       'High Temperature',
        description: 'Temperatura interna acima do limite operacional',
        severity:    'warning',
        icon:        'fa-thermometer-full',
        rfc:         'Huawei Enterprise MIB — hwGponOntTemperature',
    },
    highCPU: {
        oid:         '1.3.6.1.2.1.25.3.3.1.2',
        name:        'highCPU',
        label:       'High CPU Load',
        description: 'Utilização de CPU acima do limite configurado',
        severity:    'warning',
        icon:        'fa-microchip',
        rfc:         'HOST-RESOURCES-MIB — hrProcessorLoad',
    },
};

// ── Estado dos Traps ──────────────────────────────────────────────────────────
const trapState = {
    // Fila de traps recebidos (máximo 200)
    queue:    [],
    // Contadores por tipo
    counters: Object.fromEntries(Object.keys(TRAP_TYPES).map(k => [k, 0])),
    // Último estado de cada interface (para detectar linkDown/linkUp)
    ifStatus: { eth0: 'up', eth1: 'up', eth2: 'down', wlan0: 'up', wlan1: 'up' },
    // Flags de estado para evitar Traps duplicados
    flags: {
        opticalAlarmActive:  false,
        temperatureAlarmActive: false,
        cpuAlarmActive:      false,
        lastAuthFailAt:      0,
        coldStartSent:       false,
    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function nowStr() {
    return new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(',', '');
}

function makeTrap(type, device, varbinds = {}) {
    const def = TRAP_TYPES[type];
    if (!def) return null;

    trapState.counters[type] = (trapState.counters[type] || 0) + 1;

    const trap = {
        id:          `trap-${type}-${Date.now()}`,
        type,
        oid:         def.oid,
        label:       def.label,
        description: def.description,
        severity:    def.severity,
        icon:        def.icon,
        rfc:         def.rfc,
        device:      device || 'Home Gateway HG8145X6',
        agentAddr:   '192.168.1.1',
        community:   'public',
        timestamp:   new Date().toISOString(),
        time:        nowStr(),
        varbinds,    // variáveis ligadas ao trap (valores SNMP específicos)
        acknowledged: false,
    };

    // Inserir na fila (mantém as 200 mais recentes)
    trapState.queue.unshift(trap);
    if (trapState.queue.length > 200) trapState.queue.pop();

    return trap;
}

// ── Gerar Traps de inicialização ──────────────────────────────────────────────
function generateStartupTraps() {
    if (trapState.flags.coldStartSent) return;
    trapState.flags.coldStartSent = true;

    // coldStart no boot
    makeTrap('coldStart', 'Home Gateway HG8145X6', {
        sysDescr:    'Huawei EchoLife HG8145X6',
        sysUpTime:   0,
        sysLocation: 'Rack Principal — NOC',
    });

    // linkUp em todas as interfaces que estão ativas
    setTimeout(() => {
        ['eth0', 'wlan0', 'wlan1'].forEach(iface => {
            makeTrap('linkUp', 'Home Gateway HG8145X6', {
                ifIndex:  iface === 'eth0' ? 1 : iface === 'wlan0' ? 4 : 5,
                ifDescr:  iface === 'eth0' ? 'WAN — PON Uplink' : iface === 'wlan0' ? 'Wi-Fi 2.4 GHz' : 'Wi-Fi 5 GHz',
                ifAdminStatus: 'up',
                ifOperStatus:  'up',
            });
        });
    }, 2000);
}

// ── Avaliar métricas e gerar Traps automaticamente ────────────────────────────
function evaluateTraps(snapshot) {
    const { optical, system, interfaces, anomaly } = snapshot;

    // ── Trap Óptico ───────────────────────────────────────────────────────────
    if (optical.rxPower < optical.thresholds.rxMin + 3 && !trapState.flags.opticalAlarmActive) {
        trapState.flags.opticalAlarmActive = true;
        makeTrap('opticalDegradation', snapshot.device.name, {
            hwGponOntRxPower:    optical.rxPowerRaw,   // valor SNMP bruto (dBm × 100)
            hwGponOntTxPower:    optical.txPowerRaw,
            rxPowerDbm:          optical.rxPower,
            thresholdMin:        optical.thresholds.rxMin,
            ber:                 optical.ber,
            opticalStatus:       optical.status,
        });
    } else if (optical.rxPower >= optical.thresholds.rxMin + 3 && trapState.flags.opticalAlarmActive) {
        // Sinal recuperado — gerar Trap informativo
        trapState.flags.opticalAlarmActive = false;
        makeTrap('linkUp', snapshot.device.name, {
            ifDescr:      'WAN — PON Uplink (Sinal óptico recuperado)',
            rxPowerDbm:   optical.rxPower,
            opticalStatus:'online',
        });
    }

    // ── Trap Temperatura ──────────────────────────────────────────────────────
    if (system.temperature > 70 && !trapState.flags.temperatureAlarmActive) {
        trapState.flags.temperatureAlarmActive = true;
        makeTrap('highTemperature', snapshot.device.name, {
            temperature:       system.temperature,
            temperatureRaw:    Math.round(system.temperature * 256), // valor SNMP: °C × 256
            thresholdCelsius:  70,
            hwGponOntLocation: snapshot.device.location,
        });
    } else if (system.temperature <= 65 && trapState.flags.temperatureAlarmActive) {
        trapState.flags.temperatureAlarmActive = false;
    }

    // ── Trap CPU ──────────────────────────────────────────────────────────────
    if (system.cpu > 80 && !trapState.flags.cpuAlarmActive) {
        trapState.flags.cpuAlarmActive = true;
        makeTrap('highCPU', snapshot.device.name, {
            hrProcessorLoad: system.cpu,
            memPercent:      system.memPercent,
            threshold:       80,
        });
    } else if (system.cpu <= 70 && trapState.flags.cpuAlarmActive) {
        trapState.flags.cpuAlarmActive = false;
    }

    // ── Trap LinkDown/LinkUp (mudança de status de interface) ─────────────────
    interfaces.forEach(iface => {
        const prev = trapState.ifStatus[iface.name];
        const curr = iface.status;
        if (prev && prev !== curr) {
            trapState.ifStatus[iface.name] = curr;
            makeTrap(curr === 'down' ? 'linkDown' : 'linkUp', snapshot.device.name, {
                ifIndex:       iface.index,
                ifDescr:       iface.descr,
                ifType:        iface.type,
                ifAdminStatus: curr,
                ifOperStatus:  curr,
                ifSpeed:       iface.speed,
            });
        }
    });

    // ── Trap authenticationFailure (ocasional — simula tentativa inválida) ────
    const now = Date.now();
    if (now - trapState.flags.lastAuthFailAt > 90000 && Math.random() < 0.005) {
        trapState.flags.lastAuthFailAt = now;
        makeTrap('authenticationFailure', snapshot.device.name, {
            community:   'private',   // community inválida tentada
            sourceIp:    `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
            snmpVersion: 'v2c',
        });
    }

    // ── Trap coldStart/warmStart via anomalia ─────────────────────────────────
    if (anomaly?.type === 'cpuSpike' && Math.random() < 0.03) {
        makeTrap('warmStart', snapshot.device.name, {
            reason:   'Processo watchdog reiniciou o módulo de gerência',
            sysUpTime: snapshot.device.uptimeTicks,
        });
    }
}

// ── API pública ───────────────────────────────────────────────────────────────

function getTraps(filters = {}) {
    let traps = [...trapState.queue];

    if (filters.type)       traps = traps.filter(t => t.type === filters.type);
    if (filters.severity)   traps = traps.filter(t => t.severity === filters.severity);
    if (filters.unacknowledged) traps = traps.filter(t => !t.acknowledged);

    return traps;
}

function acknowledgeTraps(ids) {
    ids.forEach(id => {
        const trap = trapState.queue.find(t => t.id === id);
        if (trap) trap.acknowledged = true;
    });
}

function acknowledgeAllTraps() {
    trapState.queue.forEach(t => { t.acknowledged = true; });
}

function getTrapStats() {
    return {
        total:          trapState.queue.length,
        unacknowledged: trapState.queue.filter(t => !t.acknowledged).length,
        critical:       trapState.queue.filter(t => t.severity === 'critical' && !t.acknowledged).length,
        warning:        trapState.queue.filter(t => t.severity === 'warning'  && !t.acknowledged).length,
        counters:       { ...trapState.counters },
        lastTrap:       trapState.queue[0] || null,
    };
}

function getTrapTypes() {
    return TRAP_TYPES;
}

module.exports = {
    generateStartupTraps,
    evaluateTraps,
    getTraps,
    acknowledgeTraps,
    acknowledgeAllTraps,
    getTrapStats,
    getTrapTypes,
    makeTrap,
};