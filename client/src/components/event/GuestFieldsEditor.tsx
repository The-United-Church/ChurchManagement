import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Plus, Trash2, RotateCcw } from "lucide-react";
import type { GuestCheckInField } from "@/types/event";
import { DEFAULT_GUEST_FIELDS } from "@/types/event";

interface Props {
  value: GuestCheckInField[] | null;
  onChange: (fields: GuestCheckInField[] | null) => void;
}

const FIELD_TYPE_LABELS: Record<GuestCheckInField["type"], string> = {
  text: "Text",
  email: "Email",
  tel: "Phone",
  textarea: "Long Text",
  select: "Dropdown",
};

function generateId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const GuestFieldsEditor: React.FC<Props> = ({ value, onChange }) => {
  const fields = value ?? DEFAULT_GUEST_FIELDS;
  const isDefault = value === null;

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  // Keep raw options text per field so commas can be typed freely; parse only on blur
  const [optionsRaw, setOptionsRaw] = useState<Record<number, string>>({});

  const updateField = (idx: number, patch: Partial<GuestCheckInField>) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    onChange(next);
  };

  const removeField = (idx: number) => {
    const next = fields.filter((_, i) => i !== idx);
    onChange(next.length === 0 ? [] : next);
    if (expandedIdx === idx) setExpandedIdx(null);
    setOptionsRaw((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  const addField = () => {
    const next: GuestCheckInField[] = [
      ...fields,
      { id: generateId(), label: "", type: "text", required: false, placeholder: "" },
    ];
    onChange(next);
    setExpandedIdx(next.length - 1);
  };

  const resetToDefault = () => {
    onChange(null);
    setExpandedIdx(null);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...fields];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setDragIdx(idx);
    if (expandedIdx === dragIdx) setExpandedIdx(idx);
    onChange(next);
  };
  const handleDragEnd = () => setDragIdx(null);

  return (
    <div className="space-y-4 pt-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Guest check-in form</Label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Customize what guests fill out when scanning the QR code.
          </p>
        </div>
        {!isDefault && (
          <Button type="button" variant="outline" size="sm" onClick={resetToDefault} className="text-xs gap-1.5 shrink-0">
            <RotateCcw className="h-3 w-3" /> Reset to default
          </Button>
        )}
      </div>

      {isDefault && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 leading-relaxed">
          Using the default template. Click a field to customize it, or add new ones below.
        </p>
      )}

      {/* Field list */}
      <div className="space-y-2">
        {fields.map((field, idx) => {
          const isExpanded = expandedIdx === idx;
          return (
            <div
              key={field.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`rounded-lg border transition-all ${
                dragIdx === idx
                  ? "shadow-md ring-2 ring-primary/20 bg-primary/5"
                  : "bg-white hover:border-gray-300"
              }`}
            >
              {/* Collapsed row — always visible */}
              <div
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              >
                <div
                  className="cursor-grab text-gray-300 hover:text-gray-500 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate block">
                    {field.label || <span className="text-gray-400 italic">Untitled field</span>}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground bg-gray-100 rounded px-1.5 py-0.5">
                    {FIELD_TYPE_LABELS[field.type]}
                  </span>
                  {field.required && (
                    <span className="text-[11px] font-medium text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">
                      Required
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(idx);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t px-3 pb-3 pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        placeholder="e.g. Full Name"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Field type</Label>
                      <select
                        className="h-9 w-full rounded-md border px-3 text-sm bg-white"
                        value={field.type}
                        onChange={(e) =>
                          updateField(idx, { type: e.target.value as GuestCheckInField["type"] })
                        }
                      >
                        {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Placeholder</Label>
                    <Input
                      value={field.placeholder ?? ""}
                      onChange={(e) => updateField(idx, { placeholder: e.target.value || undefined })}
                      placeholder="Hint text shown to guests"
                      className="h-9"
                    />
                  </div>

                  {field.type === "select" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Options (comma-separated)</Label>
                      <Input
                        value={optionsRaw[idx] ?? (field.options ?? []).join(", ")}
                        onChange={(e) =>
                          setOptionsRaw((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        onBlur={(e) => {
                          const parsed = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          updateField(idx, { options: parsed });
                          setOptionsRaw((prev) => ({ ...prev, [idx]: parsed.join(", ") }));
                        }}
                        placeholder="Option 1, Option 2, Option 3"
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">Press Tab or click away to save options.</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <Label className="text-xs text-muted-foreground">Required field</Label>
                    <Switch
                      checked={field.required}
                      onCheckedChange={(v) => updateField(idx, { required: v })}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add button */}
      <Button type="button" variant="outline" size="sm" onClick={addField} className="gap-1.5 w-full border-dashed h-9">
        <Plus className="h-3.5 w-3.5" /> Add field
      </Button>
    </div>
  );
};
