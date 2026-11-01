// Questions are authored with the plan. Answers are user input, never inferred from a recommendation.
import crypto from 'node:crypto';
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && !!v.trim();
const id = v => text(v) && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(v);
const hash = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const digest = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const iso = v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
const normalized = (q) => { const value = typeof q === 'string' ? { question: q } : q; return { ...value, id: value?.id || `legacy-${hash(value?.question).slice(0,16)}` }; };
export const questionHash = q => hash([q.question, q.about || [], !!q.multiple, (Array.isArray(q.options) ? q.options : []).map(o => [o?.id, o?.label, o?.description, !!o?.recommended])]);
export const answerHash = a => hash([a.questionHash, a.selected, a.labels, a.text, a.at]);
export function questionViews(plan) {
  return (plan?.questions || []).map((value, i) => {
    const q = normalized(value, i), fingerprint = questionHash(q), answer = q.answer;
    const state = !answer ? 'open' : answer.questionHash !== fingerprint ? 'stale' : q.resolution?.answerHash === answerHash(answer) ? 'resolved' : 'answered';
    return { ...q, questionHash: fingerprint, ...(answer ? { answerHash: answerHash(answer) } : {}), state };
  });
}

export function validateQuestions(questions) {
  if (questions === undefined) return [];
  if (!Array.isArray(questions)) return ['questions must be an array'];
  const errors = [], ids = new Set();
  const keys = (v, allowed, where) => {
    if (!object(v)) { errors.push(`${where} must be an object`); return false; }
    for (const k of Object.keys(v)) if (!allowed.includes(k)) errors.push(`${where}.${k} is not a supported field`);
    return true;
  };
  questions.forEach((q, i) => {
    if (text(q)) return;
    const at = `questions[${i}]`;
    if (!keys(q, ['id','question','about','multiple','options','answer','resolution'], at)) return;
    if (!text(q.question) || q.question.length > 8000) errors.push(`${at}.question is required (max 8000)`);
    if (q.id !== undefined && (!id(q.id) || ids.has(q.id))) errors.push(`${at}.id must be unique and persistent`);
    if (q.id) ids.add(q.id);
    if ((q.options || q.answer || q.resolution) && !id(q.id)) errors.push(`${at}.id is required for structured questions`);
    if (q.about !== undefined && (!Array.isArray(q.about) || q.about.some(x => !text(x)))) errors.push(`${at}.about must be strings`);
    if (q.multiple !== undefined && typeof q.multiple !== 'boolean') errors.push(`${at}.multiple must be boolean`);
    if (q.options !== undefined) {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 8) errors.push(`${at}.options must contain 2–8 choices`);
      const choices = new Set(); let recommended = 0;
      for (const o of Array.isArray(q.options) ? q.options : []) {
        if (!keys(o, ['id','label','description','recommended'], `${at}.option`)) continue;
        if (!id(o.id) || choices.has(o.id)) errors.push(`${at}.option.id must be unique`);
        choices.add(o.id);
        if (!text(o.label) || o.label.length > 300 || !text(o.description) || o.description.length > 2000) errors.push(`${at}.option needs a label and explanation`);
        if (o.recommended !== undefined && typeof o.recommended !== 'boolean') errors.push(`${at}.option.recommended must be boolean`);
        if (o.recommended) recommended++;
      }
      if (recommended > 1) errors.push(`${at} may recommend at most one choice`);
    }
    if (q.answer !== undefined && keys(q.answer, ['questionHash','selected','labels','text','at'], `${at}.answer`)) {
      const a = q.answer;
      if (!digest(a.questionHash) || !iso(a.at)) errors.push(`${at}.answer needs a definition hash and timestamp`);
      if (!Array.isArray(a.selected) || a.selected.some(x => !id(x)) || new Set(a.selected).size !== a.selected.length) errors.push(`${at}.answer.selected is invalid`);
      if (!Array.isArray(a.labels) || a.labels.some(x => !text(x)) || a.labels.length !== a.selected?.length) errors.push(`${at}.answer.labels must preserve chosen labels`);
      if (typeof a.text !== 'string' || a.text.length > 8000 || (!a.selected?.length && !text(a.text))) errors.push(`${at}.answer must contain a choice or text (max 8000)`);
      if (a.questionHash === questionHash(q) && Array.isArray(a.selected)) {
        if (!q.multiple && a.selected.length > 1) errors.push(`${at} allows a single choice`);
        if (a.selected.some(x => !(q.options || []).some(o => o.id === x))) errors.push(`${at}.answer contains an unknown option`);
      }
    }
    if (q.resolution !== undefined && keys(q.resolution, ['answerHash','summary','at'], `${at}.resolution`)) {
      const r = q.resolution;
      if (!q.answer || !digest(r.answerHash) || r.answerHash !== answerHash(q.answer) || !text(r.summary) || !iso(r.at)) errors.push(`${at}.resolution needs the exact answer hash, a summary and timestamp`);
    }
  });
  return errors;
}

