"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cx } from "@/lib/cx";
import { useDashboardData, useFinance } from "@/lib/finance-context";
import { Panel } from "./Panel";
import { cancelButtonClass, fieldHintClass, fieldLabelClass, inputClass, saveButtonClass } from "./DialogOverlay";

const MAX_OPTIONS = 5;

// Inputs stay strings while typing; values[i] belongs to optionNames[i].
interface VariantDraft {
  id: string;
  values: string[];
  quantity: string;
  price: string;
}

// inputClass sets w-full, which would override the fixed widths below.
const cellInputClass = "min-h-9 border border-line bg-surface px-2.5 py-1.5 text-14";

const linkButtonClass = "cursor-pointer self-start font-condensed text-13 font-semibold text-accent-600";
const removeButtonClass = "grid size-7 shrink-0 cursor-pointer place-items-center text-ink/60 hover:text-error";

export function ProductEditorPage({ mode, productId }: { mode: "new" | "edit"; productId?: string }) {
  const router = useRouter();
  const { submitProduct, state } = useFinance();
  const { productOptionNameOptions, productOptionValueOptions } = useDashboardData();
  const product = mode === "edit" && productId ? (state.products.find((p) => p.id === productId) ?? null) : null;

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
      });
      if (problem) {
        setError(problem);
        setPending(false);
        return;
      }
      router.push("/products");
      router.refresh();
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
        <button type="button" onClick={() => router.push("/products")} className={cx(cancelButtonClass, "mt-4")}>
          Back to products
        </button>
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
            <button type="button" onClick={() => router.push("/products")} className={cancelButtonClass}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={cx(saveButtonClass, "disabled:cursor-default disabled:opacity-70")}>
              {pending ? "Saving…" : "Save product"}
            </button>
          </div>
        </div>

        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
          <div className="max-w-md">
            <label className={fieldLabelClass}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              pattern=".*\S.*"
              maxLength={200}
              className={inputClass}
            />
          </div>

          <div>
            <label className={fieldLabelClass}>Options</label>
            <div className="flex flex-wrap items-center gap-2">
              {optionNames.map((optionName, i) => (
                <div key={i} className="flex w-40 items-center">
                  <input
                    type="text"
                    aria-label={`Option ${i + 1} name`}
                    list="product-option-names"
                    value={optionName}
                    onChange={(e) => renameOption(i, e.target.value)}
                    required
                    pattern=".*\S.*"
                    maxLength={50}
                    className={inputClass}
                  />
                  <button type="button" aria-label="Remove option" onClick={() => removeOption(i)} className={removeButtonClass}>
                    &times;
                  </button>
                </div>
              ))}
              {optionNames.length < MAX_OPTIONS && (
                <button type="button" onClick={addOption} className={linkButtonClass}>
                  + Add option
                </button>
              )}
            </div>
            <datalist id="product-option-names">
              {productOptionNameOptions.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <div className={fieldHintClass}>What varies between versions, such as Color, Type or Size.</div>
          </div>

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
                        <input
                          key={i}
                          type="text"
                          aria-label={label}
                          value={value}
                          onChange={(e) => setValue(v.id, i, e.target.value)}
                          required
                          pattern=".*\S.*"
                          maxLength={100}
                          className={cx(cellInputClass, "min-w-32 flex-1")}
                        />
                      );
                    }
                    // A value saved earlier that isn't in the list still needs an entry to show.
                    const choices = value && !known.includes(value) ? [...known, value] : known;
                    return (
                      <select
                        key={i}
                        aria-label={label}
                        value={value}
                        onChange={(e) => setValue(v.id, i, e.target.value)}
                        required
                        className={cx(cellInputClass, "min-w-32 flex-1")}
                      >
                        <option value="">Choose…</option>
                        {choices.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    );
                  })}
                  <input
                    type="number"
                    aria-label="Quantity"
                    min="0"
                    step="1"
                    value={v.quantity}
                    onChange={(e) => updateVariant(v.id, { quantity: e.target.value })}
                    required
                    className={cx(cellInputClass, "w-24")}
                  />
                  <input
                    type="number"
                    aria-label="Price"
                    min="0"
                    step="0.01"
                    value={v.price}
                    onChange={(e) => updateVariant(v.id, { price: e.target.value })}
                    required
                    className={cx(cellInputClass, "w-32")}
                  />
                  <button
                    type="button"
                    aria-label="Remove variant"
                    disabled={variants.length === 1}
                    onClick={() => removeVariant(v.id)}
                    className={cx(removeButtonClass, "disabled:cursor-default disabled:opacity-30")}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addVariant} className={cx(linkButtonClass, "mt-2")}>
              + Add variant
            </button>          </div>

          {error && (
            <div role="alert" className="text-13 text-error">
              {error}
            </div>
          )}
        </fieldset>
      </Panel>
    </form>
  );
}
