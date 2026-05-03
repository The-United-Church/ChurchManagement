import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  addDays,
} from 'date-fns';
import { cn } from '@/lib/utils';
import {
  FOLLOWUP_PRIORITY_LABELS,
  FOLLOWUP_STATUS_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  followUpTargetName,
  isOverdue,
  type FollowUp,
  type FollowUpStatus,
} from '@/types/follow-up';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// ─── Kanban (drag-to-update-status) ──────────────────────────────────────
interface FollowUpKanbanProps {
  followUps: FollowUp[];
  onView: (fu: FollowUp) => void;
  onStatusChange: (id: string, status: FollowUpStatus) => Promise<unknown>;
}

const KANBAN_COLUMNS: { status: FollowUpStatus; label: string; tone: string }[] = [
  { status: 'pending', label: 'Pending', tone: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20' },
  { status: 'in_progress', label: 'In Progress', tone: 'border-blue-300 bg-blue-50 dark:bg-blue-950/20' },
  { status: 'completed', label: 'Completed', tone: 'border-green-300 bg-green-50 dark:bg-green-950/20' },
];

export const FollowUpKanban: React.FC<FollowUpKanbanProps> = ({ followUps, onView, onStatusChange }) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<FollowUpStatus | null>(null);

  const groups = useMemo(() => {
    const map: Record<FollowUpStatus, FollowUp[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };
    for (const f of followUps) map[f.status].push(f);
    return map;
  }, [followUps]);

  const handleDrop = async (status: FollowUpStatus) => {
    if (!draggingId) return;
    const fu = followUps.find((f) => f.id === draggingId);
    setDraggingId(null);
    setDragOver(null);
    if (!fu || fu.status === status) return;
    await onStatusChange(fu.id, status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {KANBAN_COLUMNS.map((col) => {
        const list = groups[col.status];
        return (
          <div
            key={col.status}
            className={cn(
              'rounded-md border p-2 flex flex-col min-h-[300px] transition-colors',
              col.tone,
              dragOver === col.status && 'ring-2 ring-app-primary',
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(col.status)}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <Badge variant="outline">{list.length}</Badge>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {list.length === 0 && (
                <div className="text-xs text-muted-foreground italic text-center py-6">
                  Drop here
                </div>
              )}
              {list.map((fu) => {
                const name = followUpTargetName(fu);
                const overdue = isOverdue(fu);
                return (
                  <div
                    key={fu.id}
                    draggable
                    onDragStart={() => setDraggingId(fu.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => onView(fu)}
                    className={cn(
                      'rounded-md bg-card border p-2 cursor-pointer hover:shadow transition-shadow',
                      draggingId === fu.id && 'opacity-50',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={fu.person?.profile_image || fu.user?.profile_image || undefined} />
                        <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{name}</div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <Badge className={cn('text-[9px]', PRIORITY_COLORS[fu.priority])}>
                            {FOLLOWUP_PRIORITY_LABELS[fu.priority]}
                          </Badge>
                          {overdue && (
                            <Badge variant="destructive" className="text-[9px] gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {fu.scheduled_date && (
                      <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(fu.scheduled_date), 'MMM d')}
                      </div>
                    )}
                    {fu.notes && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{fu.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Calendar (month view) ────────────────────────────────────────────────
interface FollowUpCalendarProps {
  followUps: FollowUp[];
  onView: (fu: FollowUp) => void;
}

export const FollowUpCalendar: React.FC<FollowUpCalendarProps> = ({ followUps, onView }) => {
  const [cursor, setCursor] = useState(new Date());
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const byDate = useMemo(() => {
    const map = new Map<string, FollowUp[]>();
    for (const f of followUps) {
      if (!f.scheduled_date) continue;
      const key = format(new Date(f.scheduled_date), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return map;
  }, [followUps]);

  const [selected, setSelected] = useState<Date | null>(null);
  const selectedKey = selected ? format(selected, 'yyyy-MM-dd') : null;
  const selectedItems = selectedKey ? byDate.get(selectedKey) || [] : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{format(cursor, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={() => setCursor(addMonths(cursor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button size="icon" variant="outline" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="px-1 py-0.5 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const items = byDate.get(key) || [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, new Date());
          const isSelected = selected && isSameDay(day, selected);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(day)}
              className={cn(
                'aspect-square min-h-[64px] rounded-md border p-1 text-left flex flex-col gap-0.5 transition-colors',
                inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground',
                isToday && 'border-app-primary',
                isSelected && 'ring-2 ring-app-primary',
              )}
            >
              <span className={cn('text-[11px]', isToday && 'font-bold text-app-primary')}>
                {format(day, 'd')}
              </span>
              <div className="flex flex-wrap gap-0.5 overflow-hidden">
                {items.slice(0, 3).map((f) => (
                  <span
                    key={f.id}
                    className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full',
                      f.priority === 'urgent'
                        ? 'bg-red-500'
                        : f.priority === 'high'
                          ? 'bg-orange-500'
                          : f.priority === 'medium'
                            ? 'bg-blue-500'
                            : 'bg-gray-400',
                    )}
                  />
                ))}
                {items.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">+{items.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <Card>
          <CardContent className="p-3">
            <h4 className="text-sm font-semibold mb-2">
              {format(selected, 'PPPP')}
              <span className="ml-2 text-muted-foreground font-normal text-xs">
                ({selectedItems.length} {selectedItems.length === 1 ? 'follow-up' : 'follow-ups'})
              </span>
            </h4>
            {selectedItems.length === 0 && (
              <div className="text-xs text-muted-foreground italic">
                No follow-ups scheduled for this date.
              </div>
            )}
            <ul className="space-y-1.5">
              {selectedItems.map((fu) => {
                const name = followUpTargetName(fu);
                return (
                  <li
                    key={fu.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => onView(fu)}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={fu.person?.profile_image || fu.user?.profile_image || undefined} />
                      <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{name}</div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge className={cn('text-[9px]', STATUS_COLORS[fu.status])}>
                          {FOLLOWUP_STATUS_LABELS[fu.status]}
                        </Badge>
                        <Badge className={cn('text-[9px]', PRIORITY_COLORS[fu.priority])}>
                          {FOLLOWUP_PRIORITY_LABELS[fu.priority]}
                        </Badge>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
