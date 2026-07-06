# Memória do projeto (aprendizados)

> Fonte da verdade viva. Registre aqui decisões, descobertas, becos sem saída e
> convenções que forem surgindo. Sempre acrescente uma entrada datada ao final.
> Este repositório (a extensão) centraliza a memória de TODO o esforço de integração
> Beefood + uazapi, mesmo quando o trabalho tocar os outros projetos.

## Contexto do objetivo (resumo do briefing)

- Temos um **fork** da nova extensão oficial da uazapi. A uazapi lançou essa extensão
  para resolver uma nova validação de segurança do WhatsApp: ela captura e devolve
  corretamente uma sessão do WhatsApp para funcionamento na instância.
- Queremos transformar esse fork numa **extensão da Beefood**: com a nossa cara e
  **mais automatizada**, feita para o nosso ecossistema.
- Dor atual: a extensão exige que o usuário informe manualmente dados do servidor
  (nome da assinatura/`client` + `token`). Nossa extensão deve ser mais esperta:
  **identificar que está no `bot2.beefood.com.br/dashboard` e automatizar o fluxo**.
- Precisamos manter a capacidade de **acompanhar o repositório original (upstream)** e
  eventualmente **fazer merge de melhorias** futuras da uazapi.

## Estado atual (snapshot — atualizar a cada sessão)

> Leia isto primeiro para saber onde paramos. Detalhes no "Log de sessões" ao final.

- Extensão `0.2.1`. `origin` = repo Beefood; `upstream` = `github.com/uazapi/whatsapp-web-session-importer`
  (push desabilitado, em sync com `upstream/main` no commit `516b4f6`).
- **Feito (funcional, validado):**
  - Bridge + `externally_connectable` habilitados para `*.beefood.com.br`, `*.lovable.app`, `localhost`
    (mantido `*.uazapi.com` p/ upload). Handler `onMessageExternal` no background.
  - Auto-início da migração via `auto=1` (hash/bridge) → `scheduleAutoImport`.
  - Cron: endpoint `POST .../instancia/preparar-importacao/:empresaID/:filialID` (init sem connect
    + `status=importing`/`importing_until` + guarda no watchdog). Sem lints; `node --check` OK.
  - Extensão: typecheck + 10/10 testes + build OK (Node ≥20).
- **Pendente:**
  - Migration DB: `ALTER TABLE whatsapp.instancia ADD COLUMN importing_until DATETIME NULL;`
  - Rodar o script Lovable no `beefood-whatsapp-react` (usuário rodando/testando em 2026-07-03).
  - Teste ponta a ponta com 1 filial.
  - Fase 1 (branding/identidade Beefood) — deixada por último.
- **Ambiente:** exige Node ≥20 (`nvm use 20`/`22` antes de `npm install`/`build`).
- **Workspace:** MCP de mover raiz indisponível; edições feitas por caminho absoluto.

## Decisões tomadas

| Data | Decisão | Motivo |
|------|---------|--------|
| 2026-07-03 | Centralizar toda a memória neste repo (`spec.md` + `docs/`). | Pedido do time; extensão é o núcleo do esforço. |
| 2026-07-03 | Configurar remote `upstream` (uazapi) com push **desabilitado**. | Acompanhar melhorias sem risco de push acidental no original. |
| 2026-07-03 | Estratégia de integração = **bridge direta** (usar `token`+`base_url` que o front já recebe). | Maior ganho de automação com menor esforço; token roda no navegador do próprio operador. |
| 2026-07-03 | `importKey + gateway` fica como evolução futura (mais segura). | Exige endpoints novos na `beefood-server-whatsapp-api`. |
| 2026-07-03 | Toda customização de fork deve ficar isolada em `src/customization.ts`. | Minimiza conflitos ao mergear o upstream. |
| 2026-07-03 | Prioridade: **extensão funcional primeiro**, layout/branding por último. | Pedido do time. |
| 2026-07-03 | Frontend terá **modal com 2 opções** (Opção 1 = QR atual; Opção 2 = WhatsApp Web/extensão). | Compatibilidade total; extensão vira opção. |
| 2026-07-03 | Endpoint novo de preparação da instância fica no **cron**; extensão **auto-inicia** a migração. | Cron é dono do ciclo de vida; máxima automação. |
| 2026-07-03 | Frontend será alterado via **script Lovable** (não editar o repo `beefood-whatsapp-react` diretamente). | Pedido do time. |

## Descobertas técnicas importantes

1. **O frontend já tem os dados que a extensão pede.** `Instancia.token` e
   `Instancia.base_url` chegam via `getNotificacoes`, mas são ignorados na UI hoje.
   → dá para automatizar sem digitação manual.
