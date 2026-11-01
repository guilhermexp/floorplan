# Análise opcional com Repowise

O Floorplan continua funcionando apenas com Node. Quando Repowise está instalado, `observe.mjs` acrescenta evidências do código ao mesmo projeto: contexto de arquivos, relações, achados de manutenção, referências documentais desatualizadas e impacto de uma mudança.

O adaptador utiliza interfaces públicas do Repowise: CLI para indexação e um processo MCP stdio temporário para consultas estruturadas. Não lê seu banco diretamente, não instala configuração MCP no editor, não altera hooks e não copia código do Repowise para o plugin.

## Privacidade dos projetos

Somente o código do plugin pertence ao seu repositório Git. Dados do projeto ficam na pasta local do projeto analisado:

- `floorplan/.cache/repowise.json`: observação datada e, quando necessário, último resultado utilizável.
- `floorplan/.cache/observe.lock`: proprietário do supervisor em execução.
- `.repowise/`: índice local do analisador externo.

As duas pastas têm um `.gitignore` interno com `*`. Isso inclui os próprios arquivos de ignore. O adaptador recusa indexação se `.repowise/` já contém dados rastreados pelo Git, e a CLI recusa um mapa cujo conteúdo já esteja rastreado. Não remove arquivos do Git automaticamente.

Essa proteção é necessária mesmo com `repowise init --no-editor-setup`: a versão 0.56.0 examinada não adiciona o ignore por conta própria nesse modo.

## Uso

Exemplos executados a partir do repositório do plugin, apontando para **outro diretório de projeto**:

```sh
# Primeira vez: índice estrutural local, sem alterar editor ou hooks.
node skills/floorplan/scripts/observe.mjs /caminho/do/projeto --init --target src/reservas.py

# Atualizar incluindo arquivos novos e alterações ainda sem commit.
node skills/floorplan/scripts/observe.mjs /caminho/do/projeto --update --target src/reservas.py --risk

# Acompanhar mudanças em primeiro plano. Ctrl+C encerra tudo que este supervisor iniciou.
node skills/floorplan/scripts/observe.mjs /caminho/do/projeto --watch --interval 3000 --target src/reservas.py
```

`--init` é explícito e não reinstala um índice já existente. Cria um índice rápido/estrutural, sem geração de documentação por modelo, embeddings externos ou criação de arquivos AGENTS/CLAUDE/editor. A análise de código é real; a busca semântica fica indisponível nesse modo, e isso aparece entre as limitações. A CLI não instala nem atualiza a ferramenta Repowise no computador.

`--target` pode ser repetido até 100 vezes. Aceita caminhos relativos ao repositório e identificadores `arquivo::Símbolo`. Nomes absolutos, travessia para outros diretórios e strings que parecem opções são recusados.

`--update` usa `update --index-only --working-tree --no-workspace --no-agents`: indexação incremental, sem solicitar regeneração de páginas por LLM. O repositório é sempre fornecido explicitamente; o adaptador não expande a operação para outros repositórios de um workspace.

Se o projeto tiver `architecture.json`, a CLI reconstrói o mapa pelo fluxo nativo depois de salvar a observação. `--no-rebuild` salva somente o cache. A saída é JSON; instalação ausente ou falha completa produz código de saída diferente de zero. Uma análise parcial continua sendo um resultado com limitações, não um atestado de completude.

Para uma instalação em ambiente isolado:

```sh
node skills/floorplan/scripts/observe.mjs /caminho/do/projeto --repowise /caminho/venv/bin/repowise
```

`--repowise-arg` adiciona argumentos de prefixo quando o executável precisa de um launcher. Isso é uma opção local de CLI, não um comando recebido do modelo ou do navegador.

## Atualização acompanhada

`--watch` é o supervisor único desse projeto. Ele compara HEAD e o conteúdo do worktree, incluindo alterações repetidas em arquivos já modificados e arquivos novos. Uma rodada completa de indexação, coleta e reconstrução termina antes da seguinte. Alterações durante a rodada provocam outra passagem.

O supervisor mantém lock com PID, recusa outro supervisor concorrente e libera o lock ao receber SIGINT/SIGTERM. Os subprocessos de consulta/indexação são encerrados no cancelamento. O monitor não é instalado como serviço do sistema e não é iniciado automaticamente ao abrir um mapa.

