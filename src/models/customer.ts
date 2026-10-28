export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
}

export interface CustomerSubmitValues {
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
}
