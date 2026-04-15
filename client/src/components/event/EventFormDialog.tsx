import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  EventCategory,
  EVENT_CATEGORY_LABELS,
  RecurrencePattern,
  RECURRENCE_LABELS,
  EventVisibility,
  EventStatus,
  EVENT_STATUS_LABELS,
  type CreateEventInput,
  type EventDTO,
} from "@/types/event";
import { EventRecurrenceFields } from "./EventRecurrenceFields";
import { EventAttendanceFields } from "./EventAttendanceFields";
import { EventVisibilityFields } from "./EventVisibilityFields";
import { EventImageUpload } from "./EventImageUpload";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateEventInput) => Promise<void>;
  initial?: EventDTO | null;
  loading?: boolean;
}

const EMPTY_FORM: CreateEventInput = {
  title: "",
  description: null,
  location: "",
  category: EventCategory.GENERAL,
  date: "",
  time_from: "",
  time_to: "",
  image: null,
  is_recurring: false,
  recurrence_pattern: null,
  recurrence_days: null,
  monthly_type: null,
  monthly_day: null,
  monthly_week_descriptor: null,
  recurrence_end_date: null,
  accept_attendance: false,
  require_location: false,
  location_lat: null,
  location_lng: null,
  location_radius: null,
  attendance_status: null,
  attendance_opens_at: null,
  attendance_closes_at: null,
  guest_checkin_fields: null,
  allow_multiple_checkins: false,
  visibility: EventVisibility.PUBLIC,
  visible_to_member_ids: null,
  publish_at: null,
  status: EventStatus.DRAFT,
};

function toFormData(ev: EventDTO): CreateEventInput {
  return {
    title: ev.title,
    description: ev.description,
    location: ev.location,
    category: ev.category,
    date: ev.date,
    time_from: ev.time_from,
    time_to: ev.time_to,
    image: ev.image,
    is_recurring: ev.is_recurring,
    recurrence_pattern: ev.recurrence_pattern,
    recurrence_days: ev.recurrence_days,
    monthly_type: ev.monthly_type,
    monthly_day: ev.monthly_day,
    monthly_week_descriptor: ev.monthly_week_descriptor,
    recurrence_end_date: ev.recurrence_end_date,
    accept_attendance: ev.accept_attendance,
    require_location: ev.require_location,
    location_lat: ev.location_lat,
    location_lng: ev.location_lng,
    location_radius: ev.location_radius,
    attendance_status: ev.attendance_status,
    attendance_opens_at: ev.attendance_opens_at,
    attendance_closes_at: ev.attendance_closes_at,
    guest_checkin_fields: ev.guest_checkin_fields,
    allow_multiple_checkins: ev.allow_multiple_checkins,
    visibility: ev.visibility,
    visible_to_member_ids: ev.visible_to_member_ids,
    publish_at: ev.publish_at,
    status: ev.status,
  };
}

export const EventFormDialog: React.FC<Props> = ({ open, onOpenChange, onSubmit, initial, loading }) => {
  const isEdit = !!initial && !!initial.id;
  const isDuplicate = !!initial && !initial.id;
  const [form, setForm] = useState<CreateEventInput>(EMPTY_FORM);

  useEffect(() => {
    if (open) setForm(initial ? toFormData(initial) : EMPTY_FORM);
  }, [open, initial]);

  const update = <K extends keyof CreateEventInput>(key: K, value: CreateEventInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const isValid = form.title.trim().length > 0 && form.location.trim().length > 0 && !!form.date && !!form.time_from && !!form.time_to;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Event" : isDuplicate ? "Duplicate Event" : "Create Event"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Title *</Label>
            <Input id="ev-title" value={form.title} onChange={(e) => update("title", e.target.value)} required placeholder="e.g. Sunday Worship Service" />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-category">Category *</Label>
            <select id="ev-category" className="w-full rounded-md border px-3 py-2 text-sm" value={form.category} onChange={(e) => update("category", e.target.value as EventCategory)}>
              {Object.entries(EVENT_CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-location">Location *</Label>
            <Input id="ev-location" value={form.location} onChange={(e) => update("location", e.target.value)} required placeholder="e.g. Main Auditorium" />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Date *</Label>
              <Input id="ev-date" type="date" value={form.date} onChange={(e) => update("date", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-from">From *</Label>
              <Input id="ev-from" type="time" value={form.time_from} onChange={(e) => update("time_from", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-to">To *</Label>
              <Input id="ev-to" type="time" value={form.time_to} onChange={(e) => update("time_to", e.target.value)} required />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Description (optional)</Label>
            <Textarea id="ev-desc" value={form.description ?? ""} onChange={(e) => update("description", e.target.value || null)} placeholder="Add event details..." rows={3} />
          </div>

          {/* Image Upload */}
          <EventImageUpload value={form.image} onChange={(url) => update("image", url)} />

          {/* Recurring toggle */}
          <div className="flex items-center justify-between">
            <Label>Recurring event</Label>
            <Switch checked={form.is_recurring} onCheckedChange={(v) => update("is_recurring", v)} />
          </div>
          {form.is_recurring && <EventRecurrenceFields form={form} update={update} />}

          {/* Attendance */}
          <EventAttendanceFields form={form} update={update} />

          {/* Visibility */}
          <EventVisibilityFields form={form} update={update} />

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-status">Event status</Label>
            <select
              id="ev-status"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => update("status", e.target.value as EventStatus)}
            >
              {Object.entries(EVENT_STATUS_LABELS)
                .filter(([val]) => val !== EventStatus.ONGOING)
                .map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
            </select>
            <p className="text-xs text-muted-foreground">Save as Draft to keep it hidden until you're ready to publish.</p>
          </div>

          {/* Publish at — only relevant when publishing */}
          {form.status === EventStatus.PUBLISHED && (
            <div className="space-y-1.5">
              <Label htmlFor="ev-publish">Schedule publish at (optional)</Label>
              <Input id="ev-publish" type="datetime-local" value={form.publish_at ?? ""} onChange={(e) => update("publish_at", e.target.value || null)} />
              <p className="text-xs text-muted-foreground">Leave empty to publish immediately.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!isValid || loading}>{loading ? "Saving…" : isEdit ? "Update" : isDuplicate ? "Duplicate" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
