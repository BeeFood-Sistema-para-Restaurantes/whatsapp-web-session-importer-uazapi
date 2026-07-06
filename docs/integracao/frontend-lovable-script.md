# Script Lovable — adicionar 2 modos de conexão no `beefood-whatsapp-react`

> **Este repositório (a extensão) NÃO é o frontend.** Não edite `beefood-whatsapp-react`
> diretamente: cole o prompt abaixo no Lovable para que ele faça as alterações.
>
> Objetivo: manter o fluxo atual (QR) 100% intacto e adicionar uma **segunda opção** de
> conexão via a extensão do navegador (WhatsApp Web), escolhida pelo operador.

---

## Contexto técnico (para você entender antes de colar)

- Hoje: clicar no avatar/logo da filial abre direto o `WhatsAppConnectionModal`, que
  chama `api.criarInstancia()` e faz polling do QR.
- Novo: clicar no avatar abre primeiro um **modal de escolha** com 2 opções:
  - **Opção 1 — QR Code (atual):** abre o `WhatsAppConnectionModal` exatamente como hoje.
  - **Opção 2 — WhatsApp Web (extensão):** novo fluxo que usa a extensão do navegador.
- A extensão expõe uma **bridge** via `window.postMessage` no domínio `bot2.beefood.com.br`
  (o app roda em `https://bot2.beefood.com.br/dashboard`).
- No fluxo da Opção 2, o front chama um **endpoint novo** no cron que prepara a instância
  (init sem connect) e devolve `base_url` + `token`; depois manda a extensão importar.

Protocolo da bridge da extensão (fixo):
- `source` / `target` das mensagens: `"whatsapp-session-connector"`.
- Detecção: front envia `{ target: "whatsapp-session-connector", type: "PING" }` →
  extensão responde `{ source: "whatsapp-session-connector", type: "CONNECTOR_READY", version }`.
- Iniciar: front envia `{ target: "whatsapp-session-connector", type: "START_IMPORT", client, token, auto }` →
  extensão responde `IMPORT_TAB_OPENED` ou `IMPORT_TAB_ERROR`.
  - `client` = `base_url` completo (ex.: `https://beefoodwhatsappN.uazapi.com`).
  - `token` = token da instância.
  - `auto` = `true` (a extensão inicia a migração sozinha após o login no WhatsApp Web).
- Fallback sem extensão: abrir `https://web.whatsapp.com/#client=<base_url>&token=<token>&auto=1`.

Endpoint novo do cron (**já implementado** no backend; ver `docs/integracao/backend-endpoint-preparar-importacao.md`):
```
POST https://whatsapp-cron.beetechapi.be/api/rest/whatsapp/instancia/preparar-importacao/{empresaID}/{filialID}
Auth: Basic beetech:1q2w3e4r (igual ao restante de api.ts)
-> { sucesso: true, base_url, token, status: "importing", importing_minutes: 10 }
```
Observação: este endpoint cria a instância na uazapi SEM conectar (fica pronta para a
extensão importar) e reserva a instância por ~10 min contra o watchdog. Se a instância já
estiver `connected`, retorna erro (o operador deve usar o fluxo normal/Reiniciar).

---

## PROMPT PARA COLAR NO LOVABLE

