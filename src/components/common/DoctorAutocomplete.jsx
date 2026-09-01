"use client";

import SearchableSelect from "./SearchableSelect";

export const DEFAULT_DOCTOR =
  "Dr. Vaibhav Mathur";

export const clinicDoctors = [
  DEFAULT_DOCTOR,
];

export default function DoctorAutocomplete({
  value = DEFAULT_DOCTOR,
  onChange,
  disabled = false,
  label = "Doctor name",
}) {
  return (
    <SearchableSelect
      label={label}
      value={value}
      options={clinicDoctors}
      disabled={disabled}
      minChars={1}
      strict
      fallbackValue={DEFAULT_DOCTOR}
      placeholder="Type doctor name..."
      onChange={onChange}
    />
  );
}
