# Endpoint novo (cron): preparar instância para importação via extensão

> Especificação do endpoint que habilita o fluxo "Conectar via WhatsApp Web (extensão)".
> **NÃO altera nenhum endpoint atual.** É um caminho novo, paralelo ao fluxo QR.
> Local: `beefood-server-whatsapp-cron` (dono do ciclo de vida das instâncias uazapi).
>
> STATUS: **IMPLEMENTADO** em 2026-07-03 (falta apenas rodar a migration do banco).
> - Rota: `src/api/routes/whatsappRouter.js`
> - Controller: `src/api/controllers/whatsapp/instanciaPrepararImportacaoPOST.js`
> - Model: `prepararInstanciaParaImport` + `initWithoutConnect` + `isInImportWindow` em
>   `src/models/uazapi/instances/instances.js`
> - Guarda no watchdog: `clearDisconnectedInstances` pula instâncias em `importing_until`.
>   (O watchdog principal `processaDisconnectedInstances` já ignora naturalmente, pois só
>   age em status `disconnected`, e a instância preparada fica em `importing`.)
>
> Resposta real do endpoint:
> ```json
> { "sucesso": true, "base_url": "https://...uazapi.com", "token": "...",
>   "status": "importing", "importing_minutes": 10 }
> ```
>
> AÇÃO PENDENTE (DBA): rodar a migration `ALTER TABLE ... ADD COLUMN importing_until`
> (ver seção "Migration de banco"). Sem ela, o status `importing` já protege o watchdog
> principal; a coluna adiciona proteção também às limpezas agendadas (05:00/13:30/4h).

## Por que precisamos dele

A extensão só importa a sessão se a instância uazapi estiver **`disconnected`** (ou
`importing`). Ver `verifyInstanceForImport` em `src/background/api.ts` (deste repo):

- aceita apenas `status ∈ { disconnected, importing }`;
- rejeita `connected`/`loggedIn`/`connecting`.

No fluxo atual (`criarInstancia`), o cron faz `/instance/init` **+ `/instance/connect`**
imediatamente (instância vai para `connecting`, mostrando o QR da uazapi). Além disso, o
watchdog `processaDisconnectedInstances` (loop 2s em `cronConnection.js`) recria via
**delete + init** qualquer instância `disconnected`.

Portanto o fluxo da extensão precisa de um endpoint que:
1. garanta a instância **existindo** e **`disconnected`** (init **sem** connect);
2. **sinalize ao watchdog para não mexer** durante a janela de importação;
3. devolva `base_url` + `token` para o front repassar à extensão.

## Contrato HTTP

```
POST /api/rest/whatsapp/instancia/preparar-importacao/:empresaID/:filialID
Auth: Basic (mesma do restante: beetech / 1q2w3e4r)
```

### Resposta de sucesso (200)

```json
{
  "sucesso": true,
  "base_url": "https://beefoodwhatsappN.uazapi.com",
  "token": "TOKEN_DA_INSTANCIA",
  "status": "importing",
  "importing_expira_em": "2026-07-03T18:10:00.000Z"
}
```

### Erros

```json
{ "sucesso": false, "erro": "mensagem amigável" }
```

## Regras de negócio

1. **Reuso vs. criação:**
   - Se a instância já existe na uazapi e está `connected`: retornar erro amigável
     ("Instância já conectada; use 'Reiniciar' para reconectar") OU, se o operador quiser
     migrar mesmo assim, exigir uma ação explícita (fora do escopo inicial).
   - Se existe e está `connecting`/`disconnected`: **não** chamar `connect`; garantir
     `disconnected` e marcar `importing`.
   - Se não existe: `POST /instance/init` (escolhendo servidor com menos conexões, como
     em `init()`), persistir, **sem** `connect`.
2. **Marcar `importing`:** gravar estado que o watchdog reconheça e ignore, com **TTL**
   (sugestão 5–10 min). Duas opções de implementação:
   - **Opção A (recomendada):** novo campo `importing_until DATETIME NULL` em
     `whatsapp.instancia`. Watchdog ignora instâncias com `importing_until > NOW()`.
   - **Opção B:** usar `status = 'importing'` + coluna de timestamp. Requer garantir que
     nenhuma outra rotina trate `importing` como conectável.
