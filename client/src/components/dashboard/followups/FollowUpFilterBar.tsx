import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Filter,
  X,
  Save,
  Trash2,
  Loader2,
  Bookmark,
  ChevronDown,
} from 'lucide-react';
import {
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_TYPE_LABELS,
  FOLLOWUP_PRIORITY_LABELS,
  type FollowUpFiltersState,
  type FollowUpStatus,
  type FollowUpType,
  type FollowUpPriority,
} from '@/types/follow-up';
import { useSavedFilters } from '@/hooks/useFollowUpsCrud';
import { AssigneePicker } from './Pickers';

interface FollowUpFilterBarProps {
  filters: FollowUpFiltersState;
  onChange: (
    next: FollowUpFiltersState | ((prev: FollowUpFiltersState) => FollowUpFiltersState),
  ) => void;
}

const toggleArr = <T,>(arr: T[] | undefined, value: T) => {
  const set = new Set(arr ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
};

const countActive = (f: FollowUpFiltersState) => {
  let n = 0;
  if (f.status?.length) n++;
  if (f.type?.length) n++;
  if (f.priority?.length) n++;
  if (f.assigneeId) n++;
  if (f.from) n++;
  if (f.to) n++;
  if (f.overdueOnly) n++;
  return n;
};

export const FollowUpFilterBar: React.FC<FollowUpFilterBarProps> = ({ filters, onChange }) => {
  const [open, setOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savingFilter, setSavingFilter] = useState(false);
  const { data: savedFilters = [], create, remove } = useSavedFilters();

  const activeCount = countActive(filters);

  const clear = () => onChange({});

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSavingFilter(true);
    const ok = await create(saveName.trim(), filters);
    setSavingFilter(false);
    if (ok) {
      setSaveDialogOpen(false);
      setSaveName('');
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <Badge className="bg-app-primary text-white h-4 min-w-4 text-[10px] px-1">{activeCount}</Badge>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-3 space-y-3 max-h-[80vh] overflow-y-auto z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg text-gray-900 dark:text-gray-100">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {(Object.keys(FOLLOWUP_STATUS_LABELS) as FollowUpStatus[]).map((s) => {
                const checked = filters.status?.includes(s) ?? false;
                return (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        onChange((prev) => ({ ...prev, status: toggleArr(prev.status, s) as any }))
                      }
                    />
                    {FOLLOWUP_STATUS_LABELS[s]}
                  </label>
                );
              })}
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {(Object.keys(FOLLOWUP_TYPE_LABELS) as FollowUpType[]).map((t) => {
                const checked = filters.type?.includes(t) ?? false;
                return (
                  <label key={t} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        onChange((prev) => ({ ...prev, type: toggleArr(prev.type, t) as any }))
                      }
                    />
                    {FOLLOWUP_TYPE_LABELS[t]}
                  </label>
                );
              })}
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Priority</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {(Object.keys(FOLLOWUP_PRIORITY_LABELS) as FollowUpPriority[]).map((p) => {
                const checked = filters.priority?.includes(p) ?? false;
                return (
                  <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        onChange((prev) => ({ ...prev, priority: toggleArr(prev.priority, p) as any }))
                      }
                    />
                    {FOLLOWUP_PRIORITY_LABELS[p]}
                  </label>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Assignee</Label>
            <AssigneePicker
              value={filters.assigneeId || null}
              onChange={(id) => onChange((prev) => ({ ...prev, assigneeId: id || undefined }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={filters.from || ''}
                onChange={(e) => onChange((prev) => ({ ...prev, from: e.target.value || undefined }))}
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={filters.to || ''}
                onChange={(e) => onChange((prev) => ({ ...prev, to: e.target.value || undefined }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Overdue only</Label>
            <Switch
              checked={!!filters.overdueOnly}
              onCheckedChange={(v) => onChange((prev) => ({ ...prev, overdueOnly: v || undefined }))}
            />
          </div>

          <Separator />

          <div className="flex justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={clear} disabled={activeCount === 0}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={activeCount === 0}
              onClick={() => setSaveDialogOpen(true)}
            >
              <Save className="h-3 w-3 mr-1" /> Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={savedOpen} onOpenChange={setSavedOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" /> Saved
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2 z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg">
          {savedFilters.length === 0 && (
            <div className="px-2 py-3 text-xs text-center text-gray-400">No saved filters yet.</div>
          )}
          {savedFilters.map((sf) => (
            <div key={sf.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <button
                type="button"
                className="flex-1 text-left text-sm truncate text-gray-900 dark:text-gray-100"
                onClick={() => {
                  onChange(sf.filters || {});
                  setSavedOpen(false);
                }}
              >
                {sf.name}
              </button>
              <button
                type="button"
                className="text-gray-400 hover:text-red-500 p-1"
                onClick={() => remove(sf.id)}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </PopoverContent>
      </Popover>

      {filters.overdueOnly && (
        <Badge variant="destructive" className="text-[10px]">
          Overdue
          <button onClick={() => onChange((p) => ({ ...p, overdueOnly: undefined }))} className="ml-1">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Name</Label>
            <Input
              autoFocus
              placeholder="My follow-ups due this week"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground"
              onClick={handleSave}
              disabled={!saveName.trim() || savingFilter}
            >
              {savingFilter && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
