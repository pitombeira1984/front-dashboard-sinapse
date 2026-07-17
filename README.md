# SINAPSE — Front Dashboard

Dashboard de monitoramento preditivo de redes GPON com interface web em **Vanilla JavaScript** e servidor mock de dados SNMP em **Node.js + Express**.

---

## Visão Geral

O SINAPSE é um dashboard de monitoramento preditivo para redes GPON, com foco em dispositivos de fibra óptica como ONUs e OLTs. A interface exibe em tempo real métricas de potência óptica (RxPower/TxPower), CPU, memória, temperatura, latência e tráfego de rede, com polling automático de 5 segundos.

A topologia simulada representa um provedor real: **3 OLTs** em diferentes POPs, cada uma com múltiplas portas GPON (8 portas no total), cada porta servindo a um grupo de ONUs (18 no total). O gráfico de consumo de banda por OLT exibe dinamicamente todas as OLTs disponíveis na API, sem necessidade de reconfiguração manual.

O sistema é composto por **6 páginas funcionais**:

- **Dashboard** — KPIs por porta GPON, gráficos ao vivo (consumo de banda por OLT e latência GPON) e resumo de SNMP Traps
- **Dispositivos** — Tabela de ONUs em tempo real + CRUD completo de dispositivos com filtros e descoberta automática de rede
- **Alertas** — Parâmetros de monitoramento configuráveis pelo operador (limiares, duração, ação), SNMP Traps com reconhecimento e tabela de alertas gerados automaticamente
- **Análise** — Previsão de falhas por regressão linear sobre a telemetria real (RxPower das ONUs, tráfego e latência), recomendações de ação geradas dinamicamente e agendamento de manutenções
- **Configurações** — Parâmetros de rede, monitoramento e notificações que atuam de fato sobre as demais páginas (intervalo real de polling, exibição de métricas avançadas, identidade do nó, canais de notificação e política de retenção)
- **Histórico** — Auditoria de eventos sincronizada com o servidor (inclui o ciclo de vida dos alertas), filtros, exportação (CSV/JSON/PDF) e sistema de backup/restauração

O backend simula respostas SNMP reais enquanto o hardware (Orange Pi) não está disponível — a migração para dados reais exige substituir apenas um arquivo no servidor (`mock-engine.js` → `snmp-engine.js`).

---

## Estrutura do Projeto

