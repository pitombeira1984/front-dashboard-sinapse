# SINAPSE — Mock SNMP Server

Servidor que simula respostas SNMP reais de um **Home Gateway / ONU com fibra óptica Wi-Fi 6**
(baseado no Huawei EchoLife HG8145X6).

Quando o **Orange Pi** estiver disponível, a troca para dados reais é feita
alterando apenas o arquivo `mock-engine.js` → `snmp-engine.js`.
O frontend (`api.js`) não precisa de nenhuma mudança.

---

## Estrutura de arquivos

```
sinapse-server/
├── server.js          ← Servidor Express + todas as rotas da API
├── mock-engine.js     ← Engine que gera dados simulados realistas
├── trap-engine.js     ← Engine de geração de SNMP Traps
├── oids.js            ← Mapa de OIDs SNMP utilizados
├── package.json
└── README.md

scripts/js/
├── api.js             ← Cliente da API (consome este servidor)
└── trap-ui.js         ← UI de SNMP Traps (badges, toasts, painel)
```

---

## Instalação

```bash
cd sinapse-server
npm install
npm start
```

O servidor sobe em **http://localhost:3000**

Para desenvolvimento com auto-reload:
```bash
npm run dev
```

---

## Endpoints disponíveis

### Dispositivo (leitura SNMP simulada)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/status` | Status do servidor |
| GET | `/api/device` | Snapshot completo do dispositivo |
| GET | `/api/device/optical` | Dados ópticos GPON (RxPower, TxPower) |
| GET | `/api/device/system` | CPU, Memória, Temperatura, Uptime |
| GET | `/api/device/wifi` | Wi-Fi 2.4 GHz e 5 GHz |
| GET | `/api/device/interfaces` | Todas as interfaces de rede |
| GET | `/api/device/history` | Últimos ~10 minutos de histórico (120 pontos) |
| GET | `/api/metrics/live` | Poll rápido para atualização em tempo real (5s) |
| GET | `/api/oids` | Lista de OIDs SNMP utilizados |

> `/api/metrics/live` aceita query param `?port=0/1/2` para filtro por porta GPON.

---

### Alertas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/alerts` | Alertas gerados automaticamente pelo engine |
| GET | `/api/alerts/all` | Todos os alertas (incluindo resolvidos) |
| POST | `/api/alerts/add` | Adicionar alerta manualmente |
| PUT | `/api/alerts/:id/resolve` | Resolver alerta |
| DELETE | `/api/alerts/:id` | Remover alerta |

---

### SNMP Traps

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/traps` | Listar traps (filtros: `?type`, `?severity`, `?unacknowledged`, `?limit`) |
| GET | `/api/traps/stats` | Estatísticas e contadores de traps |
| GET | `/api/traps/types` | Catálogo de tipos de trap disponíveis |
| PUT | `/api/traps/acknowledge` | Reconhecer traps por IDs |
| PUT | `/api/traps/acknowledge-all` | Reconhecer todos os traps pendentes |

---

### Topologia GPON

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/topology` | Topologia completa da rede GPON |
| GET | `/api/onus` | Listar ONUs (filtro: `?port`) |
| GET | `/api/onus/:id` | Detalhes de uma ONU específica |
| GET | `/api/gpon/ports` | Informações das portas GPON |
| GET | `/api/gpon/kpis` | KPIs agregados GPON |

---

### Gerenciamento de Dispositivos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/devices` | Listar todos os dispositivos |
| POST | `/api/devices` | Adicionar dispositivo (requer `name`, `ip`) |
| PUT | `/api/devices/:id` | Atualizar dispositivo |
| DELETE | `/api/devices/:id` | Remover dispositivo |

---

