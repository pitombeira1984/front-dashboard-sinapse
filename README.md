# SINAPSE — Front Dashboard

Dashboard de monitoramento preditivo de redes GPON com interface web em **Vanilla JavaScript** e servidor mock de dados SNMP em **Node.js + Express**.

---

## Visão Geral

O SINAPSE é um dashboard de monitoramento preditivo para redes GPON, com foco em dispositivos de fibra óptica como ONUs e OLTs. A interface exibe em tempo real métricas de potência óptica (RxPower/TxPower), CPU, memória, temperatura, latência e tráfego de rede, com polling automático de 5 segundos.

A topologia simulada representa um provedor real: **3 OLTs** em diferentes POPs, cada uma com múltiplas portas GPON (8 portas no total), cada porta servindo a um grupo de ONUs (18 no total). O gráfico de consumo de banda por OLT exibe dinamicamente todas as OLTs disponíveis na API, sem necessidade de reconfiguração manual.

O sistema é composto por **6 páginas funcionais**:

- **Dashboard** — KPIs por porta GPON, gráficos ao vivo (consumo de banda por OLT e latência GPON) e resumo de SNMP Traps
- **Dispositivos** — Tabela de ONUs em tempo real + CRUD completo de dispositivos com filtros e descoberta automática de rede
- **Alertas** — Gerenciamento de alertas por severidade, SNMP Traps com reconhecimento e regras de notificação configuráveis (Email, Telegram, SMS)
- **Análise** — Predição de falhas com modelos de IA (Isolation Forest, Regressão Linear, LSTM) e agendamento de manutenções
- **Configurações** — Parâmetros de rede, monitoramento, notificações e informações do nó
- **Histórico** — Auditoria de eventos com filtros, exportação (CSV/JSON/PDF) e sistema de backup/restauração

O backend simula respostas SNMP reais enquanto o hardware (Orange Pi) não está disponível — a migração para dados reais exige substituir apenas um arquivo no servidor (`mock-engine.js` → `snmp-engine.js`).

---

## Estrutura do Projeto

```
front-dashboard-sinapse/
├── index.html                  ← SPA — ponto de entrada único
├── css/
│   └── style.css               ← Estilos globais
├── scripts/js/
│   ├── api.js                  ← Cliente da API + polling 5s
│   ├── charts.js               ← Módulo Chart.js (gráficos em tempo real)
│   ├── data.js                 ← Dados de fallback (LocalStorage seed)
│   ├── events.js               ← Inicialização de eventos por página
│   ├── pages.js                ← Renderização das páginas (SPA)
│   ├── router.js               ← Roteamento client-side
│   ├── state.js                ← Gerenciamento de estado global (AppState)
│   ├── storage.js              ← CRUD via LocalStorage
│   ├── trap-ui.js              ← UI de SNMP Traps (badges, toasts, painel)
│   └── utils.js                ← Funções utilitárias (modal, toast, export)
└── sinapse-server/             ← Servidor mock (ver README próprio)
    ├── server.js
    ├── mock-engine.js
    ├── trap-engine.js
    ├── oids.js
    └── README.md
```

---

## Páginas da Aplicação

### Dashboard

Visão geral do estado da rede em tempo real.

**Seletor de Porta GPON**
- Dropdown no cabeçalho lista todas as portas GPON de todas as OLTs com contagem de ONUs (`online/total`), no formato `OLT-XX / GPON X/Y/Z`.
- Ao trocar de porta, todos os KPIs e o gráfico de latência GPON são reinicializados e recarregados com os dados da nova porta.
- Portas sem ONUs associadas são exibidas como `(sem ONUs)` e ficam disponíveis para uso futuro.

**KPIs (atualizados a cada 5 segundos)**

| KPI | Descrição |
|-----|-----------|
| ONUs Ativas | Contagem `online/total` com indicador de offline em vermelho |
| Sinal Médio RxPower | Média em dBm; cor muda conforme limiar (-24 aviso, -27 crítico) |
| Latência Média | Média das ONUs da porta selecionada em ms |
| Disponibilidade | Percentual com barra de progresso colorida (verde/amarelo/vermelho) |
| CPU OLT | Uso da CPU com barra de progresso colorida |

**Gráficos em tempo real (Chart.js)**

