# Planejar, revisar e acompanhar um projeto

Este guia organiza o trabalho do agente dentro do Floorplan. Ele usa os mesmos documentos, canvas, galeria, revisão e exportação da ferramenta. Não exige instalar outro coordenador de agentes nem altera as instruções globais do usuário.

## 1. Entender o pedido e o estágio

Leia o pedido, fontes fornecidas e contexto existente antes de perguntar. Registre:

- problema e objetivo;
- usuários, jornadas e resultados esperados;
- inclusões e exclusões;
- restrições de plataforma, equipe, dados, carga e operação;
- decisões já tomadas, hipóteses e dúvidas que mudam o escopo.

Pergunte sobre decisões materiais que não podem ser inferidas. Prossiga com escolhas reversíveis dentro da autorização recebida e registre a justificativa. Não repita aprovações já dadas nem transforme uma sequência de tarefas mecânicas em uma entrevista.

Use `concept`, `scope`, `architecture` ou `implementation` conforme o entendimento real. Não crie arquivos de código fictícios para cumprir o formato inicial. Não registre a ideia do agente como requisito do cliente.

Todos os dados de trabalho e fontes copiadas ficam em `floorplan/` no projeto correspondente, fora do Git. Antes de copiar a primeira fonte, garanta que `floorplan/.gitignore` contenha `*`; os comandos do projeto mantêm essa proteção. O repositório do plugin recebe somente o produto, seus exemplos sintéticos e testes. Use o [contrato do blueprint](blueprint.md) para aplicar alterações e criar versões locais.

## 2. Tornar o escopo verificável

Cada requisito deve ter uma identidade persistente, um comportamento compreensível e critérios de aceite observáveis. Inclua os estados relevantes: caminho principal, autorização, vazio, erro, repetição/concorrência e recuperação quando aplicáveis.

Evite “rápido”, “seguro” ou “escalável” sem contexto. Se a meta de carga ou latência ainda não existe, registre a pergunta ou hipótese; não invente uma garantia. Critérios não funcionais podem ser requisitos próprios com uma forma de verificação adequada.

Ligue requisitos a áreas, arquivos ou telas conforme essas entidades existirem. Uma associação ausente deve aparecer como lacuna. Um índice temporário de rota no grafo não é identidade durável.

Antes de detalhar a implementação, verifique se outra pessoa conseguiria planejar a construção sem adivinhar decisões relevantes:

- O que será entregue e o que está excluído?
- Os critérios demonstram o resultado ou apenas repetem a descrição?
- A jornada cobre os estados que afetam o comportamento?
- Dependências externas e decisões do cliente estão identificadas?
- Há contradição entre requisito, mockup e arquitetura?

Esta revisão produz questões e correções concretas. Não é um selo automático de prontidão.

## 3. Desenhar a arquitetura pela responsabilidade

Em projeto existente, inspecione entradas, chamadas, dados e limites reais antes de propor componentes. Em projeto novo, compare alternativas quando houver uma escolha material. Registre escolha, razão e condição para rever a decisão.

Uma área deve ter responsabilidade clara e controlar suas invariantes. Evite duas partes gravando o mesmo estado com regras diferentes. Reutilize um módulo existente quando ele já resolve o problema. Uma camada que apenas encaminha parâmetros sem esconder complexidade precisa de uma razão concreta.

Avalie os caminhos principais e de falha: quem pode executar, onde se valida, quem grava, como falhas chegam ao usuário, como a operação é repetida e como se recupera. Mostre essas relações nos fluxos e explique dados/integrações no nível útil ao público do mapa.

Simplicidade depende do contexto. Um arquivo grande não prova um defeito; um serviço separado não prova excesso de arquitetura. Para recomendar simplificação, indique o caso afetado, o custo atual, a alternativa e a consequência de mudar. Para aceitar uma limitação, registre seu limite e um gatilho observável para revê-la.

## 4. Planejar telas junto com comportamento

Siga [navigation.md](navigation.md): registre `plan.journeys` por perfil e objetivo, incluindo sequência principal, ações de transição, condições, alternativas, recuperação e resultado. Toda tela deve participar de uma jornada significativa. O catálogo alfabético é apenas um inventário; `architecture.flows` continua descrevendo a execução técnica. Revise também etapas de entrada, saída, retorno e mudanças de papel. Não declare navegação concluída apenas porque todas as imagens existem.

Associe cada proposta visual à tela e ao estado que ela representa. Mantenha a identificação de proposta ou captura real. Uma imagem aprovada representa uma decisão visual, não a aprovação de todo o backend ou de regras ausentes.

Inclua estados que mudam o entendimento do cliente: vazio, carregamento, erro, permissão e confirmação conforme a jornada. Não gere dezenas de versões sem registrá-las: importe cada resultado para a tela correspondente e preserve sua origem/versão.

Veja [screen-visuals.md](screen-visuals.md) para os metadados de capturas. Se uma URL ou arquivo mudar, preserve a identidade e aliases da tela; não descarte imagens sem correspondência.

## 5. Preparar a execução a partir de uma revisão

Um plano de implementação deve identificar a revisão do escopo, requisitos atendidos, dependências, interfaces, arquivos a criar/alterar e verificações. Ordene tarefas por dependências e entregue fatias que possam ser testadas pelo comportamento.