```
Contexto: este é o app bot2.beefood.com.br/dashboard (React + Vite + TS, shadcn/ui + Tailwind,
react-query). Hoje, ao clicar no avatar/logo de uma filial no Header (desktop e mobile),
abrimos diretamente o WhatsAppConnectionModal, que cria a instância e mostra o QR Code.

Objetivo: manter 100% o fluxo atual e adicionar uma segunda forma de conexão via uma
extensão do navegador (WhatsApp Web). O operador deve ESCOLHER entre as duas.

NÃO altere o comportamento do WhatsAppConnectionModal atual nem a api existente. Apenas
adicione o que for descrito. Preserve compatibilidade total.

Tarefas:

1) Criar um novo componente ConnectionMethodModal (modal de escolha) usando os
   componentes de UI já existentes (Dialog do shadcn). Ele recebe a filial selecionada e
   mostra 2 cards/opções:
   - Opção 1: "QR Code" (badge "Recomendado"): descrição curta "Escaneie o QR Code com o
     WhatsApp do celular (como sempre)". Ao selecionar, fecha este modal e abre o
     WhatsAppConnectionModal atual, exatamente com o comportamento de hoje.
   - Opção 2: "WhatsApp Web (extensão)": descrição "Conecte usando o WhatsApp Web do
     navegador, sem depender do QR da instância. Requer a extensão Beefood instalada."
     Ao selecionar, inicia o fluxo da extensão (ver item 3).

2) Alterar o Header (desktop: src/components/Header.tsx; mobile:
   src/components/mobile/MobileHeader.tsx) para que o clique no avatar da filial abra o
   ConnectionMethodModal em vez de abrir o WhatsAppConnectionModal diretamente. Manter os
   estados existentes (selectedFilialForConnection / isConnectionModalOpen) e adicionar
   um novo estado para o modal de escolha. O WhatsAppConnectionModal continua sendo aberto
   pela Opção 1.

3) Criar um hook useExtensionImport (ou funções em src/services/) que implemente o fluxo
   da Opção 2:
   a) Detectar a extensão via postMessage com timeout de ~1500ms:
      - enviar window.postMessage({ target: "whatsapp-session-connector", type: "PING" }, "*")
      - resolver instalado=true ao receber um message com
        event.data.source === "whatsapp-session-connector" && event.data.type === "CONNECTOR_READY".
   b) Se instalada: chamar o endpoint novo do backend para preparar a instância:
      POST https://whatsapp-cron.beetechapi.be/api/rest/whatsapp/instancia/preparar-importacao/{empresaID}/{filialID}
      usando os MESMOS headers de auth Basic já usados em src/services/api.ts
      (Authorization: Basic base64("beetech:1q2w3e4r")). A resposta traz { base_url, token }.
   c) Enviar para a extensão:
      window.postMessage({
        target: "whatsapp-session-connector",
        type: "START_IMPORT",
        client: base_url,   // URL completa https://...uazapi.com
        token: token,
        auto: true
      }, "*")
      e ouvir a resposta (source "whatsapp-session-connector"): "IMPORT_TAB_OPENED"
      (sucesso: a extensão abriu o WhatsApp Web) ou "IMPORT_TAB_ERROR" (mostrar erro).
   d) Se a extensão NÃO responder ao PING (não instalada), mostrar um aviso com:
      - link/botão "Instalar extensão Beefood" (deixar href="#" como placeholder por ora);
      - botão "Abrir WhatsApp Web mesmo assim" que abre em nova aba:
        https://web.whatsapp.com/#client={base_url}&token={token}&auto=1
        (obs: para o fallback também é preciso chamar o endpoint preparar-importacao antes,
         para obter base_url e token).

4) UX da Opção 2 (dentro do ConnectionMethodModal ou em um sub-modal):
   - Ao escolher a Opção 2, mostrar estados: "Verificando extensão..." ->
     "Preparando instância..." -> "Abrindo WhatsApp Web..." -> instrução:
     "Escaneie o QR do WhatsApp Web e aguarde. A migração é automática."
   - Não implementar polling de status novo se já existir (o AuthContext já faz polling de
     status das filiais a cada 3s e o header mostra verde quando conecta). Reaproveite.
   - Tratar erros com toast (sonner já está no projeto) e mensagens claras em pt-BR.

5) Não introduzir variáveis de ambiente novas se o projeto não usa .env (ele não usa;
   URLs/credenciais ficam hardcoded em src/services/api.ts). Adicione a URL do endpoint
   novo seguindo o mesmo padrão do arquivo.

6) Textos em português do Brasil. Estilo visual consistente com o app (shadcn/ui + Tailwind).

Critérios de aceite:
- Clicar no avatar abre o modal de escolha.
- Opção 1 reproduz EXATAMENTE o fluxo QR atual (nada mudou nele).
- Opção 2 detecta a extensão, prepara a instância, dispara a importação e dá feedback.
- Sem extensão, há fallback por link direto do WhatsApp Web.
- Nada do comportamento atual foi removido ou alterado.
```

---

## Detecção da extensão — ambiente de teste (IMPORTANTE)

- A detecção usa `postMessage` (PING→CONNECTOR_READY), que depende do content script
  `app-bridge.js` estar injetado **na mesma janela** onde o app roda.
- **Sempre dê F5 na página do frontend após recarregar a extensão** — o content script não
  é reinjetado em abas que já estavam abertas.
- **Preview do editor Lovable roda em iframe** e em domínios `*.lovableproject.com` /
  `*.lovable.dev`. Por isso o manifest inclui esses hosts e o `app-bridge.js` usa
  `all_frames: true`. Domínios cobertos hoje: `*.beefood.com.br`, `*.lovable.app`,
  `*.lovableproject.com`, `*.lovable.dev`, `localhost` (sem porta na match pattern).
- Em produção (`bot2.beefood.com.br/dashboard`) é top-frame e já funciona.

## Notas de integração (para o time)

- O `client` enviado para a extensão deve ser a **URL completa** (`base_url`), pois é o
  que o backend Beefood conhece. A extensão aceita URL https completa (ver
  `normalizeBaseUrl` em `src/shared/url.ts`).
- `auto: true` faz a extensão iniciar a migração automaticamente após o login no
  WhatsApp Web (ver `scheduleAutoImport` em `src/content/index.ts`).
- O endpoint `preparar-importacao` **precisa existir** para a Opção 2 funcionar
  (`docs/integracao/backend-endpoint-preparar-importacao.md`). Enquanto ele não existir, a Opção 2 pode ser
  exibida como "em breve" ou apontar para um mock.
- Segurança: neste desenho o `token` trafega no navegador do operador (decisão registrada
  em `docs/memoria.md`). A alternativa `importKey + gateway` fica como evolução futura.
