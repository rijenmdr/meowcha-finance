// How the customer pays for an order.
export interface PaymentMethod {
  id: string;
  name: string;
}

export interface PaymentMethodSubmitValues {
  name: string;
}
