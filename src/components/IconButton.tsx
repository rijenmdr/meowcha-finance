import { Button } from "@/components/ui/button";
import { PencilLine, Trash2 } from "lucide-react";

const baseClass = "rounded-none border-line bg-transparent text-ink hover:bg-surface";

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="icon-sm" onClick={onClick} aria-label="Edit" className={baseClass}>
      <PencilLine />
    </Button>
  );
}

export function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="icon-sm" onClick={onClick} aria-label="Delete" className={baseClass}>
      <Trash2 />
    </Button>
  );
}
