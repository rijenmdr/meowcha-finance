import { DeleteButton, EditButton, ViewButton } from "@/components/shared/icon-button";
import type { OrderRow } from "@/models/order";
import type { OrderRowHandlers } from "./order-columns";

export const textButtonClass = "cursor-pointer border-none bg-transparent p-0 font-condensed text-12 font-semibold text-accent-500";
export const cancelButtonClass = "cursor-pointer border-none bg-transparent p-0 font-condensed text-12 font-semibold text-error";

// The Orders tab's row actions: the next status step, record payment, cancel, edit (or view) and delete.
export function OrderRowActions({ order, handlers }: { order: OrderRow; handlers: OrderRowHandlers }) {
  return (
    <div className="flex items-center justify-end gap-2.5">
      <div className="flex flex-col items-end gap-1">
        {order.nextStepLabel && (
          <button type="button" onClick={() => handlers.advanceOrderStatus(order)} className={textButtonClass}>
            {order.nextStepLabel}
          </button>
        )}
        {order.canRecordPayment && (
          <button type="button" onClick={() => handlers.openRecordPayment(order.paymentTarget)} className={textButtonClass}>
            Record payment
          </button>
        )}
        {order.canCancel && (
          <button type="button" onClick={() => handlers.cancelOrder(order)} className={cancelButtonClass}>
            Cancel
          </button>
        )}
      </div>
      <div>
        {order.canEdit ? <EditButton onClick={() => handlers.openEditOrder(order.id)} /> : <ViewButton onClick={() => handlers.openEditOrder(order.id)} />}
        <DeleteButton onClick={() => handlers.deleteOrder(order)} />
      </div>
    </div>
  );
}