Dimensione o plano para a mudança: uma correção localizada não exige um documento enorme, e um fluxo de pagamento não cabe em “implementar checkout”. Não replique o código inteiro no plano. Registre onde há decisão ainda aberta e quais tarefas dependem dela.

O executor pode ser o agente atual ou outra ferramenta escolhida pelo usuário. O contrato de entrega permanece o mesmo; não obrigue subagentes, worktrees ou outro plugin por causa das referências usadas neste guia.

## 6. Verificar com evidências atuais

Depois de implementar, confira o escopo e o comportamento. Testes que passaram comprovam apenas o que exercitam. Para declarar um critério verificado, registre o método, o resultado, a data e a revisão observada realmente testada em `requirements[].evidence`. Copie `criterionHash` e `observedRevision` da avaliação produzida pelo status; não calcule por aproximação nem reutilize hashes depois de mudar o critério. Alterar o texto de aceite também pode invalidar a verificação, mesmo com código idêntico.

Separe explicitamente:

- intenção aceita;
- implementação não observada/parcial/observada/desconhecida;
- verificação não realizada/passou/falhou/desatualizada;
- aprovação visual e captura real.

Mudanças no corpo de uma função podem alterar comportamento sem mudar o nome ou assinatura. Reavalie os critérios afetados. Falha do analisador, cobertura parcial ou índice antigo não são evidência de ausência nem de conformidade.

## 7. Usar análise externa quando útil

O scanner nativo continua disponível. Quando Repowise estiver habilitado para o projeto, use o adaptador para reunir contexto, relações, risco e estado do índice. Ele complementa a leitura do agente; não determina o escopo do cliente.

Preserve proveniência e avisos de atualidade/truncamento. Refaça consultas limitadas quando necessário; não trate a parte omitida de um grafo como código inexistente. Detecção de referências documentais quebradas não equivale a validar todas as regras de negócio.

Atualizar o índice pode ser automático; reescrever decisões ou aprovar mudanças não. Evite instalar hooks/instruções globais e chamar modelos a cada salvamento implicitamente. Consulte o guia de integração e use o modo index-only quando o objetivo for atualizar fatos.

## 8. Revisar mudanças e entregar ao cliente

Uma revisão considera requisitos, diff e contexto conectado: callers, contratos, testes e configuração. Cada achado precisa explicar um caso concreto, impacto e ação. Priorize correção, segurança, carga esperada, verificação e desempenho; depois proponha simplificações justificadas. Não use linhas removidas como medida de qualidade.

Uma baseline registra o conteúdo de uma versão, não uma aceitação presumida. Na apresentação, mostre objetivo, escopo, exclusões, jornadas, telas, decisões abertas e critérios de conclusão. Identifique versão e data. Quando o cliente aceitar, associe a decisão à versão e à evidência real, sem preencher uma aprovação inventada.

Mudanças posteriores geram outra versão. Preserve o que foi entregue e indique o que mudou. O HTML exportado é uma apresentação local; enviar o arquivo, hospedar uma página e receber comentários são ações separadas conforme o pedido do usuário.

## Referências de método

Este guia tem redação própria e adapta os métodos às responsabilidades e contratos do Floorplan. Não carrega hooks ou instruções de sessão dessas ferramentas.

- [Superpowers: brainstorming](https://github.com/obra/superpowers/blob/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/brainstorming/SKILL.md), [writing-plans](https://github.com/obra/superpowers/blob/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/writing-plans/SKILL.md) e [verification-before-completion](https://github.com/obra/superpowers/blob/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/verification-before-completion/SKILL.md). Jesse Vincent, MIT.
- [Ponytail: review](https://github.com/DietrichGebert/ponytail/blob/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846/skills/ponytail-review/SKILL.md), [audit](https://github.com/DietrichGebert/ponytail/blob/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846/skills/ponytail-audit/SKILL.md) e [debt](https://github.com/DietrichGebert/ponytail/blob/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846/skills/ponytail-debt/SKILL.md). DietrichGebert, MIT.
- [Repowise: MCP e evidências](https://github.com/repowise-dev/repowise/blob/775a4e07e82eed299a3ee8dfe284e8dd00d98a6d/docs/agent/MCP_TOOLS.md). Integração externa opcional; nenhuma implementação incorporada neste guia.


## Decisões pelo formulário de perguntas

Para dúvidas que mudam o planejamento, prepare `plan.questions` com IDs estáveis, alternativas e consequências, seguindo [o contrato de perguntas](../../../docs/questions.md). O usuário responde em **Perguntas** no mapa, sem precisar copiar cada pergunta para o chat. Leia `node floorplan/query.mjs project` para recuperar respostas e seus hashes. Nunca preencha uma resposta em nome do usuário, nem confunda recomendação com decisão. Incorpore respostas completas em requisitos, decisões e fluxos e registre `resolution {answerHash, summary, at}`. Preserve o histórico; não remova perguntas respondidas. Respostas parciais ou delegação de pesquisa exigem o trabalho restante antes de resolver a decisão.

## Stack técnica explícita

Todo projeto deve manter `plan.technologyStack` conforme [o contrato da stack](technology-stack.md). Avalie todas as categorias e registre escolhas, propostas, pendências ou não aplicabilidade com justificativa. A seção **Planejamento → Stack do projeto** e a exportação apresentam o mesmo inventário; a revisão aponta omissões. Preserve `stack[]` como resumo compatível e mantenha decisões e perguntas vinculadas.
