import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  RecurrencePattern,
  RECURRENCE_LABELS,
  MonthlyRecurrenceType,
  DAY_LABELS,
  type CreateEventInput,
} from "@/types/event";

interface Props {
  form: CreateEventInput;
  update: <K extends keyof CreateEventInput>(key: K, value: CreateEventInput[K]) => void;
}

const WEEKLY_PATTERNS: RecurrencePattern[] = [RecurrencePattern.WEEKLY, RecurrencePattern.EVERY_2_WEEKS];

export const EventRecurrenceFields: React.FC<Props> = ({ form, update }) => {
  const showDayPicker = form.recurrence_pattern != null && WEEKLY_PATTERNS.includes(form.recurrence_pattern);
  const showMonthly = form.recurrence_pattern === RecurrencePattern.MONTHLY;

  const toggleDay = (dayIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const current = form.recurrence_days ?? [];
    const next = current.includes(dayIdx) ? current.filter((d) => d !== dayIdx) : [...current, dayIdx].sort();
    update("recurrence_days", next.length > 0 ? next : null);
  };

  return (
    <div className="space-y-4 rounded-md border p-4">
      {/* Pattern */}
      <div className="space-y-1.5">
        <Label htmlFor="ev-recur">Repeat</Label>
        <select
          id="ev-recur"
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={form.recurrence_pattern ?? ""}
          onChange={(e) => {
            const val = e.target.value as RecurrencePattern;
            update("recurrence_pattern", val || null);
            update("recurrence_days", null);
            update("monthly_type", null);
            update("monthly_day", null);
            update("monthly_week_descriptor", null);
          }}
        >
          <option value="">Select…</option>
          {Object.entries(RECURRENCE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Day picker (weekly / every 2 weeks) */}
      {showDayPicker && (
        <div className="space-y-1.5">
          <Label>Active days</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select days of the week">
            {DAY_LABELS.map((day, idx) => {
              const selected = (form.recurrence_days ?? []).includes(idx);
              return (
                <button
                  key={day}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold border-2 transition-all select-none cursor-pointer ${
                    selected
                      ? "bg-app-primary text-app-primary-foreground border-app-primary shadow-sm"
                      : "bg-slate-100 text-gray-700 border-gray-300 hover:border-app-accent-border hover:bg-app-primary-light"
                  }`}
                  onClick={(e) => toggleDay(idx, e)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {(form.recurrence_days ?? []).length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Selected: {(form.recurrence_days ?? []).map((d) => DAY_LABELS[d]).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Monthly options */}
      {showMonthly && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Monthly type</Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.monthly_type ?? ""}
              onChange={(e) => {
                const val = e.target.value as MonthlyRecurrenceType;
                update("monthly_type", val || null);
                update("monthly_day", null);
                update("monthly_week_descriptor", null);
              }}
            >
              <option value="">Select…</option>
              <option value={MonthlyRecurrenceType.DAY_OF_MONTH}>Specific day of month</option>
              <option value={MonthlyRecurrenceType.DAY_OF_WEEK}>Specific week & day</option>
            </select>
          </div>

          {form.monthly_type === MonthlyRecurrenceType.DAY_OF_MONTH && (
            <div className="space-y-1.5">
              <Label htmlFor="ev-mday">Day of month</Label>
              <Input
                id="ev-mday"
                type="number"
                min={1}
                max={31}
                value={form.monthly_day ?? ""}
                onChange={(e) => update("monthly_day", e.target.value ? Number(e.target.value) : null)}
                placeholder="e.g. 15"
              />
            </div>
          )}

          {form.monthly_type === MonthlyRecurrenceType.DAY_OF_WEEK && (
            <div className="space-y-1.5">
              <Label htmlFor="ev-mweek">Which occurrence (e.g. first_sunday)</Label>
              <select
                id="ev-mweek"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.monthly_week_descriptor ?? ""}
                onChange={(e) => update("monthly_week_descriptor", e.target.value || null)}
              >
                <option value="">Select…</option>
                {["first", "second", "third", "fourth", "last"].flatMap((week) =>
                  DAY_LABELS.map((day, idx) => (
                    <option key={`${week}_${day}`} value={`${week}_${day.toLowerCase()}`}>
                      {week.charAt(0).toUpperCase() + week.slice(1)} {day}
                    </option>
                  )),
                )}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Recurrence end date */}
      <div className="space-y-1.5">
        <Label htmlFor="ev-recur-end">Recurrence ends on</Label>
        <Input
          id="ev-recur-end"
          type="date"
          value={form.recurrence_end_date ?? ""}
          onChange={(e) => update("recurrence_end_date", e.target.value || null)}
        />
      </div>
    </div>
  );
};
