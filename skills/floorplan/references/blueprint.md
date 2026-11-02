# Blueprints: do objetivo à implementação

O blueprint conecta o que se pretende construir à arquitetura, às telas e ao código observado. Ele começa com um objetivo ou PRD e pode amadurecer antes de existir qualquer arquivo de implementação. Leia [planning.md](planning.md) para o fluxo de levantamento, revisão e entrega.

Os documentos autorais ficam na pasta privada `floorplan/` do projeto, ignorada pelo Git:
- `plan.json`: objetivo, escopo, requisitos, critérios, decisões, telas e detalhe técnico quando conhecido.
- `architecture.json`: responsabilidades, serviços externos, relações, fluxos e tour ([schema.md](schema.md)).
- `visuals.json` e `visuals/`: propostas e capturas reais, preservadas em suas versões.
- `baselines/`: versões locais imutáveis do escopo. Não são commits e não implicam aprovação do cliente.

`plan.mjs` compila o planejamento para o formato visual do build. O mapa mantém a distinção entre planejado e observado, e **Planejamento** reúne escopo, critérios, decisões e versões. O formato antigo `floorplan/plan@1` continua aceito; novos planos devem usar `floorplan/plan@2`.

## Estágios e profundidade

| `stage` | O que definir |
|---|---|
| `concept` | Problema, objetivo, público, hipóteses e perguntas materiais. Arquivos/endpoints podem ficar vazios. |
| `scope` | Inclusões, exclusões, requisitos, critérios de aceite e jornadas principais. |
| `architecture` | Responsabilidades, dados, contratos, acessos, integrações e escolhas justificadas. |
| `implementation` | Arquivos/endpoints planejados, dependências e verificações por requisito. |

O estágio não significa aprovação ou conclusão. Pode haver implementação parcial enquanto novos requisitos estão em definição.

## plan@2

Exemplo sintético de um primeiro escopo, sem código fictício:

```json
{
  "$schema": "floorplan/plan@2",
  "stage": "scope",
  "source": "floorplan/sources/pedido.md",
  "objective": "Permitir que clientes reservem horários disponíveis.",
  "scope": {
    "included": ["Consultar e reservar horários"],
    "excluded": ["Pagamento online"]
  },
  "requirements": [{
    "id": "req:reserva",
    "title": "Reservar horário",
    "refs": ["n:reservas"],
    "criteria": [{
      "id": "criterion:exclusividade",
      "text": "Duas solicitações concorrentes para o mesmo horário produzem uma reserva; a outra recebe indisponibilidade."
    }]
  }],
  "decisions": [{
    "id": "decision:persistencia",
    "title": "Persistência das reservas",
    "choice": "Usar as transações do banco da aplicação.",
    "rationale": "A confirmação precisa evitar duas reservas para o mesmo horário.",
    "alternatives": ["Serviço separado para agenda, ainda sem necessidade demonstrada"],
    "revisitWhen": "A carga medida ou o isolamento operacional exigir uma fronteira independente."
  }],
  "screens": [],
  "stack": [],
  "assumptions": [],
  "questions": [{ "question": "Quem pode cancelar uma reserva?", "about": ["reservas"] }],
  "files": [],
  "endpoints": []
}
```

O exemplo pressupõe um nó `reservas` em `architecture.json`. Use IDs estáveis; alterar o título, caminho ou URL não é razão para criar outra identidade de requisito/tela. Não gere critérios genéricos como “funcionar corretamente”: descreva resultados observáveis, incluindo autorização e falhas relevantes.

| Campo | Contrato |
|---|---|
| `objective` | Finalidade do projeto, em linguagem de produto. |
| `scope` | `{ included: string[], excluded: string[] }`. Exclusões permanecem visíveis na apresentação. |
| `requirements` | `{ id, title, description?, refs?, criteria, evidence? }`. `criteria` contém `{ id, text }`. |
| `refs` | Referências estáveis ao contexto: `n:<id>` para área, `f:<caminho>` para arquivo, `screen:<id>` para tela. Não usar índices transitórios como `r:4`. |
| `evidence` | `{ criterionId, criterionHash, result: "pass"|"fail", method, at, revision, details? }`. `criterionId` precisa existir naquele requisito; copie `criterionHash` da avaliação do critério e `revision` de `observedRevision` após verificar aquela versão do código; `at` é data ISO. Não invente hashes. |
| `decisions` | `{ id, title, choice, rationale, alternatives?, revisitWhen?, status? }`. Uma hipótese ou inferência não vira decisão aceita automaticamente. |
| `screens` | `{ id, title, url?, file?, node?, aliases? }`. O ID persiste; aliases preservam vínculos anteriores. |
| `journeys` | Jornadas de navegação por perfil, com etapas, caminho principal e transições; ver [navigation.md](navigation.md). |
| Campos legados | `source`, `stack`, `assumptions`, `questions`, `files`, `endpoints` continuam disponíveis conforme abaixo. |

