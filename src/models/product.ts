// One sellable option combination (e.g. Color: Olive, Type: Lined) with its own stock and price.
export interface ProductVariant {
  id: string;
  options: Record<string, string>; // one value per Product.optionNames entry
  quantity: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  optionNames: string[];
  variants: ProductVariant[];
}

export interface ProductSubmitValues {
  id?: string;
  name: string;
  categoryId: string;
  optionNames: string[];
  variants: ProductVariant[];
}
