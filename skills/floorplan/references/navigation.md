# Jornadas e transições de navegação

O agente escreve `plan.journeys` em `plan.json` (`floorplan/plan@2`). É conteúdo privado do projeto, publicado pelo mesmo comando `project apply`, com revisão otimista, histórico e baselines. Não escreva no grafo gerado. Não reordene imagens no manifesto para simular uma jornada.

## Contrato

```json
{
  "id": "reservar",
  "title": "Reservar um horário",
  "actor": "Cliente",
  "goal": "Escolher um horário e obter confirmação",
  "requirements": ["R1"],
  "steps": [
    {"id":"escolha", "screen":"screen:agenda", "note":"Escolhe um horário ainda disponível."},
    {"id":"confirmado", "screen":"screen:confirmacao", "end":true},
    {"id":"conflito", "screen":"screen:conflito", "note":"Preserva os dados para tentar novamente."}
  ],
  "path": ["escolha", "confirmado"],
  "transitions": [
    {"from":"escolha","to":"confirmado","action":"Confirmar reserva","condition":"O servidor confirmou disponibilidade e autorização.","kind":"forward"},
    {"from":"escolha","to":"conflito","action":"Exibir conflito","condition":"O horário foi ocupado antes da confirmação.","kind":"error"},
    {"from":"conflito","to":"escolha","action":"Escolher outro horário","kind":"recovery"},
    {"from":"confirmado","to":"escolha","action":"Consultar agenda","kind":"back"}
  ]
}
```

`screen` referencia exatamente um ID persistente de `plan.screens`, nunca índice, caminho ou nó da API. `steps[].id` é único dentro da jornada. Para revisitar a mesma tela no caminho principal, crie outra etapa com outro ID: a tela pode aparecer várias vezes em contextos distintos.

`path` define a apresentação do caminho principal, começa na entrada e termina numa etapa `end:true`. Cada par consecutivo precisa de uma transição não `back`. `transitions` define as ações reais de navegação propostas. `alternative` e `error` exigem condição explícita; `recovery` explica como retomar; `back` registra retorno. Uma etapa de resultado pode oferecer retorno ou outras ações: não significa que o app inteiro terminou.

O validador rejeita IDs duplicados, referências inexistentes, saltos sem transição, etapas inalcançáveis e ciclos sem caminho para resultado. Telas sem jornada são achados de revisão, preservando compatibilidade com planos antigos e rascunhos. Nenhum desses checks prova que a UX está correta ou implementada.

## Como planejar

1. Identifique perfis, entradas (primeiro acesso, sessão existente, link/aviso) e objetivos reais. Uma jornada não deve atravessar perfis sem explicar a mudança de contexto. Não faça o tutor navegar por telas exclusivas do operador.
2. Desenhe o caminho principal e as ações que mudam de tela. Numere etapas pelo comportamento, não pelo nome do arquivo. Pré-condições devem explicitar sessão, autorização e estado necessários.
3. Modele alternativas, cancelamento, retorno, permissão negada, erro e recuperação relevantes. Não force todas as pessoas a visitar todas as telas. Se o erro ocorre na mesma tela, use outra etapa da mesma tela e explique seu estado em `note`.
4. Relacione requisitos e mantenha regras em aberto condicionadas às perguntas do projeto. Não invente respostas, prazos, preços ou aceite do cliente. Navegação proposta não equivale a alteração comercial aprovada.
5. Confira cobertura e faça uma passagem pelo caminho principal e cada ramificação. Ajuste requisitos/fluxos técnicos se houver contradição; registre diferenças entre mockup antigo e comportamento proposto. Reutilizar a imagem não comprova que ela representa todos os estados.
6. Ao alterar uma tela ou regra, atualize as jornadas afetadas junto com o plano. Preserve IDs, visuais e versões anteriores.

## Galeria e entrega

A galeria abre a primeira jornada cadastrada; o agente deve ordenar `journeys` para apresentação (primeiro acesso, tarefas principais, gestão, suporte). O seletor mostra perfil e objetivo. Uma etapa tem um mockup preferido e versões independentes: duas propostas da mesma tela não viram duas etapas.

As setas percorrem o caminho principal e o histórico visitado. Em uma alternativa, o usuário escolhe a recuperação/saída em **Ações e caminhos desta etapa**; não há avanço automático para outra imagem por ordem alfabética. Clicar numa miniatura inspeciona a etapa, sem simular uma ação de negócio. Filtros de imagens não removem etapas: falta de mockup fica visível. **Todas as telas · catálogo** preserva o inventário completo.

O status, a revisão, a apresentação offline e as versões locais conservam a mesma navegação. Para projetos sem interface, `journeys` pode ser omitido; não invente telas para satisfazer cobertura.
