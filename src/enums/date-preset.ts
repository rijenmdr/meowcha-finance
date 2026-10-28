export const DATE_PRESET = {
  today: "today",
  week: "week",
  month: "month",
  year: "year",
  custom: "custom",
} as const;
export type DatePreset = (typeof DATE_PRESET)[keyof typeof DATE_PRESET];
