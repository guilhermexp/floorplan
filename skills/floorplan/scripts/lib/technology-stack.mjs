// Authored technology choices. This inventory never infers installation or approval.
export const STACK_CATEGORIES = [
  ['mobile', 'Aplicativo móvel', 'Mobile app'], ['web', 'Frontend web', 'Web frontend'],
  ['backend', 'API e runtime', 'API and runtime'], ['data', 'Banco e acesso a dados', 'Database and data access'],
  ['auth', 'Autenticação e autorização', 'Authentication and authorization'], ['async', 'Tarefas e comunicação em tempo real', 'Jobs and realtime'],
  ['storage', 'Arquivos e mídia', 'Files and media'], ['integrations', 'Integrações externas', 'External integrations'],
  ['infrastructure', 'Hospedagem e infraestrutura', 'Hosting and infrastructure'], ['delivery', 'Build, CI/CD e distribuição', 'Build, CI/CD and distribution'],
  ['observability', 'Logs, métricas e alertas', 'Logs, metrics and alerts'], ['testing', 'Testes e qualidade', 'Testing and quality'],
  ['security', 'Segredos, backups e recuperação', 'Secrets, backups and recovery'],
];
export const STACK_STATUSES = { selected: ['Escolhida', 'Selected'], proposed: ['Proposta', 'Proposed'], undecided: ['A definir', 'Undecided'], 'not-needed': ['Não se aplica', 'Not applicable'] };
const text = value => typeof value === 'string' && !!value.trim();
const array = value => Array.isArray(value) ? value : [];
export function validateTechnologyStack(plan) {
  if (plan?.technologyStack === undefined) return [];
  if (plan.$schema !== 'floorplan/plan@2') return ['technologyStack requires floorplan/plan@2'];
  if (!Array.isArray(plan.technologyStack)) return ['technologyStack must be an array'];
  const errors = [], ids = new Set(), categories = new Set(STACK_CATEGORIES.map(c => c[0]));
  const decisions = new Map(array(plan.decisions).map(d => [d.id, d]));
  const questions = new Set(array(plan.questions).map(q => q.id));
  plan.technologyStack.forEach((item, i) => {
    const at = `technologyStack[${i}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) { errors.push(`${at} must be an object`); return; }
    for (const key of Object.keys(item)) if (!['id','category','technology','version','purpose','rationale','status','decisions','questions'].includes(key)) errors.push(`${at}.${key} is not supported`);
    if (!text(item.id) || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/.test(item.id) || ids.has(item.id)) errors.push(`${at}.id must be unique and persistent`);
    ids.add(item.id);
    if (!categories.has(item.category)) errors.push(`${at}.category is unsupported`);
    if (!Object.hasOwn(STACK_STATUSES, item.status)) errors.push(`${at}.status is unsupported`);
    for (const key of ['purpose','rationale']) if (!text(item[key])) errors.push(`${at}.${key} is required`);
    for (const key of ['technology','version']) {
      if (['selected','proposed'].includes(item.status) ? !text(item[key]) : item[key] !== undefined && !text(item[key])) errors.push(`${at}.${key} must contain a choice or a version selection criterion`);
    }
    for (const [key, known] of [['decisions', decisions], ['questions', questions]]) {
      if (item[key] !== undefined && (!Array.isArray(item[key]) || item[key].some(id => !text(id) || !known.has(id)))) errors.push(`${at}.${key} contains an unknown reference`);
    }
    if (item.status === 'selected' && !array(item.decisions).some(id => decisions.get(id)?.status === 'accepted')) errors.push(`${at}: selected requires an accepted architecture decision`);
  });
  for (const [category] of STACK_CATEGORIES) {
    const items = plan.technologyStack.filter(i => i?.category === category);
    if (items.some(i => i.status === 'not-needed') && items.some(i => i.status !== 'not-needed')) errors.push(`technologyStack.${category}: not-needed conflicts with active items`);
  }
  return errors;
}
export function technologyStackReport(plan) {
  const items = array(plan?.technologyStack);
  const missing = STACK_CATEGORIES.filter(([id]) => !items.some(i => i.category === id)).map(([id]) => id);
  const pending = items.filter(i => i.status === 'undecided').map(i => i.id);
  const findings = [];
  const finding = (id, title, detail) => ({id:`technology-stack:${id}`,kind:'planning',severity:'medium',title,detail,items:[],locations:[],change:'Complete plan.technologyStack seguindo references/technology-stack.md. Preserve decisões aceitas e perguntas abertas; não invente aprovação, versões ou fornecedores.'});
  if (plan && missing.length) findings.push(finding('coverage', 'Stack técnica incompleta', `Categorias ainda não avaliadas: ${STACK_CATEGORIES.filter(([id]) => missing.includes(id)).map(c => c[1]).join(', ')}. Declare a escolha, a pendência ou por que não se aplica.`));
  if (plan && pending.length) findings.push(finding('pending', 'Escolhas da stack em aberto', `${pending.length} itens aguardam definição. Consulte a seção Stack do projeto antes de implementar as partes dependentes.`));
  return {categories:STACK_CATEGORIES, statuses:STACK_STATUSES, items, legacy:array(plan?.stack), missing, pending, findings};
}
