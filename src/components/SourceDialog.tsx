"use client";

import { useId } from "react";
import { useFinance, useLookups } from "@/lib/finance-context";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DialogOverlay } from "./DialogOverlay";

export function SourceDialog() {
  const { submitSource } = useFinance();
  const { editingSource } = useLookups();
  const id = useId();

  function handleSubmit(fd: FormData) {
    return submitSource({ name: String(fd.get("name") || "").trim() });
  }

  return (
    <DialogOverlay title={editingSource ? "Edit source" : "Add source"} className="max-w-105" onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <Input
          id={`${id}-name`}
          type="text"
          name="name"
          defaultValue={editingSource ? editingSource.name : ""}
          required
          pattern=".*\S.*"
        />
        <FieldDescription>
          {editingSource
            ? "Renaming updates every expense that uses this source."
            : "Where the money for an expense comes from, e.g. a bank account or cash."}
        </FieldDescription>
      </Field>
    </DialogOverlay>
  );
}
