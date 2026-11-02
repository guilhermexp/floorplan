// Presentation-only localization. Graph IDs, paths, prompts and user input are never rewritten.
(() => {
  const SC = window.Floorplan;
  if (!SC) return;
  const pairs = {
    'Overview':'Visão geral','Screens':'Telas','Screen':'Tela','Flows':'Fluxos','Flow':'Fluxo','Start here':'Comece aqui','Review':'Revisão','Health':'Verificação','Export':'Exportar','Ask':'Perguntar','Change':'Alterar','Close':'Fechar','Close (Esc)':'Fechar (Esc)','Back':'Voltar','Next':'Próximo','Previous':'Anterior','Done':'Concluir','Skip':'Pular','Play':'Reproduzir','Play it':'Reproduzir fluxo','Stop':'Parar','Pause':'Pausar','Continue':'Continuar','Cancel':'Cancelar','Save':'Salvar','Copy':'Copiar','Copied':'Copiado','Download':'Baixar','More':'Mais','Less':'Menos','Open':'Abrir','Answer':'Resposta','Board':'Painel','Blueprint':'Planejamento','Codebase':'Projeto','Folder':'Pasta','File':'Arquivo','Visual':'Visual',
    'Search files, routes, modules':'Buscar arquivos, rotas e módulos','Search by name, description, path or route…':'Buscar por nome, descrição, caminho ou rota…','Find a screen…':'Buscar uma tela…','Connection types':'Tipos de conexão','Toggle details':'Exibir detalhes','Toggle details (P)':'Exibir detalhes (P)','Up one level':'Subir um nível','Up one level (Backspace)':'Subir um nível (Backspace)','Drag to resize':'Arraste para redimensionar','Zoom out (−)':'Diminuir zoom (−)','Zoom in (+)':'Aumentar zoom (+)','Fit to screen (F)':'Ajustar à tela (F)','Fit to screen':'Ajustar à tela','Back to overview':'Voltar à visão geral','Back to map':'Voltar ao mapa','Show on the map':'Mostrar no mapa','Show on map':'Mostrar no mapa','Show details':'Mostrar detalhes','Ask about this':'Perguntar sobre isto','Ask about this screen':'Perguntar sobre esta tela','Ask about this connection':'Perguntar sobre esta conexão','Open in editor':'Abrir no editor','Open handler':'Abrir responsável','Copy endpoint':'Copiar endpoint','Copy path':'Copiar caminho','Copy name':'Copiar nome','Copy prompt':'Copiar solicitação','Copy command':'Copiar comando','Copy answer':'Copiar resposta',
    'Systems':'Sistemas','Apps people use':'Aplicativos usados pelas pessoas','what users and staff open':'o que usuários e equipe acessam','Behind the scenes':'Nos bastidores','servers, background work, shared code':'servidores, tarefas e código compartilhado','Outside services':'Serviços externos','other companies your app relies on':'serviços de outras empresas usados pelo app','Inside':'Conteúdo','Used by':'Usado por','Depends on':'Depende de','Uses':'Usa','Web requests':'Requisições web','Background jobs':'Tarefas em segundo plano','Saved data':'Dados armazenados','Settings':'Configurações','Imports':'Importações','HTTP calls':'Chamadas HTTP','Events':'Eventos','Queues':'Filas','Contains':'Contém','Configuration':'Configuração','Data':'Dados','Calls':'Chamadas','Entrypoints':'Pontos de entrada','Repositories':'Repositórios','Guided flows':'Fluxos guiados','Planned files':'Arquivos planejados','Files':'Arquivos','Endpoints':'Endpoints','Exports':'Exportações','Defined in':'Definido em','Called from':'Chamado por','Handled by':'Responsável','Imported by':'Importado por','On this board':'Neste painel','Matched by':'Associado por','Who may use it':'Quem pode usar','Build it':'Implementar','Assumptions':'Premissas','Design review':'Revisão do plano','Health check':'Verificação do projeto','Recent work':'Trabalho recente','This is a screen':'Esta é uma tela','Behind these screens':'Usado nestas telas','See everything behind this screen':'Ver tudo por trás desta tela','Start from a screen':'Começar por uma tela',
    'Show connections':'Mostrar conexões','Show technical detail':'Mostrar detalhes técnicos','Reset filters':'Redefinir filtros','All':'Todos','None':'Nenhum','Everything':'Tudo','Nothing inside.':'Nada nesta seção.','No description yet':'Descrição ainda não disponível','Laying out…':'Organizando o mapa…','checking…':'verificando…','Thinking…':'Analisando…','Working…':'Trabalhando…','Starting…':'Iniciando…','Reading…':'Lendo…','Asking is unavailable':'Perguntas indisponíveis','What should change here?':'O que deve mudar aqui?','Ask anything about this codebase…':'Pergunte sobre este projeto…','Ask for a change, e.g. “also plan out refunds”…':'Peça uma alteração, por exemplo: “planeje também os reembolsos”…','Ask a question about the plan':'Faça uma pergunta sobre o plano','Ask for a change, addition or removal, and the map is redrawn':'Peça uma alteração, inclusão ou remoção para atualizar o mapa','Remove':'Remover','Show answer board':'Mostrar painel da resposta','Follow-up questions':'Perguntas complementares','Try again':'Tentar novamente','Retry':'Tentar novamente','Send':'Enviar','Request a new flow':'Solicitar novo fluxo','Request a flow':'Solicitar fluxo','New flow':'Novo fluxo','Custom flows':'Fluxos personalizados','Delete flow':'Excluir fluxo','Delete':'Excluir','Saved flows':'Fluxos salvos','Save flow':'Salvar fluxo','Flow saved':'Fluxo salvo','No flows yet':'Nenhum fluxo ainda','Ask a follow-up…':'Faça outra pergunta…',
    'Pick a screen of the app to see everything behind it':'Escolha uma tela do aplicativo para ver suas conexões','Pick a page of the app to see the parts on it, the requests it makes and the server code behind them.':'Escolha uma página para ver os componentes, as requisições e o código do servidor relacionado.','A one-minute tour of this codebase':'Um passeio de um minuto por este projeto','What was just worked on, on one board':'As alterações recentes reunidas em um painel','One real path':'Um caminho real','The codebase':'O projeto','What people use':'O que as pessoas usam','Where the data lives':'Onde os dados ficam','There is not enough on this map for a tour yet.':'Este mapa ainda não tem conteúdo suficiente para uma apresentação.','Press Play to follow it through the code, one step at a time.':'Clique em Reproduzir para acompanhar o fluxo, passo a passo.','Back (←)':'Voltar (←)','Replay':'Rever','Replay tour':'Rever apresentação',
    'Export a copy':'Exportar uma cópia','Export a copy of this map to share':'Exportar uma cópia deste mapa para compartilhar','Flows and the tour':'Fluxos e apresentação','The guided walkthroughs, including ones you requested.':'Os fluxos guiados, incluindo os que você solicitou.','Notes pinned to files':'Notas vinculadas aos arquivos','The notes shown on file cards.':'As notas mostradas nos cartões de arquivo.','What was just changed, and why.':'O que mudou recentemente e por quê.','The decisions the plan still leaves open.':'As decisões do plano que ainda estão em aberto.','One HTML file with the whole map, to send to anyone. It opens in any browser with nothing to install, and has no Ask bar.':'Um arquivo HTML com o mapa completo para compartilhar. Abre em qualquer navegador, sem instalação e sem a barra de perguntas.','The map’s server has restarted since this page opened. Reload the page and try again.':'O servidor reiniciou desde que esta página foi aberta. Recarregue e tente novamente.','The map’s server couldn’t export it.':'Não foi possível exportar o mapa.','Couldn’t reach the map’s server. Ask Claude or Codex to open the floorplan again, then try again.':'Não foi possível acessar o servidor. Peça ao agente para abrir o mapa novamente e tente outra vez.',
    'Type your answer, then press Enter':'Digite sua resposta e pressione Enter','Edit the request if you like, then press Enter':'Ajuste a solicitação, se quiser, e pressione Enter','Resolve on the map':'Resolver no mapa','Show all':'Mostrar todos','Important':'Importante','Worth fixing':'Vale revisar','Minor':'Menor','Nothing urgent':'Nada urgente','Nothing needs attention':'Nenhum item precisa de atenção','No issues found':'Nenhum problema encontrado','Resolve':'Resolver','Fix':'Corrigir','Notes':'Notas','Add a note':'Adicionar nota','Edit note':'Editar nota','Save note':'Salvar nota','No matches':'Nenhum resultado','Nothing on the map matches that.':'Nenhum item do mapa corresponde à busca.','The screen itself':'A própria tela','A component on this screen':'Um componente desta tela','Helper code this screen uses':'Código de apoio usado por esta tela','A map of the main parts of this app and how they talk to each other.':'Um mapa das principais partes deste aplicativo e de suas conexões.','Planned, not built yet: every card is a part the system would need.':'Planejado, ainda não implementado: cada cartão representa uma parte prevista do sistema.',
    'Language':'Idioma','Português':'Português','English':'English',
    // Native Portuguese visual tools also have an English presentation.
    'Visuals':'Visuais','Screen visuals':'Visuais das telas','Close preview':'Fechar preview','Thumbnails':'Miniaturas','Enlarge':'Ampliar','Open on canvas':'Abrir no canvas','Previous image':'Imagem anterior','Next image':'Próxima imagem','Image preview':'Preview da imagem','Search screen':'Buscar tela','Filter visuals':'Filtrar visuais','All screens':'Todas as telas','With proposals':'Com propostas','With real captures':'Com capturas reais','Without image':'Sem imagem','Proposal':'Proposta','Real capture':'Captura real','Approved':'Aprovada','Compare':'Comparar','Add visual':'Adicionar visual','View on canvas':'Ver no canvas','Enlarge image':'Ampliar imagem','Original size':'Tamanho original','Fit to window':'Ajustar à janela','Save visual':'Salvar visual','Saving…':'Salvando…','Title':'Título','Version':'Versão','State':'Estado','Image date':'Data da imagem','Captured URL':'Endereço capturado','Type':'Tipo','Approved proposal':'Proposta aprovada','Proposal version':'Versão da proposta','Capture version':'Versão da captura','Waiting for image':'Aguardando imagem','Image unavailable':'Imagem indisponível','Explore visuals':'Explorar visuais','Planned and implemented':'Planejado e implementado','Search by name, ID or address…':'Buscar por nome, ID ou endereço…','No screen matches this filter.':'Nenhuma tela corresponde a este filtro.','Images added here stay linked to this screen.':'As imagens adicionadas aqui ficam vinculadas a esta tela.','The first proposal or capture of this screen is still pending.':'Aguardando a primeira proposta ou captura real desta tela.','This screen has no images yet.':'Esta tela ainda não tem imagens.','This screen has no images yet. Add a proposal or real capture.':'Esta tela ainda não tem imagens. Adicione uma proposta ou uma captura real.','This screen has no real capture yet. Once the app is running, add a capture here.':'Ainda não há captura real desta tela. Quando o app estiver funcionando, registre uma captura aqui.','This screen has no visual proposal yet.':'Ainda não há proposta visual para esta tela.','Proposals and captures are separate records. Adding a version preserves earlier ones.':'Propostas e capturas são registros independentes. Adicionar uma versão preserva as anteriores.','These images have different viewports or states. Check their labels when comparing.':'Estas imagens têm viewport ou estado diferentes. Confira as etiquetas ao comparar.','Planned and implemented · choose the versions to compare.':'Planejado e implementado · selecione as versões que deseja comparar.','Image unavailable. Its record was preserved.':'Imagem indisponível. O registro foi preservado.','Date not provided':'Data não informada','the planning and implementation in one place.':'o planejamento e a implementação no mesmo lugar.','Preview image':'Visualizar imagem'
  };
  Object.assign(pairs, {
    'New':'Novo','Changed':'Alterado','Show cards':'Mostrar cartões','Nothing urgent':'Nenhum item urgente','nothing urgent':'nenhum item urgente','No call sites matched in the scanned code. It may be called by an external system, or through a URL built at runtime.':'Não foram encontradas chamadas no código analisado. Este item pode ser usado por um sistema externo ou por um endereço montado durante a execução.',
    'Click a card to inspect it':'Clique em um cartão para ver os detalhes','double-click to open it':'clique duas vezes para abrir','search':'buscar','up':'subir','fit':'ajustar','inspector':'detalhes','navigate':'navegar','open':'abrir','close':'fechar','Planned from':'Planejado a partir de',', not built yet. Every dashed card is a part the system would need. Pick one and choose':'ainda não implementado. Cada cartão tracejado representa uma parte prevista. Escolha uma parte e use','to start on it.':'para começar a implementação.',
    'Copy this request and paste it into':'Copie esta solicitação e cole no','opened in your project folder.':'com a pasta do projeto aberta.','opened in your project folder. It explains what to change and asks before anything risky.':'com a pasta do projeto aberta. A solicitação explica a alteração e pede confirmação antes de ações de risco.','A ready request for':'Uma solicitação pronta para','to build':'implementar','this file':'este arquivo','this part':'esta parte','the way the plan describes.':'conforme descrito no plano.','It shows how':'Mostra como','is put together: every part, file and endpoint, and the names of the functions inside, but not the code itself.':'é organizado: partes, arquivos, endpoints e nomes das funções, sem incluir o código-fonte.','Exporting needs the map’s server. Ask Claude or Codex to “export the floorplan”, or run this in the project folder:':'Para exportar, use o servidor local. Peça ao agente para exportar o mapa ou execute este comando na pasta do projeto:',
    'for the person to finish':'para completar','Press Play to follow it through the code, one step at a time.':'Clique em Reproduzir para seguir pelo código, passo a passo.','Replay this tour any time from':'Você pode rever esta apresentação usando','at the top.':'no topo.','shows everything behind any page.':'mostra as conexões de cada página.','No match':'Nenhum resultado','Description':'Descrição','Name':'Nome','Path':'Caminho','Status':'Status','Details':'Detalhes','Summary':'Resumo','Add':'Adicionar','Reset':'Redefinir','Undo':'Desfazer','Undo change':'Desfazer alteração','Keep':'Manter','Remove from map':'Remover do mapa',
    'The parts of this app':'As partes deste app','the main parts':'as partes principais','On this screen':'Nesta tela','Background work':'Tarefas em segundo plano','Server':'Servidor','Service':'Serviço','Library':'Biblioteca','Data store':'Armazenamento de dados','External':'Externo','Route':'Rota','Symbol':'Símbolo','Module':'Módulo','file':'arquivo','node':'parte','config':'configuração','infra':'infraestrutura','test':'teste','worker':'tarefas','service':'serviço','library':'biblioteca','feature':'funcionalidade','external':'externo',
    'Language: English':'Idioma: Inglês','Choose the interface language.':'Escolha o idioma da interface.','These settings apply to the interface.':'Estas preferências se aplicam à interface.','Search by name, ID or address…':'Buscar por nome, ID ou endereço…','The planning and implementation in one place.':'O planejamento e a implementação no mesmo lugar.',
    'Image · PNG, JPEG or WebP':'Imagem · PNG, JPEG ou WebP','Context, review or known differences':'Contexto, revisão ou diferenças conhecidas','e.g. Home on mobile':'Ex.: Início no celular','e.g. Mobile 390 × 844':'Ex.: Mobile 390 × 844','Default':'Padrão','Pick an image of up to 12 MB.':'Escolha uma imagem de até 12 MB.','Could not read the image.':'Não foi possível ler a imagem.','Could not save the visual.':'Não foi possível salvar o visual.','The server restarted. Reload the map and try again.':'O servidor foi reiniciado. Recarregue o mapa e tente novamente.','Open the map with its local server to add images. You can also ask the agent to import a proposal or capture into this screen.':'Abra o mapa pelo servidor local para adicionar imagens. Você também pode pedir ao agente para importar uma proposta ou captura nesta tela.',
    'Linked visuals':'Visuais vinculados','real captures':'capturas reais','proposals':'propostas','proposal':'proposta','real capture':'captura real','screens':'telas','without image':'sem imagem','visuals linked':'visuais vinculados','Date not provided':'Data não informada'
  });
  Object.assign(pairs, {
    "Proposals and real captures per screen": "Propostas e capturas reais por tela",
    "No problems found": "Nenhum problema encontrado",
    "Fix these first": "Corrija estes itens primeiro",
    "Worth fixing soon": "Vale revisar em breve",
    "Good to tidy up": "Ajustes recomendados",
    "We checked the plan for parts anyone on the internet could use, decisions the PRD leaves open, and pieces nothing connects to. Settling these now is cheaper than after it’s built.": "Verificamos as partes do plano acessíveis pela internet, as decisões em aberto no PRD e os elementos sem conexões. Resolver isso agora reduz retrabalho depois da implementação.",
    "We looked for keys left in the code or sent to the browser, data and parts of your app anyone on the internet can reach (Supabase tables, Firebase rules, Stripe webhooks, endpoints), leftover files and files too big to edit safely. It’s a quick check, not a security audit.": "Verificamos chaves no código ou enviadas ao navegador, dados e serviços acessíveis pela internet (tabelas Supabase, regras Firebase, webhooks Stripe e endpoints), arquivos sem uso e arquivos grandes demais. Esta é uma verificação rápida, não uma auditoria de segurança.",
    "These are automatic hints.": "Estas são sugestões automáticas.",
    "These are automatic hints from when this copy was exported.": "Estas sugestões automáticas refletem o momento da exportação.",
    "No flows in this copy.": "Esta cópia não tem fluxos.",
    "Request a new flow…": "Solicitar um novo fluxo…",
    "yours": "seu",
    "Trace it": "Mapear fluxo",
    "Describe a flow…": "Descreva um fluxo…",
    "connecting…": "conectando…",
    "Unavailable": "Indisponível",
    "Coming soon": "Em breve",
    "One shared map for your whole team: notes everyone can see, kept in sync with GitHub and updated on every push.": "Um mapa compartilhado com toda a equipe: notas visíveis para todos, sincronizado com o GitHub e atualizado a cada envio de alterações.",
    "Want an email when it launches?": "Quer receber um e-mail no lançamento?",
    "Let me know": "Quero ser avisado",
    "Not now": "Agora não",
    "Don't ask again": "Não perguntar novamente",
    "How would you use it?": "Como você usaria?",
    "Just me": "Só eu",
    "just me": "só eu",
    "With my team": "Com minha equipe",
    "with my team": "com minha equipe",
    "A map of my own projects": "Um mapa dos meus projetos",
    "One shared map we all work from": "Um mapa compartilhado com toda a equipe",
    "Where should we email you?": "Em qual e-mail devemos avisar?",
    "Notify me": "Avisar no lançamento",
    "Use my Claude email": "Usar meu e-mail do Claude",
    "you@example.com": "voce@exemplo.com",
    "Only this email and your answer (": "Somente este e-mail e sua resposta (",
    ") are sent, to a private Google Sheet kept by Floorplan's maker. It's used only to tell you when Floorplan Cloud launches.": ") são enviados a uma planilha privada mantida pelo criador do Floorplan. Esses dados são usados apenas para avisar sobre o lançamento do Floorplan Cloud.",
    "Looking up your Claude Code account…": "Consultando sua conta do Claude Code…",
    "Claude Code isn't signed in with a Claude account here. Type an email instead.": "O Claude Code não está conectado a uma conta aqui. Digite seu e-mail.",
    "Couldn't ask Claude Code. Type an email instead.": "Não foi possível consultar o Claude Code. Digite seu e-mail.",
    "That doesn't look like an email address.": "Confira o formato do endereço de e-mail.",
    "Sending…": "Enviando…",
    "Too many sign-ups right now. Try again in a little while.": "Há muitas inscrições neste momento. Tente novamente em breve.",
    "Couldn't send that. Check your connection and try again.": "Não foi possível enviar. Confira sua conexão e tente novamente.",
    "You're on the list": "Você está na lista",
    "We'll email": "Vamos enviar um e-mail para",
    "when Floorplan Cloud launches. Thanks!": "quando o Floorplan Cloud for lançado. Obrigado!",
    "Answers come from Claude in the Claude app, using the map (not the source files)": "As respostas vêm do aplicativo Claude usando o mapa, sem acessar os arquivos-fonte",
    "Install the Claude Code CLI for a better experience": "Instale a CLI do Claude Code para uma experiência mais completa",
    "About the Claude Code CLI": "Sobre a CLI do Claude Code",
    "Nothing stood out. This is a quick automatic check, not a full design review.": "Nada chamou a atenção. Esta é uma verificação automática rápida, não uma revisão completa do projeto.",
    "Nothing stood out. This is a quick automatic check, not a full security review.": "Nada chamou a atenção. Esta é uma verificação automática rápida, não uma revisão completa de segurança."
});
  Object.assign(pairs, {
    'The PRD doesn’t answer this, and the answer changes what gets built. Decide it before building the parts it touches.':'O PRD não responde a esta questão, e a decisão muda o que será implementado. Defina isso antes de desenvolver as partes envolvidas.',
    'Depends on an open question':'Depende de uma decisão em aberto',
    'Saved data this reads or changes':'Dados armazenados que esta tela consulta ou altera',
    'Where the data is kept':'Onde os dados ficam armazenados',
    '“Resolve on the map” puts a request in the Ask bar’s Change mode: finish or edit it, press Enter, and Codex updates the plan and redraws the map. Undo puts it back.':'“Resolver no mapa” prepara uma solicitação no modo Alterar: complete ou edite o texto e pressione Enter. O Codex atualiza o plano e o mapa. Use Desfazer para reverter.',
    '“Resolve on the map” puts a request in the Ask bar’s Change mode: finish or edit it, press Enter, and Claude updates the plan and redraws the map. Undo puts it back.':'“Resolver no mapa” prepara uma solicitação no modo Alterar: complete ou edite o texto e pressione Enter. O Claude atualiza o plano e o mapa. Use Desfazer para reverter.'
  });
  Object.assign(pairs, {
    'Not a problem':'Não é um problema','Not a problem?':'Não é um problema?',
    'Mark as not a problem':'Marcar como não sendo um problema','Marked as not a problem':'Marcado como não sendo um problema',
    'Show again':'Mostrar novamente','Marked as not a problem.':'Marcado como não sendo um problema.',
    'Marked as not a problem. Thanks for the report.':'Marcado como não sendo um problema. Obrigado pelo relato.',
    'Couldn’t reach the map server, so this wasn’t saved.':'Não foi possível acessar o servidor do mapa. A alteração não foi salva.',
    'Couldn’t reach the map server.':'Não foi possível acessar o servidor do mapa.',
    'Why not? (optional) e.g. that value is a bcrypt hash, not the password':'Por quê? (opcional) Ex.: o valor é um hash bcrypt, não a senha',
    'Also tell the Floorplan developer, so the check gets better. This opens a GitHub issue you can read and edit before sending. It includes only what’s shown below, never your code or any values.':'Avise também o desenvolvedor do Floorplan para melhorar a verificação. Isso abre uma issue no GitHub para você revisar e editar antes de enviar. Ela inclui apenas o conteúdo mostrado abaixo, sem código nem valores.',
    'Quick automatic check of the plan':'Verificação automática rápida do plano',
    'Quick automatic check of secrets, open endpoints and leftover files':'Verificação automática rápida de segredos, endpoints abertos e arquivos sem uso',
    'If one is wrong, “Not a problem” sets it aside.':'Se uma sugestão estiver incorreta, use “Não é um problema” para deixá-la de lado.'
  });
  const reverse = Object.fromEntries(Object.entries(pairs).map(([en, pt]) => [pt,en]));
  let lang = 'pt-BR';
  try { if (localStorage.getItem('floorplan.language') === 'en') lang = 'en'; } catch {}
  const templates = [
    [/^Mark “(.+)” as a false alarm and it moves to the bottom of the (design review|health check), out of the count\. It comes back if this check finds something new there\.$/,'Marque “$1” como falso alarme para removê-lo da contagem e movê-lo para o fim da lista. Ele volta a aparecer se a verificação encontrar algo novo nesse item.'],[/^Marked as not a problem: (.+)$/,'Marcado como não sendo um problema: $1'],
    [/^Part of (.+)$/,'Parte de $1'],[/^Asks the server for (.+)$/,'Solicita ao servidor: $1'],[/^Asks the server to (.+)$/,'Solicita ao servidor: $1'],[/^Server code that handles (.+)$/,'Código do servidor responsável por $1'],[/^Step (\d+) of (\d+)$/,'Etapa $1 de $2'],
    [/^Describe what to trace, and (.+) builds a step-by-step flow through the map\.$/,'Descreva o que deseja acompanhar, e $1 criará um fluxo passo a passo pelo mapa.'],
    [/^Answers come from (.+) on this computer, which can read the source$/,'As respostas vêm do $1 neste computador, com acesso de leitura ao código'],[/^Everything behind (.+)$/,'Tudo por trás de $1'],[/^Ask anything about (.+)…$/,'Pergunte sobre $1…'],[/^Screen: (.+)$/,'Tela: $1'],[/^Answer: (.+)$/,'Resposta: $1'],[/^Go to (.+)$/,'Ir para $1'],[/^Build this with (.+)$/,'Implementar com $1'],[/^Fix with (.+)$/,'Corrigir com $1'],[/^Resolve with (.+)$/,'Resolver com $1'],[/^Copied\. Paste it into (.+)\.$/,'Copiado. Cole no $1.'],[/^Downloaded (.+)$/,'Arquivo baixado: $1'],[/^Layout failed: (.+)$/,'Falha ao organizar o mapa: $1'],[/^No screen matches (.+)\.$/,'Nenhuma tela corresponde a $1.'],[/^(Design review|Health check): (.+)$/,'__HEALTH__'],[/^Theme: (.+)\. Press for (.+)\.$/,'__THEME__'],[/^Theme is now (.+)\.$/,'__THEME_STATUS__'],
    [/^(\d+) of (\d+)$/,'$1 de $2'],[/^(\d+) (planned files|files|file|screens|screen|lines|line|endpoints|endpoint|modules|module|cards|card|steps|step|uses|used by|exports|export)$/,'__COUNT__'],[/^(\d+) changed$/,'$1 alterados'],[/^Updated (.+)$/,'Atualizado: $1'],[/^(\d+) things need attention$/,'$1 itens precisam de atenção'],[/^(\d+) important$/,'$1 importantes'],[/^(\d+) worth fixing$/,'$1 para revisar'],[/^(\d+) minor$/,'$1 menores'],
  ];
  const terms = {'planned files':'arquivos planejados',files:'arquivos',file:'arquivo',screens:'telas',screen:'tela',lines:'linhas',line:'linha',endpoints:'endpoints',endpoint:'endpoint',modules:'módulos',module:'módulo',cards:'cartões',card:'cartão',steps:'etapas',step:'etapa',uses:'dependências','used by':'usos',exports:'exportações',export:'exportação',new:'novo',changed:'alterado',service:'serviço',worker:'tarefas',library:'biblioteca',feature:'funcionalidade',data:'dados',config:'configuração',test:'teste',script:'script',infra:'infraestrutura',external:'externo',node:'parte',root:'projeto',ui:'interface',symbol:'símbolo',route:'rota',module:'módulo',dir:'pasta',contains:'contém'};
  const time = (s) => s.replace(/\btoday\b/g,'hoje').replace(/\byesterday\b/g,'ontem').replace(/(\d+) days? ago/g,'há $1 dias').replace(/(\d+) hours? ago/g,'há $1 horas').replace(/(\d+) minutes? ago/g,'há $1 minutos');
  function toPortuguese(s) {
    const clean = s.trim();
    if (!clean) return s;
    if (s !== clean) return s.replace(clean,toPortuguese(clean));
    if (pairs[s]) return pairs[s];
    if (terms[s]) return terms[s];
    if (s.includes('·')) return s.split('·').map(toPortuguese).join('·');
    if (s.includes(' — ') && /^(Screen|Answer|Board|Overview|Blueprint) — /.test(s)) return s.split(' — ').map(toPortuguese).join(' — ');
    for (const [re, out] of templates) {
      const m = re.exec(s); if (!m) continue;
      if (out === '__COUNT__') return `${m[1]} ${terms[m[2]]}`;
      if (out === '__HEALTH__') return `${pairs[m[1]]}: ${m[2] === 'nothing urgent' ? 'nenhum item urgente' : toPortuguese(m[2])}`;
      if (out === '__THEME__') { const names = {'Auto (follows your device)':'Automático (segue o dispositivo)',Auto:'Automático',Light:'Claro',Dark:'Escuro'};return `Tema: ${names[m[1]] || m[1]}. Mudar para ${names[m[2]] || m[2]}.`; }
      if (out === '__THEME_STATUS__') return `Tema alterado para ${({'Auto, following your device':'Automático, seguindo o dispositivo',Light:'Claro',Dark:'Escuro'})[m[1]] || m[1]}.`;
      return time(s.replace(re,out));
    }
    return s;
  }
  function translate(value) {
    const trimmed = value.trim(); if (!trimmed) return value;
    let translated = lang === 'pt-BR' ? toPortuguese(trimmed) : reverse[trimmed] || trimmed;
    if (lang === 'en' && translated === trimmed) {
      translated = trimmed.replace(/^(\d+) de (\d+) telas · clique para visualizar aqui$/, '$1 of $2 screens · click to preview here')
        .replace(/^(\d+) telas · (\d+) visuais vinculados$/, '$1 screens · $2 linked visuals')
        .replace(/^(\d+) proposta(s?) · (\d+) captura(s?) rea(?:l|is)$/, '$1 proposals · $3 real captures')
        .replace(/ · a nova imagem será acrescentada ao histórico\.$/, ' · the new image will be added to the history.')
        .replace(/^(\d+) (propostas|proposta|capturas reais|captura real|telas|sem imagem)$/, (_,n,word) => n + ' ' + (reverse[word] || word));
    }
    if (lang === 'en' && translated === trimmed && trimmed.includes('·')) {
      translated = trimmed.split('·').map((part) => { const clean = part.trim(); return clean ? part.replace(clean,reverse[clean] || clean) : part; }).join('·');
    }
    return value.replace(trimmed, translated);
  }
  const originals = new WeakMap(), attributes = new WeakMap();
  const skip = (el) => !el || !!el.closest('script,style,code,pre,textarea,[contenteditable=true],[data-no-translate],.vs-screen-copy strong,.visual-title,.vs-panel-row strong');
  const observer = new MutationObserver((changes) => {
    observer.disconnect();
    // Process changed subtrees only; drawing a map does not rescan script/data payloads.
    const roots = new Set(changes.map((c) => c.type === 'characterData' ? c.target.parentElement : c.target));
    for (const root of roots) apply(root);
    observe();
  });
  function apply(root) {
    if (!root || skip(root.nodeType === 1 ? root : root.parentElement)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (skip(node.parentElement)) continue;
      const old = originals.get(node), source = old && node.data === old.last ? old.source : node.data;
      const next = translate(source); originals.set(node,{source,last:next}); if (node.data !== next) node.data = next;
    }
    const elements = root.nodeType === 1 ? [root,...root.querySelectorAll('[title],[aria-label],[placeholder]')] : [];
    for (const el of elements) {
      if (skip(el)) continue;
      const saved = attributes.get(el) || {};
      for (const name of ['title','aria-label','placeholder']) {
        if (!el.hasAttribute(name)) continue;
        const value = el.getAttribute(name), old = saved[name], source = old && value === old.last ? old.source : value, next = translate(source);
        saved[name] = {source,last:next}; if (value !== next) el.setAttribute(name,next);
      }
      attributes.set(el,saved);
    }
  }
  const observe = () => observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder']});
  function setLanguage(next) {
    lang = next === 'en' ? 'en' : 'pt-BR';
    try { localStorage.setItem('floorplan.language',lang); } catch {}
    document.documentElement.lang = lang;
    observer.disconnect(); apply(document.body);
    observe(); window.dispatchEvent(new CustomEvent('floorplan-language-change',{detail:lang}));
  }
  window.FloorplanI18n = Object.freeze({ get:()=>lang, set:setLanguage, t:translate, ownsText:(node)=>{ const s = originals.get(node)?.source || node.data || ''; return toPortuguese(s) !== s || !!reverse[s.trim()]; } });
  setLanguage(lang);
})();
