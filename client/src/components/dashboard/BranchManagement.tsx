import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  GitBranch,
  Plus,
  Search,
  MapPin,
  User,
  Star,
  Trash2,
  Edit,
  LayoutGrid,
  LayoutList,
  Loader2,
  Building,
} from 'lucide-react';
import { format } from 'date-fns';
import { fetchChurches } from '@/lib/api';
import type { ChurchDTO, BranchDTO } from '@/lib/api';
import { useBranchCrud } from '@/hooks/useBranchCrud';
import BranchFormDialog from '@/components/church/BranchFormDialog';
import ChurchViewDialog from '@/components/church/ChurchViewDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useChurch } from '@/components/church/ChurchProvider';

const BranchManagement: React.FC = () => {
  const { currentChurch, effectiveRole } = useChurch();
  const isAdmin = effectiveRole === 'admin';
  const isSuperAdmin = effectiveRole === 'super_admin';

  const [denominations, setDenominations] = useState<ChurchDTO[]>([]);
  const [selectedDenomId, setSelectedDenomId] = useState<string | null>(null);
  const [denomLoading, setDenomLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BranchDTO | null>(null);
  const [viewTarget, setViewTarget] = useState<ChurchDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BranchDTO | null>(null);

  const { branches, loading, saving, load, create, update, remove } = useBranchCrud(selectedDenomId);

  // For admin: use their church directly; for superadmin: fetch all denominations
  useEffect(() => {
    if (isAdmin) {
      if (currentChurch) {
        setDenominations([currentChurch as unknown as ChurchDTO]);
        setSelectedDenomId(currentChurch.id);
      } else {
        setDenominations([]);
        setSelectedDenomId(null);
      }
      setDenomLoading(false);
    } else {
      // superadmin: load all denominations
      setDenomLoading(true);
      fetchChurches()
        .then((res) => {
          const list = res.data ?? [];
          setDenominations(list);
          if (list.length > 0) setSelectedDenomId(list[0].id);
        })
        .catch(() => {})
        .finally(() => setDenomLoading(false));
    }
  }, [isAdmin, currentChurch]);

  useEffect(() => { load(); }, [load]);

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.pastor_name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedDenom = denominations.find((d) => d.id === selectedDenomId) ?? null;

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (b: BranchDTO) => { setEditTarget(b); setFormOpen(true); };
  const openDelete = (b: BranchDTO) => setDeleteTarget(b);

  const handleFormSubmit = async (data: any) => {
    const ok = editTarget ? await update(editTarget.id, data) : await create(data);
    if (ok) setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await remove(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  if (denomLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (denominations.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Building className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No denomination found</p>
            <p className="text-sm">
              {isAdmin
                ? 'Your denomination could not be loaded. Please try refreshing.'
                : 'Register a denomination first before adding branches.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <Header
        onAdd={openCreate}
        viewMode={viewMode}
        onViewChange={setViewMode}
        disabled={!selectedDenomId}
      />

      {/* Denomination selector */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Denomination:</label>
        {isSuperAdmin ? (
          <Select value={selectedDenomId ?? ''} onValueChange={setSelectedDenomId}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Select a denomination" />
            </SelectTrigger>
            <SelectContent>
              {denominations.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.denomination_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm font-semibold text-gray-900">
            {selectedDenom?.denomination_name ?? '—'}
          </span>
        )}
        {selectedDenom && (
          <Badge variant="outline" className="text-xs">{branches.length} branch{branches.length !== 1 ? 'es' : ''}</Badge>
        )}
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'card' ? (
        <CardView branches={filtered} onEdit={openEdit} onDelete={openDelete} />
      ) : (
        <TableView branches={filtered} onEdit={openEdit} onDelete={openDelete} />
      )}

      <BranchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        initial={editTarget}
        loading={saving}
      />
      <ChurchViewDialog
        open={!!viewTarget}
        onOpenChange={() => setViewTarget(null)}
        church={viewTarget}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Branch"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={saving}
      />
    </div>
  );
};

/* ─── Sub-components ──────────────────────────────────────────────────────── */

const Header: React.FC<{
  onAdd: () => void;
  viewMode: 'card' | 'table';
  onViewChange: (m: 'card' | 'table') => void;
  disabled: boolean;
}> = ({ onAdd, viewMode, onViewChange, disabled }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Branches</h2>
      <p className="text-sm text-gray-500 mt-1">Manage local church branches for each denomination</p>
    </div>
    <div className="flex items-center gap-2">
      <div className="border rounded-md flex">
        <Button
          variant={viewMode === 'card' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-9 w-9 rounded-r-none"
          onClick={() => onViewChange('card')}
          title="Card view"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'table' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-9 w-9 rounded-l-none"
          onClick={() => onViewChange('table')}
          title="Table view"
        >
          <LayoutList className="h-4 w-4" />
        </Button>
      </div>
      <Button onClick={onAdd} disabled={disabled}>
        <Plus className="h-4 w-4 mr-2" />
        Add Branch
      </Button>
    </div>
  </div>
);

const SearchBar: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="relative mb-6">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
    <Input className="pl-10" placeholder="Search branches or pastors..." value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const EmptyState: React.FC = () => (
  <Card>
    <CardContent className="p-8 text-center text-gray-500">
      <GitBranch className="h-12 w-12 mx-auto mb-3 text-gray-300" />
      <p className="font-medium">No branches found</p>
      <p className="text-sm">Add a branch for this denomination to get started</p>
    </CardContent>
  </Card>
);

interface ListProps {
  branches: BranchDTO[];
  onEdit: (b: BranchDTO) => void;
  onDelete: (b: BranchDTO) => void;
}

const CardView: React.FC<ListProps> = ({ branches, onEdit, onDelete }) => {
  if (branches.length === 0) return <EmptyState />;
  return (
    <div className="space-y-3">
      {branches.map((branch) => (
        <Card key={branch.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <GitBranch className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                    {branch.is_headquarters && (
                      <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                        <Star className="h-2.5 w-2.5 mr-1" />HQ
                      </Badge>
                    )}
                  </div>
                  {branch.pastor_name && (
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                      <User className="h-3 w-3" /> {branch.pastor_name}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {(branch.city || branch.state) && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {[branch.city, branch.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {branch.country && <Badge variant="outline" className="text-[10px]">{branch.country}</Badge>}
                  </div>
                </div>
              </div>
              <ActionButtons branch={branch} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const TableView: React.FC<ListProps> = ({ branches, onEdit, onDelete }) => {
  if (branches.length === 0) return <EmptyState />;
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch Name</TableHead>
                <TableHead className="hidden sm:table-cell">Pastor</TableHead>
                <TableHead className="hidden md:table-cell">City</TableHead>
                <TableHead className="hidden lg:table-cell">Country</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {branch.name}
                      {branch.is_headquarters && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">HQ</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{branch.pastor_name || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">{branch.city || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{branch.country || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {branch.created_at ? format(new Date(branch.created_at), 'PP') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionButtons branch={branch} onEdit={onEdit} onDelete={onDelete} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

const ActionButtons: React.FC<{
  branch: BranchDTO;
  onEdit: (b: BranchDTO) => void;
  onDelete: (b: BranchDTO) => void;
}> = ({ branch, onEdit, onDelete }) => (
  <div className="flex gap-1">
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(branch)} title="Edit">
      <Edit className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => onDelete(branch)} title="Delete">
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
);

export default BranchManagement;
