# Documentação — fork Beefood da extensão de importação de sessão WhatsApp

Este repositório (a extensão) **centraliza a memória e a documentação** de todo o esforço
de integração Beefood + uazapi, mesmo quando o trabalho toca os outros projetos.

## Por onde começar

1. **`../spec.md`** — stack, versões, estrutura de pastas e convenções do projeto.
2. **`memoria.md`** — memória viva: estado atual (snapshot), decisões, riscos e log de
   sessões. **Leia o "Estado atual" primeiro** para saber onde paramos.
3. Depois, o documento específico do que você vai fazer (mapa abaixo).

## Mapa da documentação

| Pasta / arquivo | O que é | Quando usar |
|-----------------|---------|-------------|
| `memoria.md` | Memória viva, decisões e log de sessões | Sempre, no início e no fim de cada sessão |
| `arquitetura/ecossistema-beefood.md` | Mapa dos 4 projetos e do contrato uazapi | Entender como tudo se conecta |
| `planejamento/plano-transformacao.md` | Roadmap em fases + "onde mexer" | Planejar/priorizar o próximo passo |
| `integracao/backend-endpoint-preparar-importacao.md` | Spec do endpoint novo no cron (implementado) | Backend / fluxo da Opção 2 |
| `integracao/frontend-lovable-script.md` | Prompt Lovable p/ modal de 2 opções no frontend | Alterar o `beefood-whatsapp-react` |
| `integracao/frontend-lovable-desligar-conexao.md` | Prompt Lovable p/ botão "Desligar conexão" | Destravar operador preso no QR |
| `operacao/upstream-merge.md` | Skill de acompanhar o upstream e mergear melhorias | Trazer mudanças da uazapi |

## Estrutura

```
docs/
├── README.md                 (este índice)
├── memoria.md                (memória viva / log de sessões)
├── arquitetura/
│   └── ecossistema-beefood.md
├── planejamento/
│   └── plano-transformacao.md
├── integracao/
│   ├── backend-endpoint-preparar-importacao.md
│   ├── frontend-lovable-script.md
│   └── frontend-lovable-desligar-conexao.md
└── operacao/
    └── upstream-merge.md
```

## Convenções da documentação

- Idioma: **português do Brasil**.
- Referências entre documentos são escritas relativas à raiz do repo (`docs/...`).
- Toda sessão de trabalho deve terminar com uma entrada nova em `memoria.md` e, quando
  fizer sentido, atualizar o "Estado atual" e o `planejamento/plano-transformacao.md`.
- Customização de fork mora em `src/customization.ts` (facilita merge do upstream).

## Resumo do objetivo

Transformar o fork da extensão da uazapi numa **extensão da Beefood**, mais automatizada,
que detecta o ecossistema (`bot2.beefood.com.br/dashboard`) e reduz a intervenção manual — mantendo o
**fluxo atual por QR Code 100% intacto** e adicionando a conexão via **WhatsApp Web
(extensão)** como uma segunda opção.
