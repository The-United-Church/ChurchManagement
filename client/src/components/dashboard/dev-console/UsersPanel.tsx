import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Search,
  Loader2,
  Download,
  Users as UsersIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  Calendar,
  Activity,
  Shield,
  CircleDot,
  X,
  Wifi,
  Timer,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { DisplayUser } from './types';
import { formatUptime } from './helpers';

interface UsersPanelProps {
  users: DisplayUser[];
  loading?: boolean;
  onlineCount?: number;
}

type SortKey = 'name' | 'email' | 'role' | 'status' | 'isOnline' | 'joinDate' | 'lastAccess' | 'totalTimeSpentSeconds';
type SortDir = 'asc' | 'desc';

const ROLE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4'];
const USERS_PAGE_SIZE = 50;

const UsersPanel: React.FC<UsersPanelProps> = ({ users, loading, onlineCount }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [presenceFilter, setPresenceFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('joinDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerUser, setDrawerUser] = useState<DisplayUser | null>(null);

  const roles = useMemo(() => {
    const set = new Set(users.map((u) => u.role).filter(Boolean));
    return Array.from(set);
  }, [users]);

  const roleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return Object.entries(counts).map(([role, count]) => ({ name: role, value: count }));
  }, [users]);

  const onlineUsers = useMemo(() => users.filter((u) => u.isOnline), [users]);
  const totalOnline = onlineCount ?? onlineUsers.length;
  const mostActiveUser = useMemo(
    () => [...users].sort((a, b) => (b.totalTimeSpentSeconds || 0) - (a.totalTimeSpentSeconds || 0))[0] || null,
    [users],
  );

  const filtered = useMemo(() => {
    let arr = users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      const matchPresence = presenceFilter === 'all' || (presenceFilter === 'online' ? u.isOnline : !u.isOnline);
      return matchSearch && matchRole && matchStatus && matchPresence;
    });

    arr = [...arr].sort((a, b) => {
      let av: string | number = (a[sortKey] || '') as string;
      let bv: string | number = (b[sortKey] || '') as string;
      if (sortKey === 'joinDate' || sortKey === 'lastAccess') {
        av = av ? new Date(av as string).getTime() : 0;
        bv = bv ? new Date(bv as string).getTime() : 0;
      } else if (sortKey === 'totalTimeSpentSeconds') {
        av = Number(a.totalTimeSpentSeconds || 0);
        bv = Number(b.totalTimeSpentSeconds || 0);
      } else if (sortKey === 'isOnline') {
        av = a.isOnline ? 1 : 0;
        bv = b.isOnline ? 1 : 0;
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [users, search, roleFilter, statusFilter, presenceFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / USERS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedUsers = useMemo(
    () => filtered.slice(currentPage * USERS_PAGE_SIZE, currentPage * USERS_PAGE_SIZE + USERS_PAGE_SIZE),
    [filtered, currentPage],
  );

  const resetPage = () => setPage(0);

  const toggleSort = (k: SortKey) => {
    resetPage();
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = pagedUsers.map((u) => u.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...visibleIds]));
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Role', 'Status', 'Presence', 'Total Time Spent', 'Joined', 'Last Access'],
      ...filtered.map((u) => [u.name, u.email, u.role, u.status, u.isOnline ? 'online' : 'offline', String(u.totalTimeSpentSeconds || 0), u.joinDate, u.lastAccess || '']),
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const recencyColor = (last?: string) => {
    if (!last) return 'text-gray-400 dark:text-zinc-600';
    const d = Date.now() - new Date(last).getTime();
    const days = d / (1000 * 60 * 60 * 24);
    if (days < 1) return 'text-emerald-400';
    if (days < 7) return 'text-blue-400';
    if (days < 30) return 'text-amber-400';
    return 'text-red-400';
  };

  const SortHeader: React.FC<{ k: SortKey; children: React.ReactNode }> = ({ k, children }) => (
    <button
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors"
    >
      {children}
      {sortKey === k ? (
        sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-emerald-400" />
            Users
          </h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{users.length} total · {filtered.length} shown</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100 text-xs font-medium transition-colors w-fit"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Stats + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-medium">Total</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 tabular-nums mt-1">{users.length}</div>
          <div className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">Registered users</div>
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-medium">Online Now</div>
          <div className="text-2xl font-semibold text-emerald-400 tabular-nums mt-1">{totalOnline}</div>
          <div className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">Connected socket sessions</div>
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-medium">Active</div>
          <div className="text-2xl font-semibold text-emerald-400 tabular-nums mt-1">
            {users.filter((u) => u.status === 'active').length}
          </div>
          <div className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
            {users.length ? Math.round((users.filter((u) => u.status === 'active').length / users.length) * 100) : 0}% of total
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-medium">Most active</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mt-1 truncate">{mostActiveUser?.name || '—'}</div>
          <div className="text-[11px] text-emerald-400 mt-1 font-mono">
            {mostActiveUser ? formatUptime(mostActiveUser.totalTimeSpentSeconds || 0) : '0m'}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-medium">By role</div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="h-16 w-16 flex-shrink-0">
              {roleDistribution.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleDistribution} dataKey="value" innerRadius={20} outerRadius={32} paddingAngle={2} stroke="none">
                      {roleDistribution.map((_, i) => (
                        <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              {roleDistribution.slice(0, 3).map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length] }} />
                  <span className="capitalize text-gray-600 dark:text-zinc-300 truncate flex-1">{d.name}</span>
                  <span className="text-gray-900 dark:text-zinc-100 tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            placeholder="Search users…"
            className="w-full bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none focus:border-gray-200 dark:focus:border-zinc-700"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); resetPage(); }}
          className="bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 rounded-md px-2.5 py-1.5 text-sm text-gray-600 dark:text-zinc-300 outline-none focus:border-gray-200 dark:focus:border-zinc-700"
        >
          <option value="all">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r} className="capitalize">{r}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
          className="bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 rounded-md px-2.5 py-1.5 text-sm text-gray-600 dark:text-zinc-300 outline-none focus:border-gray-200 dark:focus:border-zinc-700"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={presenceFilter}
          onChange={(e) => { setPresenceFilter(e.target.value); resetPage(); }}
          className="bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 rounded-md px-2.5 py-1.5 text-sm text-gray-600 dark:text-zinc-300 outline-none focus:border-gray-200 dark:focus:border-zinc-700"
        >
          <option value="all">All presence</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
          <span className="text-sm text-emerald-300">
            <span className="font-semibold">{selected.size}</span> user{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800">
              Deactivate
            </button>
            <button className="px-2.5 py-1 rounded-md text-xs font-medium border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20">
              Delete
            </button>
            <button onClick={() => setSelected(new Set())} className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-900/60">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={pagedUsers.length > 0 && pagedUsers.every((u) => selected.has(u.id))}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-emerald-500 focus:ring-emerald-500/40"
                  />
                </th>
                <th className="px-3 py-3 text-left"><SortHeader k="name">Name</SortHeader></th>
                <th className="px-3 py-3 text-left"><SortHeader k="email">Email</SortHeader></th>
                <th className="px-3 py-3 text-left"><SortHeader k="role">Role</SortHeader></th>
                <th className="px-3 py-3 text-left"><SortHeader k="status">Status</SortHeader></th>
                <th className="px-3 py-3 text-left"><SortHeader k="isOnline">Presence</SortHeader></th>
                <th className="px-3 py-3 text-left"><SortHeader k="totalTimeSpentSeconds">App Time</SortHeader></th>
                <th className="px-3 py-3 text-left"><SortHeader k="joinDate">Joined</SortHeader></th>
                <th className="px-3 py-3 text-left"><SortHeader k="lastAccess">Last Active</SortHeader></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/60 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-zinc-600 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400 dark:text-zinc-500 text-sm">No users found</td>
                </tr>
              ) : (
                pagedUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setDrawerUser(user)}
                    className={`cursor-pointer transition-colors ${
                      selected.has(user.id) ? 'bg-emerald-500/5' : 'hover:bg-gray-50/60 dark:hover:bg-zinc-900/60'
                    }`}
                  >
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        className="rounded border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-emerald-500"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-zinc-100">{user.name || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-zinc-400 font-mono text-[12px]">{user.email}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-1.5 py-0.5 text-[11px] capitalize text-gray-600 dark:text-zinc-300">
                        <Shield className="h-2.5 w-2.5" />
                        {user.role || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] ${
                          user.status === 'active'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'
                        }`}
                      >
                        <CircleDot className="h-2.5 w-2.5" />
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] ${
                          user.isOnline
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-400 dark:text-zinc-500'
                        }`}
                      >
                        {user.isOnline ? <Wifi className="h-2.5 w-2.5" /> : <CircleDot className="h-2.5 w-2.5" />}
                        {user.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-zinc-300 text-xs font-mono whitespace-nowrap">
                      {formatUptime(user.totalTimeSpentSeconds || 0)}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 dark:text-zinc-500 text-xs">
                      {user.joinDate ? format(new Date(user.joinDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-xs ${recencyColor(user.lastAccess)}`}>
                      {user.lastAccess ? formatDistanceToNow(new Date(user.lastAccess), { addSuffix: true }) : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > USERS_PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-gray-400 dark:text-zinc-500">
            Showing {currentPage * USERS_PAGE_SIZE + 1}-{Math.min((currentPage + 1) * USERS_PAGE_SIZE, filtered.length)} of {filtered.length} users
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1 rounded-md border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              Previous
            </button>
            <span className="text-xs text-gray-400 dark:text-zinc-500 font-mono">
              Page {currentPage + 1} / {totalPages}
            </span>
            <button
              disabled={currentPage + 1 >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="px-3 py-1 rounded-md border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      <Sheet open={!!drawerUser} onOpenChange={(o) => !o && setDrawerUser(null)}>
        <SheetContent className="bg-white dark:bg-zinc-950 border-gray-100 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 w-full sm:max-w-md">
          {drawerUser && (
            <>
              <SheetHeader>
                <SheetTitle className="text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-sm font-semibold text-white">
                    {(drawerUser.name || drawerUser.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-base">{drawerUser.name || '—'}</div>
                    <div className="text-xs text-gray-400 dark:text-zinc-500 font-normal font-mono">{drawerUser.email}</div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <DetailRow icon={Shield} label="Role">
                  <span className="capitalize text-gray-800 dark:text-zinc-200">{drawerUser.role}</span>
                </DetailRow>
                <DetailRow icon={CircleDot} label="Status">
                  <span className={drawerUser.isOnline ? 'text-emerald-400' : drawerUser.status === 'active' ? 'text-blue-400' : 'text-gray-400 dark:text-zinc-500'}>
                    {drawerUser.isOnline ? 'Online now' : drawerUser.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </DetailRow>
                <DetailRow icon={Timer} label="Total app time">
                  <span className="text-gray-600 dark:text-zinc-300 font-mono">{formatUptime(drawerUser.totalTimeSpentSeconds || 0)}</span>
                </DetailRow>
                <DetailRow icon={Mail} label="Email">
                  <span className="font-mono text-xs text-gray-600 dark:text-zinc-300 break-all">{drawerUser.email}</span>
                </DetailRow>
                <DetailRow icon={Calendar} label="Joined">
                  <span className="text-gray-600 dark:text-zinc-300">
                    {drawerUser.joinDate ? format(new Date(drawerUser.joinDate), 'PPP') : '—'}
                  </span>
                </DetailRow>
                <DetailRow icon={Activity} label="Last Active">
                  <span className={recencyColor(drawerUser.lastAccess)}>
                    {drawerUser.lastAccess ? formatDistanceToNow(new Date(drawerUser.lastAccess), { addSuffix: true }) : 'Never'}
                  </span>
                </DetailRow>

                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-semibold mb-2">User ID</div>
                  <div className="font-mono text-[11px] text-gray-500 dark:text-zinc-400 break-all bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded p-2">
                    {drawerUser.id}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const DetailRow: React.FC<{ icon: React.ElementType; label: string; children: React.ReactNode }> = ({ icon: Icon, label, children }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <span className="flex items-center gap-2 text-gray-400 dark:text-zinc-500 flex-shrink-0">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
    <div className="text-right min-w-0">{children}</div>
  </div>
);

export default UsersPanel;
