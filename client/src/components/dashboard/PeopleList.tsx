import React from 'react';
import type { Person } from '@/types/person';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, Mail, Phone, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PeopleListProps {
  people: Person[];
  onEdit: (person: Person) => void;
  onDelete: (person: Person) => void;
  onConvert: (person: Person) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  viewMode?: 'table' | 'card';
}

function fullName(p: Person) {
  return `${p.first_name} ${p.last_name}`;
}

const PeopleList: React.FC<PeopleListProps> = ({ people, onEdit, onDelete, onConvert, selectedIds, onToggleSelect, onToggleSelectAll, viewMode }) => {
  console.log('Rendering PeopleList with people:', people);
  if (people.length === 0) {
    return <p className="p-4 text-center text-gray-500">No people found.</p>;
  }

  const allSelected = people.length > 0 && people.every((p) => selectedIds.has(p.id));
  const someSelected = people.some((p) => selectedIds.has(p.id)) && !allSelected;

  const showCards = viewMode === 'card';
  const showTable = viewMode === 'table';

  return (
    <>
      {/* Card view: always on mobile, or when toggled */}
      <div className={showTable ? 'hidden' : showCards ? 'block' : 'md:hidden'}>
        <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 pb-1 border-b">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
            aria-label="Select all"
            data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
          />
          <span className="text-sm text-gray-500">
            {someSelected || allSelected ? `${selectedIds.size} selected` : 'Select all'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {people.map((p) => (
            <MobileCard
              key={p.id}
              person={p}
              onEdit={onEdit}
              onDelete={onDelete}
              onConvert={onConvert}
              selected={selectedIds.has(p.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
        </div>
      </div>
      {/* Table view: always on desktop, or when toggled */}
      <div className={showCards ? 'hidden' : showTable ? 'block rounded-md border' : 'hidden md:block rounded-md border'}>
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
              <th className="h-12 px-4 text-left font-medium text-gray-500">Gender</th>
              <th className="h-12 px-4 text-left font-medium text-gray-500">Status</th>
              <th className="h-12 px-4 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {people.map((p) => (
              <DesktopRow
                key={p.id}
                person={p}
                onEdit={onEdit}
                onDelete={onDelete}
                onConvert={onConvert}
                selected={selectedIds.has(p.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PeopleList;

/* ─── Sub-components ──────────────────────────────────────────────────── */

const MobileCard: React.FC<{ person: Person; onEdit: (p: Person) => void; onDelete: (p: Person) => void; onConvert: (p: Person) => void; selected: boolean; onToggleSelect: (id: string) => void }> = ({ person, onEdit, onDelete, onConvert, selected, onToggleSelect }) => (
  <Card className={`p-4 space-y-3 transition-colors ${selected ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
    <div className="flex justify-between items-start">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(person.id)}
          aria-label={`Select ${person.first_name} ${person.last_name}`}
          className="mt-0.5"
        />
        <div>
          <h3 className="font-semibold">{fullName(person)}</h3>
          {person.converted_user_id && <Badge variant="secondary" className="text-xs mt-1">Member</Badge>}
        </div>
      </div>
      <ActionButtons person={person} onEdit={onEdit} onDelete={onDelete} onConvert={onConvert} />
    </div>
    <div className="space-y-2 text-sm text-gray-600">
      {person.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-gray-400" /><span>{person.email}</span></div>}
      {person.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-gray-400" /><span>{person.phone}</span></div>}
    </div>
  </Card>
);

const DesktopRow: React.FC<{ person: Person; onEdit: (p: Person) => void; onDelete: (p: Person) => void; onConvert: (p: Person) => void; selected: boolean; onToggleSelect: (id: string) => void }> = ({ person, onEdit, onDelete, onConvert, selected, onToggleSelect }) => (
  <tr className={`border-b hover:bg-muted/50 ${selected ? 'bg-primary/5' : ''}`}>
    <td className="p-4 w-10">
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggleSelect(person.id)}
        aria-label={`Select ${person.first_name} ${person.last_name}`}
      />
    </td>
    <td className="p-4 font-medium">{fullName(person)}</td>
    <td className="p-4">{person.email && <span className="flex items-center gap-2"><Mail className="h-3 w-3 text-gray-400" />{person.email}</span>}</td>
    <td className="p-4">{person.phone && <span className="flex items-center gap-2"><Phone className="h-3 w-3 text-gray-400" />{person.phone}</span>}</td>
    <td className="p-4 capitalize">{person.gender || '—'}</td>
    <td className="p-4">{person.converted_user_id ? <Badge variant="secondary">Member</Badge> : <Badge variant="outline">Person</Badge>}</td>
    <td className="p-4 text-right"><ActionButtons person={person} onEdit={onEdit} onDelete={onDelete} onConvert={onConvert} /></td>
  </tr>
);

const ActionButtons: React.FC<{ person: Person; onEdit: (p: Person) => void; onDelete: (p: Person) => void; onConvert: (p: Person) => void }> = ({ person, onEdit, onDelete, onConvert }) => (
  <div className="flex gap-1">
    {!person.converted_user_id && (
      <Button variant="ghost" size="icon" className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50" title="Convert to Member" onClick={() => onConvert(person)}>
        <UserPlus className="h-4 w-4" />
      </Button>
    )}
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(person)}>
      <Edit className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(person)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
);
