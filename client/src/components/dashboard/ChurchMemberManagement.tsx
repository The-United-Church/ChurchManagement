import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserPlus,
  Search,
  Users,
  Shield,
  Download,
  Upload,
  Trash2,
  Edit,
  Mail,
  Phone,
  Loader2,
  LayoutGrid,
  LayoutList,
  UsersRound,
  Link2,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useChurch } from '@/components/church/ChurchProvider';
import { useMemberCrud } from '@/hooks/useMemberCrud';
import type { MemberDTO } from '@/hooks/useMemberCrud';
import { usePeopleCrud } from '@/hooks/usePeopleCrud';
import AddMemberDialog from './AddMemberDialog';
import ImportMembersDialog from './ImportMembersDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { fetchUsersDirectoryApi, addUserToBranchApi, fetchMembersApi } from '@/lib/api';
import type { DirectoryUserDTO } from '@/lib/api';
import { toast } from 'sonner';
import MemberDetailsDialog from '@/components/member/MemberDetailsDialog';
import JoinRequestsPanel from './JoinRequestsPanel';
import InviteLinksPanel from './InviteLinksPanel';

// ── Export helpers ─────────────────────────────────────────────────────────
function exportToCSV(members: MemberDTO[]) {
  const TEXT_COLS = new Set(['phone_number']);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const format = (col: string, v: unknown) => {
    if (TEXT_COLS.has(col) && v !== undefined && v !== null && String(v) !== '') {
      return `"=""${String(v).replace(/"/g, '""')}"""`;
    }
    return escape(v);
  };
  const cols = ['full_name', 'email', 'phone_number', 'role', 'branch_is_active'];
  const header = cols.join(',');
  const rows = members.map((m) => cols.map((c) => format(c, (m as any)[c])).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'members_export.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── Edit Member Dialog ─────────────────────────────────────────────────────
interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberDTO | null;
  onSave: (id: string, data: { full_name?: string; role?: string }) => Promise<boolean>;
  onToggleBranchActive: (id: string, is_active: boolean) => Promise<boolean>;
  saving?: boolean;
}

const EditMemberDialog: React.FC<EditMemberDialogProps> = ({ open, onOpenChange, member, onSave, onToggleBranchActive, saving }) => {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('member');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (member) {
      setFullName(member.full_name || `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim());
      setRole(member.branch_role || member.role || 'member');
      setIsActive(member.branch_is_active !== false);
    }
  }, [member]);

  const handleSave = async () => {
    if (!member) return;
    const originalName = member.full_name || `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim();
    const originalRole = member.branch_role || member.role || 'member';
    const payload: Partial<{ full_name: string; role: string }> = {};
    if (fullName !== originalName) payload.full_name = fullName;
    if (role !== originalRole) payload.role = role;

    const tasks: Promise<boolean>[] = [];
    if (Object.keys(payload).length > 0) tasks.push(onSave(member.id, payload));
    // Only update branch status if it actually changed
    if (isActive !== (member.branch_is_active !== false)) {
      tasks.push(onToggleBranchActive(member.id, isActive));
    }
    if (tasks.length === 0) { onOpenChange(false); return; }
    const results = await Promise.all(tasks);
    if (results.every(Boolean)) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-4 w-4 text-blue-600" /> Edit Member
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div> */}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['member', 'coordinator', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-2 py-2 text-sm rounded-md border transition-colors ${
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
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(Boolean(v))}
            />
            <Label htmlFor="edit-active" className="cursor-pointer">Active</Label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Member Card (card view) ────────────────────────────────────────────────
const MemberCard: React.FC<{
  member: MemberDTO;
  selected: boolean;
  onToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ member, selected, onToggle, onView, onEdit, onDelete }) => {
  const name = member.full_name || `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() || member.email;
  const isAdmin = member.role === 'admin' || member.role === 'super_admin';
  const displayRole = member.branch_role || member.role;

  return (
    <Card className={`p-4 space-y-3 transition-colors ${selected ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-0.5" onClick={(e) => e.stopPropagation()} />
          <div>
            <h3 className="font-semibold cursor-pointer hover:underline" onClick={onView}>{name}</h3>
            <Badge variant={isAdmin ? 'destructive' : 'secondary'} className="text-xs mt-1">{displayRole}</Badge>
            {member.branch_is_active === false && <Badge variant="outline" className="text-xs mt-1 ml-1 text-gray-400">inactive</Badge>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="space-y-1 text-sm text-gray-600">
        {member.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-gray-400" /><span>{member.email}</span></div>}
        {member.phone_number && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-gray-400" /><span>{member.phone_number}</span></div>}
      </div>
    </Card>
  );
};

// ── Member List (both views) ───────────────────────────────────────────────
interface MemberListProps {
  members: MemberDTO[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onView: (m: MemberDTO) => void;
  onEdit: (m: MemberDTO) => void;
  onDelete: (m: MemberDTO) => void;
  viewMode: 'table' | 'card';
  loading?: boolean;
}

const MemberList: React.FC<MemberListProps> = ({ members, selectedIds, onToggleSelect, onToggleSelectAll, onView, onEdit, onDelete, viewMode, loading }) => {
  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (members.length === 0) return <p className="p-4 text-center text-gray-500">No members found.</p>;

  const allSelected = members.length > 0 && members.every((m) => selectedIds.has(m.id));
  const someSelected = members.some((m) => selectedIds.has(m.id)) && !allSelected;
  const showCards = viewMode === 'card';

  return (
    <>
      {/* Card view */}
      <div className={showCards ? 'block space-y-3' : 'md:hidden space-y-3'}>
        <div className="flex items-center gap-2 px-1 pb-1 border-b">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
            aria-label="Select all"
            data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
          />
          <span className="text-sm text-gray-500">{someSelected || allSelected ? `${selectedIds.size} selected` : 'Select all'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              selected={selectedIds.has(m.id)}
              onToggle={() => onToggleSelect(m.id)}
              onView={() => onView(m)}
              onEdit={() => onEdit(m)}
              onDelete={() => onDelete(m)}
            />
          ))}
        </div>
      </div>

      {/* Table view */}
      <div className={showCards ? 'hidden' : 'hidden md:block rounded-md border'}>
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b hover:bg-muted/50">
              <th className="h-12 px-4 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all"
                  data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                />
              </th>
              <th className="h-12 px-4 text-left font-medium text-gray-500">Name</th>
              <th className="h-12 px-4 text-left font-medium text-gray-500">Email</th>
              <th className="h-12 px-4 text-left font-medium text-gray-500">Phone</th>
              <th className="h-12 px-4 text-left font-medium text-gray-500">Role</th>
              <th className="h-12 px-4 text-left font-medium text-gray-500">Status</th>
              <th className="h-12 px-4 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {members.map((m) => {
              const name = m.full_name || `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email;
              const isAdmin = m.role === 'admin' || m.role === 'super_admin';
              const displayRole = m.branch_role || m.role;
              return (
                <tr key={m.id} className={`border-b hover:bg-muted/50 ${selectedIds.has(m.id) ? 'bg-primary/5' : ''}`}>
                  <td className="p-4 w-10">
                    <Checkbox checked={selectedIds.has(m.id)} onCheckedChange={() => onToggleSelect(m.id)} />
                  </td>
                  <td className="p-4 font-medium cursor-pointer hover:underline" onClick={() => onView(m)}>{name}</td>
                  <td className="p-4">{m.email && <span className="flex items-center gap-2"><Mail className="h-3 w-3 text-gray-400" />{m.email}</span>}</td>
                  <td className="p-4">{m.phone_number && <span className="flex items-center gap-2"><Phone className="h-3 w-3 text-gray-400" />{m.phone_number}</span>}</td>
                  <td className="p-4"><Badge variant={isAdmin ? 'destructive' : 'secondary'}>{displayRole}</Badge></td>
                  <td className="p-4">{m.branch_is_active !== false ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline" className="text-gray-400">Inactive</Badge>}</td>
                  <td className="p-4 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(m)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(m)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ── Add from Users Dialog ─────────────────────────────────────────────────
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
          {/* Search input */}
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

          {/* Role selector */}
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

          {/* User list */}
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
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-blue-700">{initials}</span>
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

// ── Main Component ─────────────────────────────────────────────────────────
const ChurchMemberManagement: React.FC = () => {
  const { currentChurch, currentBranch, effectiveRole, branchRole } = useChurch();
  const { members, loading, saving, load, total, page, totalPages, limit, searchTerm, setPage, setSearchTerm, create, update, setBranchStatus, remove, removeMany, importMembers } = useMemberCrud();
  const { people, load: loadPeople } = usePeopleCrud();

  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [addOpen, setAddOpen] = useState(false);
  const [addFromUsersOpen, setAddFromUsersOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MemberDTO | null>(null);
  const [viewTarget, setViewTarget] = useState<MemberDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberDTO | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Data is loaded automatically by useQuery; load people lazily for import dialog
  useEffect(() => { if (importOpen) loadPeople(); }, [importOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () =>
    setSelectedIds(members.every((m) => selectedIds.has(m.id))
      ? new Set()
      : new Set(members.map((m) => m.id)));

  const handleBulkDelete = async () => {
    const ok = await removeMany(Array.from(selectedIds));
    if (ok) { setSelectedIds(new Set()); setBulkDeleteOpen(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await remove(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  const canManage = effectiveRole === 'admin' || effectiveRole === 'super_admin' || branchRole === 'admin' || branchRole === 'coordinator';
  console.log('[canManage debug]', {
    effectiveRole,
    branchRole,
    canManage,
    currentBranchId: currentBranch?.id,
    currentBranchMembershipRole: currentBranch?.membership_role,
    currentChurchId: currentChurch?.id,
  });
  const branchName = currentBranch?.name;
  const churchName = currentChurch?.denomination_name;
  const displayOrg = branchName ?? churchName ?? '';

  const adminCount = members.filter((m) => m.role === 'admin' || m.role === 'super_admin').length;
  const activeCount = members.filter((m) => m.branch_is_active !== false).length;

  if (!currentChurch) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-gray-500">Please select a church first.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header — matches PeopleManagement layout */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Members</h2>
          <p className="text-gray-500">
            {displayOrg ? `Manage members of ${displayOrg}` : 'Manage church members'}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => setViewMode((v) => v === 'table' ? 'card' : 'table')} title={viewMode === 'table' ? 'Card view' : 'Table view'}>
              {viewMode === 'table' ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />Import
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={async () => {
              const res = await fetchMembersApi({ page: 1, limit: 10000 });
              exportToCSV(res.data ?? []);
            }}>
              <Download className="mr-2 h-4 w-4" />Export
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />Add Member
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAddFromUsersOpen(true)}>
              <UsersRound className="mr-2 h-4 w-4" />Add from Users
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-gray-500">Total</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-gray-500">Active</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div><p className="text-2xl font-bold">{adminCount}</p><p className="text-xs text-gray-500">Admins</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed section: Members / Join Requests / Invite Links */}
      <Tabs defaultValue="members">
        <TabsList className="mb-2">
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-1.5" />Members
          </TabsTrigger>
          {canManage && (
            <>
              <TabsTrigger value="join-requests">
                <ClipboardList className="h-4 w-4 mr-1.5" />Join Requests
              </TabsTrigger>
              <TabsTrigger value="invites">
                <Link2 className="h-4 w-4 mr-1.5" />Invite Links
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ── Members tab ─────────────────────────────────────────── */}
        <TabsContent value="members">
      {/* List Card */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-medium">
                All Members {loading && <Loader2 className="inline h-4 w-4 animate-spin ml-2" />}
              </CardTitle>
              {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} disabled={saving}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedIds.size} selected
                </Button>
              )}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by name, email, phone..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MemberList
            members={members}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onView={setViewTarget}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
            viewMode={viewMode}
            loading={loading}
          />
        </CardContent>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-500">
          <span>
            {total > 0
              ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`
              : loading ? '' : 'No results'}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1 || loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages || loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
        </TabsContent>

        {/* ── Join Requests tab ────────────────────────────────────── */}
        {canManage && currentChurch && currentBranch && (
          <TabsContent value="join-requests">
            <Card>
              <CardContent className="pt-6">
                <JoinRequestsPanel churchId={currentChurch.id} branchId={currentBranch.id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Invite Links tab ─────────────────────────────────────── */}
        {canManage && currentChurch && currentBranch && (
          <TabsContent value="invites">
            <Card>
              <CardContent className="pt-6">
                <InviteLinksPanel churchId={currentChurch.id} branchId={currentBranch.id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={(data) => create({ ...data, branch_name: branchName, church_name: churchName })}
        saving={saving}
        branchName={branchName}
        churchName={churchName}
      />

      <AddFromUsersDialog
        open={addFromUsersOpen}
        onOpenChange={setAddFromUsersOpen}
        existingMemberIds={new Set(members.map((m) => m.id))}
        onAdded={load}
        churchId={currentChurch!.id}
        branchId={currentBranch?.id ?? ''}
        branchName={branchName}
        churchName={churchName}
      />

      <EditMemberDialog
        open={!!editTarget}
        onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        member={editTarget}
        onSave={update}
        onToggleBranchActive={setBranchStatus}
        saving={saving}
      />

      <MemberDetailsDialog
        open={!!viewTarget}
        onOpenChange={(open) => { if (!open) setViewTarget(null); }}
        member={viewTarget}
      />

      <ImportMembersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={importMembers}
        saving={saving}
        existingPersonEmails={people.map((p) => p.email).filter(Boolean)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Remove Member"
        description={`Remove "${deleteTarget?.full_name || deleteTarget?.email}"? They will be deactivated.`}
        onConfirm={handleDelete}
        loading={saving}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(o) => { if (!o) setBulkDeleteOpen(false); }}
        title="Remove Selected Members"
        description={`Remove ${selectedIds.size} member(s)? They will be deactivated.`}
        onConfirm={handleBulkDelete}
        loading={saving}
        confirmLabel="Remove All"
        variant="danger"
        icon={<Trash2 className="h-6 w-6 text-red-600" />}
      />
    </div>
  );
};

export default ChurchMemberManagement;