// Shared by every normal CLI/server publication. Do not let a refreshed plan erase user responses.
export function protectAnswers(previous, next) {
  if (!next && !(previous?.questions || []).some(q => q?.answer)) return next;
  if (!next) throw new Error('Preserve as perguntas e respostas registradas no plano.');
  const old = new Map(questionViews(previous).map(q => [q.id, q]));
  const candidate = structuredClone(next);
  candidate.questions = (candidate.questions || []).map((value, i) => {
    const q = normalized(value, i), before = old.get(q.id);
    if (before?.answer) {
      if (q.answer && answerHash(q.answer) !== answerHash(before.answer)) throw new Error(`A resposta de ${q.id} pertence ao usuário. Use a operação de respostas para alterá-la.`);
      q.answer = structuredClone(before.answer);
      if (!q.resolution && before.resolution) q.resolution = structuredClone(before.resolution);
    } else if (q.answer) throw new Error(`Não invente uma resposta para ${q.id}; use a operação de respostas.`);
    if (q.resolution && JSON.stringify(q.resolution) !== JSON.stringify(before?.resolution) && q.answer?.questionHash !== questionHash(q)) throw new Error(`A pergunta ${q.id} mudou. Peça revisão da resposta antes de incorporá-la.`);
    // Keep plain legacy questions plain until the user actually responds.
    return before?.answer ? q : value;
  });
  for (const q of old.values()) if (q.answer && !questionViews(candidate).some(n => n.id === q.id)) throw new Error(`Preserve a pergunta respondida ${q.id}; registre resolution em vez de removê-la.`);
  return candidate;
}

export function recordAnswers(plan, answers, at = new Date().toISOString()) {
  if (!plan) throw new Error('Crie um planejamento antes de responder.');
  if (!Array.isArray(answers) || !answers.length || answers.length > 100) throw new Error('Envie de 1 a 100 respostas.');
  const copy = structuredClone(plan), views = questionViews(plan), seen = new Set();
  for (const input of answers) {
    if (!object(input) || Object.keys(input).some(k => !['id','questionHash','selected','text'].includes(k))) throw new Error('Formato de resposta inválido.');
    const index = views.findIndex(q => q.id === input.id), q = views[index];
    if (!q || views.filter(v => v.id === input.id).length !== 1 || seen.has(q.id)) throw new Error('Pergunta desconhecida ou repetida.');
    seen.add(q.id);
    if (q.questionHash !== input.questionHash) throw new Error('Question conflict: a pergunta mudou; revise as alternativas.');
    if (input.text !== undefined && typeof input.text !== 'string') throw new Error('A resposta livre deve ser texto.');
    if (input.selected !== undefined && !Array.isArray(input.selected)) throw new Error('As escolhas devem ser uma lista.');
    const selected = input.selected || [], free = typeof input.text === 'string' ? input.text.trim() : '';
    if (!Array.isArray(selected) || selected.some(x => !(q.options || []).some(o => o.id === x)) || new Set(selected).size !== selected.length || (!q.multiple && selected.length > 1)) throw new Error('Escolha alternativas válidas para esta pergunta.');
    if (free.length > 8000 || (!selected.length && !free)) throw new Error('Escolha uma alternativa ou escreva sua resposta.');
    const original = typeof copy.questions[index] === 'string' ? { question: copy.questions[index] } : copy.questions[index];
    const answer = { questionHash: q.questionHash, selected, labels: selected.map(x => q.options.find(o => o.id === x).label), text: free, at };
    copy.questions[index] = { ...original, id: q.id, answer };
    delete copy.questions[index].resolution;
  }
  const errors = validateQuestions(copy.questions); if (errors.length) throw new Error(errors.join('\n'));
  return copy;
}
