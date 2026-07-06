# spec.md — Extensão de Importação de Sessão WhatsApp (fork Beefood)

> Documento de referência técnica do projeto. Descreve stack, versões, estrutura de
> pastas e convenções. Deve ser lido no início de cada sessão de trabalho e mantido
> atualizado quando algo mudar.

## Identidade do projeto

- **Repositório (origin):** `git@github.com:BeeFood-Sistema-para-Restaurantes/whatsapp-web-session-importer-uazapi.git`
- **Upstream (original uazapi):** `https://github.com/uazapi/whatsapp-web-session-importer.git` (remote `upstream`, push desabilitado)
- **Natureza:** fork da extensão oficial da uazapi para Chrome/Edge (Manifest V3).
- **Objetivo do fork:** transformar em uma extensão com a cara da **Beefood**, mais
  automatizada, que detecta o ecossistema Beefood (`bot2.beefood.com.br/dashboard`) e reduz ao
  máximo a intervenção manual do operador.
- **Versão atual:** `0.2.1` (ver `manifest.json` e `package.json`).

## O que a extensão faz

Migra uma sessão já autenticada no **WhatsApp Web** para uma instância **uazapi**,
capturando o estado da sessão no navegador e enviando para a API da instância em
*chunks*, com confirmação/validação e limpeza da sessão local ao final.

## Stack e versões

| Item | Valor |
|------|-------|
| Tipo | Extensão Chrome/Edge, **Manifest V3** |
| Linguagem | TypeScript (`^6.0.3`) |
| Módulos | ESM (`"type": "module"`) |
| Bundler | esbuild (`^0.28.1`) via scripts próprios em `scripts/` |
| Testes | Vitest (`^4.1.9`) |
| Dep. runtime | `wa-store-migrate` `0.1.1`, `buffer` `^6.0.3` |
| Tipos | `@types/chrome` `^0.2.2` |
| Node/tsconfig | ver `tsconfig.json` |

### Permissões do manifest

- `permissions`: `activeTab`, `scripting`, `storage`
- `host_permissions`: `https://web.whatsapp.com/*`, `https://*.uazapi.com/*`
- `content_scripts`:
  - `autofill.js` em `https://web.whatsapp.com/*` (painel flutuante)
  - `app-bridge.js` em `https://*.uazapi.com/*` (bridge de detecção/automação)
- `background.service_worker`: `background.js`

## Scripts (package.json)

```
npm run typecheck        # tsc --noEmit
npm test                 # vitest run
npm run build:vendor     # node scripts/build-vendor.mjs
npm run build:extension  # node scripts/build-extension.mjs
npm run build            # vendor + extension  -> gera dist/
npm run zip              # typecheck + test + build + zip
npm run release          # alias de zip
```

### Saída do build (`dist/`)

```
dist/background.js
dist/autofill.js
dist/app-bridge.js
dist/manifest.json
dist/vendor/wa-store-migrate.bundle.js
```

Carregar em `chrome://extensions` (Modo desenvolvedor → "Carregar sem compactação" → pasta `dist`).

## Estrutura de pastas

```
whatsapp-web-session-importer-uazapi/
├── manifest.json              # Manifest V3
├── package.json / tsconfig.json
├── README.md / DEVELOPERS.md / CHANGELOG.md / PRIVACY.md
├── spec.md                    # (este arquivo)
├── docs/                      # memória e documentação do fork Beefood
│   ├── README.md              # índice de navegação da documentação
│   ├── memoria.md             # memória viva / log de sessões
│   ├── arquitetura/
│   │   └── ecossistema-beefood.md
│   ├── planejamento/
│   │   └── plano-transformacao.md
│   ├── integracao/
│   │   ├── backend-endpoint-preparar-importacao.md
│   │   └── frontend-lovable-script.md
│   └── operacao/
│       └── upstream-merge.md
├── icons/                     # ícones da extensão
├── scripts/                   # build-vendor.mjs, build-extension.mjs
├── store-assets/              # assets de publicação
├── test/                      # testes (vitest)
├── vendor/                    # bundle do wa-store-migrate
└── src/
    ├── customization.ts       # ★ ponto único de customização de fork
    ├── global.d.ts
    ├── shared/
    │   ├── config.ts          # constantes derivadas da customização
    │   ├── messages.ts        # protocolo de mensagens (portas/bridge)
    │   ├── types.ts
    │   └── url.ts             # normalização de subdomínio + hash #client=&token=
    ├── content/
    │   ├── index.ts          # painel flutuante no WhatsApp Web (autofill.js)
    │   ├── app-bridge.ts     # bridge postMessage no SaaS (app-bridge.js)
    │   ├── page/whatsapp-page.ts
    │   └── panel/            # template.ts, icons.ts (UI do painel)
    └── background/
        ├── index.ts          # orquestração da importação (service worker)
        ├── api.ts            # contrato HTTP com a API uazapi
        ├── chunks.ts         # divisão do payload em chunks por seção
        ├── conversion.ts     # dump WhatsApp Web -> payload whatsmeow
        ├── payload.ts
        ├── tab.ts
        └── page-scripts/     # funções autocontidas injetadas na página
            ├── clear-local-session.ts
            ├── extract-history.ts
            ├── extract-session.ts
            └── storage-inventory.ts
```

## Convenções e princípios

- **Clean Architecture / separação de responsabilidades** (regra do time):
  - orquestração → `src/background`
  - UI → `src/content`
  - funções injetadas na página (autocontidas) → `src/background/page-scripts`
  - helpers compartilhados fora da página → `src/shared`
- **Toda customização de fork deve ficar isolada em `src/customization.ts`** para
  facilitar merges do upstream. Evitar espalhar mudanças de marca/config pelo código.
- Idioma de comunicação e documentação: **português do Brasil**.

## Contrato com a API uazapi (resumo)

Auth por header `token`. Endpoints (base = `https://<subdomínio>.uazapi.com`):

```
GET  /instance/status
POST /instance/import-web-session/start
POST /instance/import-web-session/chunk
POST /instance/import-web-session/finish
POST /instance/import-web-session/history
```

Detalhes de payload e decisões em `DEVELOPERS.md` e `docs/arquitetura/ecossistema-beefood.md`.

## Referências rápidas

- Índice da documentação: `docs/README.md`
- Guia técnico completo do upstream: `DEVELOPERS.md`
- Mapa do ecossistema Beefood: `docs/arquitetura/ecossistema-beefood.md`
- Memória/aprendizados: `docs/memoria.md`
- Roadmap do fork: `docs/planejamento/plano-transformacao.md`
- Rotina de merge do upstream: `docs/operacao/upstream-merge.md`
