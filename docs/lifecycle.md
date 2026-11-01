# Planejamento contínuo e privado

O Floorplan reúne intenção, arquitetura, telas e implementação observada no mesmo mapa. O botão **Planejamento** mostra escopo, requisitos e critérios, decisões, estado da análise e versões locais de apresentação.

**O Git do plugin contém somente a ferramenta e exemplos sintéticos.** Cada projeto mantém seus documentos, imagens, capturas, análises e histórico na própria pasta `floorplan/`, integralmente ignorada pelo Git. Fechar o servidor não apaga esses arquivos. Um clone do plugin não inclui esses dados: faça backup da pasta privada quando precisar transferir um projeto para outra máquina.

## Começar um projeto

Peça ao agente: “Use Floorplan para planejar este projeto, definir critérios de aceite, desenhar a arquitetura e apresentar as telas”. A skill usa o [guia de planejamento](../skills/floorplan/references/planning.md).

O formato `plan@2` permite começar com conceito e escopo sem inventar arquivos de código. Conforme o projeto amadurece, vincule requisitos a telas, componentes e arquivos. O mapa continua mostrando as partes ainda planejadas quando começar a observar código real.

## Interface comum para agentes

Substitua `<skill>` pela pasta `skills/floorplan` da instalação e `<projeto>` pela raiz do projeto, fora do repositório do plugin:

```sh
node <skill>/scripts/project.mjs <projeto> status
node <skill>/scripts/project.mjs <projeto> validate
node <skill>/scripts/project.mjs <projeto> apply --input /caminho/alteracao.json --revision HASH
node <skill>/scripts/project.mjs <projeto> migrate --revision HASH
```

`status` retorna a revisão atual. `apply` recebe `{ "documents": { "plan.json": {...}, "architecture.json": {...} } }`, valida e compila antes de publicar. Uma revisão antiga é recusada; o agente deve reler o estado e reconciliar sua proposta. `migrate` introduz o formato novo e IDs persistentes mantendo arquivos e visuais anteriores. Alterações válidas mantêm snapshots locais em `revisions/`.

O Ask do mapa usa a mesma aplicação validada. Sua consulta `node floorplan/query.mjs project` reúne planejamento, avaliação e contexto do analisador. O agente propõe mudanças; encontrar um arquivo ou gerar um mockup não declara um requisito concluído.

## Observar a implementação

```sh
node <skill>/scripts/refresh.mjs <projeto> --from-code --no-claude-md
```

O scan observado e o plano permanecem separados. Os arquivos planejados continuam visíveis. Evidências de verificação são associadas à revisão observada e ao hash do critério: mudanças relevantes invalidam a conclusão anterior. Capturas preservam sua identificação como capturas, sem servir de prova automática de autorização, persistência ou regras de negócio.

O [adaptador Repowise](repowise.md) é opcional. Ele usa o programa instalado, sem instalar dependências, hooks ou configurações globais. Há coleta única e acompanhamento em primeiro plano; o supervisor serializa as atualizações, reconstroi o mapa e para quando encerrado. Respostas parciais, antigas e arquivos não resolvidos ficam explícitos.

## Guardar uma versão para apresentar

Na interface, abra **Planejamento**, informe um título e salve uma versão local. Pela CLI:

```sh
node <skill>/scripts/project.mjs <projeto> baseline --id escopo-v1 --title "Escopo inicial" --revision HASH
node <skill>/scripts/project.mjs <projeto> export --baseline escopo-v1 --output /caminho/apresentacao.html
```

A baseline congela documentos e imagens e não depende do cache. A exportação de cliente usa essa versão, mesmo que o plano tenha mudado. Ela inclui escopo, critérios, decisões, arquitetura e galeria navegável com molduras de dispositivos. Abre offline e inclui cada imagem uma vez no payload.

O perfil de cliente não inclui caminhos de código, URLs de origem das capturas, notas internas, análises, comandos ou evidências privadas. A exportação técnica antiga continua disponível separadamente. Salvar uma baseline não registra aceitação: a aprovação deve ter responsável, data e evidência reais. O HTML offline não é um portal de comentários ou aprovação sincronizada.

## Continuidade e limites

- `revisions/` guarda versões locais dos documentos autorais; `baselines/` conserva as entregas com imagens congeladas.
- `.cache/` contém observações reconstruíveis, processo do servidor e Undo temporário. Sua limpeza não remove planos, imagens, revisões ou baselines.
- Versões locais não são backup externo. Copie a pasta privada ou exporte a apresentação conforme sua necessidade; o plugin não a publica.
- Migração conserva IDs antigos como aliases e atualiza vínculos inequívocos. Ambiguidades precisam ser resolvidas, sem atribuição automática a uma tela diferente.
- O scanner nativo e o Repowise têm limites de linguagem, cobertura e atualidade. A revisão de arquitetura e os testes do comportamento continuam necessários.

O método foi informado por [Superpowers](https://github.com/obra/superpowers) e [Ponytail](https://github.com/DietrichGebert/ponytail), com referências e versões registradas no guia. O adaptador chama a interface pública do [Repowise](https://github.com/repowise-dev/repowise); seus pacotes não são incorporados ao plugin.

A consulta de status também confere a atualidade da análise nativa pelo conteúdo e inventário dos arquivos, mesmo sem Git. Mudanças desde a leitura tornam a evidência anterior desatualizada. Leituras que excedem os limites de tempo, quantidade ou tamanho ficam explicitamente incompletas; não são tratadas como aprovação.
