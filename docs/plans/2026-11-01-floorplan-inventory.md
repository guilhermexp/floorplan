# Inventário técnico para a evolução do Floorplan

**2026-11-01 · fork base:** `d31d0d52cf7054a507041cb12d1f04d41a17eab6`.

Complementa a [proposta de integração](2026-11-01-floorplan-lifecycle-design.md). Os caminhos abaixo são relativos à raiz do repositório. “Evoluir” descreve uma recomendação, não uma alteração já executada.

O inventário cobre os pontos de entrada, instruções, bibliotecas e extensões. A leitura aprofundou os caminhos relevantes ao ciclo de planejamento, atualização, persistência e apresentação; não é uma auditoria exaustiva de cada heurística de parsing ou linha de código vendorizado.

## 1. Instruções e contratos existentes

| Arquivo | Responsabilidade atual | Decisão |
|---|---|---|
| `skills/floorplan/SKILL.md` | Roteia entre blueprint sem código, primeiro mapa de código e refresh; manda criar arquitetura, descrições, fluxos e abrir o viewer | Evoluir para ciclo único por estágio. Reaproveitar as instruções de inspeção e preservação de visuais; adaptar princípios selecionados de Superpowers/Ponytail. |
| `references/blueprint.md` | `plan@1`, arquivos/endpoints, premissas, perguntas, acesso e passagem para código | Principal contrato a ampliar: requisitos, critérios, decisões, estágios e coexistência com implementação. |
| `references/schema.md` | `architecture@1`, nós, globs, exclusões, relações, fluxos, tour, público e recent work | Preservar a gramática visual; adicionar vínculos de domínio e versões sem inventar outro formato de mapa. |
| `references/choosing-boundaries.md` | Limites por responsabilidade, visão legível, agrupamento e relações | Manter como guia de desenho; acrescentar critérios de simplicidade e restrições fundamentadas. |
| `references/writing-descriptions.md` | Descrições humanas curtas e vocabulário por público | Preservar; separar descrição de critério verificável, para não perder precisão em uma frase de resumo. |
| `references/screen-visuals.md` | Proposta/captura, importação imediata, versões, estado real e origem | Preservar e conectar a IDs persistentes, revisão de escopo e atualidade. |

Os cinco caminhos `references/` ficam sob `skills/floorplan/`.

### Limites das instruções atuais

- A análise inicial sugere ler arquivos representativos para compreender a forma do sistema; não promete examinar toda regra de negócio.
- A distribuição de arquivos exige mais de 90% de cobertura, e as descrições têm meta de cobertura completa. Isso não significa que cada arquivo, dependência ou comportamento foi validado.
- A arquitetura é deliberadamente pequena: 3–9 áreas de topo, grupos legíveis e profundidade limitada. Esse limite visual é útil e deve coexistir com um inventário técnico maior consultável.
- Perguntas e hipóteses são parte do blueprint, mas hoje não têm o mesmo ciclo de revisão e proveniência exigido por uma baseline de cliente.
- Por orientação explícita do usuário, a pasta continua integralmente fora do Git. O histórico precisa de revisões locais duráveis, sem alterar essa política.

## 2. Nove scripts de entrada

Todos em `skills/floorplan/scripts/`.

| Script | Entrada e saída atuais | Reuso / ponto de mudança |
|---|---|---|
| `scan.mjs` | Descobre repos/arquivos, extrai imports/símbolos/rotas, resolve relações e grava `.cache/scan.json` | Manter inventário nativo. Publicar observação com cobertura, limites e erros, distinta do plano. |
| `plan.mjs` | Converte `plan.json` em scan sintético pela mesma interface do código | Manter compilação, mas escrever projeção planejada separada e aceitar estágios sem arquivos. |
| `build.mjs` | Valida arquitetura, associa arquivos/rotas, inclui descrições, health, telas e visuais; gera grafo e HTML | Compor intenção + observação; tornar falhas/omissões explícitas; publicar revisão coerente. |
| `refresh.mjs` | Seleciona blueprint ou código, compara scans, reaproveita descrições e gera NEXT | Transformar em reconciliação sem perder planejamento; preservar referências e decisões. |
| `describe.mjs` | Gera worksheets, preenche nomes/descrições e aplica atualizações | Continuar como especialização de descrição; sem assumir papel de especificação funcional. |
| `recent.mjs` | Reúne commits, worktree e mudanças para um resumo do agente | Manter resumo; história durável e baselines pertencem ao núcleo de projeto. |
| `status.mjs` | Verifica estado do mapa; em blueprint retorna cedo; em código compara HEAD/worktree | Mostrar revisão de intenção, observação, frescor e pendências; não apenas “mapa atualizado”. |
| `visuals.mjs` | Importa visual, valida/copia asset, grava manifesto e rebuild | Preservar CLI; submeter associação/revisão ao mesmo contrato de projeto usado pela UI. |
| `open.mjs` | Localiza/reutiliza servidor, atualiza runtime gerado quando muda, abre navegador | Manter ciclo local. A supervisão de análise externa precisa de propriedade e encerramento explícitos. |

