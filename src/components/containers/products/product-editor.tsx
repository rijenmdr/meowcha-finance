"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useLookupTables } from "@/components/shared/lookups-provider";
import { Panel } from "@/components/shared/panel";
import { useLookups } from "@/hooks/use-lookups";
import { useProductForm } from "@/hooks/use-product-form";
import { withDateFilter } from "@/lib/helpers/date-filter";
import { ProductOptionFields } from "./product-option-fields";
import { ProductVariantRows } from "./product-variant-rows";

// variantIdsInUse: the product's variants that are on an order, loaded by the page on the server.
export function ProductEditor({ mode, productId, variantIdsInUse }: { mode: "new" | "edit"; productId?: string; variantIdsInUse: string[] }) {
  const router = useRouter();
  const nameId = useId();
  const categoryId = useId();
  const { products } = useLookupTables();
  const { productCategoryOptions } = useLookups();
  const product = mode === "edit" && productId ? (products.find((p) => p.id === productId) ?? null) : null;
  const form = useProductForm(product, variantIdsInUse);

  if (mode === "edit" && !product) {
    return (
      <Panel className="p-6">
        <div className="font-condensed text-20 font-semibold">Product not found</div>
        <div className="mt-2 text-13 text-ink/60">That product may have been deleted or the link is stale.</div>
        <Button type="button" variant="outline" onClick={form.goBack} className="mt-4">
          Back to products
        </Button>
      </Panel>
    );
  }

  return (
    <form onSubmit={form.handleSubmit}>
      <Panel className="p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-condensed text-28 font-semibold">{product ? `Edit ${product.name}` : "New product"}</div>
            <div className="mt-1 text-13 text-ink/60">One product, with a variant for each combination of options. Each variant has its own stock and price.</div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={form.goBack}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.pending}>
              {form.pending ? "Saving…" : "Save product"}
            </Button>
          </div>
        </div>

        <fieldset disabled={form.pending} className="flex min-w-0 flex-col gap-5">
          <Field className="max-w-md">
            <FieldLabel htmlFor={nameId}>Name</FieldLabel>
            <Input id={nameId} type="text" value={form.name} onChange={(e) => form.setName(e.target.value)} required pattern=".*\S.*" maxLength={200} />
          </Field>

          <Field className="max-w-md">
            <FieldLabel htmlFor={categoryId}>Category</FieldLabel>
            {productCategoryOptions.length === 0 ? (
              <FieldDescription>
                Create a product category first.{" "}
                <Button type="button" variant="link" onClick={() => router.push(withDateFilter("/product-categories"))} className="h-auto p-0 text-accent-600">
                  Go to product categories
                </Button>
              </FieldDescription>
            ) : (
              <NativeSelect id={categoryId} value={form.category} onChange={(e) => form.setCategory(e.target.value)} required>
                <NativeSelectOption value="">Select category</NativeSelectOption>
                {productCategoryOptions.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </Field>

          <ProductOptionFields options={form.options} />
          <ProductVariantRows optionNames={form.options.names} variants={form.variantRows} />

          {form.error && <FieldError>{form.error}</FieldError>}
        </fieldset>
      </Panel>
    </form>
  );
}