| Gráfico | Tipo | Dados |
|---------|------|-------|
| Consumo de Banda por OLT | Barras agrupadas (IN/OUT) | `inRate` e `outRate` em Mbps por OLT via `GET /api/olts/bandwidth`; número de barras dinâmico — uma barra por OLT disponível na API; cor proporcional à capacidade (azul < 50%, laranja ≥ 50%, vermelho ≥ 80%) |
| Latência Média das ONUs | Linha | `avgLatency` em ms — janela deslizante de 30 pontos, atualizado a cada 5s |

O tooltip do gráfico de banda exibe a taxa em Mbps, o percentual de uso da capacidade e o modelo da OLT. OLTs com capacidades diferentes (ex.: 2,5 Gbps vs 10 Gbps) são refletidas automaticamente nos percentuais e no eixo Y.

**Alertas Ativos**
- Lista os alertas não resolvidos do `AlertStorage` com badge de contagem crítica.

**Dispositivos Monitorados**
- Cards com métricas ao vivo atualizados a cada 5s em sincronia com as KPIs.
- **OLT:** CPU, Memória, Temperatura interna, ONUs Ativas.
- **ONUs:** RxPower (colorido por limiar), **TxPower** (potência de transmissão laser da porta), **Temp. SFP** (temperatura do módulo transceptor GBIC/SFP), **Tensão SFP** (tensão de alimentação do módulo), **BER** (taxa de erro de bit, notação científica), **Uptime SFP** (tempo de operação contínua do módulo), Latência, Distância, Cliente. Valores com código de cor por faixa operacional:

| Campo | Verde | Amarelo | Vermelho |
|-------|-------|---------|----------|
| RxPower | > −24 dBm | −24 a −27 dBm | < −27 dBm |
| TxPower | 1,0 a 5,0 dBm | 0,5 a 1,0 dBm | < 0,5 ou > 5,0 dBm |
| Temp. SFP | < 50 °C | 50 a 70 °C | ≥ 70 °C |
| Tensão SFP | 3,1 a 3,5 V | 3,0 a 3,1 V / 3,5 a 3,6 V | < 3,0 V ou > 3,6 V |
| BER | < 10⁻⁹ | 10⁻⁹ a 10⁻⁶ | > 10⁻⁶ |

- Os valores exibidos nos cards são a mesma fonte de dados que compõem `avgRxPower` e `avgLatency` nas KPIs.

**Drawer de Informações do Cliente**
- O campo **Cliente** em cada card ONU exibe um botão ⓘ. Ao clicar, um painel lateral deslizante (drawer) abre à direita com o cadastro completo do cliente, carregado via `GET /api/clients/:id`.
- O drawer exibe cinco seções:

| Seção | Conteúdo |
|-------|----------|
| Identificação | CPF ou CNPJ, número do contrato, categoria, data de instalação |
| Criticidade | Bloco colorido com nível (Comum / Prioritário / Crítico) e descrição de SLA |
| Endereço | Logradouro, complemento, bairro, cidade/estado, CEP e coordenadas GPS |
| Contato | Telefone e e-mail |
| Plano Contratado | Velocidade contratada |

- **Níveis de criticidade:** `Comum` (cinza) — residencial/atendimento padrão; `Prioritário` (amarelo) — empresas; `Crítico` (vermelho) — saúde, educação, órgãos públicos — SLA prioritário com alertas imediatos.
- Fecha ao clicar no botão ×, no overlay escuro ou via teclado. O toast de SNMP fica abaixo do overlay quando o drawer está aberto (hierarquia de z-index: toast 199 < overlay 200 < drawer 201 < modal 1000).

**SNMP Traps**
- Card de resumo injetado dinamicamente via `renderTrapSummaryCard()`.
- Polling independente a cada 5s detecta novos traps e exibe toast de notificação.
- Traps disparados automaticamente por eventos de ONU: `linkDown` (offline), `linkUp` (reconectado), `opticalDegradation` (RxPower < -24 dBm).

---

### Dispositivos

Gerenciamento de equipamentos de rede.

**Tabela de ONUs**
- Lista todas as ONUs de todas as portas GPON com: Apto/Cliente/Modelo, IP/Serial, Porta, Status (online/offline + indicador de sinal degradado), RxPower, TxPower, Latência, Distância, Uptime.
- Polling de 5s mantém a tabela sempre atualizada.
- Badges `Online` / `Offline` com contagem atualizada em tempo real.

