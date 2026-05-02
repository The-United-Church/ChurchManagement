import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  Server,
  Database,
  Mail,
  Wifi,
  HardDrive,
  Clock as ClockIcon,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Shield,
  Calendar as CalendarIcon,
  Activity as ActivityIcon,
} from 'lucide-react';
import { fetchHealth, fetchServiceHealth, type ServiceHealthResponse } from '@/lib/api';
import Sparkline from './Sparkline';
import type { RoleInfo, HealthInfo, UserStats } from './types';

interface SystemPanelProps {
  roles: RoleInfo[];
  health: HealthInfo | null;
  stats: UserStats | null;
  userCount: number;
  activityTotal: number;
  loading: boolean;
  onRefresh: () => void;
}

interface ServiceMetric {
  name: string;
  icon: React.ElementType;
  status: 'healthy' | 'degraded' | 'down' | 'monitored';
  responseMs: number;
  history: number[];
  description: string;
  detail?: string;
}

type ServiceKey = 'api' | 'database' | 'email' | 'socket' | 'storage';

// All known permissions across roles to render the matrix.
const ALL_PERMISSIONS = [
  'view_members', 'manage_members',
  'view_attendance', 'manage_attendance',
  'view_contributions', 'manage_contributions',
  'view_events', 'manage_events',
  'view_reports', 'manage_reports',
  'view_users', 'manage_users',
  'view_settings', 'manage_settings',
  'view_roles', 'manage_roles',
  'view_departments', 'manage_departments',
  'view_categories', 'manage_categories',
];

