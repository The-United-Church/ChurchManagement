import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  ListTodo,
  TrendingUp,
} from 'lucide-react';
import { useFollowUpStats, useFollowUpFunnel } from '@/hooks/useFollowUpsCrud';
import { FOLLOWUP_TYPE_LABELS, type FollowUpType } from '@/types/follow-up';
import { fetchFollowUps } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

const exportCsv = async () => {
  try {
    toast.info('Preparing export...');
    const res = await fetchFollowUps({ status: ['completed'], limit: 1000, page: 1 } as any);
    const data = res.data || [];
    if (data.length === 0) {
      toast.info('No completed follow-ups to export.');
      return;
    }
    const cols = [
      'created_at',
      'completed_date',
      'type',
      'priority',
      'status',
      'target',
      'assignee',
      'notes',
      'outcome_notes',
    ];
    const escape = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const rows = data.map((f: any) => {
      const target =
        (f.person && `${f.person.first_name || ''} ${f.person.last_name || ''}`.trim()) ||
        (f.user && (`${f.user.first_name || ''} ${f.user.last_name || ''}`.trim() || f.user.full_name || f.user.email)) ||
        '';
      const assignee = f.assignee
        ? `${f.assignee.first_name || ''} ${f.assignee.last_name || ''}`.trim() ||
          f.assignee.full_name ||
          f.assignee.email
        : '';
      return [
        f.created_at,
        f.completed_date,
        f.type,
        f.priority,
        f.status,
        target,
        assignee,
        f.notes || '',
        f.outcome_notes || '',
      ]
        .map(escape)
        .join(',');
    });
    const csv = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `followups-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} follow-ups`);
  } catch (err: any) {
    toast.error(err.message || 'Export failed');
  }
};

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: string;
  hint?: string;
}> = ({ title, value, icon, tone = 'text-app-primary', hint }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
        </div>
        <div className={`p-2 rounded-md bg-muted ${tone}`}>{icon}</div>
      </div>
    </CardContent>
  </Card>
);

export const FollowUpAnalytics: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useFollowUpStats();
  const { data: funnel, isLoading: funnelLoading } = useFollowUpFunnel(6);

  if (statsLoading || !stats) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const total = stats.pending + stats.in_progress + stats.completed + stats.cancelled;
  const maxByType = Math.max(1, ...stats.byType.map((b) => Number(b.count) || 0));
  const maxByAssignee = Math.max(1, ...stats.byAssignee.map((b) => Number(b.count) || 0));

  const funnelSteps = funnel
    ? [
        { label: 'New visitors', value: funnel.visitors },
        { label: 'With follow-up', value: funnel.withFollowUps },
        { label: 'Reached', value: funnel.reached },
        { label: 'Converted to member', value: funnel.converted },
      ]
    : [];
  const maxFunnel = Math.max(1, ...funnelSteps.map((s) => s.value || 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Follow-up insights</h3>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<ListTodo className="h-4 w-4" />}
          tone="text-yellow-600"
          hint={`${stats.pendingThisMonth} this month`}
        />
        <StatCard
          title="In progress"
          value={stats.in_progress}
          icon={<Clock className="h-4 w-4" />}
          tone="text-blue-600"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle className="h-4 w-4" />}
          tone="text-green-600"
          hint={`${stats.completedThisMonth} this month`}
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="text-red-600"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-app-primary" />
            Completion rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={stats.completionRate} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats.completionRate.toFixed(1)}% completed</span>
            <span>
              {stats.completed} / {total} total
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Funnel */}
      {funnel && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversion funnel (last 6 months)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {funnelLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              funnelSteps.map((step) => {
                const pct = (step.value / maxFunnel) * 100;
                return (
                  <div key={step.label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span>{step.label}</span>
                      <span className="font-mono">{step.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-app-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
            {funnel.visitors > 0 && (
              <div className="text-[11px] text-muted-foreground pt-1">
                Conversion rate: {((funnel.converted / funnel.visitors) * 100).toFixed(1)}% of visitors
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* By type */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">By type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.byType.length === 0 && (
            <div className="text-xs text-muted-foreground italic">No data yet.</div>
          )}
          {stats.byType.map((row) => {
            const count = Number(row.count) || 0;
            const pct = (count / maxByType) * 100;
            return (
              <div key={row.type}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span>{FOLLOWUP_TYPE_LABELS[row.type as FollowUpType] || row.type}</span>
                  <span className="font-mono">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-app-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* By assignee */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Leaderboard — assignees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.byAssignee.length === 0 && (
            <div className="text-xs text-muted-foreground italic">No assignments yet.</div>
          )}
          {stats.byAssignee.map((row, i) => {
            const count = Number(row.count) || 0;
            const pct = (count / maxByAssignee) * 100;
            return (
              <div key={row.assignee_id || `unassigned-${i}`}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[9px]">
                      #{i + 1}
                    </Badge>
                    {row.assignee_name || 'Unassigned'}
                  </span>
                  <span className="font-mono">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-app-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
