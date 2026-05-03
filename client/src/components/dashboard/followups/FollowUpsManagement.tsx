import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  X,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Columns3,
  Calendar as CalendarIconLucide,
  BarChart3,
  UserCheck,
  Shuffle,
} from 'lucide-react';
import { useChurch } from '@/components/church/ChurchProvider';
import { useAuth } from '@/components/auth/AuthProvider';
import { useFollowUpsCrud } from '@/hooks/useFollowUpsCrud';
import { FollowUpList } from './FollowUpList';
import { FollowUpKanban, FollowUpCalendar } from './FollowUpKanbanCalendar';
import { FollowUpAnalytics } from './FollowUpAnalytics';
import { FollowUpFilterBar } from './FollowUpFilterBar';
import { AddFollowUpDialog, EditFollowUpDialog } from './FollowUpDialogs';
import { FollowUpDetailsDialog } from './FollowUpDetailsDialog';
import { AssigneePicker } from './Pickers';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  type FollowUp,
  type FollowUpStatus,
} from '@/types/follow-up';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'list' | 'kanban' | 'calendar' | 'analytics';

const FollowUpsManagement: React.FC = () => {
  const { currentBranch, branchRole, effectiveRole } = useChurch();
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    followUps,
    total,
    page,
    totalPages,
    limit,
    loading,
    saving,
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    setPage,
    create,
    update,
    remove,
    assignMany,
    setStatusMany,
    autoAssign,
  } = useFollowUpsCrud();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FollowUp | null>(null);
  const [viewTarget, setViewTarget] = useState<FollowUp | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FollowUp | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canManage =
    effectiveRole === 'super_admin' ||
    effectiveRole === 'admin' ||
    branchRole === 'admin' ||
    branchRole === 'coordinator';

  // "My follow-ups" filter
  const visibleFollowUps = useMemo(() => {
    if (scope === 'mine' && user?.id) {
      return followUps.filter((f) => f.assigned_to === user.id);
    }
    return followUps;
  }, [followUps, scope, user?.id]);

  if (!currentBranch) {
    return (
      <div className="p-4 md:p-6">
        <h2 className="text-xl font-bold mb-2">Follow-ups</h2>
        <p className="text-sm text-muted-foreground">Select a branch to view follow-ups.</p>
      </div>
    );
  }

  const handleStatusChange = async (id: string, status: FollowUpStatus) => {
    await setStatusMany([id], status);
    setViewTarget(null);
  };

  const handleConvert = (fu: FollowUp) => {
    if (fu.person_id) {
      navigate(`/dashboard?section=people&convertPersonId=${fu.person_id}`);
    }
  };

  const selectedCount = selectedIds.size;

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    const ok = await remove(Array.from(selectedIds));
    if (ok) {
      clearSelection();
      setBulkDeleteOpen(false);
    }
  };

  const handleBulkAssign = async () => {
    const ok = await assignMany(Array.from(selectedIds), bulkAssignee);
    if (ok) {
      clearSelection();
      setBulkAssignOpen(false);
      setBulkAssignee(null);
    }
  };

  const handleBulkComplete = async () => {
    const ok = await setStatusMany(Array.from(selectedIds), 'completed');
    if (ok) clearSelection();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Follow-ups</h2>
          <p className="text-sm text-muted-foreground">
            Track outreach to visitors and members across {currentBranch.name}
          </p>
        </div>
        <Button
          className="bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          New follow-up
        </Button>
      </div>

      {/* Tabs (view mode) */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList className="grid grid-cols-4 max-w-lg">
          <TabsTrigger value="list" className="text-xs">
            <LayoutList className="h-3.5 w-3.5 mr-1" /> List
          </TabsTrigger>
          <TabsTrigger value="kanban" className="text-xs">
            <Columns3 className="h-3.5 w-3.5 mr-1" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs">
            <CalendarIconLucide className="h-3.5 w-3.5 mr-1" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode !== 'analytics' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by person, member, notes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={scope} onValueChange={(v) => setScope(v as 'all' | 'mine')}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All follow-ups</SelectItem>
                <SelectItem value="mine">
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    My follow-ups
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <FollowUpFilterBar filters={filters} onChange={setFilters} />
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => autoAssign()} disabled={saving} className="h-9 gap-2">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}
                Auto-assign
              </Button>
            )}
          </div>

          {/* Bulk action bar */}
          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-md border bg-app-primary/5 border-app-primary/30">
              <span className="text-xs font-medium">
                {selectedCount} selected
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkComplete}
                disabled={saving}
                className="border-green-500 text-green-700"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark complete
              </Button>
              {canManage && (
                <Button size="sm" variant="outline" onClick={() => setBulkAssignOpen(true)} disabled={saving}>
                  Assign
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={saving}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && viewMode === 'list' && (
            <FollowUpList
              followUps={visibleFollowUps}
              loading={loading}
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              onView={setViewTarget}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
              onComplete={(fu) => handleStatusChange(fu.id, 'completed')}
            />
          )}

          {!loading && viewMode === 'kanban' && (
            <FollowUpKanban
              followUps={visibleFollowUps}
              onView={setViewTarget}
              onStatusChange={(id, status) => setStatusMany([id], status)}
            />
          )}

          {!loading && viewMode === 'calendar' && (
            <FollowUpCalendar followUps={visibleFollowUps} onView={setViewTarget} />
          )}

          {/* Pagination (only in list view) */}
          {viewMode === 'list' && totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs px-2">
                  Page {page} / {totalPages}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === 'analytics' && <FollowUpAnalytics />}

      {/* Dialogs */}
      <AddFollowUpDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={create}
        saving={saving}
      />
      <EditFollowUpDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        followUp={editTarget}
        onSave={update}
        saving={saving}
      />
      <FollowUpDetailsDialog
        open={!!viewTarget}
        onOpenChange={(o) => !o && setViewTarget(null)}
        followUp={viewTarget}
        onEdit={(fu) => {
          setViewTarget(null);
          setEditTarget(fu);
        }}
        onConvert={handleConvert}
        onStatusChange={handleStatusChange}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete follow-up?"
        description="This action cannot be undone. All contact logs for this follow-up will also be deleted."
        confirmLabel="Delete"
        variant="danger"
        loading={saving}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const ok = await remove([deleteTarget.id]);
          if (ok) setDeleteTarget(null);
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedCount} follow-up${selectedCount === 1 ? '' : 's'}?`}
        description="This action cannot be undone."
        confirmLabel="Delete all"
        variant="danger"
        loading={saving}
        onConfirm={handleBulkDelete}
      />

      {/* Bulk assign dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign {selectedCount} follow-up{selectedCount === 1 ? '' : 's'}
            </DialogTitle>
            <DialogDescription>
              Choose any branch member to take ownership. Leave blank to unassign.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <AssigneePicker value={bulkAssignee} onChange={(id) => setBulkAssignee(id)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground"
              onClick={handleBulkAssign}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FollowUpsManagement;
