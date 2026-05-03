import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Phone,
  Mail,
  MessageSquare,
  Loader2,
  CheckCircle,
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  CONTACT_METHOD_LABELS,
  CONTACT_OUTCOME_LABELS,
  FOLLOWUP_PRIORITY_LABELS,
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_TYPE_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  followUpTargetIsMember,
  followUpTargetName,
  isOverdue,
  type ContactMethod,
  type ContactOutcome,
  type FollowUp,
  type FollowUpStatus,
} from '@/types/follow-up';
import { useFollowUpLogs } from '@/hooks/useFollowUpsCrud';

interface FollowUpDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUp: FollowUp | null;
  onEdit?: (fu: FollowUp) => void;
  onConvert?: (fu: FollowUp) => void;
  onMessage?: (fu: FollowUp) => void;
  onStatusChange?: (id: string, status: FollowUpStatus) => Promise<unknown>;
}

const contactInitials = (name?: string) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const FollowUpDetailsDialog: React.FC<FollowUpDetailsDialogProps> = ({
  open,
  onOpenChange,
  followUp,
  onEdit,
  onConvert,
  onMessage,
  onStatusChange,
}) => {
  const { data: logs = [], isLoading: logsLoading, addLog } = useFollowUpLogs(followUp?.id ?? null);

  const [logOpen, setLogOpen] = useState(false);
  const [method, setMethod] = useState<ContactMethod>('phone_call');
  const [outcome, setOutcome] = useState<ContactOutcome>('reached');
  const [logNotes, setLogNotes] = useState('');
  const [contactedAt, setContactedAt] = useState<string>(
    new Date().toISOString().slice(0, 16),
  );
  const [savingLog, setSavingLog] = useState(false);

  if (!followUp) return null;

  const targetName = followUpTargetName(followUp);
  const isMember = followUpTargetIsMember(followUp);
  const overdue = isOverdue(followUp);

  const phone = followUp.person?.phone || followUp.user?.phone_number;
  const email = followUp.person?.email || followUp.user?.email;
  const profileImg = followUp.person?.profile_image || followUp.user?.profile_image;

  const handleLog = async () => {
    setSavingLog(true);
    const ok = await addLog({
      method,
      outcome,
      notes: logNotes.trim() || null,
      contacted_at: new Date(contactedAt).toISOString(),
    });
    setSavingLog(false);
    if (ok) {
      setLogNotes('');
      setLogOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profileImg || undefined} />
              <AvatarFallback>{contactInitials(targetName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="truncate">{targetName}</span>
                <Badge className={cn('text-[10px]', isMember ? 'bg-blue-600' : 'bg-purple-600')}>
                  {isMember ? 'Member' : 'Visitor'}
                </Badge>
                {overdue && (
                  <Badge variant="destructive" className="text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-3 flex-wrap text-xs">
                {email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {email}
                  </span>
                )}
                {phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {phone}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Status row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{FOLLOWUP_TYPE_LABELS[followUp.type]}</Badge>
            <Badge className={STATUS_COLORS[followUp.status]}>{FOLLOWUP_STATUS_LABELS[followUp.status]}</Badge>
            <Badge className={PRIORITY_COLORS[followUp.priority]}>
              {FOLLOWUP_PRIORITY_LABELS[followUp.priority]}
            </Badge>
            {followUp.scheduled_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(followUp.scheduled_date), 'PP')}
              </span>
            )}
            {followUp.completed_date && (
              <span className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Completed {format(new Date(followUp.completed_date), 'PPp')}
              </span>
            )}
            {followUp.assignee && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                {`${followUp.assignee.first_name || ''} ${followUp.assignee.last_name || ''}`.trim() ||
                  followUp.assignee.full_name ||
                  followUp.assignee.email}
              </span>
            )}
          </div>

          {/* Notes */}
          {followUp.notes && (
            <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {followUp.notes}
            </div>
          )}

          {followUp.outcome_notes && (
            <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 p-3 text-sm">
              <div className="text-[10px] uppercase tracking-wider text-green-700 dark:text-green-400 mb-1 font-semibold">
                Resolution
              </div>
              <div className="whitespace-pre-wrap">{followUp.outcome_notes}</div>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setLogOpen((v) => !v)}>
              <MessageSquare className="h-4 w-4 mr-1" />
              {logOpen ? 'Cancel log' : 'Log contact'}
            </Button>
            {followUp.status !== 'completed' && onStatusChange && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(followUp.id, 'completed')}
                className="border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark complete
              </Button>
            )}
            {followUp.status === 'pending' && onStatusChange && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(followUp.id, 'in_progress')}
              >
                <Clock className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
            {phone && (
              <Button size="sm" variant="outline" asChild>
                <a href={`tel:${phone}`}>
                  <Phone className="h-4 w-4 mr-1" /> Call
                </a>
              </Button>
            )}
            {phone && (
              <Button size="sm" variant="outline" asChild>
                <a
                  href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
            )}
            {email && (
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${email}`}>
                  <Mail className="h-4 w-4 mr-1" /> Email
                </a>
              </Button>
            )}
            {isMember && onMessage && (
              <Button size="sm" variant="outline" onClick={() => onMessage(followUp)}>
                Chat in app
              </Button>
            )}
            {!isMember && onConvert && (
              <Button
                size="sm"
                variant="outline"
                className="border-app-primary text-app-primary hover:bg-app-primary/10"
                onClick={() => onConvert(followUp)}
              >
                Convert to member
              </Button>
            )}
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(followUp)}>
                Edit
              </Button>
            )}
          </div>

          {/* Inline log form */}
          {logOpen && (
            <div className="rounded-md border p-3 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Method</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as ContactMethod)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CONTACT_METHOD_LABELS) as ContactMethod[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {CONTACT_METHOD_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Outcome</Label>
                  <Select value={outcome} onValueChange={(v) => setOutcome(v as ContactOutcome)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CONTACT_OUTCOME_LABELS) as ContactOutcome[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {CONTACT_OUTCOME_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">When</Label>
                <Input
                  type="datetime-local"
                  value={contactedAt}
                  onChange={(e) => setContactedAt(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  rows={2}
                  placeholder="What was said? Any next steps?"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground"
                  onClick={handleLog}
                  disabled={savingLog}
                >
                  {savingLog && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Save log
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Contact history */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Contact history</h4>
            {logsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {!logsLoading && logs.length === 0 && (
              <div className="text-xs text-muted-foreground italic">
                No contact attempts logged yet.
              </div>
            )}
            <ul className="space-y-2">
              {logs.map((log) => {
                const contactor = log.contactor;
                const name = contactor
                  ? `${contactor.first_name || ''} ${contactor.last_name || ''}`.trim() ||
                    contactor.full_name ||
                    contactor.email
                  : 'Unknown';
                return (
                  <li key={log.id} className="flex gap-2 text-xs">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={contactor?.profile_image || undefined} />
                      <AvatarFallback className="text-[10px]">{contactInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {CONTACT_METHOD_LABELS[log.method]}
                        </Badge>
                        <Badge
                          className={cn(
                            'text-[10px]',
                            log.outcome === 'reached'
                              ? 'bg-green-100 text-green-800'
                              : log.outcome === 'no_answer'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-700',
                          )}
                        >
                          {CONTACT_OUTCOME_LABELS[log.outcome]}
                        </Badge>
                        <span className="text-muted-foreground">
                          {format(new Date(log.contacted_at), 'PPp')}
                        </span>
                      </div>
                      {log.notes && <div className="text-muted-foreground whitespace-pre-wrap">{log.notes}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