2. **A bridge já existe** e só precisa habilitar o host `*.beefood.com.br`
   (cobre `bot2.beefood.com.br/dashboard`; `appBridge.matches` em `customization.ts` + `manifest.json`).
3. **Nome da instância na uazapi = `{empresaID}_{filialID}`** (definido pelo cron).
4. **Watchdog do cron** faz delete+init de instâncias `disconnected` (limite de 20
   connects → delete). Cuidado: pode conflitar com sessão recém-importada se o status
   não for atualizado para `connected` a tempo.
5. **`normalizeBaseUrl`** (`src/shared/url.ts`) aceita nome curto, host ou URL https
   completa como `client`; rejeita `http://`, `localhost`, `127.*` no build de produção.
6. Contrato de import é feito em **chunks por seção** (`sessions`, `identities`,
   `senderKeys`, `preKeys`, `appStateSyncKeys`, `appState`, `contacts`, `privacyTokens`,
   `nctSalt`, e histórico opcional). Backend e extensão precisam concordar nas seções.

## Riscos / pontos em aberto

- [ ] Confirmar, em teste real, que o webhook marca `connected` durante a janela `importing`
      de 10 min (senão a instância pode ser reciclada após expirar).
- [ ] Validar que o `externally_connectable` funciona com extensão **unpacked** (ID muda a
      cada carga; a bridge por `postMessage` não depende de ID e é o caminho primário).
- [ ] Definir política de token no navegador (bridge direta) com o time de segurança.
- [ ] Ícones/marca Beefood (assets) para `icons/` e `store-assets/` (Fase 1).
- [ ] Estratégia de versionamento do fork vs. versão do upstream.
- [ ] Publicar a extensão (Chrome Web Store) para ter um ID estável (habilita `externally_connectable`).

## Log de sessões

### 2026-07-03 — Botão "Desligar conexão" (destravar operador)
- **Dor:** operador que clica no método errado (QR) fica preso — só existia "Reiniciar
  conexão", que recria a instância e volta a gerar QR (loop).
- **Backend (cron) — endpoint novo, sem afetar o fluxo atual:**
  - `desligarInstancia(empresaID, filialID)` em `instances.js`: `deleteInstance` +
    `resetConnectCounter` + limpa `importing_until` (best-effort) + `refresh()`. **Não** chama
    `init()` → filial fica desconectada/limpa. Idempotente.
  - Controller `instanciaDesligarPOST.js`; rota
    `POST /api/rest/whatsapp/instancia/desligar/:empresaID/:filialID`.
  - `node --check` OK nos 3 arquivos. Nenhum comportamento existente alterado.
- **Frontend:** novo script Lovable `docs/integracao/frontend-lovable-desligar-conexao.md`
  (adiciona `api.desligarInstancia` + botão "Desligar conexão" com confirmação no
  WhatsAppConnectionModal, toast e fecha o modal). Frontend não é editado direto aqui.

### 2026-07-03 — Detecção da extensão no Lovable (iframe/preview)
- **Sintoma:** frontend no Lovable mostrando "extensão não detectada". **Não foi regressão**:
  a bridge (`app-bridge.ts`, PING→CONNECTOR_READY) e as `matches` continuavam iguais.
- **Causas reais:** (1) recarregar a extensão não reinjeta o content script em abas já abertas
  → precisa dar F5 no frontend; (2) o **preview do editor Lovable roda o app em iframe** e em
  domínios `*.lovableproject.com`/`*.lovable.dev` (fora do nosso `*.lovable.app`), e o content
  script só injetava no frame principal.
- **Correção (robustez):** `manifest.json` + `customization.ts`:
  - adicionados `https://*.lovableproject.com/*` e `https://*.lovable.dev/*` em `host_permissions`,
    `externally_connectable.matches` e nas `matches` do content script `app-bridge.js`;
  - `app-bridge.js` agora com **`all_frames: true`** (injeta também em iframes → preview Lovable).
- **No domínio real `bot2.beefood.com.br`** já funcionava (top-frame, coberto por `*.beefood.com.br`).
- Build OK. Após recarregar a extensão, **dar F5 na página do frontend**.

### 2026-07-03 — Painel só abre pelo nosso fluxo
- **Problema:** o painel abria em TODA visita ao `web.whatsapp.com` porque `autoOpenPanel`
  tinha padrão `true`.
- **Correção:** padrão agora `false` em `src/content/index.ts`
  (`DEFAULT_USER_SETTINGS.autoOpenPanel = false` e `normalizeUserSettings` → `raw.autoOpenPanel === true`).
