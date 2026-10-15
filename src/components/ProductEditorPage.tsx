"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { useLookups, useFinance, withDateFilter } from "@/lib/finance-context";
import { Panel } from "./Panel";

const MAX_OPTIONS = 5;

// Inputs stay strings while typing; values[i] belongs to optionNames[i].
interface VariantDraft {
  id: string;
  values: string[];
  quantity: string;
  price: string;
}

const linkButtonClass = "self-start text-accent-600";
const removeButtonClass = "text-ink/60 hover:bg-transparent hover:text-error";

// variantIdsInUse: the product's variants that are on an order, loaded by the page on the server.
export function ProductEditorPage({
  mode,
  productId,
  variantIdsInUse,
}: {
  mode: "new" | "edit";
  productId?: string;
  variantIdsInUse: string[];
}) {
  const router = useRouter();
  const { submitProduct, lookups } = useFinance();
  const { productOptionNameOptions, productOptionValueOptions } = useLookups();
  const product = mode === "edit" && productId ? (lookups.products.find((p) => p.id === productId) ?? null) : null;

  const nameId = useId();
  const [name, setName] = useState(product?.name ?? "");
  const [optionNames, setOptionNames] = useState<string[]>(() => (product ? product.optionNames : ["Color"]));
  const [variants, setVariants] = useState<VariantDraft[]>(() =>
    product
      ? product.variants.map((v) => ({
          id: v.id,
          values: product.optionNames.map((n) => v.options[n] ?? ""),
          quantity: String(v.quantity),
          price: String(v.price),
        }))
      : [{ id: crypto.randomUUID(), values: [""], quantity: "0", price: "" }],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addOption() {
    setOptionNames((prev) => [...prev, ""]);
    setVariants((prev) => prev.map((v) => ({ ...v, values: [...v.values, ""] })));
  }

  function removeOption(index: number) {
    setOptionNames((prev) => prev.filter((_, i) => i !== index));
    setVariants((prev) => prev.map((v) => ({ ...v, values: v.values.filter((_, i) => i !== index) })));
  }

  function renameOption(index: number, value: string) {
    setOptionNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  }

  function updateVariant(id: string, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function setValue(id: string, index: number, value: string) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, values: v.values.map((x, i) => (i === index ? value : x)) } : v)));
  }

  function addVariant() {
    setVariants((prev) => [...prev, { id: crypto.randomUUID(), values: optionNames.map(() => ""), quantity: "0", price: "" }]);
  }

  function removeVariant(id: string) {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const names = optionNames.map((n) => n.trim());
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
      setError("Option names must be different from each other.");
      return;
    }
    const combos = variants.map((v) => v.values.map((x) => x.trim().toLowerCase()).join("\u0000"));
    if (new Set(combos).size !== combos.length) {
      setError("Two variants have the same options. Change one or remove it.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const problem = await submitProduct({
        id: product?.id,
        name: name.trim(),
        optionNames: names,
        variants: variants.map((v) => ({
          id: v.id,
          options: Object.fromEntries(names.map((n, i) => [n, v.values[i].trim()])),
          quantity: parseInt(v.quantity, 10) || 0,
          price: parseFloat(v.price) || 0,
        })),
      }, variantIdsInUse);
      if (problem) {
        setError(problem);
        setPending(false);
        return;
      }
      router.push(withDateFilter("/products"));
    } catch (err) {
      console.error("Failed to save product", err);
      setError("Couldn't save the product. Check the details and try again.");
      setPending(false);
    }
  }

  if (mode === "edit" && !product) {
    return (
      <Panel className="p-6">
        <div className="font-condensed text-20 font-semibold">Product not found</div>
        <div className="mt-2 text-13 text-ink/60">That product may have been deleted or the link is stale.</div>
        <Button type="button" variant="outline" onClick={() => router.push(withDateFilter("/products"))} className="mt-4">
          Back to products
        </Button>
      </Panel>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Panel className="p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-condensed text-28 font-semibold">{product ? `Edit ${product.name}` : "New product"}</div>
            <div className="mt-1 text-13 text-ink/60">One product, with a variant for each combination of options. Each variant has its own stock and price.</div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.push(withDateFilter("/products"))}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save product"}
            </Button>
          </div>
        </div>

        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
          <Field className="max-w-md">
            <FieldLabel htmlFor={nameId}>Name</FieldLabel>
            <Input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              pattern=".*\S.*"
              maxLength={200}
            />
          </Field>

          <Field>
            <FieldLabel>Options</FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              {optionNames.map((optionName, i) => (
                <div key={i} className="flex w-40 items-center">
                  <Input
                    type="text"
                    aria-label={`Option ${i + 1} name`}
                    list="product-option-names"
                    value={optionName}
                    onChange={(e) => renameOption(i, e.target.value)}
                    required
                    pattern=".*\S.*"
                    maxLength={50}
                  />
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove option" onClick={() => removeOption(i)} className={removeButtonClass}>
                    <XIcon />
                  </Button>
                </div>
              ))}
              {optionNames.length < MAX_OPTIONS && (
                <Button type="button" variant="link" onClick={addOption} className={linkButtonClass}>
                  + Add option
                </Button>
              )}
            </div>
            <datalist id="product-option-names">
              {productOptionNameOptions.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <FieldDescription>What varies between versions, such as Color, Type or Size.</FieldDescription>
          </Field>

          <div>
            <div className="mb-1.25 flex gap-2 pr-9">
              {optionNames.map((n, i) => (
                <span key={i} className="min-w-32 flex-1 truncate text-12 text-ink/70">
                  {n.trim() || `Option ${i + 1}`}
                </span>
              ))}
              <span className="w-24 text-12 text-ink/70">Qty</span>
              <span className="w-32 text-12 text-ink/70">Price (Rs)</span>
            </div>
            <div className="flex flex-col gap-2">
              {variants.map((v) => (
                <div key={v.id} className="flex items-center gap-2">
                  {v.values.map((value, i) => {
                    const known = productOptionValueOptions[optionNames[i].trim().toLowerCase()] ?? [];
                    const label = optionNames[i] || `Option ${i + 1}`;
                    if (known.length === 0) {
                      return (
                        <Input
                          key={i}
                          type="text"
                          aria-label={label}
                          value={value}
                          onChange={(e) => setValue(v.id, i, e.target.value)}
                          required
                          pattern=".*\S.*"
                          maxLength={100}
                          className="min-w-32 flex-1"
                        />
                      );
                    }
                    // A value saved earlier that isn't in the list still needs an entry to show.
                    const choices = value && !known.includes(value) ? [...known, value] : known;
                    return (
                      <NativeSelect
                        key={i}
                        aria-label={label}
                        value={value}
                        onChange={(e) => setValue(v.id, i, e.target.value)}
                        required
                        className="min-w-32 flex-1"
                      >
                        <NativeSelectOption value="">Choose…</NativeSelectOption>
                        {choices.map((c) => (
                          <NativeSelectOption key={c} value={c}>
                            {c}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    );
                  })}
                  <Input
                    type="number"
                    aria-label="Quantity"
                    min="0"
                    step="1"
                    value={v.quantity}
                    onChange={(e) => updateVariant(v.id, { quantity: e.target.value })}
                    required
                    className="w-24"
                  />
                  <Input
                    type="number"
                    aria-label="Price"
                    min="0"
                    step="0.01"
                    value={v.price}
                    onChange={(e) => updateVariant(v.id, { price: e.target.value })}
                    required
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove variant"
                    disabled={variants.length === 1}
                    onClick={() => removeVariant(v.id)}
                    className={cn(removeButtonClass, "disabled:opacity-30")}
                  >
                    <XIcon />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="link" onClick={addVariant} className={cn(linkButtonClass, "mt-2")}>
              + Add variant
            </Button>
          </div>

          {error && <FieldError>{error}</FieldError>}
        </fieldset>
      </Panel>
    </form>
  );
}
