import { useState, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import { applyTheme, getAppliedResolvedTheme, getStoredTheme, normalizeTheme, resolveTheme, THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type Theme } from '@/lib/theme';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  fetchAllUsers,
  fetchUserStatistics,
  fetchRecentActivities,
  fetchActivityStats,
  fetchHealth,
  fetchDenominationRequests,
  fetchAllCustomDomainsApi,
  fetchWebsiteVisitStats,
} from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/hooks/useAuthQuery';
import { useChurch } from '@/components/church/ChurchProvider';
import { Navigate, useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, CheckCircle2, AlertCircle, Search, Bell, Command as CommandIcon, ArrowLeft } from 'lucide-react';
import { formatUptime } from '@/components/dashboard/dev-console/helpers';

import DevSidebar, { MobileNav, type DevSection } from '@/components/dashboard/dev-console/DevSidebar';
import OverviewPanel from '@/components/dashboard/dev-console/OverviewPanel';
import LiveMonitorPanel from '@/components/dashboard/dev-console/LiveMonitorPanel';
import AnalyticsPanel from '@/components/dashboard/dev-console/AnalyticsPanel';
import UsersPanel from '@/components/dashboard/dev-console/UsersPanel';
import ActivityPanel from '@/components/dashboard/dev-console/ActivityPanel';
import SystemPanel from '@/components/dashboard/dev-console/SystemPanel';
import DenominationRequestsPanel from '@/components/dashboard/dev-console/DenominationRequestsPanel';
import CustomDomainsPanel from '@/components/dashboard/dev-console/CustomDomainsPanel';
import CommandPalette from '@/components/dashboard/dev-console/CommandPalette';
import type { DisplayUser, UserStats, RoleInfo, HealthInfo, ActivityLog, BackendUser, WebsiteVisitStats } from '@/components/dashboard/dev-console/types';

interface DailyStat { date: string; count: number }
interface ActivityStats {
  byAction: { action: string; count: number }[];
  byEntity: { entityType: string; count: number }[];
  daily: DailyStat[];
}

const SECTION_KEYS: Record<string, DevSection> = {
  '1': 'overview', '2': 'live', '3': 'analytics', '4': 'activity',
  '5': 'users', '6': 'requests', '7': 'custom-domains', '8': 'system',
};

