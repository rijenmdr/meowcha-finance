import type { PickerPage } from "@/models/picker";

export const PICKER_PAGE_SIZE = 20;

// The SQL search functions are asked for one row more than a page, which only
// tells whether another page exists.
export function pickerArgs(search: string, page: number) {
  return { p_search: search || null, p_limit: PICKER_PAGE_SIZE + 1, p_offset: (page - 1) * PICKER_PAGE_SIZE };
}

export function toPickerPage<R, T>(rows: R[], map: (row: R) => T): PickerPage<T> {
  return { rows: rows.slice(0, PICKER_PAGE_SIZE).map(map), hasMore: rows.length > PICKER_PAGE_SIZE };
}