### Detalhes que condicionam a integração

- `build --check` retorna antes da construção de health/telas/visuais. É verificação estrutural, não validação completa de prontidão do projeto.
- Erros de cálculo de health podem resultar em aviso e lista vazia; erros de descoberta de telas também têm fallback. A evolução deve preservar a distinção entre “sem problemas encontrados” e “não foi possível analisar”.
- `scan.mjs` registra hash integral e assinatura resumida. `refresh.mjs` reaproveita descrições pelo hash/assinatura, mas isso não estabelece conformidade semântica.
- Arquivos grandes continuam representados, porém há limite de leitura para extração. Projetos sem Git também têm limites de profundidade/quantidade; o mapa deve informar o alcance efetivo.
- Rebuild pode substituir scripts gerados na pasta do projeto. Alterações de integração precisam ser feitas na origem da skill, mantendo coerência do runtime copiado.

## 3. Onze bibliotecas

Todas em `skills/floorplan/scripts/lib/`.

| Biblioteca | Responsabilidade | Orientação |
|---|---|---|
| `common.mjs` | Diretórios, globs, classificação, Git, descoberta, migração de pasta antiga, política de ignore | Preservar utilitários; manter a política de ignore e informar exclusões/limites de descoberta. |
| `extract.mjs` | Extração aproximada baseada em regex para linguagens/frameworks | Preservar fallback leve; não representar como compreensão completa do programa. |
| `resolve.mjs` | Imports, aliases, workspaces e referências de arquivos | Reutilizar; combinar evidência de outro analisador sem apagar origem. |
| `routes.mjs` | Prefixos/montagens e ligação entre chamadas HTTP e endpoints | Reutilizar; evitar assumir que o grafo importado terá os mesmos contratos ou cobertura. |
| `blueprint.mjs` | `planToScan`, revisão de permissões/perguntas/endpoints e validação manual | Ampliar schema e compilação; separar problema/escopo de detalhe técnico obrigatório. |
| `health.mjs` | Heurísticas de segurança/stack/manutenção e dismissals | Preservar verificações específicas; normalizar achados no painel comum, sem confundir heurística com certificado. |
| `screens.mjs` | Descoberta de telas e travessia de componentes, chamadas, handlers e dados | Preservar exploração visual; adicionar identidade estável e cobertura da travessia. |
| `visuals.mjs` | Validação de proposta/captura, manifesto, resolução de referências, lock e rollback | Preservar os assets e garantias; migrar vínculos sem perdas e integrar concorrência global. |
| `names.mjs` | Rótulos humanos e identificação de rotas | Preservar apresentação; nomes mutáveis não podem ser identidade durável. |
| `agent.mjs` | Detecção de Claude/Codex | Preservar; capacidades de integração devem ser detectadas separadamente do nome do agente. |
| `claudemd.mjs` | Instrução opcional em `CLAUDE.local.md` | Manter opção compatível; não injetar automaticamente políticas globais de três plugins. |

Pontos verificados: `keepOutOfGit` escreve `*` a cada uso; `planToScan` requer arquivos; a revisão de blueprint limita a lista de achados; IDs de telas incluem app/URL; visuais não resolvidos são conservados; `approved` atual não identifica ator e revisão da aprovação.

## 4. Runtime e ponte com o agente

