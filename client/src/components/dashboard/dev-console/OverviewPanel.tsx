import { useMemo } from 'react';
import { Users, UserCheck, UserX, Shield, Activity, Clock, ArrowUpRight, AlertTriangle, Church, Globe, TrendingUp, Server, Zap, Wifi, Eye } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Sparkline from './Sparkline';
import { actionColorsDark, timeAgo, formatNumber } from './helpers';
import type { UserStats, RoleInfo, ActivityLog, HealthInfo, WebsiteVisitStats } from './types';
import type { DevSection } from './DevSidebar';

interface OverviewPanelProps {
  stats: UserStats | null;
  userCount: number;
  onlineUsers: number;
  visitStats: WebsiteVisitStats | null;
  roles: RoleInfo[];
  recentActivities: ActivityLog[];
  dailyActivity: { date: string; count: number }[];
  pendingRequests: number;
  pendingDomains: number;
  health: HealthInfo | null;
  loading: boolean;
  onNavigate: (s: DevSection) => void;
}

const ROLE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4'];

const OverviewPanel: React.FC<OverviewPanelProps> = ({
  stats,
  userCount,
  onlineUsers,
  visitStats,
  roles,
  recentActivities,
  dailyActivity,
  pendingRequests,
  pendingDomains,
  health,
  loading,
  onNavigate,
}) => {
  // Derive 7-day sparkline data from daily activity stats
  const last7 = useMemo(() => dailyActivity.slice(-7).map((d) => d.count), [dailyActivity]);
  const last7Activity = last7.length ? last7 : [0, 0, 0, 0, 0, 0, 0];

  // Health score: weighted aggregate
  const healthScore = useMemo(() => {
    let score = 0;
    if (health?.status === 'OK') score += 60;
    if (stats && stats.totalUsers > 0) score += 20;
    if (stats && stats.activeUsers / Math.max(stats.totalUsers, 1) > 0.5) score += 10;
    if (recentActivities.length > 0) score += 10;
    return Math.min(100, score);
  }, [health, stats, recentActivities]);

  const totalActivity = useMemo(() => dailyActivity.reduce((s, d) => s + d.count, 0), [dailyActivity]);

  return (
    <div className="space-y-6">
      <AlertRibbon
        pendingRequests={pendingRequests}
        pendingDomains={pendingDomains}
        inactiveUsers={stats?.inactiveUsers ?? 0}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Users"
          value={formatNumber(stats?.totalUsers ?? userCount)}
          delta="+12%"
          deltaPositive
          spark={last7Activity}
          color="#10b981"
          icon={Users}
        />
        <MetricCard
          title="Online Now"
          value={formatNumber(onlineUsers)}
          delta={stats?.mostActiveUser ? `Top: ${stats.mostActiveUser.email}` : 'Live sockets'}
          deltaPositive
          spark={last7Activity}
          color="#22c55e"
          icon={Wifi}
        />
        <MetricCard
          title="Active Users"
          value={formatNumber(stats?.activeUsers)}
          delta={stats ? `${Math.round((stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100)}%` : '—'}
          deltaPositive
          spark={last7Activity}
          color="#3b82f6"
          icon={UserCheck}
        />
        <MetricCard
          title="Activity (30d)"
          value={formatNumber(totalActivity)}
          delta={last7.length ? `${last7.reduce((s, x) => s + x, 0)} this week` : '—'}
          deltaPositive
          spark={last7Activity}
          color="#a855f7"
          icon={Activity}
        />
        <MetricCard
          title="Website Visits"
          value={formatNumber(visitStats?.totalVisits)}
          delta={visitStats?.lastVisitAt ? `Last: ${timeAgo(visitStats.lastVisitAt)}` : visitStats ? `${visitStats.todayVisits} today` : '—'}
          deltaPositive
          spark={visitStats?.daily?.slice(-7).map((d) => d.count) ?? last7Activity}
          color="#06b6d4"
          icon={Eye}
        />
        <MetricCard
          title="Inactive Users"
          value={formatNumber(stats?.inactiveUsers)}
          delta={stats?.inactiveUsers ? `${stats.inactiveUsers} flagged` : 'None'}
          deltaPositive={false}
          spark={last7Activity.map((v) => v * 0.3)}
          color="#ef4444"
          icon={UserX}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <HealthGauge score={healthScore} health={health} />
        <UsersByRoleDonut stats={stats} loading={loading} />
        <SystemSnapshot
          rolesCount={roles.length}
          totalUsers={stats?.totalUsers ?? userCount}
          activity30d={totalActivity}
          onlineUsers={onlineUsers}
          visits30d={visitStats?.totalVisits ?? 0}
          health={health}
        />
      </div>

      <LiveTicker activities={recentActivities} loading={loading} onNavigate={onNavigate} />
    </div>
  );
};

