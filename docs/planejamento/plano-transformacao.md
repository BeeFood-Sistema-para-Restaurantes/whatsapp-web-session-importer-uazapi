# Plano de transformação — fork Beefood

> Roadmap para transformar a extensão da uazapi numa extensão da Beefood, mais
> automatizada e integrada ao ecossistema. Atualize o status das fases conforme avança.

## Princípios

- **Isolar customização em `src/customization.ts`** sempre que possível (facilita merge do upstream).
- **Não quebrar o fluxo genérico** (link `#client=&token=` + painel manual) — ele é o fallback.
- **Automatizar por camadas:** cada fase entrega valor sozinha e é reversível.
- Seguir Clean Architecture / separação de responsabilidades.

## Fase 0 — Memória e base (CONCLUÍDA)

- [x] Estudar os 4 projetos do ecossistema.
- [x] Criar `spec.md` e `docs/` (ecossistema, memória, plano, skill de upstream).
- [x] Configurar remote `upstream` (push desabilitado) e confirmar sync.

> **Ordem ajustada pelo time (2026-07-03):** priorizar **extensão funcional** (Fase 2)
> ANTES do branding (Fase 1). Layout/identidade é o último passo.

## Progresso atual (2026-07-03)

- [x] Bridge habilitada em `*.beefood.com.br` (cobre `bot2.beefood.com.br/dashboard`) (Fase 2a).
- [x] Auto-início da migração via `auto=1` no hash/bridge (Fase 2b — parte da extensão).
- [x] Extensão builda e passa nos testes (10/10) no Node ≥20.
- [x] Spec do endpoint novo do cron: `docs/integracao/backend-endpoint-preparar-importacao.md`.
- [x] Script Lovable do frontend (modal 2 opções): `docs/integracao/frontend-lovable-script.md`.
- [x] `externally_connectable` + hosts (beefood/lovable/localhost) no manifest + handler externo.
- [x] **Implementado** endpoint `preparar-importacao` no cron (`initWithoutConnect` +
      `status=importing` + `importing_until` + guarda `isInImportWindow`).
- [ ] Rodar a migration `ALTER TABLE whatsapp.instancia ADD COLUMN importing_until DATETIME NULL`.
- [ ] Rodar o script Lovable no `beefood-whatsapp-react`.
- [ ] Teste ponta a ponta com 1 filial.

## Fase 1 — Identidade Beefood (branding) — (CONCLUÍDA em 2026-07-03)

Arquivos: `src/customization.ts`, `manifest.json`, `icons/`, `src/content/panel/template.ts`, `scripts/make-icons.mjs`.

- [x] `manifest.json`: `name` = "Beefood — Conectar WhatsApp", `description` PT, `default_title`, `version` 0.3.0.
- [x] `src/customization.ts` → `panelText.title` = "Beefood · Conectar WhatsApp".
- [x] Ícones Beefood (mascote abelha) em `icons/` (16/32/48/128), gerados por `scripts/make-icons.mjs`
      (`npm run icons`) a partir de `assets/icon-master.png`.
- [x] Accent do painel = vermelho de marca `#ef3f37` (light+dark); verde mantido nos estados de sucesso.
- [ ] (Opcional) Atualizar `README.md`/`PRIVACY.md` para a Beefood (sem quebrar créditos do upstream).

Critério de pronto: extensão builda (`npm run build`), painel abre no WhatsApp Web com
a identidade Beefood, fluxo manual continua funcionando. **OK.**

## Fase 2 — Extensão "esperta" no ecossistema

### 2a. Habilitar a bridge no domínio Beefood
- [ ] `src/customization.ts` → `appBridge.matches`: adicionar `https://*.beefood.com.br/*` (cobre `bot2.beefood.com.br/dashboard`).
- [ ] `manifest.json` → `host_permissions` e `content_scripts[app-bridge].matches`.
- [ ] `npm run build` e validar `PING` → `CONNECTOR_READY` no site.

### 2b. Detecção de contexto + automação no WhatsApp Web
- [ ] Ao chegar via bridge/URL com dados válidos, **esconder campos** `client`/`token`
      (modo "assistido Beefood") e mostrar status amigável.
- [ ] Opção de **auto-iniciar** a migração (sem o operador clicar em "Migrar sessão"),
      respeitando uma confirmação de segurança clara.
- [ ] Mensagens/estados de progresso adaptados ao fluxo Beefood.

### 2c. Integração no frontend `beefood-whatsapp-react` (outro repo)
- [ ] Em `WhatsAppConnectionModal.tsx`, detectar a extensão via `PING`.
- [ ] Botão "Importar sessão do WhatsApp Web" que envia
      `START_IMPORT { client: base_url, token }` (dados já vindos de `getNotificacoes`).
- [ ] Fallback: link direto `web.whatsapp.com/#client=...&token=...` quando a extensão não responder.
- [ ] (Registrar decisões desse repo aqui e na `memoria.md`.)

## Fase 3 — Robustez com cron/API

- [ ] Garantir que, após import, o status vire `connected` a tempo (via `fila_connection`
      ou update em `whatsapp.instancia`) para o watchdog do cron não fazer delete+init.
- [ ] Validar comportamento de `finish` (`connect_queued`) x reconexão do cron.
- [ ] Testar cenário real ponta a ponta (1 filial de teste).

## Fase 4 — Evoluções futuras (opcional)

- [ ] `importKey + gateway` na `beefood-server-whatsapp-api` (esconder token do navegador).
- [ ] Telemetria/erros amigáveis específicos Beefood.
- [ ] Publicação na Chrome Web Store com identidade Beefood.

## Sequência recomendada

`Fase 1` (branding, baixo risco) → `Fase 2a` (bridge no domínio) → `Fase 2b` (automação)
→ `Fase 2c` (frontend) → `Fase 3` (robustez) → `Fase 4` (evoluções).

## Mapa de "onde mexer" (referência rápida)

| Quero mudar | Arquivo |
|-------------|---------|
| Marca/textos do painel | `src/customization.ts` (`panelText`) |
| Nome/descrição/hosts da extensão | `manifest.json` |
| Domínio padrão da instância | `src/customization.ts` (`api.clientBaseDomain`) |
| Endpoints da API | `src/customization.ts` (`api.paths`) + `src/background/api.ts` |
| Hosts da bridge | `src/customization.ts` (`appBridge.matches`) + `manifest.json` |
| Leitura do hash `#client=&token=` | `src/shared/url.ts` |
| Comportamento do painel / automação | `src/content/index.ts` |
| Bridge (postMessage) | `src/content/app-bridge.ts` |
| Orquestração da importação | `src/background/index.ts` |
| Conversão do dump | `src/background/conversion.ts` |
| Chunks | `src/background/chunks.ts` |
