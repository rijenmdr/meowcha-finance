export interface Invoice {
  id: string;
  customerId: string | null;
  issueDate: string;
  dueDate: string;
  amount: number;
  paid: boolean;
}

export interface InvoiceFormValues {
  customerId: string | null;
  issueDate: string;
  dueDate: string;
  amount: string;
  paid: boolean;
}

export interface InvoiceSubmitValues {
  customerId: string | null;
  issueDate: string;
  dueDate: string;
  amount: number;
  paid: boolean;
}
