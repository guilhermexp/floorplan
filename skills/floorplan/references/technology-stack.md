# Stack do projeto

Todo projeto precisa explicitar o que o construirá e operará. Em `floorplan/plan@2`, mantenha `technologyStack` como inventário estruturado. `stack: string[]` continua compatível como resumo de planos antigos; sozinho não demonstra completude. O inventário aparece em Planejamento, no contexto do agente, na revisão e na exportação de versões locais.

```json
{"id":"mobile-base","category":"mobile","technology":"React Native + Expo + TypeScript","version":"Definir versões compatíveis após a prova em aparelhos","purpose":"Aplicativo iOS e Android","rationale":"Compartilhar interface e domínio entre plataformas","status":"proposed","decisions":["D01"],"questions":[]}
```

Campos: `id` persistente; `category`; `purpose` e `rationale` obrigatórios; `status`; `technology` e `version` obrigatórios para propostas e escolhas; `decisions` e `questions` são referências opcionais que precisam existir no plano. Uma versão pode ser exata ou um critério explícito de seleção com validação pendente. Não invente versões atuais/compatibilidade; verifique fontes oficiais quando selecionar bibliotecas ou fornecedores.

Estados:
- `selected`: escolha já tomada, ligada a pelo menos uma decisão `accepted`. Não equivale a componente instalado ou validado.
- `proposed`: recomendação técnica ainda não aprovada.
- `undecided`: capacidade necessária com tecnologia/fornecedor indefinido. Explique o bloqueio e ligue às perguntas relevantes.
- `not-needed`: categoria não aplicável, com razão concreta. Não acrescente um serviço só para preencher a lista.

Avalie todas as categorias: `mobile`, `web`, `backend`, `data`, `auth`, `async`, `storage`, `integrations`, `infrastructure`, `delivery`, `observability`, `testing`, `security`. Mais de um item por categoria é permitido. Uma categoria declarada não aplicável não pode ter itens ativos simultâneos.

Inclua linguagens/runtime, interface e componentes quando conhecidos, API/contratos, acesso a dados/migrações, autenticação/permissões, jobs/realtime, arquivos, fornecedores externos, hospedagem/ambientes, build/distribuição/CI, observabilidade, testes, segredos, backup e recuperação. Separe decisões que possam mudar independentemente; não agrupe um fornecedor desconhecido sob uma escolha já aceita.

Em conceito, registre capacidades e pendências sem escolher ferramentas prematuramente. Em arquitetura, avalie custos/limites, operação, compatibilidade e alternativas nas decisões associadas. Em projeto existente, confronte o plano com manifests, locks, configuração e implantação observada; não marque a intenção como instalada. Não há uma stack universal obrigatória.

Categorias omitidas e escolhas indefinidas aparecem na revisão. Cobertura é um inventário, não prova de adequação. Antes de implementar uma parte dependente, resolva suas escolhas. Ao incorporar respostas, atualize inventário, resumo, decisões e arquitetura na mesma publicação; preserve perguntas e hashes das respostas. Reavalie categorias ao adicionar uma plataforma, provedor ou ambiente. Não contrate serviços nem registre aceitação sem autorização.

Dados específicos do projeto ficam em sua pasta ignorada `floorplan/`; somente o contrato e testes sintéticos entram no Git do plugin. Versões antigas continuam imutáveis.