Campos desconhecidos em v2 são erros de validação. Não invente propriedades para evitar registrar uma dúvida. Não reescreva visuais para uma tela nova quando uma associação está ambígua: conserve o registro e resolva a identidade.

### Alteração e versão local

Todos os comandos abaixo usam `<skill>` como a pasta que contém esta skill e `<root>` como a pasta do projeto, nunca a do plugin:

```sh
node <skill>/scripts/project.mjs <root> status
node <skill>/scripts/project.mjs <root> validate
node <skill>/scripts/project.mjs <root> apply --input <alteracao.json> --revision <revisao-atual>
node <skill>/scripts/project.mjs <root> baseline --id escopo-v1 --title "Escopo inicial" --revision <revisao-atual>
node <skill>/scripts/project.mjs <root> export --baseline escopo-v1 --output <apresentacao.html>
```

`status` fornece a revisão autoral atual, a revisão observada do código e a avaliação dos critérios. Não confunda a revisão autoral usada para aplicar alterações com `observedRevision`, usada em evidências. O arquivo de alteração contém `{ "documents": { "plan.json": { ... }, "architecture.json": { ... } } }`: documentos completos para os nomes incluídos; omitir um documento não o apaga. Uma revisão antiga é rejeitada para evitar sobrescrever trabalho concorrente. Leia o estado atualizado e reconcilie a proposta; não contorne o conflito removendo a precondição.

Depois de aplicar, use o fluxo normal de compilação/refresh. Não edite `graph.json` ou HTML gerado para inserir requisitos. Versões locais ficam fora de `.cache`, preservam os visuais e não alteram a exclusão do Git. Exportar é uma ação local; enviar ao cliente requer instrução para esse envio.

### Evoluir um plano antigo

Para adotar requisitos estruturados em um projeto `plan@1`, consulte `status` e execute:

```sh
node <skill>/scripts/project.mjs <root> migrate --revision <revisao-atual>
```

A migração preserva o plano anterior no histórico privado, mantém arquivos, endpoints, hipóteses e perguntas, atribui IDs estáveis às telas e conserva aliases para seus vínculos antigos. Ela normaliza referências visuais sem fabricar aprovação, identidade de aprovador ou data. Campos legados que não possam ser preservados são rejeitados para revisão, em vez de descartados. Repetir em `plan@2` não modifica o plano.

Confira o objetivo derivado da descrição existente e acrescente requisitos, critérios e decisões com base no escopo real: a conversão do formato não faz esse trabalho de produto automaticamente. Ao alterar caminho ou endereço de uma tela depois disso, mantenha o ID; os aliases antigos preservam seus visuais e referências.

## Planning well

- **Detalhe arquivos e endpoints quando o projeto chegar à arquitetura/implementação.** Antes disso, responsabilidades e jornadas podem ser suficientes. Não planeje cada helper nem escolha uma quantidade ideal de arquivos; use o detalhe que permita executar sem adivinhar decisões materiais.
- **Fundamente a stack nas restrições.** Em projeto existente, comece pelas ferramentas já usadas. Em projeto novo, considere equipe, plataforma, operação e integrações necessárias. Registre a escolha e sua razão; não adicione fila, serviço ou framework sem um caso que justifique seu custo.
- **Dê uma identidade a cada tela.** Em v2, `screens` pode existir antes de um arquivo. Quando o frontend for detalhado, mantenha o ID e associe o arquivo/URL; o formato legado de `files[].screen` também continua aceito. Registre as chamadas e componentes quando conhecidos.
- **Every endpoint gets `access`**, and `who` when only some signed-in people may use it ("managers of that location", "the account owner"). Decide it from the PRD. If the PRD is silent and it matters, leave it out (the review will flag it) or add a question. An endpoint that must be open to anyone and changes data (sign-in codes, sign-up, guest checkout) gets `publicBecause`: why, and what stops abuse.
- **Don't invent requirements.** Where the PRD doesn't say and you had to choose, write the choice in `assumptions`. Where the answer changes what gets built and you can't reasonably choose, add it to `questions` with the parts it affects. Carry every open question the PRD lists into `questions` unless the PRD settles it elsewhere; if you planned around the likely answer, say so in `assumptions` too. Ask the user 2–3 questions up front only if the PRD leaves something fundamental open (who uses it, web or mobile, does anyone sign in, does money change hands).
- **Outside services and data stores are `external` nodes** in architecture.json (Stripe, the database, an email service). Files reach them through `services` and `data` in plan.json. Put `data` on the files that talk to the database directly (a database helper, or each data-access file), not on every file that uses them: Screens follow `uses` down to them.
- **Background work** (scheduled emails, nightly jobs, queue workers) gets its own files and a `worker` node.

## Campos técnicos e compatibilidade com plan@1

