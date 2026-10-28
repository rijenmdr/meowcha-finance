"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DATE_PRESET_LABELS } from "@/constants/date-preset";
import { useDateFilter } from "@/hooks/use-date-filter";
import type { DatePreset } from "@/enums/date-preset";

const dateLabelClass = "text-11 text-ink/60";
const dateInputClass = "h-auto min-h-8.5 w-auto px-2 py-1.25 text-13";

// The period select, plus From/To inputs for a custom range.
export function DateFilterControls() {
  const fromId = useId();
  const toId = useId();
  const periodId = useId();
  const { dateFilter, setDateStart, setDateEnd, setDatePreset } = useDateFilter();

  return (
    <>
      <div className="flex flex-col gap-1">
        <Label htmlFor={periodId} className={dateLabelClass}>
          Period
        </Label>
        <NativeSelect id={periodId} value={dateFilter.preset} onChange={(e) => setDatePreset(e.target.value as DatePreset)} className="w-36">
          {Object.entries(DATE_PRESET_LABELS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {dateFilter.preset === "custom" && (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor={fromId} className={dateLabelClass}>
              From
            </Label>
            <Input id={fromId} type="date" value={dateFilter.start} max={dateFilter.end} onChange={(e) => setDateStart(e.target.value)} className={dateInputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={toId} className={dateLabelClass}>
              To
            </Label>
            <Input id={toId} type="date" value={dateFilter.end} min={dateFilter.start} onChange={(e) => setDateEnd(e.target.value)} className={dateInputClass} />
          </div>
        </>
      )}
    </>
  );
}
