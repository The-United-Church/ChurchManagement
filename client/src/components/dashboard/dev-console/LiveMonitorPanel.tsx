import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchRecentActivities, fetchActivityStats } from '@/lib/api';
import { Pause, Play, Trash2, Filter, Radio, Activity as ActivityIcon, ArrowDownToLine } from 'lucide-react';
import { actionAccent, timeAgo } from './helpers';
import type { ActivityLog } from './types';

const POLL_INTERVAL = 3000; // ms

const ACTIONS = ['create', 'update', 'delete', 'approve', 'reject', 'login', 'logout', 'register', 'status_change'];

const LiveMonitorPanel: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState<{ date: string; count: number }[]>([]);
  const [connected, setConnected] = useState(true);

  const seenIds = useRef<Set<string>>(new Set());
  const streamRef = useRef<HTMLDivElement>(null);

  // Initial backfill + heatmap
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [recentRes, statsRes] = await Promise.all([
          fetchRecentActivities(50),
          fetchActivityStats(90),
        ]);
        if (cancelled) return;
        const initial = (recentRes.data as ActivityLog[]).reverse();
        initial.forEach((l) => seenIds.current.add(l.id));
        setLogs(initial);
        setHeatmap(statsRes.data.daily || []);
        setConnected(true);
      } catch {
        setConnected(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Polling stream
  useEffect(() => {
    if (paused) return;
    const tick = async () => {
      try {
        const res = await fetchRecentActivities(20);
        const fresh = (res.data as ActivityLog[]).filter((l) => !seenIds.current.has(l.id));
        if (fresh.length > 0) {
          fresh.forEach((l) => seenIds.current.add(l.id));
          setLogs((prev) => [...prev, ...fresh.reverse()].slice(-500));
        }
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };
    const t = setInterval(tick, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [paused]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filtered = useMemo(
    () => (filter ? logs.filter((l) => l.action?.toLowerCase() === filter) : logs),
    [logs, filter]
  );

  const counters = useMemo(() => {
    const c: Record<string, number> = {};
    logs.forEach((l) => {
      const k = l.action?.toLowerCase() || 'other';
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400" />
            Live Activity Monitor
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500 ml-1">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'Connected' : 'Reconnecting…'}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Real-time activity stream · polling every {POLL_INTERVAL / 1000}s · {logs.length} events buffered</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              paused
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => setAutoScroll((a) => !a)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              autoScroll
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Auto-scroll
          </button>
          <button
            onClick={() => { setLogs([]); seenIds.current.clear(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-red-300 text-xs font-medium transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Action counters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1">
          <Filter className="h-3 w-3" /> Filter
        </span>
        <button
          onClick={() => setFilter(null)}
          className={`px-2.5 py-1 rounded-full border text-[11px] font-mono transition-colors ${
            filter === null
              ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
              : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/50'
          }`}
        >
          ALL · {logs.length}
        </button>
        {ACTIONS.map((a) => {
          const c = counters[a] || 0;
          if (c === 0) return null;
          const active = filter === a;
          return (
            <button
              key={a}
              onClick={() => setFilter(active ? null : a)}
              className="px-2.5 py-1 rounded-full border text-[11px] font-mono transition-colors flex items-center gap-1.5"
              style={{
                borderColor: active ? actionAccent[a] : 'rgb(39 39 42)',
                backgroundColor: active ? `${actionAccent[a]}1f` : 'rgb(24 24 27 / 0.5)',
                color: active ? actionAccent[a] : 'rgb(161 161 170)',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: actionAccent[a] }} />
              {a.toUpperCase()} · {c}
            </button>
          );
        })}
      </div>

      {/* Terminal Stream */}
      <div className="rounded-xl border border-zinc-800 bg-black/60 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800 bg-zinc-950">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-3 text-[11px] font-mono text-zinc-500">~/dev-console/live-monitor</span>
          <span className="ml-auto text-[10px] font-mono text-zinc-600">
            {filtered.length} {filter ? `· filtered (${filter})` : 'events'}
          </span>
        </div>
        <div
          ref={streamRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
            if (!atBottom && autoScroll) setAutoScroll(false);
          }}
          className="h-[480px] overflow-y-auto font-mono text-[12px] leading-6 px-4 py-3 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.04),_transparent_70%)]"
        >
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs">
              <ActivityIcon className="h-8 w-8 mb-2 opacity-30" />
              {paused ? 'Stream paused' : filter ? `Waiting for ${filter} events…` : 'Waiting for events…'}
            </div>
          ) : (
            filtered.map((log) => {
              const action = log.action?.toLowerCase() || 'other';
              const accent = actionAccent[action] || '#71717a';
              const ts = new Date(log.createdAt);
              const timeStr = ts.toISOString().split('T')[1].split('.')[0];
              return (
                <div key={log.id} className="flex items-start gap-2 hover:bg-zinc-900/30 -mx-2 px-2 rounded">
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
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-zinc-800 bg-zinc-950 text-[10px] font-mono text-zinc-600">
          <span>● {paused ? 'PAUSED' : 'STREAMING'}</span>
          <span>{timeAgo(new Date().toISOString())} · last poll</span>
        </div>
      </div>

      {/* Heatmap */}
      <ActivityHeatmap data={heatmap} />
    </div>
  );
};

const ActivityHeatmap: React.FC<{ data: { date: string; count: number }[] }> = ({ data }) => {
  // Build a 7 (rows = day of week) x N (cols = weeks) grid for the last 90 days
  const map = useMemo(() => new Map(data.map((d) => [d.date.split('T')[0], d.count])), [data]);
  const days: { date: Date; count: number }[] = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days.push({ date: d, count: map.get(key) || 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.count));

  // Group into columns (weeks). Pad start so first column starts on Sunday.
  const startPadding = days[0].date.getDay();
  const padded = [...Array(startPadding).fill(null), ...days];
  const weeks: ({ date: Date; count: number } | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const colorFor = (count: number) => {
    if (count === 0) return 'rgb(24 24 27)';
    const intensity = Math.min(1, count / max);
    const alpha = 0.2 + intensity * 0.8;
    return `rgba(16, 185, 129, ${alpha})`;
  };

  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Activity Heatmap</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{total.toLocaleString()} events in the last 90 days</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-sm border border-zinc-800"
              style={{ backgroundColor: v === 0 ? 'rgb(24 24 27)' : `rgba(16, 185, 129, ${0.2 + v * 0.8})` }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                day ? (
                  <div
                    key={di}
                    className="h-2.5 w-2.5 rounded-[2px] border border-zinc-800/60 hover:ring-1 hover:ring-emerald-400 transition-all cursor-pointer"
                    style={{ backgroundColor: colorFor(day.count) }}
                    title={`${day.date.toDateString()} · ${day.count} events`}
                  />
                ) : (
                  <div key={di} className="h-2.5 w-2.5" />
                )
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveMonitorPanel;
