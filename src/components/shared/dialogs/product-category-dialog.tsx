"use client";

import { useId } from "react";
import { useLookups } from "@/hooks/use-lookups";
import { useSubmitProductCategory } from "@/hooks/mutations/use-product-category-mutations";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DialogOverlay } from "./dialog-overlay";

export function ProductCategoryDialog() {
  const submitProductCategory = useSubmitProductCategory();
  const { editingProductCategory } = useLookups();
  const id = useId();

  function handleSubmit(fd: FormData) {
    return submitProductCategory({ name: String(fd.get("name") || "").trim() });
  }

  return (
    <DialogOverlay
      title={editingProductCategory ? "Edit product category" : "Add product category"}
      className="max-w-105"
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <Input
          id={`${id}-name`}
          type="text"
          name="name"
          defaultValue={editingProductCategory ? editingProductCategory.name : ""}
          required
          pattern=".*\S.*"
          maxLength={100}
        />
        <FieldDescription>
          {editingProductCategory
            ? "Renaming updates every product in this category."
            : "What kind of product it is, e.g. Journal, Notebook or Planner."}
        </FieldDescription>
      </Field>
    </DialogOverlay>
  );
}