| Arquivo em `skills/floorplan/assets/` | Responsabilidade | Integração |
|---|---|---|
| `viewer.html` | Canvas, layout, seleção, navegação, cards e API das extensões | Preservar. Acrescentar projeções/status sem reconstruir toda a interface. |
| `graph-query.js` | Consultas do grafo e contratos/prompts de Ask/Flow/Change | Compartilhar schema/prompt; adicionar requisitos, evidências, diferenças e contexto. |
| `query-cli.mjs` | Consultas `overview`, `find`, `show`, `path`, copiadas para o projeto | Entrada de leitura para o agente restrito; ampliar por contrato, com saída estruturada. |
| `serve.mjs` | Servidor local, autenticação de requests, execução de agentes, Change, visuais, SSE e exportação | Separar aplicação de documentos e projeção de export; consumir o mesmo núcleo de projeto da CLI. |

### Comportamentos importantes do servidor

- O agente devolve respostas estruturadas. No modo Change, ele propõe documentos, enquanto o servidor valida/grava/rebuilda. Isso é um bom ponto de controle a preservar.
- A aplicação atual guarda/restaura `plan.json`, `architecture.json` e `recent-work.json`, permite tentativa de correção e guarda Undo limitado. Ela não representa uma transação global com todos os assets e writers da CLI.
- O bloqueio de Change é local ao processo. Não há precondição geral de revisão para duas propostas simultâneas ou outro processo escrevendo o projeto.
- Claude usa Read/Grep/Glob e Bash restrito ao query do Floorplan; Codex usa execução efêmera em sandbox somente leitura. Integrar um MCP instalado no host não é o mesmo que disponibilizá-lo por essa ponte.
- A observação de arquivo para live reload é de `index.html`; source watching precisa de integração própria.
- O servidor se encerra por inatividade após as abas fecharem. A persistência dos artefatos é separada do processo.
- Exportação remove algumas informações técnicas, mas ainda serializa o grafo. A visão de cliente deve ser uma projeção permitida, construída antes da serialização.

## 5. Onze extensões de interface

Todas em `skills/floorplan/assets/ui/`, incorporadas pelo build em ordem de arquivo.

| Extensão | Função atual | Tratamento |
|---|---|---|
| `01-language.js` | Português padrão, dicionário/tradução da interface | Manter; novos componentes devem usar tradução explícita e termos consistentes. |
| `05-theme.js` | Tema claro/escuro | Preservar e verificar novas visões nos dois temas. |
| `06-blueprint.js` | Identificação de blueprint, lista/proposta e interação de planejamento | Evoluir para estágio do projeto e coexistência com implementação; evitar schema embutido divergente. |
| `10-glossary.js` | Explicações acessíveis de termos | Reutilizar na visão de cliente. |
| `20-health.js` | Achados de health/revisão e dismissals | Um painel de revisão por entidade, com filtros de origem/tipo; não criar três painéis concorrentes. |
| `25-recent.js` | Mudanças recentes | Manter resumo e ligar à revisão; não usá-lo como trilha permanente. |
| `30-screens.js` | Listagem/lente de telas e código relacionado | Reusar e migrar IDs. |
| `35-visuals.js` | Galeria, slideshow, preview, mockups de dispositivos, importação e comparação | Preservar; associar escopo, decisões e atualidade sem alterar originais. |
| `40-tour.js` | Apresentação guiada | Base da narrativa para cliente, vinculada à baseline selecionada. |
| `50-cloud.js` | Interface de waitlist do produto upstream | Não é colaboração ou sincronização implementada. Retirar/substituir essa chamada na experiência do fork conforme sua identidade. |
| `60-export.js` | Opções e download da exportação | Acrescentar perfil cliente/baseline; manter exportação técnica para uso interno. |

A navegação continua usando a API comum do viewer. Uma galeria, um canvas e um painel de revisão devem servir às visões, em vez de duplicar esses componentes em uma aplicação de planejamento separada.

## 6. Empacotamento, documentação e manutenção

