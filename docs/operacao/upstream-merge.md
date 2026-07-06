# Skill: acompanhar o upstream (uazapi) e mergear melhorias

> Rotina para monitorar o repositório original da uazapi e trazer melhorias futuras
> para o nosso fork Beefood, minimizando conflitos. Siga este playbook sempre que for
> checar/atualizar em relação ao upstream.

## Remotes

| Remote | URL | Push |
|--------|-----|------|
| `origin` | `git@github.com:BeeFood-Sistema-para-Restaurantes/whatsapp-web-session-importer-uazapi.git` | habilitado |
| `upstream` | `https://github.com/uazapi/whatsapp-web-session-importer.git` | **DISABLED** (proposital) |

Se o `upstream` não existir num clone novo:

```bash
git remote add upstream https://github.com/uazapi/whatsapp-web-session-importer.git
git remote set-url --push upstream DISABLED
```

Branches relevantes do upstream: `main`, `development`, `codex/*`.

## 1. Verificar se há novidades no upstream

```bash
git fetch upstream

# quantos commits estamos atrás/à frente de upstream/main (esquerda=nossos, direita=deles)
git rev-list --left-right --count main...upstream/main

# o que mudou lá que ainda não temos
git log --oneline main..upstream/main

# arquivos afetados pelas novidades
git diff --stat main..upstream/main
```

Se o resultado do `rev-list` for `X  0`, estamos em dia. Se for `X  Y` (Y>0), há
`Y` commits novos no upstream.

## 2. Avaliar impacto antes de mergear

- Ver se as mudanças tocam **arquivos que customizamos** (principalmente
  `src/customization.ts`, `manifest.json`, `icons/`, `README.md`, `PRIVACY.md`).
- Ver se tocam a **lógica central** (`src/background/*`, `src/shared/*`,
  `src/content/*`) — melhorias aqui costumam ser as mais valiosas (ex.: novas
  validações de segurança do WhatsApp).

```bash
# ver o diff de um arquivo específico entre nós e o upstream
git diff main..upstream/main -- src/background/index.ts
```

## 3. Estratégias de integração (escolha por caso)

### A) Merge completo (quando divergência é pequena / mudanças são gerais)
```bash
git checkout main
git pull origin main          # garantir main local atualizado
git checkout -b sync/upstream-YYYYMMDD
git merge upstream/main
# resolver conflitos (tipicamente em customization.ts / manifest.json)
npm install && npm run typecheck && npm test && npm run build
git push -u origin sync/upstream-YYYYMMDD
# abrir PR para main
```

### B) Cherry-pick (quando quero só melhorias específicas)
```bash
git checkout -b sync/cherry-YYYYMMDD
git log --oneline main..upstream/main       # achar os commits desejados
git cherry-pick <hash1> <hash2> ...
npm run typecheck && npm test && npm run build
git push -u origin sync/cherry-YYYYMMDD
```

### C) Rebase (evitar; só se o fork ainda tem poucos commits próprios)
Rebase reescreve histórico — não usar em `main` já compartilhado.

## 4. Resolver conflitos com nossa customização

- **Regra de ouro:** nossas mudanças de marca/config devem estar em
  `src/customization.ts`. Se o upstream mudar a *estrutura* de `EXTENSION_CUSTOMIZATION`,
  preserve nossos **valores** e adote a **nova forma** dele.
- `manifest.json`: manter nossos `name`/`description`/`icons` e nossos hosts extras
  (`*.beefood.com.br`, cobre `bot2.beefood.com.br`), mas incorporar novas `permissions`/`content_scripts` que o
  upstream adicionar.
- Se houver conflito em lógica central, prefira a versão do upstream e **reaplique por
  cima** apenas o que for específico Beefood (idealmente movendo para `customization.ts`).

## 5. Validar sempre antes de fechar o merge

```bash
npm install
npm run typecheck
npm test
npm run build
```

Carregar `dist/` no Chrome e testar:
1. Painel abre no `web.whatsapp.com`.
2. Fluxo manual `#client=&token=` funciona.
3. Bridge responde `PING` em `*.uazapi.com` e em `*.beefood.com.br` (ex.: `bot2.beefood.com.br/dashboard`).

## 6. Registrar na memória

Após cada sincronização, adicione uma entrada em `docs/memoria.md`:
- data, commits trazidos (hashes), conflitos resolvidos, e o que mudou de comportamento.

## 7. Comandos de diagnóstico rápido

```bash
git fetch upstream --prune
git branch -a                                  # ver branches locais/remotos
git log --oneline --graph --decorate -20       # topologia recente
git rev-list --left-right --count main...upstream/main
git diff --stat main..upstream/main
```

## Checklist resumido

- [ ] `git fetch upstream`
- [ ] Conferir divergência (`rev-list --left-right --count`)
- [ ] Ler `git log main..upstream/main` e `git diff --stat`
- [ ] Escolher estratégia (merge / cherry-pick)
- [ ] Trabalhar em branch `sync/...`
- [ ] Resolver conflitos preservando `customization.ts`/`manifest.json`
- [ ] `typecheck` + `test` + `build` + teste manual no Chrome
- [ ] Abrir PR e registrar em `docs/memoria.md`
