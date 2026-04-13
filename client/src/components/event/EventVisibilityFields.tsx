import React from "react";
import { Label } from "@/components/ui/label";
import { EventVisibility, type CreateEventInput } from "@/types/event";

interface Props {
  form: CreateEventInput;
  update: <K extends keyof CreateEventInput>(key: K, value: CreateEventInput[K]) => void;
}

export const EventVisibilityFields: React.FC<Props> = ({ form, update }) => {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="ev-visibility">Visibility</Label>
        <select
          id="ev-visibility"
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={form.visibility}
          onChange={(e) => update("visibility", e.target.value as EventVisibility)}
        >
          <option value={EventVisibility.PUBLIC}>Public (visible to everyone)</option>
          <option value={EventVisibility.MEMBERS}>Members only</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Groups-based visibility will be available in a future update.
        </p>
      </div>
    </div>
  );
};
