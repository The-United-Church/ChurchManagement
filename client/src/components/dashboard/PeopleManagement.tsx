import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Download, Upload, Plus, Search, Loader2, UserPlus, Trash2, LayoutGrid, LayoutList } from 'lucide-react';
import { fetchPeople } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePeopleCrud } from '@/hooks/usePeopleCrud';
import type { Person } from '@/types/person';
import { PERSON_IMPORT_COLUMNS } from '@/types/person';
import { useMemberCrud } from '@/hooks/useMemberCrud';
import AddPersonDialog from './AddPersonDialog';
import EditPersonDialog from './EditPersonDialog';
import ImportPeopleDialog from './ImportPeopleDialog';
import PeopleList from './PeopleList';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import PersonDetailsDialog from './PersonDetailsDialog';

const PeopleManagement = () => {
  const { people, loading, saving, total, page, totalPages, limit, searchTerm, setPage, setSearchTerm, load, create, update, remove, removeMany, importPeople, convert } = usePeopleCrud();
  const { members, load: loadMembers } = useMemberCrud();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Person | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const [convertTarget, setConvertTarget] = useState<Person | null>(null);
  const [viewTarget, setViewTarget] = useState<Person | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // Members are loaded automatically by useQuery; trigger when import/add dialog opens
  useEffect(() => { if (importOpen || addOpen) loadMembers(); }, [importOpen, addOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredPeople = people.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    return (
      name.includes(term) ||
      (p.email || '').toLowerCase().includes(term) ||
      (p.phone || '').toLowerCase().includes(term)
    );
  });

  const handleExport = () => {
    const DATE_COLS = new Set(['birthdate']);
    // Cols that Excel would mangle as numbers — force text with ="value" formula
    const TEXT_COLS = new Set(['phone']);

    const escapeCell = (value: unknown): string => {
      if (value === undefined || value === null) return '';
      let str = String(value);
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const formatCell = (col: string, raw: unknown): string => {
      if (DATE_COLS.has(col) && raw) {
        const d = new Date(raw as any);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      }
      if (TEXT_COLS.has(col) && raw !== undefined && raw !== null && String(raw) !== '') {
        // ="value" forces Excel/Sheets to render as text, not scientific notation
        return `"=""${String(raw).replace(/"/g, '""')}"""`;
      }
      return escapeCell(raw);
    };

    const header = PERSON_IMPORT_COLUMNS.join(',');
    const rows = people.map((p) =>
      PERSON_IMPORT_COLUMNS.map((col) => formatCell(col, (p as any)[col])).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'people_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await remove(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  const handleConvert = async () => {
    if (!convertTarget) return;
    const ok = await convert(convertTarget.id);
    if (ok) setConvertTarget(null);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (people.every((p) => selectedIds.has(p.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(people.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    const ok = await removeMany(Array.from(selectedIds));
    if (ok) { setSelectedIds(new Set()); setBulkDeleteOpen(false); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <HeaderSection onAdd={() => setAddOpen(true)} onImport={() => setImportOpen(true)} onExport={handleExport} viewMode={viewMode} onToggleView={() => setViewMode((v) => v === 'table' ? 'card' : 'table')} />

      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-medium">All People {loading && <Loader2 className="inline h-4 w-4 animate-spin ml-2" />}</CardTitle>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={saving}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedIds.size} selected
                </Button>
              )}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="peopleSearch"
                name="peopleSearch"
                type="search"
                autoComplete="off"
                aria-label="Search people"
                placeholder="Search by name, email, phone..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PeopleList
            people={people}
            onView={setViewTarget}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
            onConvert={setConvertTarget}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
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

       {/* Dialogs */}
       <AddPersonDialog open={addOpen} onOpenChange={setAddOpen} onSave={create} saving={saving} existingMemberEmails={members.map((m) => m.email).filter(Boolean)} />
       <EditPersonDialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }} person={editTarget} onSave={update} saving={saving} />
       <ImportPeopleDialog open={importOpen} onOpenChange={setImportOpen} onImport={importPeople} saving={saving} existingMemberEmails={members.map((m) => m.email).filter(Boolean)} />
      <PersonDetailsDialog open={!!viewTarget} onOpenChange={(o) => { if (!o) setViewTarget(null); }} person={viewTarget} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Person"
        description={`Are you sure you want to delete "${deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}` : ''}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={saving}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(o) => { if (!o) setBulkDeleteOpen(false); }}
        title="Delete Selected People"
        description={`Are you sure you want to delete ${selectedIds.size} ${selectedIds.size === 1 ? 'person' : 'people'}? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        loading={saving}
        confirmLabel="Delete All"
        variant="danger"
        icon={<Trash2 className="h-6 w-6 text-red-600" />}
      />

      <ConfirmDialog
        open={!!convertTarget}
        onOpenChange={() => setConvertTarget(null)}
        title="Convert to Member"
        description={`Convert "${convertTarget ? `${convertTarget.first_name} ${convertTarget.last_name}` : ''}" to a member? A user account will be created and a password will be sent to their email.`}
        onConfirm={handleConvert}
        loading={saving}
        confirmLabel="Convert"
        variant="primary"
        icon={<UserPlus className="h-6 w-6 text-app-primary" />}
      />
    </div>
  );
};

export default PeopleManagement;

/* ─── Header sub-component ────────────────────────────────────────────── */
const HeaderSection: React.FC<{ onAdd: () => void; onImport: () => void; onExport: () => void; viewMode: 'table' | 'card'; onToggleView: () => void }> = ({ onAdd, onImport, onExport, viewMode, onToggleView }) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
    <div>
      <h2 className="text-2xl font-bold tracking-tight">People</h2>
      <p className="text-gray-500">Manage your church members and visitors.</p>
    </div>
     <div className="flex flex-wrap gap-2 items-center">
       <Button variant="outline" size="sm" onClick={onToggleView} title={viewMode === 'table' ? 'Card view' : 'Table view'}>
         {viewMode === 'table' ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
       </Button>
       <Button size="sm" className="bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground" onClick={onImport}><Upload className="mr-2 h-4 w-4" />Import</Button>
       <Button size="sm" className="bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground" onClick={onExport}><Download className="mr-2 h-4 w-4" />Export</Button>
      <Button size="sm" className="bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Add Person</Button>
     </div>
  </div>
);
