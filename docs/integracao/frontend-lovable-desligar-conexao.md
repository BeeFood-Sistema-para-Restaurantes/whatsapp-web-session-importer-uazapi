# Script Lovable — botão "Desligar conexão" no `beefood-whatsapp-react`

> **Este repositório (a extensão) NÃO é o frontend.** Não edite `beefood-whatsapp-react`
> diretamente: cole o prompt abaixo no Lovable.
>
> Objetivo: destravar o operador que escolheu o método errado de conexão (ex.: clicou em
> QR Code e não vai usar). Hoje só existe **"Reiniciar conexão"**, que recria a instância e
> volta a gerar QR — prendendo o usuário no loop. Vamos adicionar **"Desligar conexão"**,
> que apenas encerra/limpa a instância e deixa a filial desconectada.

---

## Contexto técnico (para você entender antes de colar)

- **Reiniciar** chama `POST /instancia/restart/{empresaID}/{filialID}` (deleta + recria +
  reconecta → novo QR).
- **Desligar** (novo) chama `POST /instancia/desligar/{empresaID}/{filialID}` (deleta a
  instância na uazapi e limpa o banco; **não** recria). A filial volta ao estado
  desconectado e o operador pode escolher o método novamente.

Endpoint novo do cron (**já implementado** no backend):
```
POST https://whatsapp-cron.beetechapi.be/api/rest/whatsapp/instancia/desligar/{empresaID}/{filialID}
Auth: Basic beetech:1q2w3e4r  (o MESMO usado em src/services/api.ts)
-> { sucesso: true, mensagem: "Conexão desligada com sucesso", status: null }
```

Observação: após desligar, o polling de status que já existe (`AuthContext`, a cada ~3s)
vai refletir a filial como desconectada. Não crie polling novo.

---

## PROMPT PARA COLAR NO LOVABLE

```
Contexto: este é o app bot2.beefood.com.br/dashboard (React + Vite + TS, shadcn/ui +
Tailwind, react-query). Existe um WhatsAppConnectionModal que cria a instância e mostra o
QR Code, e nele já há um botão "Reiniciar conexão" que chama
api.reiniciarInstancia(empresaID, filialID).

Problema: quando o operador escolhe o QR Code por engano e vê que não vai usar, só temos
"Reiniciar conexão", que recria a instância e mostra QR de novo — ele fica preso. Precisamos
de um botão "Desligar conexão" que encerra a conexão e deixa a filial desconectada.

NÃO altere o comportamento atual do QR nem o botão "Reiniciar conexão". Apenas adicione o
que for descrito, preservando compatibilidade total.

Tarefas:

1) Em src/services/api.ts, adicionar um método novo seguindo EXATAMENTE o mesmo padrão de
   reiniciarInstancia (mesma base URL do cron e mesmos getAuthHeaders()):

   desligarInstancia: async (empresaID: number, filialID: number): Promise<void> => {
     const response = await fetch(
       `https://whatsapp-cron.beetechapi.be/api/rest/whatsapp/instancia/desligar/${empresaID}/${filialID}`,
       { method: "POST", headers: getAuthHeaders() }
     );
     if (!response.ok) {
       throw new Error("Erro ao desligar conexão");
     }
   },

2) No WhatsAppConnectionModal, adicionar um botão "Desligar conexão" ao lado do botão
   "Reiniciar conexão":
   - Estilo: variant="outline" com aparência destrutiva/vermelha (ex.: classe de texto
     vermelho), claramente secundário em relação ao fluxo principal, mas visível.
   - Ícone: PowerOff ou Unplug (lucide-react), se já estiver disponível no projeto.
   - Ao clicar: abrir um AlertDialog (shadcn) de confirmação com o texto:
     título "Desligar conexão?"
     descrição "Isso encerra a conexão desta filial com o WhatsApp. Você poderá conectar
     novamente quando quiser."
     botões: "Cancelar" e "Desligar" (destrutivo).
   - Ao confirmar: chamar api.desligarInstancia(empresaID, filialID). Enquanto carrega,
     desabilitar os botões e mostrar estado "Desligando...".
   - Sucesso: toast (sonner) "Conexão desligada com sucesso." e FECHAR o
     WhatsAppConnectionModal (chamar o onClose/onOpenChange já existente). NÃO reabrir QR.
   - Erro: toast de erro com a mensagem, mantendo o modal aberto.

3) Não criar polling novo de status. O AuthContext já faz polling e o header/avatar reflete
   o estado desconectado depois do desligamento.

4) Textos em português do Brasil, estilo visual consistente (shadcn/ui + Tailwind).

Critérios de aceite:
- O botão "Reiniciar conexão" continua igual.
- Existe um botão "Desligar conexão" que pede confirmação, chama o endpoint novo, mostra
  toast e fecha o modal.
- Após desligar, a filial aparece como desconectada (sem QR e sem loop).
- Nada do comportamento atual foi removido ou alterado.
```

---

## Notas de integração (para o time)

- Backend: rota `POST /api/rest/whatsapp/instancia/desligar/:empresaID/:filialID`
  (controller `instanciaDesligarPOST.js` → `desligarInstancia()` em
  `models/uazapi/instances/instances.js`). Faz `deleteInstance` + `resetConnectCounter` +
  limpa `importing_until` (best-effort). **Não** chama `init()`.
- Comportamento: se a instância estava `connected`, o desligar também faz logout do WhatsApp
  (a uazapi remove a instância). Se estava presa em `connecting`/QR, apenas limpa.
- Idempotente: chamar em uma filial já desconectada apenas garante o registro limpo.
