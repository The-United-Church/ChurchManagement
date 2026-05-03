import React, { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  FOLLOWUP_TYPE_LABELS,
  FOLLOWUP_PRIORITY_LABELS,
  FOLLOWUP_STATUS_LABELS,
  type CreateFollowUpDTO,
  type FollowUp,
  type FollowUpPriority,
  type FollowUpStatus,
  type FollowUpType,
  type UpdateFollowUpDTO,
} from '@/types/follow-up';
import { AssigneePicker, PersonOrMemberPicker, type PersonOrMemberValue } from './Pickers';

interface AddFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateFollowUpDTO) => Promise<FollowUp | null>;
  saving: boolean;
  /** Pre-fill target (e.g. when launched from a Person row). */
  initialTarget?: PersonOrMemberValue | null;
}

const DEFAULT_TYPE: FollowUpType = 'general';
const DEFAULT_PRIORITY: FollowUpPriority = 'medium';

export const AddFollowUpDialog: React.FC<AddFollowUpDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  saving,
  initialTarget,
}) => {
  const [target, setTarget] = useState<PersonOrMemberValue | null>(null);
  const [type, setType] = useState<FollowUpType>(DEFAULT_TYPE);
  const [priority, setPriority] = useState<FollowUpPriority>(DEFAULT_PRIORITY);
  const [scheduled, setScheduled] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setTarget(initialTarget ?? null);
      setType(DEFAULT_TYPE);
      setPriority(DEFAULT_PRIORITY);
      setScheduled('');
      setAssignedTo(null);
      setNotes('');
    }
  }, [open, initialTarget]);

  const handleSave = async () => {
    if (!target) return;
    const payload: CreateFollowUpDTO = {
      type,
      priority,
      scheduled_date: scheduled || null,
      assigned_to: assignedTo,
      notes: notes.trim() || null,
      person_id: target.kind === 'person' ? target.id : null,
      user_id: target.kind === 'member' ? target.id : null,
    };
    const result = await onSave(payload);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Follow-up</DialogTitle>
          <DialogDescription>
            Schedule outreach for a visitor or member of your church.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Person or member</Label>
            <PersonOrMemberPicker value={target} onChange={setTarget} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FOLLOWUP_TYPE_LABELS) as FollowUpType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {FOLLOWUP_TYPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as FollowUpPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FOLLOWUP_PRIORITY_LABELS) as FollowUpPriority[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {FOLLOWUP_PRIORITY_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Scheduled date</Label>
              <Input
                type="date"
                value={scheduled}
                onChange={(e) => setScheduled(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Assignee</Label>
              <AssigneePicker value={assignedTo} onChange={(id) => setAssignedTo(id)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notes / context</Label>
            <Textarea
              rows={3}
              placeholder="What needs to happen for this follow-up?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground"
            onClick={handleSave}
            disabled={!target || saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface EditFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUp: FollowUp | null;
  onSave: (id: string, data: UpdateFollowUpDTO) => Promise<FollowUp | null>;
  saving: boolean;
}

export const EditFollowUpDialog: React.FC<EditFollowUpDialogProps> = ({
  open,
  onOpenChange,
  followUp,
  onSave,
  saving,
}) => {
  const [type, setType] = useState<FollowUpType>('general');
  const [status, setStatus] = useState<FollowUpStatus>('pending');
  const [priority, setPriority] = useState<FollowUpPriority>('medium');
  const [scheduled, setScheduled] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  useEffect(() => {
    if (followUp) {
      setType(followUp.type);
      setStatus(followUp.status);
      setPriority(followUp.priority);
      setScheduled(followUp.scheduled_date || '');
      setAssignedTo(followUp.assigned_to || null);
      setNotes(followUp.notes || '');
      setOutcomeNotes(followUp.outcome_notes || '');
    }
  }, [followUp]);

  const handleSave = async () => {
    if (!followUp) return;
    const result = await onSave(followUp.id, {
      type,
      status,
      priority,
      scheduled_date: scheduled || null,
      assigned_to: assignedTo,
      notes: notes.trim() || null,
      outcome_notes: outcomeNotes.trim() || null,
    });
    if (result) onOpenChange(false);
  };

  if (!followUp) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Follow-up</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FOLLOWUP_TYPE_LABELS) as FollowUpType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {FOLLOWUP_TYPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FollowUpStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FOLLOWUP_STATUS_LABELS) as FollowUpStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {FOLLOWUP_STATUS_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as FollowUpPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FOLLOWUP_PRIORITY_LABELS) as FollowUpPriority[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {FOLLOWUP_PRIORITY_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Scheduled date</Label>
              <Input type="date" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Assignee</Label>
              <AssigneePicker value={assignedTo} onChange={(id) => setAssignedTo(id)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {(status === 'completed' || status === 'cancelled') && (
            <div className="grid gap-2">
              <Label>Outcome / resolution notes</Label>
              <Textarea
                rows={2}
                placeholder="How was this resolved?"
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
