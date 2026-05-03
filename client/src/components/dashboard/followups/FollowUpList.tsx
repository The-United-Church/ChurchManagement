import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  User as UserIcon,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  FOLLOWUP_PRIORITY_LABELS,
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_TYPE_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  followUpTargetIsMember,
  followUpTargetName,
  isOverdue,
  type FollowUp,
} from '@/types/follow-up';

interface FollowUpListProps {
  followUps: FollowUp[];
  loading?: boolean;
  selectedIds: Set<string>;
  onSelectChange: (ids: Set<string>) => void;
  onView: (fu: FollowUp) => void;
  onEdit: (fu: FollowUp) => void;
  onDelete: (fu: FollowUp) => void;
  onComplete: (fu: FollowUp) => void;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const FollowUpList: React.FC<FollowUpListProps> = ({
  followUps,
  loading,
  selectedIds,
  onSelectChange,
  onView,
  onEdit,
  onDelete,
  onComplete,
}) => {
  const allChecked = followUps.length > 0 && followUps.every((f) => selectedIds.has(f.id));
  const someChecked = followUps.some((f) => selectedIds.has(f.id));

  const toggleAll = () => {
    if (allChecked) {
      onSelectChange(new Set());
    } else {
      onSelectChange(new Set(followUps.map((f) => f.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectChange(next);
  };

  if (!loading && followUps.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <UserIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No follow-ups match the current filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  // Use indeterminate styling when partial
                  className={cn(someChecked && !allChecked && 'data-[state=unchecked]:bg-app-primary/20')}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {followUps.map((fu) => {
              const name = followUpTargetName(fu);
              const isMember = followUpTargetIsMember(fu);
              const overdue = isOverdue(fu);
              const profile = fu.person?.profile_image || fu.user?.profile_image;
              const assignee = fu.assignee;
              return (
                <TableRow
                  key={fu.id}
                  className={cn(
                    'cursor-pointer hover:bg-muted/50',
                    selectedIds.has(fu.id) && 'bg-app-primary/5',
                  )}
                  onClick={() => onView(fu)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(fu.id)}
                      onCheckedChange={() => toggleOne(fu.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile || undefined} />
                        <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate max-w-[160px]">{name}</span>
                          <Badge
                            className={cn('text-[9px]', isMember ? 'bg-blue-600' : 'bg-purple-600')}
                          >
                            {isMember ? 'Member' : 'Visitor'}
                          </Badge>
                          {fu.is_escalated && (
                            <Badge variant="destructive" className="text-[9px] gap-1">
                              <ChevronUp className="h-3 w-3" />
                              Esc
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {fu.person?.email || fu.user?.email || fu.person?.phone || fu.user?.phone_number || ''}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {FOLLOWUP_TYPE_LABELS[fu.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-[10px]', STATUS_COLORS[fu.status])}>
                      {FOLLOWUP_STATUS_LABELS[fu.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-[10px]', PRIORITY_COLORS[fu.priority])}>
                      {FOLLOWUP_PRIORITY_LABELS[fu.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={assignee.profile_image || undefined} />
                          <AvatarFallback className="text-[9px]">
                            {initials(
                              `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() ||
                                assignee.full_name ||
                                assignee.email ||
                                '?',
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate max-w-[120px]">
                          {`${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() ||
                            assignee.full_name ||
                            assignee.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {fu.scheduled_date ? (
                      <span
                        className={cn(
                          'text-xs flex items-center gap-1',
                          overdue && 'text-red-600 dark:text-red-400 font-medium',
                        )}
                      >
                        {overdue ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <CalendarIcon className="h-3 w-3" />
                        )}
                        {format(new Date(fu.scheduled_date), 'MMM d')}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {fu.completed_date ? (
                      <span className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {format(new Date(fu.completed_date), 'MMM d')}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="View"
                        onClick={() => onView(fu)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {fu.status !== 'completed' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-600"
                          title="Mark complete"
                          onClick={() => onComplete(fu)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Edit"
                        onClick={() => onEdit(fu)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        title="Delete"
                        onClick={() => onDelete(fu)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden grid gap-2">
        {followUps.map((fu) => {
          const name = followUpTargetName(fu);
          const isMember = followUpTargetIsMember(fu);
          const overdue = isOverdue(fu);
          const profile = fu.person?.profile_image || fu.user?.profile_image;
          return (
            <Card
              key={fu.id}
              className={cn(
                'cursor-pointer transition-colors',
                selectedIds.has(fu.id) && 'border-app-primary',
              )}
              onClick={() => onView(fu)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                    <Checkbox
                      checked={selectedIds.has(fu.id)}
                      onCheckedChange={() => toggleOne(fu.id)}
                    />
                  </div>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile || undefined} />
                    <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium truncate">{name}</span>
                      <Badge className={cn('text-[9px]', isMember ? 'bg-blue-600' : 'bg-purple-600')}>
                        {isMember ? 'Member' : 'Visitor'}
                      </Badge>
                      {overdue && (
                        <Badge variant="destructive" className="text-[9px]">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[9px]">
                        {FOLLOWUP_TYPE_LABELS[fu.type]}
                      </Badge>
                      <Badge className={cn('text-[9px]', STATUS_COLORS[fu.status])}>
                        {FOLLOWUP_STATUS_LABELS[fu.status]}
                      </Badge>
                      <Badge className={cn('text-[9px]', PRIORITY_COLORS[fu.priority])}>
                        {FOLLOWUP_PRIORITY_LABELS[fu.priority]}
                      </Badge>
                    </div>
                    {fu.scheduled_date && (
                      <div
                        className={cn(
                          'text-[11px] mt-1 flex items-center gap-1',
                          overdue ? 'text-red-600' : 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(fu.scheduled_date), 'PP')}
                      </div>
                    )}
                    {fu.completed_date && (
                      <div className="text-[11px] mt-1 flex items-center gap-1 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Completed {format(new Date(fu.completed_date), 'PP')}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
};
