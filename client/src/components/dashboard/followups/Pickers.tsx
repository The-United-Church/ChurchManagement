/**
 * Picker components used by follow-up dialogs:
 * - PersonOrMemberPicker: search and select either a Person (visitor) or a User (member)
 * - AssigneePicker: search and select any branch member as the assignee
 *
 * Both are async-search comboboxes built on Popover + Input.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search, User as UserIcon, Users as UsersIcon, Loader2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchPeople, fetchMembersApi, type MemberDTO } from '@/lib/api';
import type { Person } from '@/types/person';
import { cn } from '@/lib/utils';

interface MemberPickerProps {
  value?: string | null;
  onChange: (id: string | null, member: MemberDTO | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

const memberInitials = (m: { first_name?: string; last_name?: string; full_name?: string; email?: string }) => {
  const src = (m.first_name && m.last_name && `${m.first_name} ${m.last_name}`) || m.full_name || m.email || '?';
  return src
    .split(/\s+|@/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const memberLabel = (m: { first_name?: string; last_name?: string; full_name?: string; email?: string }) =>
  ((m.first_name || '') + (m.last_name ? ' ' + m.last_name : '')).trim() || m.full_name || m.email || 'Unknown';

export const AssigneePicker: React.FC<MemberPickerProps> = ({
  value,
  onChange,
  placeholder = 'Select assignee...',
  allowClear = true,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [selected, setSelected] = useState<MemberDTO | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchMembersApi({ page: 1, limit: 25, search: debounced || undefined })
      .then((res) => {
        if (!cancelled) setMembers(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debounced]);

  // Resolve initial selected member by id
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.id === value) return;
    const inList = members.find((m) => m.id === value);
    if (inList) setSelected(inList);
  }, [value, members, selected?.id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-full justify-between font-normal', className)} type="button">
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selected.profile_image || undefined} />
                <AvatarFallback className="text-[10px]">{memberInitials(selected as any)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{memberLabel(selected as any)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg"
        align="start"
      >
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input
              autoFocus
              placeholder="Search members..."
              className="h-8 pl-7 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {allowClear && value && (
            <button
              type="button"
              className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
              onClick={() => {
                setSelected(null);
                onChange(null, null);
                setOpen(false);
              }}
            >
              <X className="h-3 w-3" /> Clear assignee
            </button>
          )}
          {loading && (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!loading && members.length === 0 && (
            <div className="px-3 py-4 text-xs text-center text-gray-400">No members found</div>
          )}
          {!loading &&
            members.map((m) => (
              <button
                key={m.id}
                type="button"
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800',
                  m.id === value && 'bg-gray-100 dark:bg-gray-800',
                )}
                onClick={() => {
                  setSelected(m);
                  onChange(m.id, m);
                  setOpen(false);
                }}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={m.profile_image || undefined} />
                  <AvatarFallback className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{memberInitials(m as any)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{memberLabel(m as any)}</div>
                  {m.email && <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">{m.email}</div>}
                </div>
                {m.branch_role && (
                  <span className="text-[10px] uppercase text-gray-400 tracking-wider">{m.branch_role}</span>
                )}
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ─── PersonOrMemberPicker ───────────────────────────────────────────────────
interface PersonOrMemberValue {
  kind: 'person' | 'member';
  id: string;
  label: string;
  email?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
}

interface PersonOrMemberPickerProps {
  value: PersonOrMemberValue | null;
  onChange: (v: PersonOrMemberValue | null) => void;
  placeholder?: string;
  className?: string;
}

export const PersonOrMemberPicker: React.FC<PersonOrMemberPickerProps> = ({
  value,
  onChange,
  placeholder = 'Select person or member...',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [tab, setTab] = useState<'all' | 'visitors' | 'members'>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      tab !== 'members'
        ? fetchPeople({ page: 1, limit: 20, search: debounced || undefined })
        : Promise.resolve({ data: [] as Person[] } as any),
      tab !== 'visitors'
        ? fetchMembersApi({ page: 1, limit: 20, search: debounced || undefined })
        : Promise.resolve({ data: [] as MemberDTO[] } as any),
    ])
      .then(([pres, mres]) => {
        if (cancelled) return;
        setPeople((pres.data || []) as Person[]);
        setMembers((mres.data || []) as MemberDTO[]);
      })
      .catch(() => {
        if (cancelled) return;
        setPeople([]);
        setMembers([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, debounced, tab]);

  const items = useMemo(() => {
    const list: PersonOrMemberValue[] = [];
    if (tab !== 'members') {
      for (const p of people) {
        list.push({
          kind: 'person',
          id: p.id,
          label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unknown',
          email: p.email,
          phone: p.phone,
          imageUrl: p.profile_image,
        });
      }
    }
    if (tab !== 'visitors') {
      for (const m of members) {
        list.push({
          kind: 'member',
          id: m.id,
          label: memberLabel(m as any),
          email: m.email,
          phone: m.phone_number,
          imageUrl: m.profile_image,
        });
      }
    }
    return list;
  }, [people, members, tab]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-full justify-between font-normal', className)} type="button">
          {value ? (
            <span className="flex items-center gap-2 truncate">
              <Avatar className="h-5 w-5">
                <AvatarImage src={value.imageUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {(value.label || '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{value.label}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {value.kind === 'member' ? 'Member' : 'Visitor'}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg"
        align="start"
      >
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input
              autoFocus
              placeholder="Search by name, email, phone..."
              className="h-8 pl-7 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            {(['all', 'visitors', 'members'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={cn(
                  'px-2 py-0.5 rounded-md uppercase tracking-wider',
                  tab === t
                    ? 'bg-app-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
                )}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="px-3 py-4 text-xs text-center text-gray-400">No results</div>
          )}
          {!loading &&
            items.map((it) => (
              <button
                key={`${it.kind}-${it.id}`}
                type="button"
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800',
                  value?.id === it.id && value?.kind === it.kind && 'bg-gray-100 dark:bg-gray-800',
                )}
                onClick={() => {
                  onChange(it);
                  setOpen(false);
                }}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={it.imageUrl || undefined} />
                  <AvatarFallback className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {(it.label || '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{it.label}</div>
                  {(it.email || it.phone) && (
                    <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                      {it.email || it.phone}
                    </div>
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-wider flex items-center gap-1 text-gray-400">
                  {it.kind === 'member' ? <UsersIcon className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                  {it.kind === 'member' ? 'Member' : 'Visitor'}
                </span>
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export type { PersonOrMemberValue };
