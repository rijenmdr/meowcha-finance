import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel } from "./Panel";

interface RecentRow {
  id: string;
  description: string;
  dateDisplay: string;
  amountDisplay: string;
  amountClass: string;
}

export function RecentTransactions({ rows }: { rows: RecentRow[] }) {
  return (
    <Panel className="p-5">
      <h3 className="mb-3.5 text-17 font-bold">Recent transactions</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="p-2.5">Date</TableHead>
            <TableHead className="p-2.5">Description</TableHead>
            <TableHead className="p-2.5 text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:last-child]:border-b">
          {rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="p-2.5 text-ink/60">{t.dateDisplay}</TableCell>
              <TableCell className="p-2.5">{t.description}</TableCell>
              <TableCell className={cn("p-2.5 text-right font-semibold", t.amountClass)}>{t.amountDisplay}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
