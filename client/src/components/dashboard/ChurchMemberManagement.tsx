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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
  User,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { useChurch } from '@/components/church/ChurchProvider';
import { useMemberCrud } from '@/hooks/useMemberCrud';
import type { MemberDTO } from '@/hooks/useMemberCrud';
import AddMemberDialog from './AddMemberDialog';
import ImportMembersDialog from './ImportMembersDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';

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
  const cols = ['full_name', 'email', 'phone_number', 'role', 'is_active'];
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
  onSave: (id: string, data: { full_name?: string; role?: string; is_active?: boolean }) => Promise<boolean>;
  saving?: boolean;
}

const EditMemberDialog: React.FC<EditMemberDialogProps> = ({ open, onOpenChange, member, onSave, saving }) => {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('member');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (member) {
      setFullName(member.full_name || `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim());
      setRole(member.role || 'member');
      setIsActive(member.is_active !== false);
    }
  }, [member]);

  const handleSave = async () => {
    if (!member) return;
    const ok = await onSave(member.id, { full_name: fullName, role, is_active: isActive });
    if (ok) onOpenChange(false);
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
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
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

// ── View Member Dialog ─────────────────────────────────────────────────────
const ViewMemberDialog: React.FC<{ member: MemberDTO | null; onClose: () => void }> = ({ member, onClose }) => {
  if (!member) return null;
  const name = member.full_name || `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() || member.email;
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <Dialog open={!!member} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" /> Member Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-blue-700">{initials}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-base">{name}</p>
              <Badge variant={member.role === 'admin' || member.role === 'super_admin' ? 'destructive' : 'secondary'} className="text-xs mt-1">
                {member.role}
              </Badge>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="h-4 w-4 flex-shrink-0" /><span>{member.email}</span>
            </div>
            {member.phone_number && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4 flex-shrink-0" /><span>{member.phone_number}</span>
              </div>
            )}
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${member.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {member.is_active !== false ? '● Active' : '○ Inactive'}
            </span>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
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

  return (
    <Card className={`p-4 space-y-3 transition-colors ${selected ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-0.5" onClick={(e) => e.stopPropagation()} />
          <div>
            <h3 className="font-semibold cursor-pointer hover:underline" onClick={onView}>{name}</h3>
            <Badge variant={isAdmin ? 'destructive' : 'secondary'} className="text-xs mt-1">{member.role}</Badge>
            {member.is_active === false && <Badge variant="outline" className="text-xs mt-1 ml-1 text-gray-400">inactive</Badge>}
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
}

const MemberList: React.FC<MemberListProps> = ({ members, selectedIds, onToggleSelect, onToggleSelectAll, onView, onEdit, onDelete, viewMode }) => {
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
              return (
                <tr key={m.id} className={`border-b hover:bg-muted/50 ${selectedIds.has(m.id) ? 'bg-primary/5' : ''}`}>
                  <td className="p-4 w-10">
                    <Checkbox checked={selectedIds.has(m.id)} onCheckedChange={() => onToggleSelect(m.id)} />
                  </td>
                  <td className="p-4 font-medium cursor-pointer hover:underline" onClick={() => onView(m)}>{name}</td>
                  <td className="p-4">{m.email && <span className="flex items-center gap-2"><Mail className="h-3 w-3 text-gray-400" />{m.email}</span>}</td>
                  <td className="p-4">{m.phone_number && <span className="flex items-center gap-2"><Phone className="h-3 w-3 text-gray-400" />{m.phone_number}</span>}</td>
                  <td className="p-4"><Badge variant={isAdmin ? 'destructive' : 'secondary'}>{m.role}</Badge></td>
                  <td className="p-4">{m.is_active !== false ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline" className="text-gray-400">Inactive</Badge>}</td>
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

// ── Main Component ─────────────────────────────────────────────────────────
const ChurchMemberManagement: React.FC = () => {
  const { currentChurch, currentBranch, effectiveRole } = useChurch();
  const { members, loading, saving, load, create, update, remove, removeMany, importMembers } = useMemberCrud();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MemberDTO | null>(null);
  const [viewTarget, setViewTarget] = useState<MemberDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberDTO | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => { load(); }, [load, currentBranch]);

  const filtered = members.filter((m) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const name = (m.full_name || `${m.first_name ?? ''} ${m.last_name ?? ''}`).toLowerCase();
    return name.includes(term) || m.email.toLowerCase().includes(term) || (m.phone_number || '').includes(term);
  });

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () =>
    setSelectedIds(filtered.every((m) => selectedIds.has(m.id))
      ? new Set()
      : new Set(filtered.map((m) => m.id)));

  const handleBulkDelete = async () => {
    const ok = await removeMany(Array.from(selectedIds));
    if (ok) { setSelectedIds(new Set()); setBulkDeleteOpen(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await remove(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  const canManage = effectiveRole === 'admin' || effectiveRole === 'super_admin';
  const branchName = currentBranch?.name;
  const churchName = currentChurch?.denomination_name;
  const displayOrg = branchName ?? churchName ?? '';

  const adminCount = members.filter((m) => m.role === 'admin' || m.role === 'super_admin').length;
  const activeCount = members.filter((m) => m.is_active !== false).length;

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
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => exportToCSV(members)}>
              <Download className="mr-2 h-4 w-4" />Export
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />Add Member
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
            <div><p className="text-2xl font-bold">{members.length}</p><p className="text-xs text-gray-500">Total</p></div>
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

      {/* List Card — matches PeopleManagement h-[600px] */}
      <Card className="flex flex-col h-[600px]">
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto">
          <MemberList
            members={filtered}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onView={setViewTarget}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
            viewMode={viewMode}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={(data) => create({ ...data, branch_name: branchName, church_name: churchName })}
        saving={saving}
        branchName={branchName}
        churchName={churchName}
      />

      <EditMemberDialog
        open={!!editTarget}
        onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        member={editTarget}
        onSave={update}
        saving={saving}
      />

      <ViewMemberDialog
        member={viewTarget}
        onClose={() => setViewTarget(null)}
      />

      <ImportMembersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={importMembers}
        saving={saving}
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
