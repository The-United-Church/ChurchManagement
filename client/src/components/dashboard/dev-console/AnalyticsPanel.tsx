import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAppliedResolvedTheme, getStoredTheme, resolveTheme, THEME_CHANGE_EVENT } from '@/lib/theme';
import { Loader2, TrendingUp, TrendingDown, Calendar, Users, Crown } from 'lucide-react';
import { fetchActivityStats, fetchRecentActivities } from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import { actionAccent, formatNumber, pctChange } from './helpers';
import type { ActivityLog } from './types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#84cc16'];

interface StatsData {
  byAction: { action: string; count: number }[];
  byEntity: { entityType: string; count: number }[];
  daily: { date: string; count: number }[];
}

type RangeKey = '7' | '30' | '90';

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
];

function useIsDark() {
  const [dark, setDark] = useState(() => getAppliedResolvedTheme() === 'dark');
  useEffect(() => {
    const update = () => setDark(getAppliedResolvedTheme() === 'dark');
    const updateSystemTheme = () => {
      if (getStoredTheme() === 'system') setDark(resolveTheme('system') === 'dark');
    };
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    update();
    window.addEventListener('storage', update);
    window.addEventListener(THEME_CHANGE_EVENT, update);
    mediaQuery.addEventListener?.('change', updateSystemTheme);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener(THEME_CHANGE_EVENT, update);
      mediaQuery.removeEventListener?.('change', updateSystemTheme);
    };
  }, []);
  return dark;
}

