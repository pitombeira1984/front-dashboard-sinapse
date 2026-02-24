// ===== DADOS DE EXEMPLO =====
        const sampleData = {
            metrics: {
                availability: 99.87,
                latency: 24.3,
                onus: 1247,
                cpu_usage: 34,
                memory_usage: 68,
                storage_used: 42
            },
            
            alerts: [
                { id: 1, title: "Degradação Óptica Detectada", description: "OLT-01 • Porta 1/0/8 • Sinal caindo -1.2dB/dia", severity: "critical", time: "há 2 horas", device: "OLT-01" },
                { id: 2, title: "Alta Utilização de CPU", description: "Switch Core • CPU em 92% por 30min", severity: "warning", time: "há 5 horas", device: "Switch Core" },
                { id: 3, title: "Link Próximo da Saturação", description: "Rádio Backhaul • 85% utilizado • Previsão: 3 dias", severity: "info", time: "há 1 dia", device: "Rádio Backhaul" },
                { id: 4, title: "Perda de Pacotes Elevada", description: "OLT-02 • Porta 1/0/12 • 5% packet loss", severity: "warning", time: "há 3 horas", device: "OLT-02" }
            ],
            
            devices: [
                { id: 1, name: "OLT Huawei MA5800", ip: "10.0.1.10", type: "OLT", status: "online", cpu: 42, memory: 67, temperature: 48, onus_active: 312, onus_total: 320 },
                { id: 2, name: "MikroTik CCR2004", ip: "10.0.1.1", type: "Router", status: "online", traffic_in: 850, traffic_out: 920, packets: 42000, uptime: "45 dias" },
                { id: 3, name: "Switch Cisco Catalyst", ip: "10.0.1.20", type: "Switch", status: "online", cpu: 28, memory: 45, temperature: 42, ports_active: 18, ports_total: 24 },
                { id: 4, name: "Rádio Ubiquiti PtP", ip: "10.0.1.30", type: "Radio", status: "offline", signal: -78, capacity: 750, distance: "2.3km", last_seen: "há 15min" }
            ],
            
            history: [
                { id: 1, event: "Falha de Link Restaurada", device: "Rádio Backhaul", time: "2024-01-15 14:30", duration: "45min", action: "Auto-recuperação" },
                { id: 2, event: "Manutenção Programada", device: "OLT-01", time: "2024-01-14 03:00", duration: "30min", action: "Atualização de firmware" },
                { id: 3, event: "Alerta de Temperatura", device: "Switch Core", time: "2024-01-13 22:15", duration: "15min", action: "Resfriamento ativado" }
            ]
        };