3. **TTL/expiração:** ao expirar, o watchdog volta a cuidar normalmente (reconecta).
4. **Idempotência:** chamar duas vezes seguidas deve apenas renovar o `importing_until`
   e devolver o mesmo `base_url`/`token`.

## Ajuste ADITIVO no watchdog (não muda os 90%)

Em `src/routines/cronConnection.js` → `processaDisconnectedInstances`, adicionar guarda:

```js
// pular instâncias em janela de importação pela extensão
if (instance.importing_until && new Date(instance.importing_until) > new Date()) {
  continue; // watchdog não mexe durante o import
}
```

Instâncias comuns (`connected`/`disconnected` sem `importing_until`) seguem exatamente
como hoje. O comportamento só muda para instâncias marcadas pelo endpoint novo.

## Esboço de implementação (referência)

Rota (`src/api/routes/whatsappRouter.js` — adicionar; não remover as existentes):

```js
router.post(
  '/instancia/preparar-importacao/:empresaID/:filialID',
  require('../controllers/whatsapp/instanciaPrepararImportacaoPOST')
);
```

Controller (`src/api/controllers/whatsapp/instanciaPrepararImportacaoPOST.js` — novo):

```js
const { prepararInstanciaParaImport } = require('../../../models/uazapi/instances/instances');

module.exports = async (req, res) => {
  const { empresaID, filialID } = req.params;
  try {
    const dados = await prepararInstanciaParaImport(Number(empresaID), Number(filialID));
    // dados = { base_url, token, status, importing_expira_em }
    return res.status(200).json({ sucesso: true, ...dados });
  } catch (e) {
    return res.status(400).json({ sucesso: false, erro: e.message || 'Falha ao preparar importação' });
  }
};
```

Model (`src/models/uazapi/instances/instances.js` — adicionar função `prepararInstanciaParaImport`):

Passos:
1. `clearDuplicateInstance()` (reaproveitar lógica existente) para sincronizar.
2. Descobrir se a instância existe (cache/`GET /instance/all`).
3. Se não existe → escolher servidor (menos conexões) → `POST /instance/init` (guardar
   `token`, `base_url`). **Não** chamar `connect`.
4. Se existe e `connected` → erro amigável (ou fluxo de confirmação, futuro).
5. Se existe e `connecting` → **não** chamar connect; deixar `disconnected` (se a uazapi
   tiver `/instance/disconnect`, usar; senão apenas não conectar e marcar importing).
6. `UPDATE whatsapp.instancia SET importing_until = DATE_ADD(NOW(), INTERVAL 10 MINUTE)`
   (ou via nova stored procedure) para a filial.
7. Retornar `{ base_url, token, status: 'importing', importing_expira_em }`.

Headers uazapi seguem o padrão do projeto: `token` (instância) + `admintoken` (servidor).

## Migration de banco (Opção A)

```sql
ALTER TABLE whatsapp.instancia
  ADD COLUMN importing_until DATETIME NULL DEFAULT NULL;
```

(Compatível com o resto: colunas novas nullable não afetam quem já lê/escreve.)

## Fluxo ponta a ponta (referência)

1. Front chama `POST .../preparar-importacao/:empresaID/:filialID`.
2. Cron garante instância `disconnected` + `importing_until` e devolve `base_url`+`token`.
3. Front detecta a extensão (`PING`) e envia `START_IMPORT { client: base_url, token, auto: true }`.
4. Extensão abre `web.whatsapp.com`, operador escaneia o **QR oficial do WhatsApp Web**.
5. Extensão valida (`disconnected` ✓), captura, envia chunks, `finish` → sessão migrada.
6. uazapi conecta com a sessão importada; webhook grava `connected` em `fila_connection`.
7. `importing_until` expira; watchdog volta ao normal.

## Checklist de implementação (quando for codar)

- [ ] `ALTER TABLE` adicionando `importing_until` (ou definir status `importing` + TTL).
- [ ] `prepararInstanciaParaImport()` no model (init sem connect + marcar importing).
- [ ] Controller + rota novos (não tocar nas rotas atuais).
- [ ] Guarda no watchdog (`processaDisconnectedInstances`) respeitando `importing_until`.
- [ ] Testar: fluxo QR atual continua idêntico; fluxo extensão funciona ponta a ponta.
- [ ] Registrar resultado em `docs/memoria.md`.
