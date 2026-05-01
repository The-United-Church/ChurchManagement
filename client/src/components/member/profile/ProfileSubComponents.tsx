import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function InfoRow({
  icon: Icon,
  label,
  value,
  colSpan,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  colSpan?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3${colSpan ? ' sm:col-span-2' : ''}`}>
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-4 w-72 rounded bg-muted" />
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-6">
            <div className="h-24 w-24 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProfileGenderRadio({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-gray-700">Gender</Label>
      <div className="flex flex-wrap gap-4 pt-2">
        {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
          <label key={g} className="flex items-center gap-2 cursor-pointer">
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center bg-white ${
                value === g ? 'border-app-primary' : 'border-gray-300'
              }`}
            >
              {value === g && <div className="w-2.5 h-2.5 rounded-full bg-app-primary" />}
            </div>
            <input
              type="radio"
              name="profile-gender"
              className="hidden"
              checked={value === g}
              onChange={() => onChange(g)}
            />
            <span className="text-sm text-app-selected-text">
              {g.charAt(0) + g.slice(1).toLowerCase()}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ProfileToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-gray-100 bg-white px-3 py-3">
      <Label htmlFor={id} className="min-w-0 cursor-pointer space-y-0.5">
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-bold text-gray-700">
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-app-primary bg-transparent"
      />
    </div>
  );
}
