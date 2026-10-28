export interface Budget {
  id: string;
  categoryId: string;
  target: number; // monthly target
}

export interface BudgetFormValues {
  categoryId: string;
  target: string;
}

export interface BudgetSubmitValues {
  categoryId: string;
  target: number;
}