**Tabela de Dispositivos (CRUD)**
- Filtros em tempo real por nome/IP/tipo (campo de texto), tipo (OLT, Router, Switch, Rádio) e status (Online/Offline).
- Ações por linha: Editar, Ver Métricas, Testar Conexão, Remover.
- Botão "Novo Dispositivo" abre modal com campos: Nome, IP, Tipo, Comunidade SNMP.
- Botão "Resetar dados" restaura o dataset padrão.

**Descoberta Automática**
- Campo de faixa de IP (CIDR), seletor de protocolo (Ping / SNMP v2c / Ping+SNMP) e botão "Escanear Rede".
- Barra de progresso animada durante o scan (~3s simulados).
- Resultado exibe dispositivos encontrados com IP, nome, tipo e latência; cada item tem botão "Adicionar" que insere o dispositivo diretamente no `DeviceStorage`.

---

### Alertas

Gerenciamento de alertas e regras de notificação.

**Barra de filtros**
- Botões: Todos / Críticos / Avisos / Info / Resolvidos — cada um exibe badge com contagem.
- Campo de busca filtra por título, descrição ou dispositivo em tempo real.

**Tabela de Alertas**
- Colunas: Severidade, Descrição, Dispositivo, Início, Resolvido em, Ações.
- Ações por linha: Resolver (marca como resolvido), Ignorar, Detalhes.
- Botão "Resetar dados" restaura o dataset padrão.

**SNMP Traps**
- Seção injetada dinamicamente com tabela de traps recebidos.
- Filtros por severidade e por tipo de trap.
- Ação de acknowledge individual ou em massa.

**Regras de Alerta (CRUD)**
- Tabela com: Nome, Condição, Ação, Status (Ativa/Inativa), Ações.
- Botão "Nova Regra" abre modal com campos: Nome, Condição, Ação (Email / Telegram / SMS etc.), Severidade.
- Ações por linha: Editar (modal de edição), Ativar/Desativar (toggle), Remover (confirmação).

---

### Análise

Análise preditiva e agendamento de manutenções.

**Seletor de período**
- Botões: 24 Horas / 7 Dias / 30 Dias / Personalizado.
- Modo "Personalizado" exibe painel com campos de data início/fim e botão "Aplicar".

**Previsões de Falhas**
- Lista com 3 previsões ativas (com percentual de confiança) e recomendações de ação.
- Cada previsão possui botão "Agendar" que abre o modal de manutenção pré-preenchido com o dispositivo correspondente.

**Manutenções Agendadas (CRUD)**
- Tabela com: Dispositivo, Data/Hora, Descrição, Duração, Status (agendado/concluído), Ações.
- Modal de agendamento com: dispositivo (select), data, horário, duração estimada, descrição, responsável.
- Ação de cancelar manutenção com confirmação.

**Modelos de IA Ativos**
- Cards exibindo os 3 modelos em uso: Isolation Forest (92.3%), Regressão Linear (88.7%), LSTM Network (85.1%) — cada um com barra de precisão.

**Executar Análise**
- Botão no cabeçalho simula execução de análise (~2s) e exibe modal com resumo dos resultados.

---

### Configurações

Configuração do sistema SINAPSE.

**Abas de navegação**

| Aba | Campos |
|-----|--------|
| Geral | Nome do Nó, Fuso Horário, Idioma |
| Monitoramento | Intervalo de Polling (1/5/10/15 min), Retenção de Dados (3/6/12/24 meses), toggle de Métricas Avançadas |
| Notificações | Toggles Email / Telegram / SMS, campo de email para notificações |
| Sistema | IP do Nó + Máscara, Gateway, DNS Primário e Secundário, botões "Reiniciar Serviços" e "Reiniciar Sistema" |

- Botão "Salvar Configurações" persiste todos os campos no `SettingsStorage` com feedback visual (cor verde por 1s) e toast de confirmação.

---

### Histórico

Log de eventos e gerenciamento de backups.

**Filtros e busca**
- Campo de texto busca por evento, dispositivo ou ação.
- Filtro por tipo: Alertas / Manutenções / Backups / Dispositivos.
- Filtro por período: Hoje / 7 dias / 30 dias / 90 dias / Todo o período.
- Botão "Filtrar" aplica todos os filtros combinados.

