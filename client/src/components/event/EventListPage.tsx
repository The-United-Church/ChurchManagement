import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventCard } from "./EventCard";
import { EventFormDialog } from "./EventFormDialog";
import { useEventList, useEventCrud } from "@/hooks/useEventCrud";
import { useChurch } from "@/components/church/ChurchProvider";
import { EVENT_CATEGORY_LABELS, EventCategory, type EventDTO, type CreateEventInput } from "@/types/event";
import { Plus } from "lucide-react";
import { EventAttendanceDialog } from "./EventAttendanceDialog";

export const EventListPage: React.FC = () => {
  const { branchRole, effectiveRole } = useChurch();
  const canManage = ["admin", "coordinator"].includes(branchRole ?? "") || ["admin", "super_admin"].includes(effectiveRole);

  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>("");
  const { events, total, isLoading } = useEventList(page, category || undefined);
  const { saving, create, update, remove } = useEventCrud();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EventDTO | null>(null);
  const [attendanceEvent, setAttendanceEvent] = useState<EventDTO | null>(null);

  const handleCreate = async (data: CreateEventInput) => {
    const result = await create(data);
    if (result) setFormOpen(false);
  };

  const handleUpdate = async (data: CreateEventInput) => {
    if (!editTarget) return;
    const ok = await update(editTarget.id, data);
    if (ok) setEditTarget(null);
  };

  const handleDelete = async (ev: EventDTO) => {
    if (!confirm(`Delete "${ev.title}"?`)) return;
    await remove(ev.id);
  };

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Events</h1>
        {canManage && (
          <Button onClick={() => setFormOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> New Event
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-md border px-3 py-2 text-sm"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          <option value="">All categories</option>
          {Object.entries(EVENT_CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {canManage ? "No events yet. Create one to get started!" : "No upcoming events."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              canManage={canManage}
              onEdit={() => setEditTarget(ev)}
              onDelete={() => handleDelete(ev)}
              onViewAttendance={() => setAttendanceEvent(ev)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {/* Create dialog */}
      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleCreate} loading={saving} />

      {/* Edit dialog */}
      <EventFormDialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }} onSubmit={handleUpdate} initial={editTarget} loading={saving} />

      {/* Attendance dialog */}
      {attendanceEvent && (
        <EventAttendanceDialog event={attendanceEvent} open={!!attendanceEvent} onOpenChange={(open) => { if (!open) setAttendanceEvent(null); }} />
      )}
    </div>
  );
};