const AlertRibbon: React.FC<{
  pendingRequests: number;
  pendingDomains: number;
  inactiveUsers: number;
  onNavigate: (s: DevSection) => void;
}> = ({ pendingRequests, pendingDomains, inactiveUsers, onNavigate }) => {
  const alerts = [
    pendingRequests > 0 && {
      key: 'requests',
      label: `${pendingRequests} pending denomination request${pendingRequests !== 1 ? 's' : ''}`,
      icon: Church,
      action: () => onNavigate('requests'),
      tone: 'amber',
    },
    pendingDomains > 0 && {
      key: 'domains',
      label: `${pendingDomains} pending custom domain${pendingDomains !== 1 ? 's' : ''}`,
      icon: Globe,
      action: () => onNavigate('custom-domains'),
      tone: 'blue',
    },
    inactiveUsers > 0 && {
      key: 'inactive',
      label: `${inactiveUsers} inactive user${inactiveUsers !== 1 ? 's' : ''}`,
      icon: UserX,
      action: () => onNavigate('users'),
      tone: 'zinc',
    },
  ].filter(Boolean) as Array<{ key: string; label: string; icon: React.ElementType; action: () => void; tone: string }>;

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-300">
        <Zap className="h-4 w-4" />
        <span>No outstanding items. All approvals are up to date.</span>
      </div>
    );
  }

  const toneClasses: Record<string, string> = {
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20',
    zinc: 'border-gray-200 dark:border-zinc-700 bg-gray-100/40 dark:bg-zinc-800/40 text-gray-600 dark:text-zinc-300 hover:bg-gray-100/70 dark:hover:bg-zinc-800/70',
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="font-medium uppercase tracking-wider">Action required</span>
      </div>
      {alerts.map(({ key, label, icon: Icon, action, tone }) => (
        <button
          key={key}
          onClick={action}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${toneClasses[tone]}`}
        >
          <Icon className="h-3 w-3" />
          {label}
          <ArrowUpRight className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  delta: string;
  deltaPositive: boolean;
  spark: number[];
  color: string;
  icon: React.ElementType;
}> = ({ title, value, delta, deltaPositive, spark, color, icon: Icon }) => (
  <div className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-zinc-800 bg-gradient-to-br from-gray-50/80 dark:from-zinc-900/80 to-white dark:to-zinc-950 p-4 transition-colors hover:border-gray-200 dark:hover:border-zinc-700">
    <div
      className="absolute inset-x-0 top-0 h-px"
      style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
    />
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-500">{title}</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 mt-1 tabular-nums">{value}</p>
      </div>
      <div className="rounded-lg p-1.5" style={{ backgroundColor: `${color}1f` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
    </div>
    <div className="flex items-end justify-between gap-2">
      <span
        className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
          deltaPositive ? 'text-emerald-400' : 'text-red-400'
        }`}
      >
        <TrendingUp className={`h-3 w-3 ${deltaPositive ? '' : 'rotate-180'}`} />
        {delta}
      </span>
      <div className="w-24 -mb-1 -mr-1">
        <Sparkline data={spark} color={color} height={28} />
      </div>
    </div>
  </div>
);

const HealthGauge: React.FC<{ score: number; health: HealthInfo | null }> = ({ score, health }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Stable' : 'Degraded';

  return (
    <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Platform Health</h3>
        <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500">Live</span>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative h-32 w-32 flex-shrink-0">
          <svg className="-rotate-90" width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={radius} className="stroke-gray-200 dark:stroke-zinc-800" strokeWidth="10" fill="none" />
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums" style={{ color }}>{score}</span>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">/ 100</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 dark:text-zinc-500">Status</span>
            <span style={{ color }} className="font-medium">{label}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 dark:text-zinc-500">API</span>
            <span className="text-gray-800 dark:text-zinc-200 font-medium">{health?.status || 'Down'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 dark:text-zinc-500">Last check</span>
            <span className="text-gray-800 dark:text-zinc-200 font-mono text-[10px]">
              {health ? new Date(health.timestamp).toLocaleTimeString() : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const UsersByRoleDonut: React.FC<{ stats: UserStats | null; loading: boolean }> = ({ stats, loading }) => {
  const data = stats?.usersByRole?.map((r) => ({ name: r.role, value: r.count })) ?? [];
  return (
    <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Users by Role</h3>
        <Users className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500 py-8 text-center">{loading ? 'Loading…' : 'No data'}</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-32 w-32 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={42} outerRadius={60} paddingAngle={3} stroke="none">
                  {data.map((_, i) => (
                    <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tabular-nums">{stats?.totalUsers ?? 0}</span>
              <span className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase">Total</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            {data.slice(0, 5).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length] }} />
                <span className="capitalize text-gray-600 dark:text-zinc-300 truncate flex-1">{d.name}</span>
                <span className="text-gray-900 dark:text-zinc-100 font-medium tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SystemSnapshot: React.FC<{
  rolesCount: number;
  totalUsers: number;
  activity30d: number;
  onlineUsers: number;
  visits30d: number;
  health: HealthInfo | null;
}> = ({ rolesCount, totalUsers, activity30d, onlineUsers, visits30d, health }) => (
  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">System Snapshot</h3>
      <Server className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
    </div>
    <div className="space-y-3">
      <SnapshotRow icon={Shield} label="Roles defined" value={rolesCount} />
      <SnapshotRow icon={Users} label="Registered users" value={formatNumber(totalUsers)} />
      <SnapshotRow icon={Wifi} label="Online users" value={formatNumber(onlineUsers)} />
      <SnapshotRow icon={Eye} label="Visits (30d)" value={formatNumber(visits30d)} />
      <SnapshotRow icon={Activity} label="Events (30d)" value={formatNumber(activity30d)} />
      <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-zinc-500">API uptime</span>
          <span className={`text-xs font-medium ${health?.status === 'OK' ? 'text-emerald-400' : 'text-red-400'}`}>
            {health?.status === 'OK' ? '99.9%' : 'Down'}
          </span>
        </div>
      </div>
    </div>
  </div>
);

const SnapshotRow: React.FC<{ icon: React.ElementType; label: string; value: number | string }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between">
    <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
      <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-600" /> {label}
    </span>
    <span className="text-sm text-gray-900 dark:text-zinc-100 font-medium tabular-nums">{value}</span>
  </div>
);

const LiveTicker: React.FC<{
  activities: ActivityLog[];
  loading: boolean;
  onNavigate: (s: DevSection) => void;
}> = ({ activities, loading, onNavigate }) => (
  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40">
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Recent Activity</h3>
        <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Streaming</span>
      </div>
      <button
        onClick={() => onNavigate('live')}
        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
      >
        Open Live Monitor <ArrowUpRight className="h-3 w-3" />
      </button>
    </div>
    <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100/50 dark:divide-zinc-800/50">
      {activities.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
          {loading ? 'Loading activity stream…' : 'No recent activity'}
        </div>
      ) : (
        activities.map((a) => {
          const action = (a.action || '').toLowerCase();
          return (
            <div key={a.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/40 dark:hover:bg-zinc-900/40 transition-colors">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border mt-0.5 flex-shrink-0 ${actionColorsDark[action] || 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-700'}`}>
                {a.action}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-zinc-200 truncate">{a.description}</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 flex items-center gap-2 font-mono">
                  <span className="truncate">{a.user?.email || 'system'}</span>
                  <span className="text-gray-300 dark:text-zinc-700">·</span>
                  <span className="capitalize">{a.entityType?.replace('_', ' ')}</span>
                </p>
              </div>
              <span className="text-[11px] text-gray-400 dark:text-zinc-500 whitespace-nowrap flex items-center gap-1 flex-shrink-0">
                <Clock className="h-3 w-3" />
                {timeAgo(a.createdAt)}
              </span>
            </div>
          );
        })
      )}
    </div>
  </div>
);

export default OverviewPanel;
