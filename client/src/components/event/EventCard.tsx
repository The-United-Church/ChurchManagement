import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EVENT_CATEGORY_LABELS,
  RECURRENCE_LABELS,
  EventStatus,
  type EventDTO,
  type EventCategory,
} from "@/types/event";
import { Calendar, Clock, MapPin, Repeat } from "lucide-react";

interface Props {
  event: EventDTO;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewAttendance: () => void;
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

export const EventCard: React.FC<Props> = ({ event, canManage, onEdit, onDelete, onViewAttendance }) => {
  const isPast = new Date(event.date) < new Date(new Date().toDateString());
  const categoryLabel = EVENT_CATEGORY_LABELS[event.category] ?? event.category;

  const statusBadge: Record<EventStatus, { label: string; className: string }> = {
    [EventStatus.DRAFT]:     { label: "Draft",     className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    [EventStatus.PUBLISHED]: { label: "Published",  className: "bg-green-100 text-green-800 border-green-200" },
    [EventStatus.CANCELLED]: { label: "Cancelled",  className: "bg-red-100 text-red-800 border-red-200" },
    [EventStatus.CLOSED]:    { label: "Closed",     className: "bg-gray-100 text-gray-700 border-gray-200" },
  };
  const sb = statusBadge[event.status] ?? statusBadge[EventStatus.DRAFT];

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${isPast ? "opacity-70" : ""}`}>
      {event.image && (
        <div className="h-36 w-full overflow-hidden">
          <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-2">{event.title}</h3>
          <Badge variant="outline" className="shrink-0 text-xs">{categoryLabel}</Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{event.date}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(event.time_from)} – {formatTime(event.time_to)}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>
        </div>

        {event.is_recurring && event.recurrence_pattern && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Repeat className="h-3 w-3" />{RECURRENCE_LABELS[event.recurrence_pattern]}
          </span>
        )}

        {canManage && (
          <Badge variant="outline" className={`text-xs ${sb.className}`}>{sb.label}</Badge>
        )}

        {!event.is_published && event.status === EventStatus.PUBLISHED && (
          <Badge variant="secondary" className="text-xs">Scheduled</Badge>
        )}

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {event.accept_attendance && (
            <Button size="sm" variant="outline" onClick={onViewAttendance}>Attendance</Button>
          )}
          {canManage && (
            <>
              <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={onDelete}>Delete</Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
