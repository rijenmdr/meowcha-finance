// What kind of product it is (Journal, Notebook…).
export interface ProductCategory {
  id: string;
  name: string;
}

export interface ProductCategorySubmitValues {
  name: string;
}
