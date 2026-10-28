// Random rather than a per-session counter: a counter restarts on every page
// load, so a new record could reuse (and upsert over) an id saved earlier.
export function newId(): string {
  return crypto.randomUUID();
}
