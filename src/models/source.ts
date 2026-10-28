// Where the money for an expense came from. Expense-only, so it has no type.
export interface Source {
  id: string;
  name: string;
}

export interface SourceSubmitValues {
  name: string;
}
