import { Button } from "@/components/ui/button";
import { ORDER_EDITOR_DESCRIPTIONS, ORDER_EDITOR_SAVE_LABELS, ORDER_EDITOR_TITLES } from "@/constants/order-editor";
import { ORDER_STATUS_CLASSES, ORDER_STATUS_LABELS } from "@/constants/order-status";
import { cn } from "@/lib/utils/cn";
import type { OrderEditorMode } from "@/enums/order-editor-mode";
import type { Order } from "@/models/order";

export function OrderEditorHeader({
  mode,
  order,
  pending,
  onBack,
}: {
  mode: OrderEditorMode;
  order: Order | null;
  pending: boolean;
  onBack: () => void;
}) {
  const readOnly = mode === "view";
  const isRequest = mode === "new-request" || mode === "edit-request";
  const showStatus = order !== null && (isRequest || readOnly);

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="font-condensed text-28 font-semibold">{ORDER_EDITOR_TITLES[mode](order?.orderNumber ?? "")}</div>
          {showStatus && <span className={cn("px-2 py-0.75 text-11", ORDER_STATUS_CLASSES[order.status])}>{ORDER_STATUS_LABELS[order.status]}</span>}
        </div>
        <div className="mt-1 text-13 text-ink/60">{ORDER_EDITOR_DESCRIPTIONS[mode]}</div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          {readOnly ? "Back to orders" : "Cancel"}
        </Button>
        {!readOnly && (
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : ORDER_EDITOR_SAVE_LABELS[mode]}
          </Button>
        )}
      </div>
    </div>
  );
}