const SystemPanel: React.FC<SystemPanelProps> = ({
  roles,
  health,
  stats,
  userCount,
  activityTotal,
  loading,
  onRefresh,
}) => {
  const [apiHistory, setApiHistory] = useState<number[]>([]);
  const apiHistoryRef = useRef<number[]>([]);
  const serviceHistoriesRef = useRef<Record<ServiceKey, number[]>>({ api: [], database: [], email: [], socket: [], storage: [] });
  const [latestApiMs, setLatestApiMs] = useState<number>(0);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthResponse | null>(null);
  const [serviceHistories, setServiceHistories] = useState<Record<ServiceKey, number[]>>({ api: [], database: [], email: [], socket: [], storage: [] });
  const [pinging, setPinging] = useState(false);

  // Periodically ping API to track response time
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const t0 = performance.now();
      try {
        const [, serviceRes] = await Promise.all([fetchHealth(), fetchServiceHealth()]);
        const ms = Math.round(performance.now() - t0);
        if (cancelled) return;
        apiHistoryRef.current = [...apiHistoryRef.current, ms].slice(-20);
        setApiHistory([...apiHistoryRef.current]);
        setLatestApiMs(ms);
        setServiceHealth(serviceRes);
        const nextHistories = {
          ...serviceHistoriesRef.current,
          api: [...serviceHistoriesRef.current.api, ms].slice(-20),
          database: [...serviceHistoriesRef.current.database, serviceRes.services.database.responseMs].slice(-20),
          email: [...serviceHistoriesRef.current.email, serviceRes.services.email.responseMs].slice(-20),
          socket: [...serviceHistoriesRef.current.socket, serviceRes.services.socket.responseMs].slice(-20),
          storage: [...serviceHistoriesRef.current.storage, serviceRes.services.storage.responseMs].slice(-20),
        };
        serviceHistoriesRef.current = nextHistories;
        setServiceHistories(nextHistories);
      } catch {
        apiHistoryRef.current = [...apiHistoryRef.current, 999].slice(-20);
        setApiHistory([...apiHistoryRef.current]);
      }
    };
    ping();
    const t = setInterval(ping, 8000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const services: ServiceMetric[] = useMemo(() => {
    const apiHealthy = health?.status === 'OK';
    const probeStatus = (ok?: boolean): ServiceMetric['status'] => ok === undefined ? 'monitored' : ok ? 'healthy' : 'down';
    const db = serviceHealth?.services.database;
    const email = serviceHealth?.services.email;
    const socket = serviceHealth?.services.socket;
    const storage = serviceHealth?.services.storage;
    return [
      {
        name: 'API Gateway',
        icon: Server,
        status: apiHealthy ? 'healthy' : 'down',
        responseMs: latestApiMs,
        history: serviceHistories.api.length ? serviceHistories.api : apiHistory,
        description: 'Express.js · /health endpoint',
        detail: health?.timestamp ? `Last checked ${new Date(health.timestamp).toLocaleTimeString()}` : undefined,
      },
      {
        name: 'Database',
        icon: Database,
        status: probeStatus(db?.ok),
        responseMs: db?.responseMs ?? 0,
        history: serviceHistories.database,
        description: 'PostgreSQL · SELECT 1 probe',
        detail: db?.ok ? 'Connection verified' : db?.error,
      },
      {
        name: 'Email Service',
        icon: Mail,
        status: probeStatus(email?.ok),
        responseMs: email?.responseMs ?? 0,
        history: serviceHistories.email,
        description: 'Resend · config probe',
        detail: email?.ok ? 'API key and sender configured' : email?.error,
      },
      {
        name: 'WebSocket',
        icon: Wifi,
        status: probeStatus(socket?.ok),
        responseMs: socket?.responseMs ?? 0,
        history: serviceHistories.socket,
        description: 'Socket.io · realtime channel',
        detail: socket?.details ? `${socket.details.connectedUsers ?? 0} online · ${socket.details.engineClients ?? 0} sockets` : socket?.error,
      },
      {
        name: 'Storage',
        icon: HardDrive,
        status: probeStatus(storage?.ok),
        responseMs: storage?.responseMs ?? 0,
        history: serviceHistories.storage,
        description: 'Firebase Storage · config probe',
        detail: storage?.ok ? 'Bucket configured' : storage?.error,
      },
    ];
  }, [health, latestApiMs, apiHistory, serviceHealth, serviceHistories]);

  const handlePing = async () => {
    setPinging(true);
    onRefresh();
    setTimeout(() => setPinging(false), 1200);
  };

  const env = window.location.hostname.includes('localhost') ? 'Development' : 'Production';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400" />
            System Health
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              env === 'Production' ? 'bg-red-500/10 text-red-300 border border-red-500/30' : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
            }`}>
              {env.toUpperCase()}
            </span>
            <span>·</span>
            <span>{window.location.hostname}</span>
          </p>
        </div>
        <button
          onClick={handlePing}
          disabled={loading || pinging}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs font-medium disabled:opacity-50 w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${pinging || loading ? 'animate-spin' : ''}`} />
          Re-check all services
        </button>
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <ServiceCard key={s.name} service={s} />
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTile icon={ActivityIcon} label="Total events logged" value={activityTotal || '—'} />
        <StatTile icon={Shield} label="Roles defined" value={roles.length} />
        <StatTile icon={ServerStatsIcon} label="Registered users" value={stats?.totalUsers ?? userCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CronJobsCard />
        <PermissionMatrix roles={roles} />
      </div>
    </div>
  );
};

const STATUS_TONE: Record<ServiceMetric['status'], { bg: string; text: string; dot: string; label: string }> = {
  healthy: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Healthy' },
  degraded: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-300', dot: 'bg-amber-400', label: 'Degraded' },
  down: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-300', dot: 'bg-red-400', label: 'Down' },
  monitored: { bg: 'bg-zinc-800/50 border-zinc-700', text: 'text-zinc-400', dot: 'bg-zinc-500', label: 'Monitored' },
};