**Tabela de Eventos**
- Colunas: Data/Hora, Evento, Dispositivo, Duração, Ação, Usuário.

**Exportar**
- Modal com seleção de formato (CSV / JSON / PDF) e período.
- CSV e JSON são baixados automaticamente; PDF abre a janela de impressão do navegador.

**Backup e Restauração**
- "Criar Backup": persiste snapshot de todos os dados (dispositivos, alertas, regras, configurações) via `BackupStorage.create()` — exibe nome do arquivo e tamanho no toast.
- "Restaurar Backup": select com todos os backups disponíveis + confirmação modal antes de restaurar.
- Tabela de backups disponíveis com ações de restauração rápida e remoção (ambas com confirmação modal).

---

## Stack Técnico

**Frontend**
- Vanilla JavaScript (sem framework)
- Chart.js 4.4.1 — gráficos em tempo real com janela deslizante de 30 pontos
- SPA com roteamento client-side (`router.js`)
- Polling de 5 segundos via `api.js` (métricas e traps independentes)
- LocalStorage como camada de persistência client-side (`storage.js`)

**Backend**
- Node.js + Express
- Engine de simulação SNMP (`mock-engine.js`) — topologia GPON com **3 OLTs**, **8 portas** e **18 ONUs** distribuídas; estados dinâmicos (offline/online, degradação óptica, variação de TxPower e temperatura do módulo SFP/GBIC) e sincronização com `appState.devices`
- Banda por OLT calculada independentemente: OLT-01 deriva do tráfego real das ONUs; OLT-02 e OLT-03 evoluem por simulação autônoma com `drift()`, refletindo cargas distintas em tempo real
- Engine de SNMP Traps (`trap-engine.js`) — rastreia estado individual por ONU; gera `linkDown`/`linkUp` ao mudar status e `opticalDegradation` quando RxPower < -24 dBm
- **Cadastro de Clientes** (`CLIENT_PROFILES` em `mock-engine.js`) — 8 clientes (ONUs da OLT-01) com CPF/CNPJ, endereço completo, coordenadas GPS, telefone, e-mail, plano contratado e nível de criticidade (comum / prioritário / crítico)
- REST API completa com CRUD para dispositivos, alertas, regras, histórico, backups e configurações
  - `GET /api/olts` — lista todas as OLTs do provedor (id, modelo, IP, capacidade, localização)
  - `GET /api/olts/bandwidth` — consumo de banda por OLT (IN/OUT Mbps, % de carga, capacidade); retorna array dinâmico — basta adicionar uma OLT em `OLTS` para aparecer no gráfico
  - `GET /api/gpon/ports` — todas as portas GPON de todas as OLTs com estatísticas de ONUs
  - `GET /api/clients` / `GET /api/clients/:id` — cadastro de clientes

---

## Topologia Simulada

| OLT | Vendor | Modelo | IP | Capacidade | POP | Portas | ONUs |
|-----|--------|--------|----|-----------|-----|--------|------|
| OLT-01 | Huawei | MA5800-X2 | 10.0.1.10 | 2,5 Gbps | POP Central | 4 (0/1/0–0/1/3) | 8 |
| OLT-02 | ZTE | ZXA10 C600 | 10.0.2.10 | 2,5 Gbps | POP Bairro Norte | 2 (0/2/0–0/2/1) | 5 |
| OLT-03 | Nokia | 7360 FX-4 | 10.0.3.10 | 10 Gbps | POP Bairro Sul | 2 (0/3/0–0/3/1) | 5 |

- As ONUs da **OLT-01** têm cadastro completo de cliente (drawer lateral com CPF/CNPJ, endereço, plano, criticidade).
- As ONUs da **OLT-02** e **OLT-03** são monitoradas nas tabelas e no seletor de porta, mas sem cadastro de cliente associado.
- Para adicionar uma nova OLT ao sistema, basta incluir uma entrada no array `OLTS` em `mock-engine.js` — o gráfico de consumo de banda a exibirá automaticamente.

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

O frontend (`api.js`) não precisa de nenhuma alteração — basta garantir que `API.BASE_URL` aponte para o IP do Orange Pi. Veja instruções detalhadas em [`sinapse-server/README.md`](sinapse-server/README.md).

---

## Licença

Veja o arquivo [LICENSE](LICENSE).
