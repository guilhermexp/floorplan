// Shared by the local map and the offline client presentation. No DOM or dependencies.
(() => {
  function createPlayer(journey) {
    const steps = new Map(journey.steps.map(s => [s.id,s]));
    let current = journey.path[0], history = [];
    const outgoing = () => journey.transitions.filter(e => e.from===current);
    const next = () => {
      const pos = journey.path.indexOf(current), target = pos>=0 ? journey.path[pos+1] : null;
      return outgoing().find(e => e.to===target && e.kind!=='back') || null;
    };
    return {
      get current() { return current; }, get step() { return steps.get(current); },
      get history() { return [...history]; }, outgoing, next,
      go(target) { if (!outgoing().some(e=>e.to===target)) return false; history.push(current); current=target; return true; },
      back() { if(!history.length) return false; current=history.pop(); return true; },
      // Selecting a thumbnail inspects that step, without pretending the user traversed the route.
      inspect(target) { if(!steps.has(target)) return false; current=target; history=[]; return true; },
    };
  }
  globalThis.FloorplanJourneys = {createPlayer};
})();
