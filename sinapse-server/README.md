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
├── oids.js            ← Mapa de OIDs SNMP utilizados
├── package.json
└── README.md

sinapse/
└── scripts/js/
    └── api.js         ← Cliente da API (usar no frontend)
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

| Método | Endpoint                  | Descrição                              |
|--------|---------------------------|----------------------------------------|
| GET    | /api/status               | Status do servidor                     |
| GET    | /api/device               | Snapshot completo do dispositivo       |
| GET    | /api/device/optical       | Dados ópticos GPON (RxPower, TxPower)  |
| GET    | /api/device/system        | CPU, Memória, Temperatura, Uptime      |
| GET    | /api/device/wifi          | Wi-Fi 2.4 GHz e 5 GHz                  |
| GET    | /api/device/interfaces    | Todas as interfaces de rede            |
| GET    | /api/device/history       | Histórico dos últimos 10 minutos       |
| GET    | /api/metrics/live         | Poll rápido para atualização (5s)      |
| GET    | /api/alerts               | Alertas gerados automaticamente        |
| GET    | /api/oids                 | Lista de OIDs SNMP utilizados          |

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

## Integrar no SINAPSE (frontend)

### 1. Adicionar o script no `index.html`

```html
<!-- Adicionar ANTES de router.js -->
<script src="scripts/js/api.js"></script>
```

### 2. Ativar o polling no dashboard

No arquivo `events.js`, dentro de `initDashboardEvents()`, adicione:

```js
// Iniciar polling de dados reais
API.startPolling(applyLiveData);

// Enriquecer cards com dados completos
enrichDeviceCards();
```

### 3. Parar o polling ao sair do dashboard

No `router.js`, antes de `loadPageContent(page)`, adicione:

```js
if (typeof API !== 'undefined') API.stopPolling();
```

---

## Comportamento simulado

O `mock-engine.js` simula comportamentos reais do equipamento:

- **Deriva suave** — valores mudam gradualmente como num equipamento real
- **Anomalias ocasionais** — ocorrem aleatoriamente e se recuperam sozinhas:
  - `rxDrop` — degradação óptica (RxPower cai 4–8 dBm) → alerta crítico
  - `cpuSpike` — pico de CPU (vai a 85%) → alerta warning
  - `clientDrop` — queda de clientes Wi-Fi → alerta warning
- **Contadores crescentes** — `ifInOctets`, `ifOutOctets`, `ipInReceives`
  acumulam continuamente como num equipamento real
- **OIDs reais** — todos os OIDs usados são os mesmos que o equipamento
  real responde via SNMP

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

| OID                                    | Descrição                    |
|----------------------------------------|------------------------------|
| 1.3.6.1.2.1.1.3.0                     | sysUpTime                    |
| 1.3.6.1.2.1.25.3.3.1.2               | CPU %                        |
| 1.3.6.1.2.1.25.2.2.0                 | Memória total (KB)           |
| 1.3.6.1.2.1.2.2.1.10                 | ifInOctets                   |
| 1.3.6.1.2.1.2.2.1.16                 | ifOutOctets                  |
| 1.3.6.1.4.1.2011.6.128.1.1.2.51.1.4 | ONU RxPower (dBm × 100)      |
| 1.3.6.1.4.1.2011.6.128.1.1.2.51.1.5 | ONU TxPower (dBm × 100)      |
| 1.3.6.1.4.1.2011.6.128.1.1.2.51.1.2 | Temperatura transceptor       |
| 1.3.6.1.4.1.14988.1.1.1.3.1.6.1     | Clientes Wi-Fi 2.4 GHz        |
| 1.3.6.1.4.1.14988.1.1.1.3.1.6.2     | Clientes Wi-Fi 5 GHz          |