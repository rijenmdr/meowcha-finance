import type { DatePreset } from "@/enums/date-preset";

export interface DateFilter {
  preset: DatePreset;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}