```
front-dashboard-sinapse/
├── index.html                  ← SPA — ponto de entrada único
├── package.json                ← Dependências + scripts (usado pelo Railway)
├── railway.toml                ← Configuração de deploy no Railway
├── css/
│   └── style.css               ← Estilos globais + design tokens (CSS custom properties)
├── scripts/js/
│   ├── api.js                  ← Cliente da API + polling 5s + detecção de ambiente
│   ├── charts.js               ← Módulo Chart.js (gráficos em tempo real)
│   ├── data.js                 ← Dados de fallback (LocalStorage seed)
│   ├── events.js               ← Inicialização de eventos por página
│   ├── pages.js                ← Renderização das páginas (SPA)
│   ├── router.js               ← Roteamento client-side
│   ├── state.js                ← Gerenciamento de estado global (AppState)
│   ├── storage.js              ← CRUD via LocalStorage
│   ├── trap-ui.js              ← UI de SNMP Traps (badges, toasts, painel)
│   └── utils.js                ← Funções utilitárias (modal, toast, export, ThemeManager)
└── sinapse-server/             ← Servidor mock (ver README próprio)
    ├── server.js               ← Serve frontend (express.static) + API REST
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
- Lista os alertas não resolvidos gerados pelo monitoramento (parâmetros configurados ou anomalias da API). Exibe "Nenhum alerta ativo" enquanto não há alertas. Badge com contagem de críticos atualizado em tempo real.

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

Gerenciamento de dispositivos sincronizado com o monitoramento em tempo real.

**Tabela de Dispositivos Monitorados**
- Carregada diretamente da API (`GET /api/devices`) — exibe todas as **OLTs e ONUs** efetivamente monitoradas pelo sistema (3 OLTs + 18 ONUs na topologia padrão).
- Polling de 5s mantém status e métricas atualizados automaticamente.
- Colunas por tipo de dispositivo:

| Coluna | OLT | ONU |
|--------|-----|-----|
| Nome / Cliente | Nome da OLT | Nome da ONU + nome do cliente |
| IP / Porta GPON | IP de gerência + Fabricante / Localização | IP + porta GPON (ex: `0/1/0`) + serial |
| Tipo | Badge OLT | Badge ONU |
| Status | Online / Offline | Online / Offline |
| Métricas | CPU% e ONUs ativas/total | RxPower em dBm (colorido por limiar) e latência |

- Filtros em tempo real por nome/IP/cliente (texto livre), tipo (OLT, ONU, Router, Switch, Rádio) e status.

**Botão "Novo Dispositivo" — formulário dinâmico por tipo**

O modal adapta seus campos conforme o tipo selecionado:

| Tipo | Campos | Ação no backend |
|------|--------|-----------------|
| **OLT** | Nome/ID, IP\*, Fabricante, Modelo, Localização (POP), Capacidade (Mbps) | Cria OLT em `OLTS[]`, porta GPON inicial e rastreamento de banda — aparece automaticamente no gráfico do Dashboard |
| **ONU** | Porta GPON\* (dropdown com contagem de ONUs), Apto/Unidade\*, IP, Cliente, Serial, Modelo, Distância (km) | Insere no `onuState` da porta selecionada e inicia monitoramento em tempo real (RxPower, latência, degradação) |
| **Router / Switch / Rádio** | Nome\*, IP\*, Comunidade SNMP | Adiciona ao `DeviceStorage` genérico |

\* campo obrigatório

O seletor de Porta GPON (tipo ONU) é carregado dinamicamente da API com a contagem atual de ONUs por porta.

**Descoberta Automática**
- Campo de faixa de IP (CIDR), seletor de protocolo (Ping / SNMP v2c / Ping+SNMP) e botão "Escanear Rede".
- Barra de progresso animada durante o scan (~3s simulados).
- Resultado exibe dispositivos encontrados com IP, nome, tipo e latência; cada item tem botão "Adicionar" que insere o dispositivo diretamente no `DeviceStorage`.

---

### Alertas

Monitoramento configurável pelo operador, SNMP Traps e gestão de alertas gerados.

**Barra de filtros**
- Botões: Todos / Críticos / Avisos / Info / Resolvidos — cada um exibe badge com contagem.
- Campo de busca filtra por título, descrição ou dispositivo em tempo real.

**Tabela de Alertas**
- Exibe apenas alertas gerados pelo sistema (parâmetros de monitoramento ou anomalias da API). Sem dados fictícios de amostra.
- Colunas: Severidade, Descrição, Dispositivo, Início, Resolvido em, Ações.
- Ações por linha: Resolver (marca como resolvido), Ignorar, Detalhes.
- Botão "Limpar" remove todos os alertas registrados.

**SNMP Traps**
- Seção injetada dinamicamente com tabela de traps recebidos.
- Filtros por severidade e por tipo de trap.
- Ação de acknowledge individual ou em massa.

**Parâmetros de Monitoramento (CRUD)**

O operador define os limites que disparam alertas automaticamente a cada ciclo de polling (5s). Os tipos de parâmetros espelham os SNMP Traps suportados pelo `trap-engine.js`.

| Tipo | Descrição | Limiar |
|------|-----------|--------|
| Sinal Óptico (RxPower) | Dispara quando RxPower cai abaixo do limiar | `< X dBm` |
| Temperatura Alta | Dispara quando temperatura interna ultrapassa o limiar | `> X °C` |
| CPU Alta | Dispara quando utilização de CPU ultrapassa o limiar | `> X %` |
| Latência Alta | Dispara quando latência média das ONUs supera o limiar | `> X ms` |
| ONU Offline | Dispara quando uma ou mais ONUs ficam offline | evento |
| Link Down | Dispara quando interface de rede fica inativa (via Trap) | evento |
| Saturação de Banda | Dispara quando utilização de banda supera o limiar | `> X %` |
| Falha de Autenticação SNMP | Dispara em falha de autenticação SNMP (via Trap) | evento |

Cada parâmetro possui:
- **Nome personalizado** — definido pelo operador
- **Dispositivo Alvo** — todos os dispositivos ou um dispositivo específico
- **Limiar** — valor numérico com unidade (dBm / °C / % / ms), para tipos threshold-based
- **Duração mínima** — a condição deve persistir N minutos antes de disparar (0 = imediato)
- **Severidade** — Crítico / Aviso / Info (padrão pré-preenchido por tipo)
- **Ação** — Email / Telegram / SMS / Dashboard ou combinações
- **Status** — Ativo/Inativo com contador de disparos

O modal de criação/edição preenche automaticamente nome, operador (`<` / `>`), unidade e severidade padrão ao selecionar o tipo. Alertas gerados atualizam em tempo real a tabela de alertas e o card "Alertas Ativos" do Dashboard.

**Parâmetros padrão pré-configurados**

| Parâmetro | Condição | Severidade |
|-----------|----------|------------|
| Degradação Óptica Crítica | RxPower < -27 dBm | Crítico |
| Sinal Óptico Baixo | RxPower < -24 dBm | Aviso |
| CPU Alta | CPU > 80% por 5 min | Aviso |
| Temperatura Alta | Temperatura > 65 °C | Aviso |
| Latência Alta | Latência > 50 ms por 5 min | Aviso |
| ONU Offline | Status offline detectado | Crítico |

---

### Análise

Análise preditiva orientada a dados reais e agendamento de manutenções. A página consome os mesmos dados usados em Dispositivos e Alertas — não há previsões fixas ou fictícias.

**Barra de contexto**
- Abaixo do cabeçalho: contagem de dispositivos monitorados (todas as OLTs de `GET /api/olts/bandwidth` + todas as ONUs de `onuRxHistory` em `GET /api/device/history` — reflete a rede GPON inteira, não apenas o inventário cadastrado em Dispositivos), alertas ativos (`AlertStorage`) e horário da última análise executada.

**Motor de previsão (regressão linear)**
- A cada carga da página (ou clique em "Executar Análise"), o frontend busca `GET /api/device/history` (série de 120 amostras: RxPower por ONU, tráfego e latência da OLT-01) e `GET /api/olts/bandwidth`, e roda uma regressão linear (mínimos quadrados) sobre três séries:

| Sinal | Fonte | Limiar de previsão |
|-------|-------|---------------------|
| Degradação óptica por ONU | `onuRxHistory[].history` (RxPower) | −24 dBm (aviso) / −27 dBm (crítico) — mesmos limiares dos Parâmetros de Monitoramento |
| Saturação do link principal | `traffic.in` da OLT-01 | 85% da capacidade da OLT |
| Aumento de latência da rede GPON | `latency` (média OLT-01) | 50 ms — mesmo limiar do parâmetro "Latência Alta" |

- Uma tendência só vira previsão se a inclinação for consistente (R² ≥ 0,35 para RxPower / 0,3 para tráfego e latência) e o horizonte estimado for ≤ 90 dias — filtra ruído de curto prazo.
- O prazo previsto (ETA) é derivado da inclinação real e do `intervalSeconds` informado pelo servidor, exibido em segundos/minutos/horas/dias conforme a urgência; a confiança exibida é o R² do ajuste.
- Previsões já cobertas por um alerta ativo (`AlertStorage`) recebem a etiqueta "Alerta ativo".

**Onde o cálculo acontece**

- `linearRegression(values)` em `scripts/js/utils.js:128-141` — implementa a regressão linear simples (mínimos quadrados) e o R². Usa o índice de cada amostra na série (0, 1, 2...) como eixo X:

  ```js
  function linearRegression(values) {
      const n = values.length;
      if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };
      const xMean = (n - 1) / 2;
      const yMean = values.reduce((a, b) => a + b, 0) / n;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) { num += (i - xMean) * (values[i] - yMean); den += (i - xMean) ** 2; }
      const slope = den === 0 ? 0 : num / den;
      const intercept = yMean - slope * xMean;
      let ssTot = 0, ssRes = 0;
      for (let i = 0; i < n; i++) { const pred = slope * i + intercept; ssRes += (values[i] - pred) ** 2; ssTot += (values[i] - yMean) ** 2; }
      const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
      return { slope, intercept, r2 };
  }
  ```

  `slope` e `intercept` vêm da fórmula clássica de mínimos quadrados; `r2 = 1 - ssRes/ssTot` é a fração da variância explicada pela reta ajustada (0 a 1, nunca negativo).

- `runPredictiveAnalysis()` em `scripts/js/events.js:952-1050` chama `linearRegression()` três vezes por ciclo de análise — uma para cada série (RxPower por ONU, tráfego de entrada da OLT-01, latência média da rede) — e converte o R² de cada uma em "confiança" (`Math.round(Math.min(97, Math.max(35, r2 * 100)))`, faixa 35–97%).
- A **média do R²** ("confiança média" exibida no card de IA) é calculada em `scripts/js/events.js:1061-1063`, como a média aritmética simples da confiança de todas as previsões ativas no momento:

  ```js
  const avgConfidence = predictions.length
      ? Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length)
      : null;
  ```

  O resultado é renderizado por `renderAiModelCard()` em `scripts/js/pages.js:581-597`.

**Previsões de Falhas**
- Lista dinâmica (`predictions-list`) ordenada por severidade, com dispositivo/ONU real, tendência medida, ETA e confiança. ONUs com cliente cadastrado mostram o ícone ⓘ para abrir o drawer de cliente.
- Cada previsão tem botão "Agendar", que abre o modal de manutenção com o dispositivo correspondente pré-selecionado (mesma lista de `DeviceStorage` usada em Dispositivos).
- Quando não há tendência relevante, exibe mensagem de sistema normal em vez de lista vazia.

**Recomendações de Ação**
- Painel (`recommendations-panel`) gerado a partir da previsão mais urgente, com passos específicos por tipo (óptico / tráfego / latência) e botão "Agendar Manutenção".

**Seletor de período**
- Botões: 24 Horas / 7 Dias / 30 Dias / Personalizado — cada um define quantas amostras do buffer de 120 pontos entram na regressão (24h → 20, 7d → 60, 30d/Personalizado → 120) e reprocessa a análise automaticamente.
- Modo "Personalizado" exibe painel com campos de data início/fim e botão "Aplicar" (também reprocessa a análise).

**Manutenções Agendadas (CRUD)**
- Tabela com: Dispositivo, Data/Hora, Descrição, Duração, Status (agendado/concluído), Ações.
- Modal de agendamento com: dispositivo (select), data, horário, duração estimada, descrição, responsável.
- Ação de cancelar manutenção com confirmação.

**Modelos de IA Ativos**
- Exibe apenas o modelo efetivamente em produção: Regressão Linear. A "confiança média" do card é calculada em tempo real como a média do R² das previsões ativas (não um número fixo).

**Executar Análise**
- Botão no cabeçalho recalcula a análise com dados atualizados do servidor e exibe modal de resumo com a contagem real de previsões, quantas são críticas e quantas já estão correlacionadas a alertas ativos.

---

### Configurações

Configuração do sistema SINAPSE — os campos aqui salvos deixaram de ser apenas persistidos: cada um passou a alterar de fato o comportamento das demais páginas (`applySettingsRuntime()`, chamada a cada navegação e logo após salvar).

**Abas de navegação**

| Aba | Campos |
|-----|--------|
| Geral | Nome do Nó, Fuso Horário, Idioma |
| Monitoramento | Intervalo de Polling (5 segundos / 1 / 5 / 10 / 15 min), Retenção de Dados (3/6/12/24 meses), toggle de Métricas Avançadas |
| Notificações | Toggles Email / Telegram / SMS, campo de email para notificações |
| Sistema | IP do Nó + Máscara, Gateway, DNS Primário e Secundário, botões "Reiniciar Serviços" e "Reiniciar Sistema" |

**Onde cada configuração atua**

| Configuração | Efeito real | Onde aparece |
|--------------|-------------|---------------|
| Intervalo de Polling | Define `API.POLL_INTERVAL` — cadência real do polling de métricas/traps. "5 segundos" é o padrão do monitoramento simulado; as opções em minutos existem para quando o hardware real (Orange Pi) estiver em produção | Dashboard, Dispositivos, Alertas, Análise |
| Coleta Avançada de Métricas | Mostra/oculta os campos SFP (Temp., Tensão, BER, Uptime) nos cards de ONU | Dashboard |
| Nome do Nó / Endereço IP | Substitui o texto fixo de identificação do nó | Sidebar (todas as páginas) e rodapé do Dashboard |
| Retenção de Dados | Exibida como política ativa, com link direto de volta para Configurações | Histórico |
| Email / Telegram / SMS | Filtra, entre os canais configurados na ação de cada parâmetro de monitoramento, quais estão de fato habilitados; o toast de alerta mostra "enviado via X, Y" ou "canais desativados em Configurações" | Alertas (`evaluateMonitoringParams`) |

- Botão "Salvar Configurações" persiste todos os campos no `SettingsStorage` (via `PUT /api/settings`) e aplica as mudanças imediatamente, com feedback visual (cor verde por 1s) e toast de confirmação.
- **Zona de Perigo:** "Reiniciar Serviços" e "Reiniciar Sistema" (antes sem nenhuma ação associada) agora abrem modal de confirmação, registram o evento em `HistoryStorage` e simulam a operação — o primeiro com toast de conclusão, o segundo recarregando a aplicação após a contagem regressiva.

---

### Histórico

Auditoria real do servidor — dispositivos, alertas, manutenções e backups —, não apenas dados de exemplo.

- **Sincronização com o servidor:** ao entrar na página, `HistoryStorage.sync()` busca `GET /api/history` e substitui o cache local pelo histórico real do servidor. Antes dessa correção, a página exibia apenas os 3 eventos fixos de `sampleData.history` (ou o que sobrasse de sessões anteriores no navegador) e nunca era atualizada a partir do backend.
- Faixa informativa no topo mostra a política de retenção configurada em Configurações (`dataRetention`), com link direto para a página.

**Eventos de Alertas agora aparecem no Histórico**
- Resolver, ignorar ou gerar um alerta (manual ou automaticamente, incluindo ONU offline/online) grava um evento com `type: 'alert'` no histórico do servidor — antes, o filtro "Alertas" do dropdown nunca retornava nenhum resultado real, pois nenhum fluxo de alerta gravava histórico.

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
- "Criar Backup": persiste snapshot de todos os dados (dispositivos, alertas, regras, configurações, histórico) via `BackupStorage.create()` — exibe nome do arquivo e tamanho no toast.
- "Restaurar Backup": select com todos os backups disponíveis + confirmação modal antes de restaurar. A restauração agora é aguardada de fato (`await`) antes de sinalizar sucesso e recarregar a página — antes, o toast de "restaurado com sucesso" aparecia antes da restauração terminar, podendo exibir dados desatualizados. O cache local de dispositivos, alertas, regras, configurações **e histórico** é recarregado do servidor após a restauração.
- Tabela de backups disponíveis com ações de restauração rápida e remoção (ambas com confirmação modal).

---

## Stack Técnico

**Frontend**
- Vanilla JavaScript (sem framework)
- Chart.js 4.4.1 — gráficos em tempo real com janela deslizante de 30 pontos
- SPA com roteamento client-side (`router.js`)
- Polling de 5 segundos via `api.js` (métricas e traps independentes)
- Motor de avaliação de parâmetros de monitoramento (`evaluateMonitoringParams`) executado a cada tick de polling — avalia limiares, suporta duração mínima e throttle de 5 min entre disparos
- LocalStorage como camada de persistência client-side (`storage.js`)
- **Tema claro/escuro** — 10 CSS custom properties (`--bg-base`, `--bg-card`, `--text-primary` etc.); `ThemeManager` em `utils.js` gerencia toggle e persiste preferência em `localStorage`; script anti-FOUC no `<head>` previne flash ao carregar; gráficos Chart.js leem as variáveis em runtime via `getChartDefaults()`
- **Responsividade mobile** — breakpoints em 1024 / 768 / 640 / 480 px; modal vira bottom sheet em 480px; navegação com scroll horizontal e touch targets mínimos de 44px

**Backend**
- Node.js + Express
- Engine de simulação SNMP (`mock-engine.js`) — topologia GPON com **3 OLTs**, **8 portas** e **18 ONUs** distribuídas; estados dinâmicos (offline/online, degradação óptica, variação de TxPower e temperatura do módulo SFP/GBIC) e sincronização com `appState.devices`
- Banda por OLT calculada independentemente: OLT-01 deriva do tráfego real das ONUs; OLT-02 e OLT-03 evoluem por simulação autônoma com `drift()`, refletindo cargas distintas em tempo real
- Engine de SNMP Traps (`trap-engine.js`) — rastreia estado individual por ONU; gera `linkDown`/`linkUp` ao mudar status e `opticalDegradation` quando RxPower < -24 dBm
- **Cadastro de Clientes** (`CLIENT_PROFILES` em `mock-engine.js`) — 8 clientes (ONUs da OLT-01) com CPF/CNPJ, endereço completo, coordenadas GPS, telefone, e-mail, plano contratado e nível de criticidade (comum / prioritário / crítico)
- REST API completa com CRUD para dispositivos, alertas, regras, histórico, backups e configurações
  - `GET /api/olts` — lista todas as OLTs do provedor (id, modelo, IP, capacidade, localização)
  - `POST /api/olts` — adiciona nova OLT ao monitoramento; cria porta GPON inicial e rastreamento de banda automaticamente
  - `GET /api/olts/bandwidth` — consumo de banda por OLT (IN/OUT Mbps, % de carga, capacidade); retorna array dinâmico
  - `GET /api/gpon/ports` — todas as portas GPON de todas as OLTs com estatísticas de ONUs
  - `POST /api/onus` — adiciona nova ONU a uma porta GPON; inicializa `onuState` e inicia monitoramento em tempo real
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
- Novas OLTs e ONUs podem ser adicionadas em tempo de execução via `POST /api/olts` e `POST /api/onus` (botão "Novo Dispositivo" na página Dispositivos) — o gráfico de banda e o seletor de portas se atualizam automaticamente.

---

## Deploy em Produção

O projeto está publicado e acessível publicamente:

| Componente | Plataforma | Observação |
|-----------|-----------|-----------|
| Frontend + Backend | [Railway](https://railway.app) | Servidor Express único serve o frontend via `express.static()` e a API em `/api/*` — sem CORS em produção (same-origin) |

Em produção, `api.js` detecta o ambiente automaticamente: `BASE_URL` fica vazio fora do `localhost`, fazendo todas as chamadas irem para o mesmo origin. Em desenvolvimento, aponta para `http://localhost:3000`.

---

## Como Rodar Localmente

### 1. Instalar dependências e iniciar o servidor

Na raiz do projeto:

```bash
npm install
npm start
```

O servidor sobe em `http://localhost:3000` servindo tanto o frontend quanto a API.

Para desenvolvimento com auto-reload:
```bash
npm run dev
```

### 2. Acessar o frontend

Abra `http://localhost:3000` no navegador. O Express serve os arquivos estáticos automaticamente.

---

## Migração para Hardware Real (Orange Pi)

Quando o Orange Pi estiver disponível, substitua `mock-engine.js` por `snmp-engine.js` em `sinapse-server/server.js`:

```js
// Antes:
const { getSnapshot, getHistory } = require('./mock-engine');

// Depois:
const { getSnapshot, getHistory } = require('./snmp-engine');
```

O frontend (`api.js`) não precisa de nenhuma alteração — em produção, `BASE_URL` já fica vazio (same-origin); em desenvolvimento, basta apontar para o IP do Orange Pi. Veja instruções detalhadas em [`sinapse-server/README.md`](sinapse-server/README.md).

---

## Licença

Veja o arquivo [LICENSE](LICENSE).
