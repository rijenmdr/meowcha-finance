import { DeleteButton, EditButton } from "@/components/shared/icon-button";
import type { OrderRow } from "@/models/order";
import type { OrderRowHandlers } from "./order-columns";
import { cancelButtonClass, textButtonClass } from "./order-row-actions";

// The Requests tab's row actions: convert (or, for a linked request, merge into
// its order), cancel, edit and delete.
export function RequestRowActions({ request, handlers }: { request: OrderRow; handlers: OrderRowHandlers }) {
  return (
    <div className="flex items-center justify-end gap-2.5">
      <div className="flex flex-col items-end gap-1">
        {request.parentOrderNumber ? (
          <button type="button" onClick={() => handlers.mergeRequest(request)} className={textButtonClass}>
            Merge into {request.parentOrderNumber}
          </button>
        ) : (
          <button type="button" onClick={() => handlers.openConvertRequest(request.id)} className={textButtonClass}>
            Convert
          </button>
        )}
        <button type="button" onClick={() => handlers.cancelOrder(request)} className={cancelButtonClass}>
          Cancel
        </button>
      </div>
      <div>
        <EditButton onClick={() => handlers.openEditOrder(request.id)} />
        <DeleteButton onClick={() => handlers.deleteOrder(request)} />
      </div>
    </div>
  );
}
