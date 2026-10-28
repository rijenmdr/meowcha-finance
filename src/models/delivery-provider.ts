// Who carries an order to the customer.
export interface DeliveryProvider {
  id: string;
  name: string;
}

export interface DeliveryProviderSubmitValues {
  name: string;
}