Não iniciar simultaneamente `repowise watch` sobre o mesmo projeto: o supervisor Floorplan já controla quando rodar o update. O lock de publicação do Floorplan serializa a gravação do cache com alterações de documentos e visuais. A reconstrução ocorre depois de liberar esse lock.

## O significado dos resultados

O cache tem `providerVersion`, revisão do código, data, cobertura e atualidade. `status` e `freshness` são independentes:

| Campo | Valores |
|---|---|
| `status` | `ready`, `partial`, `unavailable`, `error` |
| `freshness` | `current`, `stale`, `unknown` |

Um índice rápido pode estar atualizado e continuar parcial quanto a histórico, documentação ou busca semântica. Um checkout com alterações sem commit fica conservadoramente com atualidade desconhecida ou desatualizada quando não existe evidência suficiente de atualidade de todos os dados; sucesso do comando update não basta para declarar tudo atual.

As relações do Repowise cobrem arestas resolvidas. Uma lista vazia de callers não prova que ninguém usa aquele código. O detector de documentação cobre somente referências que consegue resolver. A descrição dessas bases acompanha o contexto e os achados.

Truncamentos, alvos descartados, falhas de subsistemas e referências para recuperar conteúdo omitido permanecem no resultado. Achados são evidências para revisão, com origem/revisão, e não aprovam requisitos automaticamente. Respostas com contrato desconhecido são recusadas em vez de interpretadas como ausência de problemas.

`readRepowise(outDir, root)` reavalia o cache no momento da leitura. Uma alteração posterior no código marca a observação como antiga; dados copiados de outro repositório não são anexados ao mapa atual. Em falha de provedor, o cache preserva `lastUsable`, claramente datado e marcado como antigo.

## Validação realizada

A integração foi exercitada com Repowise **0.56.0**, contrato de respostas **3**, num repositório sintético separado dos dados reais. Foram verificados:

- Inicialização sem hooks ou arquivos de editor e com índice fora do Git.
- Consultas MCP reais de overview, health, context e impacto de mudança.
- Detecção de índice antigo após editar código.
- Atualização de função modificada e inclusão de arquivo ainda sem commit.
- Renomeação e exclusão sem commit.
- CLI real com `--init`, gravação da observação e geração de `graph.json`/HTML pelo builder nativo.
- Supervisor real em três ciclos: primeira análise, alteração somente no corpo da função, renomeação; o mapa foi reconstruído e o lock liberado ao encerrar.
- Persistência privada e nenhuma alteração em configuração global.

O cenário de renomeação revelou que essa versão do Repowise ainda pode devolver uma entrada antiga de arquivo removido sem aviso de desatualização. O adaptador cruza a existência do arquivo com o checkout: não o apresenta como implementação atual e registra o alvo como não resolvido/desatualizado. O inventário nativo do Floorplan continua necessário.

Testes automatizados exercitam ainda indisponibilidade, falha de ferramenta, contrato futuro, timeout, cancelamento, recuperação de última evidência, cache de outro projeto, supervisor concorrente e edições sucessivas em arquivo dirty. Esses casos usam processos controlados para reproduzir falhas, além da prova com o executável real.

O adaptador reconhece os contratos 3 e 4. A referência estudada no commit `775a4e07e82eed299a3ee8dfe284e8dd00d98a6d` documenta contrato 4; a prova prática acima é do contrato 3. Novas versões devem passar pela mesma prova antes de ampliar a compatibilidade declarada.

## Fontes e licença

- [CLI e MCP do Repowise](https://github.com/repowise-dev/repowise/blob/775a4e07e82eed299a3ee8dfe284e8dd00d98a6d/docs/agent/MCP_TOOLS.md).
- [Metadados, atualidade e truncamento](https://github.com/repowise-dev/repowise/blob/775a4e07e82eed299a3ee8dfe284e8dd00d98a6d/docs/reference/MCP_RESPONSE_FIELDS.md).
- [Licença do programa externo](https://github.com/repowise-dev/repowise/blob/775a4e07e82eed299a3ee8dfe284e8dd00d98a6d/LICENSE).

O Repowise é uma dependência opcional executada separadamente. Seu código não foi incorporado a este adaptador.
