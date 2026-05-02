import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchActivities, fetchRecentActivities } from '@/lib/api';
import { format } from 'date-fns';
import {
  Activity as ActivityIcon,
  Download,
  Radio,
  Pause,
  Play,
  Plus,
  X,
  Copy,
  Check,
  Filter as FilterIcon,
  ChevronDown,
} from 'lucide-react';
import { actionColorsDark, actionAccent, timeAgo } from './helpers';
import type { ActivityLog } from './types';

const PAGE_SIZE = 25;
const LIVE_POLL_MS = 3000;

const ACTION_OPTIONS = [
  'create', 'update', 'delete', 'approve', 'reject',
  'lock', 'unlock', 'dispatch', 'assign', 'status_change',
  'login', 'register', 'logout',
];

const ENTITY_OPTIONS = [
  'user', 'church', 'branch', 'auth', 'approval', 'asset',
  'inventory', 'work_order', 'maintenance_schedule', 'vehicle',
  'inspection', 'fuel_log', 'technician', 'vendor',
  'cost_record', 'vessel', 'report', 'event', 'attendance',
];

interface FilterRule {
  id: string;
  type: 'action' | 'entity';
  value: string;
}

const ActivityPanel: React.FC = () => {
  const [mode, setMode] = useState<'paginated' | 'live'>('paginated');

  // Paginated mode
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Live mode buffer
  const [liveLogs, setLiveLogs] = useState<ActivityLog[]>([]);
  const [paused, setPaused] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());

  // Filters (multi-filter builder)
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Build query params from active filters
  const filterParams = useMemo(() => {
    // Backend supports single action + single entityType. We send the first of each type.
    const action = filters.find((f) => f.type === 'action')?.value;
    const entityType = filters.find((f) => f.type === 'entity')?.value;
    const params: Record<string, string> = {};
    if (action) params.action = action;
    if (entityType) params.entityType = entityType;
    return params;
  }, [filters]);

  const loadPaginated = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {
      ...filterParams,
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    };
    try {
      const res = await fetchActivities(params);
      setActivities(res.data);
      setTotal(res.total);
    } catch { /* silent */ }
    setLoading(false);
  }, [filterParams, page]);

  useEffect(() => {
    if (mode === 'paginated') loadPaginated();
  }, [mode, loadPaginated]);

  // Live polling
  useEffect(() => {
    if (mode !== 'live' || paused) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetchRecentActivities(50);
        if (cancelled) return;
        const fresh = (res.data as ActivityLog[]).filter((l) => !seenIds.current.has(l.id));
        fresh.forEach((l) => seenIds.current.add(l.id));
        if (fresh.length > 0) {
          setLiveLogs((prev) => [...prev, ...fresh.reverse()].slice(-300));
        }
      } catch { /* silent */ }
    };
    tick();
    const t = setInterval(tick, LIVE_POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [mode, paused]);

  // Apply client-side filters in live mode (since polling fetches all)
  const filteredLive = useMemo(() => {
    const actionVals = filters.filter((f) => f.type === 'action').map((f) => f.value);
    const entityVals = filters.filter((f) => f.type === 'entity').map((f) => f.value);
    return liveLogs.filter((l) => {
      if (actionVals.length > 0 && !actionVals.includes(l.action?.toLowerCase())) return false;
      if (entityVals.length > 0 && !entityVals.includes(l.entityType?.toLowerCase())) return false;
      return true;
    });
  }, [liveLogs, filters]);

  const switchMode = (m: 'paginated' | 'live') => {
    setMode(m);
    if (m === 'live') {
      setLiveLogs([]);
      seenIds.current.clear();
    }
  };

  const addFilter = (type: 'action' | 'entity', value: string) => {
    setFilters((prev) => [...prev, { id: `${type}-${value}-${Date.now()}`, type, value }]);
    setFilterMenuOpen(false);
    setPage(0);
  };

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
    setPage(0);
  };

  const exportData = (fmt: 'json' | 'csv') => {
    const data = mode === 'live' ? filteredLive : activities;
    if (fmt === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `activity-${new Date().toISOString().split('T')[0]}.json`);
    } else {
      const rows = [
        ['Timestamp', 'Action', 'Entity', 'Description', 'User'],
        ...data.map((a) => [a.createdAt, a.action, a.entityType, a.description, a.user?.email || 'system']),
      ];
      const csv = rows.map((r) => r.map((c) => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadBlob(blob, `activity-${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const copyEntry = async (log: ActivityLog) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      setCopiedId(log.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch { /* ignore */ }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const visibleLogs = mode === 'live' ? filteredLive : activities;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-emerald-400" />
            Activity Logs
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {mode === 'live'
              ? `Live stream · ${filteredLive.length} of ${liveLogs.length} buffered`
              : `${total.toLocaleString()} total record${total !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
            <button
              onClick={() => switchMode('paginated')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === 'paginated' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Browse
            </button>
            <button
              onClick={() => switchMode('live')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                mode === 'live' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Radio className="h-3 w-3" />
              Live
            </button>
          </div>

          {mode === 'live' && (
            <button
              onClick={() => setPaused((p) => !p)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium ${
                paused
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
          )}

          {/* Export */}
          <ExportMenu onExport={exportData} />
        </div>
      </div>

      {/* Filter builder */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1">
            <FilterIcon className="h-3 w-3" /> Filters
          </span>
          {filters.length === 0 && (
            <span className="text-xs text-zinc-600">No filters · showing all events</span>
          )}
          {filters.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-[11px] font-mono"
              style={{ color: f.type === 'action' ? actionAccent[f.value] || '#a1a1aa' : '#a1a1aa' }}
            >
              <span className="text-zinc-500">{f.type}:</span>
              <span>{f.value}</span>
              <button onClick={() => removeFilter(f.id)} className="text-zinc-500 hover:text-red-400 ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <FilterDropdown
            open={filterMenuOpen}
            onToggle={() => setFilterMenuOpen((v) => !v)}
            onAdd={addFilter}
            existing={filters.map((f) => `${f.type}:${f.value}`)}
          />
          {filters.length > 0 && (
            <button onClick={() => { setFilters([]); setPage(0); }} className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-300">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Display: terminal in live, table in paginated */}
      {mode === 'live' ? (
        <LiveTerminal logs={visibleLogs} paused={paused} onCopy={copyEntry} copiedId={copiedId} />
      ) : (
        <PaginatedTable logs={visibleLogs} loading={loading} onCopy={copyEntry} copiedId={copiedId} />
      )}

      {mode === 'paginated' && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800"
            >
              Previous
            </button>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ExportMenu: React.FC<{ onExport: (f: 'json' | 'csv') => void }> = ({ onExport }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs font-medium"
      >
        <Download className="h-3.5 w-3.5" />
        Export
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-10 rounded-md border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden min-w-[120px]">
          <button onMouseDown={() => onExport('json')} className="block w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900">
            Export as JSON
          </button>
          <button onMouseDown={() => onExport('csv')} className="block w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900">
            Export as CSV
          </button>
        </div>
      )}
    </div>
  );
};

const FilterDropdown: React.FC<{
  open: boolean;
  onToggle: () => void;
  onAdd: (type: 'action' | 'entity', value: string) => void;
  existing: string[];
}> = ({ open, onToggle, onAdd, existing }) => (
  <div className="relative">
    <button
      onClick={onToggle}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-[11px]"
    >
      <Plus className="h-3 w-3" />
      Add filter
    </button>
    {open && (
      <div className="absolute left-0 mt-1 z-10 rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl p-3 min-w-[280px] max-h-[320px] overflow-y-auto">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">Action</div>
        <div className="flex flex-wrap gap-1 mb-3">
          {ACTION_OPTIONS.map((a) => {
            const used = existing.includes(`action:${a}`);
            return (
              <button
                key={a}
                disabled={used}
                onClick={() => onAdd('action', a)}
                className="rounded border px-1.5 py-0.5 text-[11px] font-mono disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{
                  borderColor: actionAccent[a] || 'rgb(63 63 70)',
                  color: actionAccent[a] || 'rgb(161 161 170)',
                  backgroundColor: `${actionAccent[a] || '#52525b'}15`,
                }}
              >
                {a}
              </button>
            );
          })}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">Entity</div>
        <div className="flex flex-wrap gap-1">
          {ENTITY_OPTIONS.map((e) => {
            const used = existing.includes(`entity:${e}`);
            return (
              <button
                key={e}
                disabled={used}
                onClick={() => onAdd('entity', e)}
                className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[11px] font-mono text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>
    )}
  </div>
);

const LiveTerminal: React.FC<{
  logs: ActivityLog[];
  paused: boolean;
  onCopy: (l: ActivityLog) => void;
  copiedId: string | null;
}> = ({ logs, paused, onCopy, copiedId }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/60 overflow-hidden shadow-2xl">
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800 bg-zinc-950">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-[11px] font-mono text-zinc-500">~/dev-console/activity --tail</span>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-zinc-600">
          <span className={`h-1.5 w-1.5 rounded-full ${paused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
          {paused ? 'PAUSED' : 'STREAMING'}
        </span>
      </div>
      <div ref={ref} className="h-[520px] overflow-y-auto font-mono text-[12px] leading-6 px-4 py-3">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
            {paused ? 'Stream paused' : 'Waiting for events…'}
          </div>
        ) : (
          logs.map((log) => {
            const action = log.action?.toLowerCase() || 'other';
            const accent = actionAccent[action] || '#71717a';
            const ts = new Date(log.createdAt);
            const timeStr = ts.toISOString().split('T')[1].split('.')[0];
            return (
              <div key={log.id} className="group flex items-start gap-2 hover:bg-zinc-900/30 -mx-2 px-2 rounded">
                <span className="text-zinc-600 select-none flex-shrink-0">{timeStr}</span>
                <span
                  className="px-1.5 rounded text-[10px] font-bold flex-shrink-0 uppercase"
                  style={{ color: accent, backgroundColor: `${accent}1a` }}
                >
                  {log.action}
                </span>
                <span className="text-zinc-500 flex-shrink-0">{log.entityType?.padEnd(8) || 'unknown'}</span>
                <span className="text-zinc-300 flex-1 min-w-0 break-words">{log.description}</span>
                <span className="text-zinc-600 flex-shrink-0 hidden md:inline">{log.user?.email || 'system'}</span>
                <button
                  onClick={() => onCopy(log)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-emerald-400"
                  title="Copy as JSON"
                >
                  {copiedId === log.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const PaginatedTable: React.FC<{
  logs: ActivityLog[];
  loading: boolean;
  onCopy: (l: ActivityLog) => void;
  copiedId: string | null;
}> = ({ logs, loading, onCopy, copiedId }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
            <th className="px-3 py-3 text-left font-semibold w-[100px]">Action</th>
            <th className="px-3 py-3 text-left font-semibold w-[120px]">Entity</th>
            <th className="px-3 py-3 text-left font-semibold">Description</th>
            <th className="px-3 py-3 text-left font-semibold">User</th>
            <th className="px-3 py-3 text-left font-semibold w-[140px]">Timestamp</th>
            <th className="px-3 py-3 w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {loading ? (
            <tr><td colSpan={6} className="text-center py-12 text-zinc-500">Loading…</td></tr>
          ) : logs.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-12 text-zinc-500">No activity logs found</td></tr>
          ) : (
            logs.map((a) => {
              const action = a.action?.toLowerCase() || 'other';
              return (
                <tr key={a.id} className="group hover:bg-zinc-900/60 transition-colors">
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${actionColorsDark[action] || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                      {a.action}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 capitalize text-zinc-400 text-xs">{a.entityType?.replace('_', ' ') || '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-200 max-w-[400px] truncate">{a.description}</td>
                  <td className="px-3 py-2.5 text-zinc-400 font-mono text-[12px]">{a.user?.email || 'system'}</td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                    <div>{format(new Date(a.createdAt), 'MMM d, HH:mm')}</div>
                    <div className="text-[10px] text-zinc-600">{timeAgo(a.createdAt)}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => onCopy(a)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-emerald-400"
                      title="Copy as JSON"
                    >
                      {copiedId === a.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default ActivityPanel;
