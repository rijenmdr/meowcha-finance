"use client";

import { PAPER_TYPE_LABELS, useFinance, useDashboardData } from "@/lib/finance-context";
import type { PaperType } from "@/lib/types";
import { DialogOverlay, dialogTitleClass, fieldHintClass, fieldLabelClass, inputClass } from "./DialogOverlay";

export function ProductDialog() {
  const { submitProduct } = useFinance();
  const { editingProduct, productNameOptions, productColorOptions } = useDashboardData();

  function handleSubmit(fd: FormData) {
    return submitProduct({
      name: String(fd.get("name") || "").trim(),
      color: String(fd.get("color") || "").trim(),
      type: String(fd.get("type")) as PaperType,
      quantity: parseInt(String(fd.get("quantity") || "0"), 10),
      price: parseFloat(String(fd.get("price") || "0")),
    });
  }

  return (
    <DialogOverlay className="max-w-115" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>{editingProduct ? "Edit product" : "Add product"}</div>

      <div>
        <label className={fieldLabelClass}>Name</label>
        <input
          type="text"
          name="name"
          list="product-names"
          defaultValue={editingProduct ? editingProduct.name : ""}
          required
          pattern=".*\S.*"
          className={inputClass}
        />
        <datalist id="product-names">
          {productNameOptions.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>Color</label>
          <input
            type="text"
            name="color"
            list="product-colors"
            defaultValue={editingProduct ? editingProduct.color : ""}
            required
            pattern=".*\S.*"
            className={inputClass}
          />
          <datalist id="product-colors">
            {productColorOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={fieldLabelClass}>Type</label>
          <select name="type" defaultValue={editingProduct ? editingProduct.type : "lined"} className={inputClass}>
            {(Object.keys(PAPER_TYPE_LABELS) as PaperType[]).map((t) => (
              <option key={t} value={t}>
                {PAPER_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>Quantity</label>
          <input
            type="number"
            name="quantity"
            min="0"
            step="1"
            defaultValue={editingProduct ? editingProduct.quantity : ""}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={fieldLabelClass}>Price (Rs)</label>
          <input
            type="number"
            name="price"
            min="0"
            step="0.01"
            defaultValue={editingProduct ? editingProduct.price : ""}
            required
            className={inputClass}
          />
        </div>
      </div>
      <div className={fieldHintClass}>The price applies to this color and type only. Add another row for each variant.</div>
    </DialogOverlay>
  );
}
