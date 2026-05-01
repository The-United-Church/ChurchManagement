import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Users, UsersRound } from 'lucide-react';
import { fetchUsersDirectoryApi, addUserToBranchApi } from '@/lib/api';
import type { DirectoryUserDTO } from '@/lib/api';
import { toast } from 'sonner';

interface AddFromUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingMemberIds: Set<string>;
  onAdded: () => void;
  churchId: string;
  branchId: string;
  branchName?: string;
  churchName?: string;
}

const AddFromUsersDialog: React.FC<AddFromUsersDialogProps> = ({
  open,
  onOpenChange,
  existingMemberIds,
  onAdded,
  churchId,
  branchId,
  branchName,
  churchName,
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [users, setUsers] = useState<DirectoryUserDTO[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<'member' | 'coordinator' | 'admin'>('member');
  const [adding, setAdding] = useState(false);

  // Debounce search input (400 ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch users whenever the dialog opens or the debounced query changes
  useEffect(() => {
    if (!open) return;
    setFetchingUsers(true);
    fetchUsersDirectoryApi(debouncedSearch.trim() || undefined)
      .then((res) => setUsers(res.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => setFetchingUsers(false));
  }, [open, debouncedSearch]);

  // Reset everything when the dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebouncedSearch('');
      setSelected(new Set());
      setRole('member');
      setUsers([]);
    }
  }, [open]);

  const toggleSelect = (id: string) => {
    if (existingMemberIds.has(id)) return;
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    let successCount = 0;
    let failCount = 0;
    for (const userId of Array.from(selected)) {
      try {
        await addUserToBranchApi(churchId, branchId, userId, role);
        successCount++;
      } catch {
        failCount++;
      }
    }
    setAdding(false);
    if (successCount > 0) {
      toast.success(`${successCount} user${successCount > 1 ? 's' : ''} added to branch`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} user${failCount > 1 ? 's' : ''} could not be added`);
    }
    onAdded();
    onOpenChange(false);
  };

  const displayOrg = branchName ?? churchName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <UsersRound className="h-5 w-5 text-blue-600" />
            Add Users{displayOrg ? ` to ${displayOrg}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 shrink-0">Add as:</span>
            <div className="flex gap-2">
              {(['member', 'coordinator', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                    role === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="h-72 overflow-y-auto">
              {fetchingUsers ? (
                <div className="flex items-center justify-center h-full gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading users…</span>
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-sm text-gray-400 gap-2">
                  <Users className="h-8 w-8 opacity-40" />
                  {search ? 'No users match your search.' : 'No users found.'}
                </div>
              ) : (
                <div className="divide-y">
                  {users.map((u) => {
                    const name = u.full_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email;
                    const initials = name.slice(0, 2).toUpperCase();
                    const isExisting = existingMemberIds.has(u.id);
                    const isChecked = selected.has(u.id);
                    const location = [u.city, u.state, u.country].filter(Boolean).join(', ');

                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleSelect(u.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 transition-colors select-none ${
                          isExisting
                            ? 'opacity-50 cursor-not-allowed bg-gray-50'
                            : isChecked
                            ? 'bg-blue-50 cursor-pointer'
                            : 'hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          disabled={isExisting}
                          onCheckedChange={() => toggleSelect(u.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-700">{initials}</span>
                          </div>
                          {u.is_online === true && (
                            <span
                              aria-label="Online"
                              title="Online"
                              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
                            <Badge
                              variant={u.role === 'admin' || u.role === 'super_admin' ? 'destructive' : 'secondary'}
                              className="text-xs shrink-0"
                            >
                              {u.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {u.email}{location ? ` · ${location}` : ''}
                          </p>
                        </div>
                        {isExisting && (
                          <span className="text-xs text-gray-400 shrink-0 italic">Already a member</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {selected.size > 0 && (
            <p className="text-xs text-gray-500">
              {selected.size} user{selected.size > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={adding}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selected.size === 0 || adding}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {adding ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</>
            ) : (
              <><UsersRound className="h-4 w-4 mr-2" />Add {selected.size > 0 ? `${selected.size} ` : ''}Selected</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFromUsersDialog;
