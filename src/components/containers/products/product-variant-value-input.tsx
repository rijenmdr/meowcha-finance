"use client";

import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useLookups } from "@/hooks/use-lookups";

// A variant's value for one option: a select when the option has a fixed list, else free text.
export function ProductVariantValueInput({
  optionName,
  label,
  value,
  onChange,
}: {
  optionName: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { productOptionValueOptions } = useLookups();
  const known = productOptionValueOptions[optionName.trim().toLowerCase()] ?? [];

  if (known.length === 0) {
    return (
      <Input
        type="text"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        pattern=".*\S.*"
        maxLength={100}
        className="min-w-32 flex-1"
      />
    );
  }

  // A value saved earlier that isn't in the list still needs an entry to show.
  const choices = value && !known.includes(value) ? [...known, value] : known;
  return (
    <NativeSelect aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} required className="min-w-32 flex-1">
      <NativeSelectOption value="">Choose…</NativeSelectOption>
      {choices.map((choice) => (
        <NativeSelectOption key={choice} value={choice}>
          {choice}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
