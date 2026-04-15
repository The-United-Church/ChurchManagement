import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, UserCheck, UserX, Shield, Activity, Clock } from 'lucide-react';
import { actionColors, timeAgo } from './helpers';
import type { UserStats, RoleInfo, ActivityLog } from './types';

interface OverviewPanelProps {
  stats: UserStats | null;
  userCount: number;
  roles: RoleInfo[];
  recentActivities: ActivityLog[];
  loading: boolean;
}

const OverviewPanel: React.FC<OverviewPanelProps> = ({
  stats,
  userCount,
  roles,
  recentActivities,
  loading,
}) => (
  <div className="space-y-6">
    <StatCards stats={stats} userCount={userCount} roleCount={roles.length} />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <RecentActivityFeed activities={recentActivities} loading={loading} />
      <UsersByRole stats={stats} loading={loading} />
    </div>
  </div>
);

const StatCards: React.FC<{ stats: UserStats | null; userCount: number; roleCount: number }> = ({
  stats,
  userCount,
  roleCount,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard title="Total Users" value={stats?.totalUsers ?? userCount} icon={Users} />
    <StatCard title="Active Users" value={stats?.activeUsers ?? '—'} icon={UserCheck} color="text-green-600" />
    <StatCard title="Inactive Users" value={stats?.inactiveUsers ?? '—'} icon={UserX} color="text-red-500" />
    <StatCard title="Roles Defined" value={roleCount} icon={Shield} />
  </div>
);

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
}> = ({ title, value, icon: Icon, color }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
    </CardHeader>
    <CardContent>
      <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
    </CardContent>
  </Card>
);

const RecentActivityFeed: React.FC<{ activities: ActivityLog[]; loading: boolean }> = ({
  activities,
  loading,
}) => (
  <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Activity className="h-4 w-4" /> Recent Activity
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ScrollArea className="h-[360px] pr-3">
        {activities.length === 0 && (
          <div className="py-10 text-center">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading activity...' : 'No recent activity recorded'}
            </p>
          </div>
        )}
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              <Badge className={`text-[10px] px-1.5 py-0 mt-0.5 ${actionColors[a.action] || 'bg-gray-100 text-gray-700'}`}>
                {a.action}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{a.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.user?.email || 'system'} &middot; <span className="capitalize">{a.entityType?.replace('_', ' ')}</span>
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(a.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </CardContent>
  </Card>
);

const UsersByRole: React.FC<{ stats: UserStats | null; loading?: boolean }> = ({ stats, loading }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Users className="h-4 w-4" /> Users by Role
      </CardTitle>
    </CardHeader>
    <CardContent>
      {stats?.usersByRole && stats.usersByRole.length > 0 ? (
        <div className="space-y-3">
          {stats.usersByRole.map((r) => (
            <div key={r.role} className="flex items-center justify-between">
              <span className="text-sm capitalize">{r.role}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, (r.count / (stats.totalUsers || 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{r.count}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">{loading ? 'Loading...' : 'No data'}</p>
      )}
    </CardContent>
  </Card>
);

export default OverviewPanel;
