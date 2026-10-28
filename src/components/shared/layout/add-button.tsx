"use client";

import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CornerBrackets } from "@/components/shared/corner-brackets";
import { withDateFilter } from "@/lib/helpers/date-filter";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { AddAction } from "@/constants/page-header";

export function AddButton({ action }: { action: AddAction }) {
  const router = useRouter();
  const openDialog = useDialogStore((state) => state.open);

  function handleClick() {
    if ("href" in action) {
      router.push(withDateFilter(action.href, action.params));
      return;
    }
    openDialog(action.dialog, { txnFormType: action.txnFormType });
  }

  return (
    <Button onClick={handleClick} className="relative h-auto gap-1.5 py-2.25">
      <CornerBrackets className="text-accent-500/70" />
      <PlusIcon aria-hidden strokeWidth={1.5} className="size-3.25" />
      {action.label}
    </Button>
  );
}
