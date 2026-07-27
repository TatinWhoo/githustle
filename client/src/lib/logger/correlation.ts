const KEY = 'gh_correlation_id';

function makeId(): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2);
  return `corr_${rnd}`;
}

export function getCorrelationId(): string {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = makeId();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return makeId();
  }
}

export function setCorrelationId(id: string): void {
  try {
    sessionStorage.setItem(KEY, id);
  } catch {
    /* ignore storage errors */
  }
}
