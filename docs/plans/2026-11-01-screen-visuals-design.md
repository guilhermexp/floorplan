# Visuais por tela — desenho aprovado

Cada tela centraliza propostas de interface e capturas da implementação. Ambas aparecem como cartões com imagens no canvas da tela e em uma galeria no painel. Uma captura nunca sobrescreve uma proposta. A comparação permite escolher versões de cada categoria, com viewport/estado e proveniência visíveis.

## Contrato

`floorplan/visuals.json` contém `{version:1, items:[...]}`. Cada item tem `id`, `screen` (ID da tela ou caminho do arquivo), `kind` (`proposal` ou `capture`), `title`, `asset` (caminho relativo dentro de `floorplan/visuals/`), `viewport`, `state`, `version`, `createdAt`, `sourceUrl`, `notes`, `approved`. Capturas exigem data e URL http(s). Propostas não são evidência de implementação. O build resolve o vínculo e reporta imagens ausentes e referências órfãs sem descartar o manifesto original. PNG/JPEG/WebP, sem dependências novas. Caminhos e symlinks não podem escapar da pasta de imagens.

## Uso

Botão Visuais abre catálogo pesquisável de telas, inclusive as ainda sem imagens. Uma tela abre seu canvas com referências visuais e componentes. Miniaturas carregam sob demanda; clique amplia; comparação permite selecionar proposta e captura. A adição manual usa o servidor local e preserva o histórico; agentes usam um comando de importação com os mesmos campos. Rebuild/refresh não sobrescrevem o manifesto. Exportação HTML pode incluir imagens embutidas.

## Teste em projeto local

Usar as telas do catálogo existente e copiar as imagens aprovadas, preservando originais. Todas são propostas; não existe implementação comprovada na sessão. Não gerar novas imagens nem construir o projeto de teste nesta tarefa. Validar importação de captura e comparação em fixture de teste identificada, sem alegar app implementado. Exibir cobertura honesta no projeto real.

## Validação

Testes de manifesto, resolução de tela, segurança de arquivo, persistência após rebuild, importação autenticada e exportação. Smoke test no navegador com o projeto de teste, ampliação, busca, canvas, estados sem captura e comparação em fixture. Suite existente para regressões.
