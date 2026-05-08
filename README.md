# SINAPSE — Front Dashboard

Dashboard de monitoramento preditivo de redes GPON com interface web em **Vanilla JavaScript** e servidor mock de dados SNMP em **Node.js + Express**.

---

## Visão Geral

O SINAPSE monitora em tempo real dispositivos de rede como ONUs de fibra óptica (baseado no Huawei EchoLife HG8145X6), exibindo métricas de CPU, memória, temperatura, potência óptica, Wi-Fi e tráfego de rede. O sistema simula respostas SNMP reais enquanto o hardware (Orange Pi) não está disponível — a migração para dados reais exige alterar apenas um arquivo no servidor.

---

## Estrutura do Projeto

```
front-dashboard-sinapse/
├── index.html                  ← SPA — ponto de entrada único
├── css/
│   └── style.css               ← Estilos globais
├── scripts/js/
│   ├── api.js                  ← Cliente da API (consome o mock server)
│   ├── charts.js               ← Módulo Chart.js (gráficos em tempo real)
│   ├── data.js                 ← Dados de fallback
│   ├── events.js               ← Inicialização de eventos por página
│   ├── pages.js                ← Renderização das páginas (SPA)
│   ├── router.js               ← Roteamento client-side
│   ├── state.js                ← Gerenciamento de estado
│   ├── storage.js              ← Cache via LocalStorage
│   ├── trap-ui.js              ← UI de SNMP Traps (badges, toasts, painel)
│   └── utils.js                ← Funções utilitárias
└── sinapse-server/             ← Servidor mock (ver README próprio)
    ├── server.js
    ├── mock-engine.js
    ├── trap-engine.js
    ├── oids.js
    └── README.md
```

---

## Páginas da Aplicação

| Página | Descrição |
|--------|-----------|
| **Dashboard** | KPIs em tempo real, gráficos de CPU/memória/temperatura, potência óptica, tráfego WAN e clientes Wi-Fi |
| **Dispositivos** | Lista e gerenciamento de ONUs monitoradas (CRUD) |
| **Alertas** | Alertas automáticos e SNMP Traps com acknowledge |
| **Análise** | Histórico de métricas e gráficos de análise GPON por porta |
| **Configurações** | Parâmetros do sistema e regras de alerta |
| **Histórico** | Log de eventos e backups de configuração |

---

## Stack Técnico

**Frontend**
- Vanilla JavaScript (sem framework)
- Chart.js — gráficos em tempo real
- SPA com roteamento client-side (`router.js`)
- Polling de 5 segundos via `api.js`

**Backend**
- Node.js + Express
- Engine de simulação SNMP (`mock-engine.js`)
- Engine de SNMP Traps (`trap-engine.js`)
- REST API completa com CRUD

---

## Como Rodar

### 1. Iniciar o servidor mock

```bash
cd sinapse-server
npm install
npm start
```

O servidor sobe em `http://localhost:3000`.

Para desenvolvimento com auto-reload:
```bash
npm run dev
```

### 2. Abrir o frontend

Abra o arquivo `index.html` diretamente no navegador, ou sirva com qualquer servidor estático:

```bash
# Exemplo com Python
python -m http.server 8080
```

Acesse `http://localhost:8080`.

---

## Migração para Hardware Real (Orange Pi)

Quando o Orange Pi estiver disponível, substitua `mock-engine.js` por `snmp-engine.js` em `server.js`:

```js
// Antes:
const { getSnapshot, getHistory } = require('./mock-engine');

// Depois:
const { getSnapshot, getHistory } = require('./snmp-engine');
```

O frontend (`api.js`) não precisa de nenhuma alteração. Veja instruções detalhadas em [`sinapse-server/README.md`](sinapse-server/README.md).

---

## Licença

Veja o arquivo [LICENSE](LICENSE).