### Regras de Alerta

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/rules` | Listar regras |
| POST | `/api/rules` | Criar regra |
| PUT | `/api/rules/:id` | Atualizar regra |
| PUT | `/api/rules/:id/toggle` | Ativar/desativar regra |
| DELETE | `/api/rules/:id` | Remover regra |

---

### Histórico e Backups

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/history` | Histórico de eventos da aplicação |
| POST | `/api/history` | Adicionar entrada ao histórico |
| GET | `/api/backups` | Listar backups |
| POST | `/api/backups` | Criar backup |
| POST | `/api/backups/:id/restore` | Restaurar backup |
| DELETE | `/api/backups/:id` | Remover backup |

---

### Configurações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/settings` | Obter configurações |
| PUT | `/api/settings` | Salvar configurações |

---

## Exemplo de resposta — `/api/metrics/live`

```json
{
  "ok": true,
  "data": {
    "timestamp":     "2024-01-15T14:30:00.000Z",
    "cpu":           18,
    "memPercent":    38,
    "temperature":   52.3,
    "rxPower":       -18.7,
    "txPower":        2.4,
    "opticalStatus": "online",
    "wanInRate":     48.2,
    "wanOutRate":    19.1,
    "wifiClients":   5,
    "uptime":        "3d 14:22:10",
    "anomaly":       null
  }
}
```

---

## Comportamento simulado

O `mock-engine.js` simula comportamentos reais do equipamento:

- **Deriva suave** — valores mudam gradualmente como num equipamento real
- **Anomalias ocasionais** — ocorrem aleatoriamente e se recuperam sozinhas:
  - `rxDrop` — degradação óptica (RxPower cai 4–8 dBm) → alerta crítico
  - `cpuSpike` — pico de CPU (vai a 85%) → alerta warning
  - `clientDrop` — queda de clientes Wi-Fi → alerta warning
- **Contadores crescentes** — `ifInOctets`, `ifOutOctets`, `ipInReceives` acumulam continuamente
- **OIDs reais** — todos os OIDs usados são os mesmos que o equipamento real responde via SNMP

O `trap-engine.js` gera SNMP Traps simulados com severidades e tipos variados, permitindo testar o fluxo completo de recebimento, filtragem e acknowledge de traps no frontend.

---

## Migração para o Orange Pi (quando o hardware chegar)

### Opção A — SNMP direto (recomendada)

```bash
npm install net-snmp
```

Crie `snmp-engine.js` substituindo `mock-engine.js`:

```js
const snmp = require('net-snmp');

const session = snmp.createSession('192.168.1.1', 'public');

async function getSnapshot() {
    // Mesma interface que mock-engine.js
    // mas consultando o equipamento real via SNMP
}
```

Em `server.js`, troque apenas a linha:
```js
// Antes:
const { getSnapshot, getHistory } = require('./mock-engine');

// Depois:
const { getSnapshot, getHistory } = require('./snmp-engine');
```

### Opção B — Proxy SNMP no Orange Pi

Instale o servidor no próprio Orange Pi e aponte o `API.BASE_URL`
no `api.js` do frontend para o IP do Orange Pi:

```js
// api.js
BASE_URL: 'http://192.168.1.100:3000',  // IP do Orange Pi
```

---

## OIDs utilizados

| OID | Descrição |
|-----|-----------|
| 1.3.6.1.2.1.1.3.0 | sysUpTime |
| 1.3.6.1.2.1.25.3.3.1.2 | CPU % |
| 1.3.6.1.2.1.25.2.2.0 | Memória total (KB) |
| 1.3.6.1.2.1.2.2.1.10 | ifInOctets |
| 1.3.6.1.2.1.2.2.1.16 | ifOutOctets |
| 1.3.6.1.4.1.2011.6.128.1.1.2.51.1.4 | ONU RxPower (dBm × 100) |
| 1.3.6.1.4.1.2011.6.128.1.1.2.51.1.5 | ONU TxPower (dBm × 100) |
| 1.3.6.1.4.1.2011.6.128.1.1.2.51.1.2 | Temperatura do transceptor |
| 1.3.6.1.4.1.14988.1.1.1.3.1.6.1 | Clientes Wi-Fi 2.4 GHz |
| 1.3.6.1.4.1.14988.1.1.1.3.1.6.2 | Clientes Wi-Fi 5 GHz |