| Item | Situação / trabalho futuro |
|---|---|
| `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | Metadados/distribuição precisam descrever o fork, versão e capacidade real; manter atribuição. |
| `.codex-plugin/` e `.agents/` | Manifests/marketplace específicos incluídos no conjunto de fingerprints; atualizar junto dos outros canais. |
| `skills/floorplan/agents/openai.yaml` | Metadados da skill no host; alinhar escopo e idioma ao fluxo ampliado. |
| `package.json` | Node >=18, sem dependências, runner nativo. Preservar instalação básica leve. |
| `tools/checksums.mjs`, `CHECKSUMS.txt` | Fingerprints da skill/manifests/package; regenerar quando mudar o runtime distribuído. Documentos desta análise não exigem isso. |
| `.github/workflows/test.yml` | Matriz Linux/Windows e Node 18/20/22; manter. |
| `.github/workflows/macos.yml` | Teste semanal/manual em macOS/Node22; execução local desta análise não substitui a matriz. |
| Templates de issues/PR | Estrutura de relato/contribuição; incluir revisão e provedor nos relatos de sincronização quando houver implementação. |
| Vendor ELK e fontes | Infraestrutura visual incorporada, sem necessidade de troca para integrar planejamento. |

Documentação a atualizar na implementação: README, `docs/getting-started.md`, `how-it-works.md`, `project-files.md`, `is-it-safe.md`, `privacy-and-security.md`, `codex.md`, `using-the-map.md`, `visuals.md`, `troubleshooting.md` e `development.md`. Explicar persistência local privada, derivados, backup, custo/atualidade do provedor, export e limitações.

Os planos anteriores em `docs/plans/` e `docs/superpowers/plans/` são histórico de funcionalidades do fork. Isso não significa que hoje exista integração geral do runtime com Superpowers.

## 7. Testes existentes e cobertura a adicionar

Há 23 arquivos na raiz de `tests/`: 22 suítes e `helpers.mjs`, além de fixtures. Organização atual:

| Grupo | Arquivos |
|---|---|
| Planejamento | `blueprint.test.mjs`, `blueprint-change.test.mjs` |
| Agentes e servidor | `agents.test.mjs`, `ask.test.mjs`, `serve.test.mjs` |
| Visuais/export/UI | `visuals.test.mjs`, `export.test.mjs`, `i18n.test.mjs`, `theme.test.mjs`, `phone.test.mjs`, `touch.test.mjs` |
| Parsing, helpers e projeto de exemplo | `parsing.test.mjs`, `helpers-lib.test.mjs`, `large-files.test.mjs`, `sample-app.test.mjs` |
| Heurísticas de análise | `health.test.mjs`, `stack-health.test.mjs`, `firebase.test.mjs`, `secrets.test.mjs`, `false-positives.test.mjs` |
| Distribuição | `release.test.mjs`, `supply-chain.test.mjs` |

`helpers.mjs` e fixtures de blueprints, CLIs falsos, FastAPI e Firebase dão suporte aos testes. Há testes de UI por conteúdo/string e VM; isso não comprova toda interação de navegador.

**Resultado local obtido:** 175 testes, 174 passaram, 0 falharam, 1 ignorado (descoberta do executável Claude específica do Windows, fora deste ambiente macOS). Nenhuma suíte dos projetos externos foi executada.

**Novas garantias a testar:** migração sem perda; IDs e aliases; conceito sem código; revisão concorrente; recuperação de gravação interrompida; comparação planejado/observado; evidência velha; adaptador com falha/truncamento; versão compatível; exportação offline de baseline e ausência efetiva de campos internos. Critérios completos estão na proposta principal.

Os testes de supply chain estabelecem programas permitidos, ausência de MCP/hooks/dependências e rotas externas conhecidas. Evoluí-los deliberadamente com contratos do adaptador; não apagar as assertions para fazer uma integração passar.

## 8. Síntese dos contratos a preservar

1. Planejamento é autoral; observação do código é evidência datada.
2. CLI, servidor e agente aplicam mudanças pelo mesmo dono de estado.
3. UI e apresentação são projeções, não fontes paralelas de especificação.
4. Uma relação não resolvida fica visível e preservada, nunca descartada silenciosamente.
5. Falha, truncamento e desatualização são estados de análise, não ausência de problemas.
6. Fontes e APIs dos projetos externos ficam atrás de um adaptador; não atravessam o produto inteiro.
7. O modo básico continua útil sem instalar o analisador externo.

Nenhum script ou asset de runtime foi modificado para produzir esta análise.
