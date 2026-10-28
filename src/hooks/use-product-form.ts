import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSubmitProduct } from "@/hooks/mutations/use-product-mutations";
import { withDateFilter } from "@/lib/helpers/date-filter";
import { newId } from "@/lib/utils/new-id";
import type { Product } from "@/models/product";

// Inputs stay strings while typing; values[i] belongs to optionNames[i].
export interface VariantDraft {
  id: string;
  values: string[];
  quantity: string;
  price: string;
}

function buildVariantDrafts(product: Product | null): VariantDraft[] {
  if (!product) return [{ id: newId(), values: [""], quantity: "0", price: "" }];
  return product.variants.map((variant) => ({
    id: variant.id,
    values: product.optionNames.map((name) => variant.options[name] ?? ""),
    quantity: String(variant.quantity),
    price: String(variant.price),
  }));
}

// Checks the browser can make before saving. Null when the draft is fine.
function findDraftProblem(category: string, names: string[], variants: VariantDraft[]): string | null {
  if (!category) return "Choose a category for this product.";
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) return "Option names must be different from each other.";
  const combos = variants.map((variant) => variant.values.map((value) => value.trim().toLowerCase()).join("\u0000"));
  if (new Set(combos).size !== combos.length) return "Two variants have the same options. Change one or remove it.";
  return null;
}

// The product editor's state and submit. product is null when new.
export function useProductForm(product: Product | null, variantIdsInUse: string[]) {
  const router = useRouter();
  const submitProduct = useSubmitProduct();

  const [name, setName] = useState(product?.name ?? "");
  // New products start unset, so the category is always a deliberate choice.
  const [category, setCategory] = useState(product?.categoryId ?? "");
  const [optionNames, setOptionNames] = useState<string[]>(() => (product ? product.optionNames : ["Color"]));
  const [variants, setVariants] = useState<VariantDraft[]>(() => buildVariantDrafts(product));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = {
    names: optionNames,
    add() {
      setOptionNames((current) => [...current, ""]);
      setVariants((current) => current.map((variant) => ({ ...variant, values: [...variant.values, ""] })));
    },
    remove(index: number) {
      setOptionNames((current) => current.filter((_, i) => i !== index));
      setVariants((current) => current.map((variant) => ({ ...variant, values: variant.values.filter((_, i) => i !== index) })));
    },
    rename(index: number, value: string) {
      setOptionNames((current) => current.map((optionName, i) => (i === index ? value : optionName)));
    },
  };

  const variantRows = {
    rows: variants,
    update(id: string, patch: Partial<VariantDraft>) {
      setVariants((current) => current.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)));
    },
    setValue(id: string, index: number, value: string) {
      setVariants((current) =>
        current.map((variant) => (variant.id === id ? { ...variant, values: variant.values.map((old, i) => (i === index ? value : old)) } : variant)),
      );
    },
    add() {
      setVariants((current) => [...current, { id: newId(), values: optionNames.map(() => ""), quantity: "0", price: "" }]);
    },
    remove(id: string) {
      setVariants((current) => current.filter((variant) => variant.id !== id));
    },
  };

  function goBack() {
    router.push(withDateFilter("/products"));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const names = optionNames.map((optionName) => optionName.trim());
    const problem = findDraftProblem(category, names, variants);
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const saveProblem = await submitProduct(
        {
          id: product?.id,
          name: name.trim(),
          categoryId: category,
          optionNames: names,
          variants: variants.map((variant) => ({
            id: variant.id,
            options: Object.fromEntries(names.map((optionName, i) => [optionName, variant.values[i].trim()])),
            quantity: parseInt(variant.quantity, 10) || 0,
            price: parseFloat(variant.price) || 0,
          })),
        },
        variantIdsInUse,
      );
      if (saveProblem) {
        setError(saveProblem);
        setPending(false);
        return;
      }
      goBack();
    } catch (err) {
      console.error("Failed to save product", err);
      setError("Couldn't save the product. Check the details and try again.");
      setPending(false);
    }
  }

  return { name, setName, category, setCategory, options, variantRows, pending, error, goBack, handleSubmit };
}

export type ProductOptionsState = ReturnType<typeof useProductForm>["options"];
export type ProductVariantsState = ReturnType<typeof useProductForm>["variantRows"];