- **Sinal de "compreensão" já existente:** o painel abre apenas quando a aba é aberta pelo nosso
  fluxo, i.e. com o hash `#client=…&token=…&auto=1` (injetado pela bridge/background em
  `openWhatsAppWithAutofill`). `applyAutofillFromUrl()` detecta isso (`changed=true`) e só então abre
  + agenda o auto-import. Também abre por clique manual no ícone (fallback).
- **Nota:** quem testou antes e salvou `userSettings` com o toggle ligado pode precisar
  desmarcar "Abrir painel automaticamente" 1x (ou limpar storage da extensão).
- Validado: typecheck + 10/10 testes + build OK.

### 2026-07-03 — UX automática (modo simples) + fechar aba
- **Painel repensado para fluxo automático.** No modo padrão (não-técnico) a extensão
  agora esconde os campos técnicos e mostra um bloco central com spinner + estado.
  - `src/content/panel/template.ts`: novo `#autoPanel` (spinner `.auto-spinner` + `#autoStatus`);
    campos `#clientField`/`#tokenField`/`#includeHistoryOption` marcados `.field-advanced`
    (só aparecem no modo técnico); classe `.panel.simple` esconde avançados e transforma o
    `#importButton` num **fallback discreto** ("Conectar manualmente").
  - `src/customization.ts`: `importDefaults.includeHistory = false`; novos textos em `panelText`
    (`autoWaiting`, `autoDetecting`, `autoMigrating`, `autoDone`, `autoClosing`, `autoTimeout`,
    `autoNoCredentials`, `fallbackButton`).
  - `src/content/index.ts`: `setAutoStatus()` controla mensagem + estado do spinner
    (waiting/working/done/error); `setDevMode` alterna a classe `.simple` e o rótulo do botão;
    `scheduleAutoImport`/`startImport`/`handlePortMessage` atualizam o estado automático.
- **Fechar a aba após migrar (modo simples):** `handleSimpleSuccess()` mostra "concluído" e
  chama `closeCurrentTab()` → `chrome.runtime.sendMessage({ type: closeTab })`.
  - `src/shared/config.ts`: `CONTENT_MESSAGE_TYPES.closeTab`.
  - `src/background/index.ts`: handler no `onMessage` que faz `chrome.tabs.remove(sender.tab.id)`
    (não exige permissão extra; `chrome.tabs.remove` funciona sem a permissão "tabs").
- **Modo técnico intacto:** 5 cliques no logo revelam todos os campos/botões e **não** fecha a aba.
- Validado: typecheck + 10/10 testes + build OK. Sem lints.

### 2026-07-03 — Branding Beefood (Fase 1)
- **Rebrand completo da extensão.** Nome `manifest.json` → "Beefood — Conectar WhatsApp",
  `description` PT, `default_title`, versão bump **0.2.1 → 0.3.0** (também no `package.json`).
- **Cor de marca:** accent do painel (`src/content/panel/template.ts`) trocado para o vermelho
  oficial **`#ef3f37`** (baseado no `--primary` do `beefood-web-react`), com tom mais claro `#ff4d43`
  no tema escuro. **Verde mantido** em `--connector-ok` (estados de sucesso/"conectado"), atendendo
  ao pedido de explorar vermelho + verde.
- **Ícones:** mascote abelha do Beefood. `assets/icon-master.png` gerado a partir de
  `beefood-web-react/public/images/beefood-icon.png`; `scripts/make-icons.mjs` (`npm run icons`,
  usa `sharp` devDep) recorta e gera `icons/icon-16/32/48/128.png`.
- **Texto:** `panelText.title` → "Beefood · Conectar WhatsApp".
- Validado: typecheck + 10/10 testes + build OK. Carregar `dist/` no Chrome.
- **Como carregar no Chrome:** `chrome://extensions` → Modo desenvolvedor → "Carregar sem
  compactação" → selecionar a pasta **`dist/`** (NÃO a raiz; os `.js` só existem após `npm run build`).

### 2026-07-03 — Correção do domínio do frontend (bot2)
- URL real do frontend: **`https://bot2.beefood.com.br/dashboard`** (era referenciado como `bot.beefood.com.br`).
- **Sem mudança funcional no manifest/customization:** o match `https://*.beefood.com.br/*`
  já cobre `bot2` e qualquer subdomínio futuro. Ajustados apenas comentários (`customization.ts`,
  `background/index.ts`) e a documentação (spec, README, ecossistema, lovable-script, upstream-merge, plano, memória).

### 2026-07-03 — Reorganização da documentação
- `docs/` reorganizada em subpastas: `arquitetura/`, `planejamento/`, `integracao/`,
  `operacao/`, com `memoria.md` na raiz e novo `docs/README.md` (índice de navegação).
- Arquivos renomeados: `endpoint-preparar-importacao.md` → `integracao/backend-endpoint-preparar-importacao.md`;
  `lovable-script-frontend.md` → `integracao/frontend-lovable-script.md`.
