import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormSelectProps {
  /** Optional field label rendered above the select */
  label?: string;
  /** Options list */
  options: SelectOption[];
  /** Controlled value */
  value: string;
  onValueChange: (v: string) => void;
  /** Placeholder shown when no value is selected */
  placeholder?: string;
  /** Extra class applied to the wrapper div */
  className?: string;
  /** Appends a red asterisk to the label */
  required?: boolean;
  disabled?: boolean;
  /**
   * Text rendered inside the dropdown when `options` is empty.
   * Useful for dependent selects (e.g. "Select a country first").
   */
  emptyMessage?: string;
}

/**
 * FormSelect — underline-style labelled select used across form dialogs.
 *
 * Matches the visual language of FormInput / PhoneField from AddPersonDialog:
 *   border-0  border-b  border-gray-300  rounded-none  bg-transparent
 *
 * Usage:
 *   <FormSelect
 *     label="Country"
 *     options={countryOptions}
 *     value={form.country}
 *     onValueChange={(v) => setForm(f => ({ ...f, country: v }))}
 *     placeholder="Select Country"
 *   />
 */
export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  className,
  required,
  disabled,
  emptyMessage,
}) => (
  <div className={cn('space-y-2', className)}>
    {label && (
      <Label className="text-xs font-bold text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
    )}
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="border-0 border-b border-gray-300 rounded-none px-0 focus:ring-0 shadow-none bg-transparent">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white max-h-72 overflow-auto">
        {options.length > 0 ? (
          options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))
        ) : emptyMessage ? (
          <div className="px-3 py-2 text-xs text-gray-500">{emptyMessage}</div>
        ) : null}
      </SelectContent>
    </Select>
  </div>
);
