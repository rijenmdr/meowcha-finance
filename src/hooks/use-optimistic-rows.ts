import { startTransition, useCallback, useMemo, useOptimistic } from "react";

// Rows hidden or patched while a delete or quick edit is in flight. They fall
// back to the server's rows once the action and the refresh it triggers land,
// or straight away if the action fails.
interface OptimisticRows {
  hidden: ReadonlySet<string>;
  patches: ReadonlyMap<string, object>;
}

export type OptimisticOp = { kind: "hide"; id: string } | { kind: "patch"; id: string; patch: object };

export type RunOptimistic = (op: OptimisticOp, action: () => Promise<void>, failure: string) => void;

const NO_OPTIMISTIC_ROWS: OptimisticRows = { hidden: new Set(), patches: new Map() };

function applyOptimisticOp(current: OptimisticRows, op: OptimisticOp): OptimisticRows {
  if (op.kind === "hide") return { ...current, hidden: new Set(current.hidden).add(op.id) };
  return { ...current, patches: new Map(current.patches).set(op.id, { ...current.patches.get(op.id), ...op.patch }) };
}

// A table's rows from the server with any in-flight delete or quick edit applied.
export function useOptimisticRows<T extends { id: string }>(rows: T[]) {
  const [optimisticRows, applyOptimistic] = useOptimistic(NO_OPTIMISTIC_ROWS, applyOptimisticOp);

  // Shows a delete or quick edit at once, then runs the action. Its refresh
  // brings the real rows; a failure only logs, and the row reappears unchanged.
  const runOptimistic: RunOptimistic = useCallback(
    (op, action, failure) => {
      startTransition(async () => {
        applyOptimistic(op);
        try {
          await action();
        } catch (err) {
          console.error(failure, err);
        }
      });
    },
    [applyOptimistic],
  );

  const visibleRows = useMemo(
    () =>
      rows
        .filter((row) => !optimisticRows.hidden.has(row.id))
        .map((row) => {
          const patch = optimisticRows.patches.get(row.id);
          return patch ? ({ ...row, ...patch } as T) : row;
        }),
    [rows, optimisticRows],
  );

  return { visibleRows, runOptimistic };
}