const SuperAdmin = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const { effectiveRole } = useChurch();
  const navigate = useNavigate();

  const userTheme = useMemo<Theme>(() => {
    const remoteTheme = (profile as { settings?: { appearance?: { theme?: unknown } } } | undefined)?.settings?.appearance?.theme;
    const localTheme = typeof window !== 'undefined' ? window.localStorage.getItem(THEME_STORAGE_KEY) : null;
    return localTheme ? normalizeTheme(localTheme) : remoteTheme ? normalizeTheme(remoteTheme) : getStoredTheme();
  }, [profile]);

  const [section, setSection] = useState<DevSection>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => getAppliedResolvedTheme());

  useLayoutEffect(() => {
    applyTheme(userTheme);
    setResolvedTheme(resolveTheme(userTheme));
  }, [userTheme]);

  useEffect(() => {
    const update = () => setResolvedTheme(getAppliedResolvedTheme());
    const updateSystemTheme = () => {
      if (userTheme === 'system') setResolvedTheme(resolveTheme('system'));
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
  }, [userTheme]);

  // Data
  const [displayUsers, setDisplayUsers] = useState<DisplayUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [visitStats, setVisitStats] = useState<WebsiteVisitStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingDomains, setPendingDomains] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadBackendData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        fetchAllUsers(),
        fetchUserStatistics(),
        fetchRecentActivities(15),
        fetchActivityStats(30),
        fetchHealth(),
        fetchWebsiteVisitStats(30),
        fetchDenominationRequests().catch(() => ({ data: [] })),
        fetchAllCustomDomainsApi().catch(() => ({ data: [] })),
      ]);
      const [usersRes, statsRes, recentRes, statsActivityRes, healthRes, visitStatsRes, requestsRes, domainsRes] = results;

      if (usersRes.status === 'fulfilled') {
        setDisplayUsers(
          (usersRes.value.data as BackendUser[]).map((u) => ({
            id: u.id,
            email: u.email,
            name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
            role: typeof u.role === 'string' ? u.role : (u.role as any)?.name || 'member',
            status: u.is_active ? 'active' : 'inactive',
            joinDate: u.createdAt || '',
            lastAccess: u.last_access || '',
            isOnline: Boolean(u.is_online),
            currentSessionStartedAt: u.current_session_started_at || null,
            totalTimeSpentSeconds: Number(u.total_time_spent_seconds || 0),
            totalTimeSpentMinutes: Number(u.total_time_spent_minutes || 0),
          }))
        );
      }
      if (statsRes.status === 'fulfilled') {
        const userStats = statsRes.value.data;
        setStats(userStats);
        setRoles(
          (userStats.usersByRole || []).map((role: { role: string; count: number }) => ({
            id: role.role,
            name: role.role,
          })),
        );
      }
      if (recentRes.status === 'fulfilled') setRecentActivities(recentRes.value.data);
      if (statsActivityRes.status === 'fulfilled') setActivityStats(statsActivityRes.value.data);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
      if (visitStatsRes.status === 'fulfilled') {
        setVisitStats(visitStatsRes.value.data);
      } else {
        console.warn('Failed to load website visit stats', visitStatsRes.reason);
        setVisitStats({
          totalVisits: 0,
          todayVisits: 0,
          mainLandingVisits: 0,
          customDomainVisits: 0,
          uniqueVisitors: 0,
          lastVisitAt: null,
          lastVisitDomain: null,
          topDomains: [],
          daily: [],
        });
      }
      if (requestsRes.status === 'fulfilled') {
        const arr = (requestsRes.value as { data: { status?: string }[] }).data || [];
        setPendingRequests(arr.filter((r) => r.status === 'pending').length);
      }
      if (domainsRes.status === 'fulfilled') {
        const arr = (domainsRes.value as { data: { status?: string }[] }).data || [];
        setPendingDomains(arr.filter((d) => d.status === 'pending').length);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) loadBackendData();
  }, [isAuthenticated, loadBackendData]);

  // Live uptime ticker
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl+K, number keys for navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      const target = e.target as HTMLElement;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (!isTyping && !e.metaKey && !e.ctrlKey && !e.altKey && SECTION_KEYS[e.key]) {
        setSection(SECTION_KEYS[e.key]);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const badges = useMemo<Partial<Record<DevSection, number>>>(
    () => ({ requests: pendingRequests, 'custom-domains': pendingDomains }),
    [pendingRequests, pendingDomains]
  );

  const totalAlerts = pendingRequests + pendingDomains;
  const onlineUserCount = displayUsers.filter((u) => u.isOnline).length;

  if (authLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (effectiveRole !== 'super_admin') return <Navigate to="/dashboard" replace />;

  const uptimeSecs = Math.floor((now - mountedAt) / 1000);

  return (
    <div className={`${resolvedTheme === 'dark' ? 'dark' : ''} flex h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 selection:bg-emerald-500/30`}>
      <DevSidebar current={section} onChange={setSection} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} badges={badges} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          health={health}
          loading={loading}
          uptime={uptimeSecs}
          alerts={totalAlerts}
          onBack={() => navigate('/dashboard')}
          onRefresh={loadBackendData}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <MobileNav current={section} onChange={setSection} badges={badges} />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-white dark:from-zinc-950 via-white dark:via-zinc-950 to-gray-50 dark:to-black p-4 md:p-6">
          {section === 'overview' && (
            <OverviewPanel
              stats={stats}
              userCount={displayUsers.length}
              onlineUsers={onlineUserCount}
              visitStats={visitStats}
              roles={roles}
              recentActivities={recentActivities}
              dailyActivity={activityStats?.daily ?? []}
              pendingRequests={pendingRequests}
              pendingDomains={pendingDomains}
              health={health}
              loading={loading}
              onNavigate={setSection}
            />
          )}
          {section === 'live' && <LiveMonitorPanel />}
          {section === 'analytics' && <AnalyticsPanel />}
          {section === 'users' && <UsersPanel users={displayUsers} loading={loading} onlineCount={onlineUserCount} />}
          {section === 'activity' && <ActivityPanel />}
          {section === 'system' && (
            <SystemPanel roles={roles} health={health} stats={stats} userCount={displayUsers.length} activityTotal={0} loading={loading} onRefresh={loadBackendData} />
          )}
          {section === 'requests' && <DenominationRequestsPanel />}
          {section === 'custom-domains' && <CustomDomainsPanel />}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNavigate={setSection}
        onRefresh={loadBackendData}
        users={displayUsers}
      />
    </div>
  );
};

const Header: React.FC<{
  health: HealthInfo | null;
  loading: boolean;
  uptime: number;
  alerts: number;
  onBack: () => void;
  onRefresh: () => void;
  onOpenPalette: () => void;
}> = ({ health, loading, uptime, alerts, onBack, onRefresh, onOpenPalette }) => {
  const isHealthy = health?.status === 'OK';
  return (
    <header className="border-b border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm px-4 md:px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="h-8 border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">Dashboard</span>
        </Button>
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-semibold tracking-tight flex items-center gap-2 text-gray-900 dark:text-zinc-100">
            <Shield className="h-4 w-4 text-emerald-400" />
            Developer Console
            <span className="hidden md:inline text-[10px] font-mono text-gray-400 dark:text-zinc-500 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded px-1.5 py-0.5">
              {window.location.hostname.includes('localhost') ? 'DEV' : 'PROD'}
            </span>
          </h1>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {isHealthy ? 'All systems operational' : 'Service degraded'}
            </span>
            <span className="text-gray-300 dark:text-zinc-700">·</span>
            <span className="font-mono">Session {formatUptime(uptime)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenPalette}
          className="hidden md:flex items-center gap-2 rounded-md border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 hover:bg-gray-50 dark:hover:bg-zinc-900 px-2.5 py-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search commands…</span>
          <kbd className="ml-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 text-[10px] font-mono">
            <CommandIcon className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <button
          onClick={onOpenPalette}
          className="md:hidden flex items-center justify-center h-8 w-8 rounded-md border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 text-gray-500 dark:text-zinc-400"
        >
          <Search className="h-4 w-4" />
        </button>

        {alerts > 0 && (
          <div className="relative">
            <Bell className="h-4 w-4 text-amber-400" />
            <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-gray-900 dark:text-zinc-950 flex items-center justify-center">
              {alerts}
            </span>
          </div>
        )}

        <Badge
          variant="outline"
          className={`gap-1 border ${
            isHealthy
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {isHealthy ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          <span className="hidden sm:inline">API</span> {health?.status || 'DOWN'}
        </Badge>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-100"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>
    </header>
  );
};

export default SuperAdmin;