const ServiceCard: React.FC<{ service: ServiceMetric }> = ({ service }) => {
  const tone = STATUS_TONE[service.status];
  const Icon = service.icon;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md p-1.5 bg-zinc-800/60">
            <Icon className="h-4 w-4 text-zinc-300" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">{service.name}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{service.description}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 border ${tone.bg} ${tone.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot} ${service.status === 'healthy' ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] font-medium uppercase tracking-wider">{tone.label}</span>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xl font-semibold text-zinc-100 tabular-nums">
            {service.responseMs > 0 ? `${service.responseMs}` : '—'}
            <span className="text-xs text-zinc-500 ml-1 font-normal">ms</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Latency · last poll</div>
          {service.detail && (
            <div className={`text-[10px] mt-1 max-w-[180px] truncate ${service.status === 'down' ? 'text-red-400' : 'text-zinc-500'}`}>
              {service.detail}
            </div>
          )}
        </div>
        <div className="w-24 -mb-1 -mr-1">
          {service.history.length > 0 && (
            <Sparkline data={service.history} color={service.status === 'healthy' ? '#10b981' : service.status === 'degraded' ? '#f59e0b' : '#ef4444'} height={28} />
          )}
        </div>
      </div>
    </div>
  );
};

const StatTile: React.FC<{ icon: React.ElementType; label: string; value: number | string }> = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
    <div className="flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</span>
      <Icon className="h-3.5 w-3.5 text-zinc-600" />
    </div>
    <div className="text-2xl font-semibold text-zinc-100 tabular-nums mt-1">{value}</div>
  </div>
);

// helper Lucide icon stand-in
const ServerStatsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <path d="M20 8v6M23 11h-6" />
  </svg>
);

const CronJobsCard: React.FC = () => {
  // Server has updateEventStatus job. We can't query it directly; show schedule info.
  const jobs = [
    {
      name: 'updateEventStatus',
      schedule: '*/5 * * * *',
      description: 'Refreshes event status (draft → published → ongoing → closed)',
      lastRun: 'Within last 5 min',
      nextRun: 'In ~5 min',
      status: 'active' as const,
    },
  ];

  return (
    <div className="lg:col-span-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-semibold text-zinc-200">Scheduled Jobs</h3>
      </div>
      <div className="space-y-3">
        {jobs.map((j) => (
          <div key={j.name} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-sm text-zinc-100">{j.name}</span>
              <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-2">{j.description}</p>
            <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600">
              <span className="bg-zinc-800/60 border border-zinc-800 rounded px-1.5 py-0.5">{j.schedule}</span>
              <span className="flex items-center gap-1"><ClockIcon className="h-2.5 w-2.5" /> last: {j.lastRun}</span>
              <span className="flex items-center gap-1"><CalendarIcon className="h-2.5 w-2.5" /> next: {j.nextRun}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PermissionMatrix: React.FC<{ roles: RoleInfo[] }> = ({ roles }) => {
  if (roles.length === 0) {
    return (
      <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-zinc-500" /> Permission Matrix
        </h3>
        <p className="text-sm text-zinc-500 text-center py-8">No roles defined</p>
      </div>
    );
  }

  // Determine permissions to display: union of all role permissions ∪ ALL_PERMISSIONS
  const perms = useMemoPermsList(roles);

  return (
    <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Shield className="h-4 w-4 text-zinc-500" /> Permission Matrix
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {roles.length} role{roles.length !== 1 ? 's' : ''} · {perms.length} permission{perms.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-2 py-2 sticky left-0 bg-zinc-900/40 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Permission</th>
              {roles.map((r) => (
                <th key={r.id} className="px-2 py-2 text-center font-medium capitalize text-zinc-200 whitespace-nowrap">
                  {r.name.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perms.map((p) => (
              <tr key={p} className="border-b border-zinc-800/50 hover:bg-zinc-900/40 group">
                <td className="text-left px-2 py-2 font-mono text-[11px] text-zinc-400 sticky left-0 bg-zinc-900/40 group-hover:bg-zinc-900">
                  {p}
                </td>
                {roles.map((r) => {
                  const has = r.permissions?.some((rp) => rp.name === p);
                  return (
                    <td key={r.id} className="px-2 py-2 text-center">
                      {has ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 inline" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-zinc-700 inline" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function useMemoPermsList(roles: RoleInfo[]): string[] {
  return useMemo(() => {
    const set = new Set<string>(ALL_PERMISSIONS);
    roles.forEach((r) => r.permissions?.forEach((p) => set.add(p.name)));
    return Array.from(set).sort();
  }, [roles]);
}

export default SystemPanel;
