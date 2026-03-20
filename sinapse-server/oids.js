// ===== OIDs SNMP REAIS =====
// Baseado nos MIBs padrão + MIBs proprietários de ONUs/Home Gateways

const OIDs = {
    // RFC 1213 - MIB-II (padrão universal)
    system: {
        sysDescr:        '1.3.6.1.2.1.1.1.0',   // Descrição do sistema
        sysUpTime:       '1.3.6.1.2.1.1.3.0',   // Tempo ligado (centésimos de segundo)
        sysContact:      '1.3.6.1.2.1.1.4.0',
        sysName:         '1.3.6.1.2.1.1.5.0',
        sysLocation:     '1.3.6.1.2.1.1.6.0',
    },

    // Interfaces (IF-MIB - RFC 2863)
    interfaces: {
        ifNumber:        '1.3.6.1.2.1.2.1.0',   // Número de interfaces
        ifDescr:         '1.3.6.1.2.1.2.2.1.2', // Descrição da interface
        ifType:          '1.3.6.1.2.1.2.2.1.3', // Tipo (6=ethernet, 53=propVirtual)
        ifSpeed:         '1.3.6.1.2.1.2.2.1.5', // Velocidade em bps
        ifOperStatus:    '1.3.6.1.2.1.2.2.1.8', // Status operacional (1=up, 2=down)
        ifInOctets:      '1.3.6.1.2.1.2.2.1.10', // Bytes recebidos
        ifOutOctets:     '1.3.6.1.2.1.2.2.1.16', // Bytes enviados
        ifInErrors:      '1.3.6.1.2.1.2.2.1.14', // Erros de entrada
        ifOutErrors:     '1.3.6.1.2.1.2.2.1.20', // Erros de saída
    },

    // IP MIB (RFC 4293)
    ip: {
        ipInReceives:    '1.3.6.1.2.1.4.3.0',
        ipOutRequests:   '1.3.6.1.2.1.4.10.0',
        ipForwarding:    '1.3.6.1.2.1.4.1.0',
    },

    // HOST-RESOURCES-MIB (RFC 2790) - CPU, Memória
    host: {
        hrProcessorLoad: '1.3.6.1.2.1.25.3.3.1.2', // CPU %
        hrMemorySize:    '1.3.6.1.2.1.25.2.2.0',   // Memória total (KB)
        hrStorageUsed:   '1.3.6.1.2.1.25.2.3.1.6', // Storage usado
        hrStorageSize:   '1.3.6.1.2.1.25.2.3.1.5', // Storage total
    },

    // GPON / ONU - ITU-T G.988 (OMCI MIB) + Huawei Enterprise MIB
    gpon: {
        // Potência óptica RX (dBm * 100) — ONU recebendo da OLT
        onuRxPower:      '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.4',
        // Potência óptica TX (dBm * 100) — ONU transmitindo para OLT
        onuTxPower:      '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.5',
        // Temperatura do transceptor óptico (°C * 256)
        onuTemperature:  '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.2',
        // Tensão de alimentação (mV)
        onuVoltage:      '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.3',
        // Status da ONU (1=online, 2=offline, 3=powersave)
        onuStatus:       '1.3.6.1.4.1.2011.6.128.1.1.2.46.1.15',
        // BER - Bit Error Rate
        onuBER:          '1.3.6.1.4.1.2011.6.128.1.1.2.46.1.21',
    },

    // Wi-Fi - IEEE 802.11 MIB + vendedor
    wifi: {
        // Número de clientes conectados no 2.4GHz
        clients24GHz:    '1.3.6.1.4.1.14988.1.1.1.3.1.6.1',
        // Número de clientes conectados no 5GHz
        clients5GHz:     '1.3.6.1.4.1.14988.1.1.1.3.1.6.2',
        // Canal Wi-Fi 2.4GHz
        channel24GHz:    '1.3.6.1.4.1.14988.1.1.1.3.1.4.1',
        // Canal Wi-Fi 5GHz
        channel5GHz:     '1.3.6.1.4.1.14988.1.1.1.3.1.4.2',
        // RSSI médio dos clientes 2.4GHz (dBm)
        avgRSSI24GHz:    '1.3.6.1.4.1.14988.1.1.1.3.1.2.1',
        // RSSI médio dos clientes 5GHz (dBm)
        avgRSSI5GHz:     '1.3.6.1.4.1.14988.1.1.1.3.1.2.2',
    }
};

module.exports = { OIDs };