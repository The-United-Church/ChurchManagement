import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  fetchUsers,
  fetchUserStatistics,
  fetchRecentActivities,
  fetchRoles,
  fetchHealth,
} from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import { Navigate } from 'react-router-dom';
import { Shield, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

import DevSidebar, { MobileNav, type DevSection } from '@/components/dashboard/dev-console/DevSidebar';
import OverviewPanel from '@/components/dashboard/dev-console/OverviewPanel';
import AnalyticsPanel from '@/components/dashboard/dev-console/AnalyticsPanel';
import UsersPanel from '@/components/dashboard/dev-console/UsersPanel';
import ActivityPanel from '@/components/dashboard/dev-console/ActivityPanel';
import SystemPanel from '@/components/dashboard/dev-console/SystemPanel';
import type { DisplayUser, UserStats, RoleInfo, HealthInfo, ActivityLog, BackendUser } from '@/components/dashboard/dev-console/types';

const SuperAdmin = () => {
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { effectiveRole } = useChurch();

  const [section, setSection] = useState<DevSection>('overview');
  const [collapsed, setCollapsed] = useState(false);

  // Data
  const [displayUsers, setDisplayUsers] = useState<DisplayUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBackendData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [usersRes, statsRes, recentRes, rolesRes, healthRes] = await Promise.allSettled([
        fetchUsers(),
        fetchUserStatistics(),
        fetchRecentActivities(10),
        fetchRoles(),
        fetchHealth(),
      ]);
      if (usersRes.status === 'fulfilled') {
        setDisplayUsers(
          (usersRes.value.data as BackendUser[]).map((u) => ({
            id: u.id,
            email: u.email,
            name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
            role: u.role?.name || '—',
            status: u.is_active ? 'active' : 'inactive',
            joinDate: u.createdAt || '',
          }))
        );
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (recentRes.status === 'fulfilled') setRecentActivities(recentRes.value.data);
      if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value.data);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) loadBackendData();
  }, [isAuthenticated, loadBackendData]);

  if (authLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (effectiveRole !== 'super_admin') return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex h-screen bg-gray-50">
      <DevSidebar current={section} onChange={setSection} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header health={health} loading={loading} onRefresh={loadBackendData} />
        <MobileNav current={section} onChange={setSection} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {section === 'overview' && (
            <OverviewPanel stats={stats} userCount={displayUsers.length} roles={roles} recentActivities={recentActivities} loading={loading} />
          )}
          {section === 'analytics' && <AnalyticsPanel />}
          {section === 'users' && <UsersPanel users={displayUsers} loading={loading} />}
          {section === 'activity' && <ActivityPanel />}
          {section === 'system' && (
            <SystemPanel roles={roles} health={health} stats={stats} userCount={displayUsers.length} activityTotal={0} loading={loading} onRefresh={loadBackendData} />
          )}
        </main>
      </div>
    </div>
  );
};

const Header: React.FC<{
  health: HealthInfo | null;
  loading: boolean;
  onRefresh: () => void;
}> = ({ health, loading, onRefresh }) => (
  <header className="border-b bg-white px-4 md:px-6 py-4 flex items-center justify-between">
    <div>
      <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
        <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
        Developer Console
      </h1>
      <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">
        Application monitoring &amp; user oversight
      </p>
    </div>
    <div className="flex items-center gap-3">
      {health && (
        <Badge variant={health.status === 'OK' ? 'default' : 'destructive'} className="gap-1">
          {health.status === 'OK' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          API {health.status}
        </Badge>
      )}
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
        <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
    </div>
  </header>
);

export default SuperAdmin;
