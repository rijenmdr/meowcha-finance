"use client";

import { cx } from "@/lib/cx";
import { useFinance, useDashboardData } from "@/lib/finance-context";
import { TODAY } from "@/lib/mock-data";
import { DialogOverlay, dialogTitleClass, fieldHintClass, fieldLabelClass, inputClass } from "./DialogOverlay";

const toggleClass = "flex cursor-pointer items-center gap-1.5 px-3.5 py-1.75 text-13";
const toggleActiveClass = "bg-accent-500 text-canvas";

export function TxnDialog() {
  const { state, setTxnFormType, submitTxn } = useFinance();
  const { editingTxn, txnCategoryOptions: categoryOptions, txnChannelOptions: channelOptions, customerOptions, sourceOptions } = useDashboardData();

  const isIncome = state.txnFormType === "income";

  function handleSubmit(fd: FormData) {
    return submitTxn({
      date: String(fd.get("date") || ""),
      amount: parseFloat(String(fd.get("amount") || "0")) || 0,
      categoryId: String(fd.get("categoryId") || ""),
      description: String(fd.get("description") || ""),
      channelId: String(fd.get("channelId") || "") || null,
      sourceId: String(fd.get("sourceId") || "") || null,
      customerId: String(fd.get("customerId") || "") || null,
    });
  }

  return (
    <DialogOverlay className="max-w-115" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>{editingTxn ? "Edit transaction" : "Add transaction"}</div>

      <div className="inline-flex self-start border border-line">
        <label className={cx(toggleClass, isIncome && toggleActiveClass)}>
          <input
            type="radio"
            name="typeToggle"
            checked={isIncome}
            onChange={() => setTxnFormType("income")}
            className="absolute size-0 opacity-0"
          />
          Income
        </label>
        <label className={cx(toggleClass, "border-l border-line", !isIncome && toggleActiveClass)}>
          <input
            type="radio"
            name="typeToggle"
            checked={!isIncome}
            onChange={() => setTxnFormType("expense")}
            className="absolute size-0 opacity-0"
          />
          Expense
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>Date</label>
          <input type="date" name="date" defaultValue={editingTxn ? editingTxn.date : TODAY} required className={inputClass} />
        </div>
        <div>
          <label className={fieldLabelClass}>Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="amount"
            defaultValue={editingTxn ? editingTxn.amount : ""}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div key={state.txnFormType}>
        <label className={fieldLabelClass}>Category</label>
        <select
          name="categoryId"
          defaultValue={editingTxn && editingTxn.type === state.txnFormType ? editingTxn.categoryId : categoryOptions[0]?.id}
          required
          className={inputClass}
        >
          {categoryOptions.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {categoryOptions.length === 0 && (
          <div className={fieldHintClass}>
            No {state.txnFormType} categories yet. Add one on the Categories page.
          </div>
        )}
      </div>

      <div>
        <label className={fieldLabelClass}>Description</label>
        <input type="text" name="description" defaultValue={editingTxn ? editingTxn.description : ""} required className={inputClass} />
      </div>

      {isIncome && (
        <div>
          <label className={fieldLabelClass}>Customer (optional)</label>
          <select name="customerId" defaultValue={editingTxn?.customerId ?? ""} className={inputClass}>
            <option value="">No customer</option>
            {customerOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isIncome && (
        <div>
          <label className={fieldLabelClass}>Source (optional)</label>
          <select name="sourceId" defaultValue={editingTxn?.sourceId ?? ""} className={inputClass}>
            <option value="">No source</option>
            {sourceOptions.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          {sourceOptions.length === 0 && <div className={fieldHintClass}>No sources yet. Add one on the Sources page.</div>}
        </div>
      )}

      <div key={`channel-${state.txnFormType}`}>
        <label className={fieldLabelClass}>Channel / vendor (optional)</label>
        <select
          name="channelId"
          defaultValue={editingTxn && editingTxn.type === state.txnFormType ? (editingTxn.channelId ?? "") : ""}
          className={inputClass}
        >
          <option value="">No channel</option>
          {channelOptions.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.name}
            </option>
          ))}
        </select>
        {channelOptions.length === 0 && (
          <div className={fieldHintClass}>
            No {state.txnFormType} channels yet. Add one on the Channels page.
          </div>
        )}
      </div>

    </DialogOverlay>
  );
}
