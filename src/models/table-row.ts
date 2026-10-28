// What a delete needs from a table row: the name for the prompt, and the usage
// counts the server computed, so a delete the DB would reject is explained first.
export interface NamedRow {
  id: string;
  name: string;
}

export interface UsedRow extends NamedRow {
  usageCount: number;
}