- Referências cruzadas atualizadas em `spec.md` e nos docs. Nenhum conteúdo técnico perdido.

### 2026-07-03 — Endpoint do cron + externally_connectable
- **Manifest da extensão atualizado:** `host_permissions` agora cobre `web.whatsapp.com`,
  `*.uazapi.com` (MANTIDO — necessário para o upload direto à uazapi), `*.beefood.com.br`,
  `*.lovable.app`, `http://localhost/*`. Adicionado `externally_connectable` (beefood,
  lovable, localhost). Content script `app-bridge.js` injeta nesses hosts.
  - **Nota:** match patterns do Chrome **ignoram porta**; `localhost:8080` vira
    `http://localhost/*` (cobre qualquer porta). `*.uazapi.com` foi mantido de propósito
    (a lista enviada tinha removido, mas sem ele o upload quebra por CORS).
- **background/index.ts:** novo handler `chrome.runtime.onMessageExternal` (PING +
  START_IMPORT/OPEN_WHATSAPP) para o canal direto do `externally_connectable`, além da
  bridge por postMessage. Revalidado: typecheck + 10/10 testes + build OK.
- **Cron (`beefood-server-whatsapp-cron`) — endpoint novo IMPLEMENTADO:**
  - Rota `POST /api/rest/whatsapp/instancia/preparar-importacao/:empresaID/:filialID`.
  - `prepararInstanciaParaImport`: sincroniza, exige que não esteja `connected`, faz
    `initWithoutConnect` (init SEM connect → uazapi `disconnected`), marca DB `status='importing'`
    + `importing_until` (best-effort). Retorna `{ base_url, token, status, importing_minutes }`.
  - `isInImportWindow` protege as limpezas agendadas (`clearDisconnectedInstances`);
    o watchdog principal já ignora pois só age em `disconnected`.
  - Resiliente: se a coluna `importing_until` não existir, o helper de leitura retorna
    objeto não-array → guarda vira no-op e o comportamento atual dos 90% é preservado.
  - `node --check` OK; sem lints. **Pendente: migration `ADD COLUMN importing_until`.**
- **Nenhum endpoint/rotina existente teve comportamento alterado.**

### 2026-07-03 — Extensão funcional para o ecossistema Beefood
- **Ambiente:** máquina tem nvm-windows; Node 16 era o default e o projeto exige Node ≥20.
  Após `nvm use 20` (ficou v22.16.0), `npm install` + typecheck + test + build OK.
- **Mudanças na extensão (implementadas e validadas):**
  - `customization.ts` + `manifest.json`: bridge habilitada em `https://bot.beefood.com.br/*`
    (host_permissions + content_scripts do `app-bridge.js`).
  - Novo parâmetro `auto` no hash (`#client=&token=&auto=1`) e na bridge (`START_IMPORT { auto }`):
    `config.ts` (AUTOFILL_PARAMS.auto), `url.ts` (parse/remoção), `background/index.ts`
    (propaga no `openWhatsAppWithAutofill`), `app-bridge.ts` (repassa `auto`).
  - `content/index.ts`: `scheduleAutoImport()` — quando chega com `auto`, aguarda o login no
    WhatsApp Web (poll 1.5s, teto 180s) e inicia a migração sozinho.
  - Teste `test/core.test.ts` atualizado para o novo campo `auto`. **10/10 testes passam.**
- **Docs criadas:** `docs/integracao/backend-endpoint-preparar-importacao.md` (spec do endpoint novo no cron)
  e `docs/integracao/frontend-lovable-script.md` (prompt Lovable p/ modal de 2 opções).
- **Pendências:** implementar o endpoint `preparar-importacao` no cron (com flag/TTL
  `importing_until` + guarda no watchdog) e rodar o script Lovable no frontend.
- **Não feito de propósito:** branding/layout (é o último passo).

### 2026-07-03 — Setup inicial e estudo
- Clonados `whatsapp-web-session-importer-uazapi` e `beefood-whatsapp-react`; os outros
  dois (`beefood-server-whatsapp-cron`, `beefood-server-whatsapp-api`) já existiam em `C:\projetos`.
- Estudo completo dos 4 projetos (ver `docs/arquitetura/ecossistema-beefood.md`).
- Criada a estrutura de memória (reorganizada em 2026-07-03; ver `docs/README.md`).
- Configurado remote `upstream` (push desabilitado); `main` em sync com `upstream/main`.
- **Nenhuma alteração de código da extensão feita ainda** (aguardando início da Fase 1).

<!-- Adicione novas entradas de sessão acima desta linha, mais recentes no topo ou ao final (mantenha consistente). -->