const AnalyticsPanel: React.FC = () => {
  const isDark = useIsDark();
  const [range, setRange] = useState<RangeKey>('30');
  const [data, setData] = useState<StatsData | null>(null);
  const [previousData, setPreviousData] = useState<StatsData | null>(null);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const days = RANGES.find((r) => r.key === range)?.days || 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [curr, prev, recent] = await Promise.all([
        fetchActivityStats(days),
        fetchActivityStats(days * 2),
        fetchRecentActivities(200),
      ]);
      setData(curr.data);
      // Slice the older window: take counts older than `days` days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const older: StatsData = {
        daily: (prev.data.daily || []).filter((d: { date: string }) => new Date(d.date) < cutoff),
        byAction: prev.data.byAction || [],
        byEntity: prev.data.byEntity || [],
      };
      setPreviousData(older);
      setRecentLogs(recent.data || []);
    } catch {
      // toast handled upstream
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const summaryStats = useMemo(() => {
    const currTotal = data?.daily.reduce((s, d) => s + d.count, 0) ?? 0;
    const prevTotal = previousData?.daily.reduce((s, d) => s + d.count, 0) ?? 0;
    const dailyAvg = data?.daily.length ? Math.round(currTotal / data.daily.length) : 0;
    const peak = data?.daily.reduce((max, d) => (d.count > max ? d.count : max), 0) ?? 0;
    const uniqueUsers = new Set(recentLogs.map((l) => l.user?.email).filter(Boolean)).size;
    return {
      total: currTotal,
      delta: pctChange(currTotal, prevTotal),
      dailyAvg,
      peak,
      uniqueUsers,
    };
  }, [data, previousData, recentLogs]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-zinc-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-12 text-center text-gray-400 dark:text-zinc-500">
        Unable to load analytics data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Date range selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Analytics</h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Compared to the preceding {days}-day period</p>
        </div>
        <div className="inline-flex items-center rounded-lg border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 p-0.5">
          <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 ml-2.5 mr-1" />
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                range === r.key ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats with comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStat label="Total Events" value={formatNumber(summaryStats.total)} delta={summaryStats.delta} />
        <SummaryStat label="Daily Average" value={formatNumber(summaryStats.dailyAvg)} suffix="/ day" />
        <SummaryStat label="Peak Day" value={formatNumber(summaryStats.peak)} suffix="events" />
        <SummaryStat label="Unique Users" value={formatNumber(summaryStats.uniqueUsers)} icon={Users} />
      </div>

      {/* Activity trends comparison */}
      <DailyTrendChart current={data.daily} previous={previousData?.daily ?? []} days={days} />

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActionBarChart byAction={data.byAction} />
        <EntityPieChart byEntity={data.byEntity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PeakActivityHeatmap logs={recentLogs} />
        <TopUsersLeaderboard logs={recentLogs} />
      </div>
    </div>
  );
};

const SummaryStat: React.FC<{
  label: string;
  value: string;
  delta?: number;
  suffix?: string;
  icon?: React.ElementType;
}> = ({ label, value, delta, suffix, icon: Icon }) => (
  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-500">{label}</span>
      {Icon && <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-600" />}
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 tabular-nums">{value}</span>
      {suffix && <span className="text-xs text-gray-400 dark:text-zinc-500">{suffix}</span>}
    </div>
    {delta !== undefined && (
      <div className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {delta >= 0 ? '+' : ''}{delta}%
        <span className="text-gray-400 dark:text-zinc-600 font-normal ml-1">vs previous period</span>
      </div>
    )}
  </div>
);

const DailyTrendChart: React.FC<{
  current: StatsData['daily'];
  previous: StatsData['daily'];
  days: number;
}> = ({ current, previous, days }) => {
  const isDark = useIsDark();
  const gridColor   = isDark ? '#27272a' : '#e5e7eb';
  const tickColor   = isDark ? '#71717a' : '#9ca3af';
  const tooltipStyle = { backgroundColor: isDark ? '#09090b' : '#ffffff', border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 11, color: isDark ? '#e4e4e7' : '#111827' };

  // Align current and previous by relative day index
  const merged = useMemo(() => {
    const len = Math.max(current.length, previous.length);
    const arr: { day: number; current: number; previous: number; date: string }[] = [];
    for (let i = 0; i < len; i++) {
      arr.push({
        day: i + 1,
        current: current[i]?.count ?? 0,
        previous: previous[i]?.count ?? 0,
        date: current[i]?.date ?? '',
      });
    }
    return arr;
  }, [current, previous]);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Activity Trends · {days} days</h3>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Current
          </span>
          <span className="flex items-center gap-1.5 text-gray-400 dark:text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-zinc-600" /> Previous
          </span>
        </div>
      </div>
      {merged.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-12">No activity data</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={merged} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="curGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(v) => {
                if (!v) return '';
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: isDark ? '#3f3f46' : '#d1d5db' }} />
            <Area type="monotone" dataKey="previous" stroke={isDark ? '#52525b' : '#9ca3af'} strokeWidth={1} fill="none" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="current" stroke="#10b981" strokeWidth={2} fill="url(#curGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

const ActionBarChart: React.FC<{ byAction: StatsData['byAction'] }> = ({ byAction }) => {
  const isDark = useIsDark();
  const gridColor    = isDark ? '#27272a' : '#e5e7eb';
  const tickColor    = isDark ? '#71717a' : '#9ca3af';
  const tooltipStyle = { backgroundColor: isDark ? '#09090b' : '#ffffff', border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 11, color: isDark ? '#e4e4e7' : '#111827' };
  return (
  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-5">
    <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-4">Activity by Action</h3>
    {byAction.length === 0 ? (
      <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-12">No data</p>
    ) : (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={byAction} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="action" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={{ stroke: gridColor }} />
          <YAxis tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? 'rgba(39,39,42,0.4)' : 'rgba(229,231,235,0.4)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {byAction.map((d, i) => (
              <Cell key={i} fill={actionAccent[d.action?.toLowerCase()] || COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
  );
};

const EntityPieChart: React.FC<{ byEntity: StatsData['byEntity'] }> = ({ byEntity }) => {
  const isDark = useIsDark();
  const tooltipStyle = { backgroundColor: isDark ? '#09090b' : '#ffffff', border: `1px solid ${isDark ? '#27272a' : '#e5e7eb'}`, borderRadius: 8, fontSize: 11, color: isDark ? '#e4e4e7' : '#111827' };
  const total = byEntity.reduce((s, e) => s + e.count, 0);
  return (
    <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-5">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-4">Activity by Entity</h3>
      {byEntity.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-12">No data</p>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative h-44 w-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byEntity} dataKey="count" innerRadius={55} outerRadius={80} paddingAngle={3} stroke="none">
                  {byEntity.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tabular-nums">{formatNumber(total)}</span>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase">Events</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {byEntity.map((d, i) => (
              <div key={d.entityType} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="capitalize text-gray-600 dark:text-zinc-300 truncate flex-1">{d.entityType?.replace('_', ' ')}</span>
                <span className="text-gray-900 dark:text-zinc-100 font-medium tabular-nums">{d.count}</span>
                <span className="text-gray-400 dark:text-zinc-600 tabular-nums w-10 text-right">
                  {total ? `${Math.round((d.count / total) * 100)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PeakActivityHeatmap: React.FC<{ logs: ActivityLog[] }> = ({ logs }) => {
  const isDark = useIsDark();
  const emptyBg = isDark ? '#18181b' : '#f3f4f6';
  // 7 days x 24 hours grid based on the latest 200 logs
  const grid = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    logs.forEach((l) => {
      const d = new Date(l.createdAt);
      g[d.getDay()][d.getHours()] += 1;
    });
    return g;
  }, [logs]);

  const max = Math.max(1, ...grid.flat());
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="lg:col-span-2 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Peak Activity Heatmap</h3>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">By day of week × hour of day · last 200 events</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="flex items-center gap-1 ml-6 mb-1">
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="w-4 text-center text-[8px] text-gray-400 dark:text-zinc-600 font-mono">
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>
          {grid.map((row, di) => (
            <div key={di} className="flex items-center gap-1 mb-0.5">
              <div className="w-5 text-[10px] text-gray-400 dark:text-zinc-500 font-medium">{dayLabels[di]}</div>
              {row.map((count, hi) => {
                const intensity = count / max;
                const bg = count === 0 ? emptyBg : `rgba(16, 185, 129, ${0.15 + intensity * 0.85})`;
                return (
                  <div
                    key={hi}
                    className="w-4 h-4 rounded-sm border border-gray-100/50 dark:border-zinc-800/50 hover:ring-1 hover:ring-emerald-400 transition-all"
                    style={{ backgroundColor: bg }}
                    title={`${dayLabels[di]} ${hi}:00 · ${count} events`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TopUsersLeaderboard: React.FC<{ logs: ActivityLog[] }> = ({ logs }) => {
  const top = useMemo(() => {
    const counts: Record<string, { email: string; name?: string; count: number }> = {};
    logs.forEach((l) => {
      const email = l.user?.email;
      if (!email) return;
      counts[email] = counts[email] || { email, name: l.user?.full_name, count: 0 };
      counts[email].count += 1;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [logs]);

  const max = Math.max(1, ...top.map((u) => u.count));

  return (
    <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Top Active Users</h3>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-8">No data</p>
      ) : (
        <div className="space-y-3">
          {top.map((u, i) => (
            <div key={u.email}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-2 min-w-0">
                  <span className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-500/20 text-amber-300' :
                    i === 1 ? 'bg-gray-300/20 dark:bg-zinc-500/20 text-gray-600 dark:text-zinc-300' :
                    i === 2 ? 'bg-orange-500/20 text-orange-300' :
                    'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-gray-800 dark:text-zinc-200 truncate">{u.name || u.email}</span>
                </span>
                <span className="text-gray-900 dark:text-zinc-100 font-medium tabular-nums flex-shrink-0">{u.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                  style={{ width: `${(u.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Re-export an internal so unused import below doesn't trip linting if needed
export { LineChart, Line };
export default AnalyticsPanel;