```json
{
  "$schema": "floorplan/plan@1",
  "source": "floorplan/sources/pedido.md",
  "stack": ["Next.js website", "Node.js + Express server", "Postgres", "Stripe"],
  "assumptions": ["Staff and customers share one sign-in, with staff marked as such."],
  "questions": [{ "question": "Can customers cancel for free?", "about": ["POST /api/orders/:id/cancel"] }],
  "files": [ { "path": "web/app/checkout/page.tsx", "name": "Checkout page", "description": "…", "screen": "/checkout", "uses": ["web/lib/api.ts"], "calls": ["POST /api/orders"] } ],
  "endpoints": [ { "method": "POST", "path": "/api/orders", "file": "api/src/routes/orders.ts", "name": "Place an order", "description": "…", "access": "signed-in" } ]
}
```

| field | meaning |
|---|---|
| `source` | what it was planned from: the PRD's path in the project, or a few words such as "a description in chat" |
| `stack` | the technology choices, in plain words |
| `assumptions` | choices you made where the PRD didn't say. Shown on the map's overview |
| `questions` | `{ question, about }`: decisions the PRD leaves open. `about` lists node ids, file paths or `"METHOD /path"`. Structured questions also support stable `id`, `options`, `multiple`, user `answer` and agent `resolution`: see [questions](../../../docs/questions.md). Preserve answered questions. Review remains pending until their exact answer is incorporated into the plan |
| `files` | every planned file (see below) |
| `endpoints` | every planned endpoint (see below) |

**files[]**

| field | meaning |
|---|---|
| `path` | where it would live, relative to the project folder. Required, unique |
| `name`, `description` | a human name and one plain sentence, written like a description of real code ([writing-descriptions.md](writing-descriptions.md)) |
| `screen` | for a page people open: its URL (`/checkout`, `/orders/:id`). Makes it a screen in **Screens** |
| `uses` | other planned files it is built from or calls directly (becomes "uses" connections) |
| `calls` | endpoints it calls, as `"METHOD /path"`, exactly as in `endpoints` |
| `services` | ids of `external` nodes it talks to (Stripe, an email service) |
| `data` | ids of nodes for the data stores it reads or writes (usually the database) |

**endpoints[]**

| field | meaning |
|---|---|
| `method` | GET, POST, PUT, PATCH, DELETE, or CALL for a callable function (for example Firebase `onCall`) |
| `path` | the URL, starting with `/`. Use `:name` for parts that change (`/api/orders/:id`) |
| `file` | the planned file that handles it. Required |
| `name`, `description` | as for files |
| `access` | who may use it: `public` (anyone), `signed-in`, `team` (only the people who run the service, for its own admin pages, not the app's users), `webhook` (another company's service, which must prove it's them) or `internal` (only your own services) |
| `who` | with `signed-in`: which signed-in people, in a few words ("managers of that location", "the account owner"). Leave it out when any signed-in user may |
| `publicBecause` | with `public`: why it has to be open, and what limits abuse ("sign-in has to work before anyone is signed in; 5 codes per number per hour"). The design review stops flagging an open endpoint that has one |

Node `paths` globs in architecture.json assign planned files to parts, the same as for code. Aim for no unassigned files. Folder names in brackets (`app/orders/[id]/**`) match literally.

plan.mjs's "calls to planned endpoints" counts each call; the build's "http" links count each caller-to-file connection plus links to outside services, so the two numbers differ.

## Changes from the map

No mapa servido, **Ask / Change** encaminha a proposta ao agente em leitura. O servidor valida os documentos e a revisão antes de aplicá-los; uma proposta antiga não deve substituir uma mudança mais recente. Os requisitos, critérios, decisões, IDs de telas e associações existentes precisam ser preservados ao alterar os documentos completos. O resumo de trabalho recente e o Undo são úteis para operação, mas não substituem uma versão local imutável do escopo.

Para cada pedido, explique o requisito afetado, o impacto em telas/contratos e a verificação necessária. Ao aplicar, reconcilie o código observado sem marcar automaticamente requisitos como concluídos. **Planejamento** mostra implementação e verificação separadas; evidências de uma revisão anterior ficam desatualizadas.

## What the design review checks

- endpoints that change data and are open to anyone, unless `publicBecause` explains why;
- endpoints with no `access` decided;
- every open question, pointing at the parts it affects;
- endpoints no planned screen or service calls;
- planned files connected to nothing.

Each has **Resolve on the map** when the map is served (see above), and otherwise **Resolve with Claude/Codex**, a request to paste into the agent.

## Jornadas de navegação

Para planos `floorplan/plan@2` com telas, siga [navigation.md](navigation.md). A sequência e as ramificações da galeria vêm de `plan.journeys`, com IDs persistentes das telas. Planos antigos continuam abrindo; telas sem jornada aparecem como lacunas na revisão.
