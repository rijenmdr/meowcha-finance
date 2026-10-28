import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="icon-sm" onClick={onClick} aria-label="Edit" className="mr-1">
      <PencilIcon strokeWidth={1.5} />
    </Button>
  );
}

export function ViewButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="icon-sm" onClick={onClick} aria-label="View" className="mr-1">
      <EyeIcon strokeWidth={1.5} />
    </Button>
  );
}

export function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="icon-sm" onClick={onClick} aria-label="Delete">
      <Trash2Icon strokeWidth={1.5} />
    </Button>
  );
}
