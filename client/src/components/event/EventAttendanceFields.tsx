import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { CreateEventInput } from "@/types/event";
import { LocationMapPicker } from "./LocationMapPicker";

interface Props {
  form: CreateEventInput;
  update: <K extends keyof CreateEventInput>(key: K, value: CreateEventInput[K]) => void;
}

export const EventAttendanceFields: React.FC<Props> = ({ form, update }) => {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <Label>Accept attendance</Label>
        <Switch checked={form.accept_attendance} onCheckedChange={(v) => update("accept_attendance", v)} />
      </div>

      {form.accept_attendance && (
        <>
          {/* Attendance window */}
          <div className="space-y-1.5">
            <Label htmlFor="att-status">Attendance window</Label>
            <select
              id="att-status"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.attendance_status ?? ""}
              onChange={(e) => update("attendance_status", (e.target.value || null) as CreateEventInput["attendance_status"])}
            >
              <option value="">Always open</option>
              <option value="open">Manually opened</option>
              <option value="closed">Manually closed</option>
              <option value="scheduled">Open in time window</option>
            </select>
          </div>

          {form.attendance_status === "scheduled" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="att-opens">Opens at</Label>
                <Input
                  id="att-opens"
                  type="datetime-local"
                  value={form.attendance_opens_at ? form.attendance_opens_at.slice(0, 16) : ""}
                  onChange={(e) => update("attendance_opens_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="att-closes">Closes at</Label>
                <Input
                  id="att-closes"
                  type="datetime-local"
                  value={form.attendance_closes_at ? form.attendance_closes_at.slice(0, 16) : ""}
                  onChange={(e) => update("attendance_closes_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </div>
            </div>
          )}

          {/* Require location */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Require location check-in</Label>
              <p className="text-xs text-muted-foreground">Users must be at the venue to mark attendance</p>
            </div>
            <Switch checked={form.require_location} onCheckedChange={(v) => update("require_location", v)} />
          </div>

          {form.require_location && (
            <LocationMapPicker
              lat={form.location_lat}
              lng={form.location_lng}
              radius={form.location_radius}
              onChangeLocation={(lat, lng) => {
                update("location_lat", lat);
                update("location_lng", lng);
              }}
              onChangeRadius={(r) => update("location_radius", r)}
            />
          )}
        </>
      )}
    </div>
  );
};
