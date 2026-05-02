import { useEffect, useMemo, useState } from 'react';
import {
  fetchAllCustomDomainsApi,
  approveCustomDomainApi,
  rejectCustomDomainApi,
  deactivateCustomDomainApi,
  reactivateCustomDomainApi,
  type CustomDomainDTO,
} from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Search,
} from 'lucide-react';

type Status = 'pending' | 'active' | 'inactive' | 'rejected';

const PIPELINE_STAGES: { key: string; label: string; matches: Status[] }[] = [
  { key: 'submitted', label: 'Submitted', matches: ['pending', 'active', 'inactive', 'rejected'] },
  { key: 'reviewed',  label: 'Reviewed',  matches: ['active', 'inactive', 'rejected'] },
  { key: 'live',      label: 'Live',      matches: ['active'] },
];

const STATUS_COLORS: Record<Status, { tone: string; text: string; dot: string; gradient: string }> = {
  pending:  { tone: 'border-amber-500/30 bg-amber-500/5',     text: 'text-amber-300',   dot: 'bg-amber-400',   gradient: 'from-amber-500 to-amber-600' },
  active:   { tone: 'border-emerald-500/30 bg-emerald-500/5', text: 'text-emerald-300', dot: 'bg-emerald-400', gradient: 'from-emerald-500 to-emerald-600' },
  inactive: { tone: 'border-zinc-700 bg-zinc-900/40',         text: 'text-zinc-400',    dot: 'bg-zinc-500',    gradient: 'from-zinc-600 to-zinc-700' },
  rejected: { tone: 'border-red-500/30 bg-red-500/5',         text: 'text-red-300',     dot: 'bg-red-400',     gradient: 'from-red-500 to-red-600' },
};

const CustomDomainsPanel: React.FC = () => {
  const { toast } = useToast();
  const [domains, setDomains] = useState<CustomDomainDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [confirmApprove, setConfirmApprove] = useState<CustomDomainDTO | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CustomDomainDTO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState<CustomDomainDTO | null>(null);
  const [confirmReactivate, setConfirmReactivate] = useState<CustomDomainDTO | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAllCustomDomainsApi();
      setDomains(res.data || []);
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { pending: 0, active: 0, inactive: 0, rejected: 0 };
    domains.forEach((d) => { c[d.status]++; });
    return c;
  }, [domains]);

  const filtered = useMemo(() => {
    return domains.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        d.domain.toLowerCase().includes(q) ||
        d.display_name?.toLowerCase().includes(q) ||
        d.church_name?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [domains, search, statusFilter]);

  const copyDomain = async (d: CustomDomainDTO) => {
    try {
      await navigator.clipboard.writeText(d.domain);
      setCopiedId(d.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch { /* ignore */ }
  };

  const onApprove = async (d: CustomDomainDTO) => {
    setWorking(d.id);
    try {
      await approveCustomDomainApi(d.id);
      toast({ title: 'Approved', description: `${d.domain} is now live` });
      setConfirmApprove(null);
      load();
    } catch (e: any) {
      toast({ title: 'Approval failed', description: e?.message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const onReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setWorking(rejectTarget.id);
    try {
      await rejectCustomDomainApi(rejectTarget.id, rejectReason.trim());
      toast({ title: 'Rejected', description: `${rejectTarget.domain} rejected` });
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (e: any) {
      toast({ title: 'Rejection failed', description: e?.message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const onDeactivate = async (d: CustomDomainDTO) => {
    setWorking(d.id);
    try {
      await deactivateCustomDomainApi(d.id);
      toast({ title: 'Deactivated', description: `${d.domain} suspended` });
      setConfirmDeactivate(null);
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const onReactivate = async (d: CustomDomainDTO) => {
    setWorking(d.id);
    try {
      await reactivateCustomDomainApi(d.id);
      toast({ title: 'Reactivated', description: `${d.domain} live again` });
      setConfirmReactivate(null);
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-400" />
            Custom Domains
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {domains.length} total · {counts.pending} pending · {counts.active} live
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs font-medium disabled:opacity-50 w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['pending', 'active', 'inactive', 'rejected'] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={`text-left rounded-xl border p-3 transition-all ${
              statusFilter === s
                ? `${STATUS_COLORS[s].tone} ring-1 ring-current ${STATUS_COLORS[s].text}`
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{s}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[s].dot}`} />
            </div>
            <div className={`text-2xl font-semibold tabular-nums mt-1 ${statusFilter === s ? STATUS_COLORS[s].text : 'text-zinc-100'}`}>
              {counts[s]}
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search domains, churches…"
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700"
          />
        </div>
        {statusFilter !== 'all' && (
          <button
            onClick={() => setStatusFilter('all')}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Pipeline cards */}
      {loading && domains.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-12 text-center">
          <Globe className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No domains found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DomainCard
              key={d.id}
              domain={d}
              working={working === d.id}
              copied={copiedId === d.id}
              onCopy={() => copyDomain(d)}
              onApprove={() => setConfirmApprove(d)}
              onReject={() => { setRejectTarget(d); setRejectReason(''); }}
              onDeactivate={() => setConfirmDeactivate(d)}
              onReactivate={() => setConfirmReactivate(d)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmApprove}
        onOpenChange={(o) => !o && setConfirmApprove(null)}
        title="Approve custom domain?"
        description={confirmApprove ? `This will publish ${confirmApprove.domain} and notify the requester.` : ''}
        confirmLabel="Approve"
        variant="success"
        loading={working === confirmApprove?.id}
        onConfirm={() => confirmApprove && onApprove(confirmApprove)}
      />

      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(o) => !o && setConfirmDeactivate(null)}
        title="Deactivate domain?"
        description={confirmDeactivate ? `${confirmDeactivate.domain} will stop serving content immediately.` : ''}
        confirmLabel="Deactivate"
        variant="danger"
        loading={working === confirmDeactivate?.id}
        onConfirm={() => confirmDeactivate && onDeactivate(confirmDeactivate)}
      />

      <ConfirmDialog
        open={!!confirmReactivate}
        onOpenChange={(o) => !o && setConfirmReactivate(null)}
        title="Reactivate domain?"
        description={confirmReactivate ? `${confirmReactivate.domain} will go live again.` : ''}
        confirmLabel="Reactivate"
        variant="success"
        loading={working === confirmReactivate?.id}
        onConfirm={() => confirmReactivate && onReactivate(confirmReactivate)}
      />

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Reject Domain Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Provide a reason for rejecting <strong className="text-zinc-100 font-mono">{rejectTarget?.domain}</strong>.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Domain ownership not verified…"
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} className="border-zinc-700 bg-zinc-900 text-zinc-300">
              Cancel
            </Button>
            <Button
              onClick={onReject}
              disabled={!rejectReason.trim() || working === rejectTarget?.id}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {working === rejectTarget?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DomainCard: React.FC<{
  domain: CustomDomainDTO;
  working: boolean;
  copied: boolean;
  onCopy: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}> = ({ domain: d, working, copied, onCopy, onApprove, onReject, onDeactivate, onReactivate }) => {
  const tone = STATUS_COLORS[d.status];

  // pipeline progress
  const progress = (() => {
    if (d.status === 'rejected') return { pct: 50, label: 'Rejected at review' };
    if (d.status === 'pending') return { pct: 33, label: 'Awaiting review' };
    if (d.status === 'inactive') return { pct: 66, label: 'Reviewed, currently inactive' };
    return { pct: 100, label: 'Live in production' };
  })();

  const previewUrl = `https://${d.domain}`;

  return (
    <div className={`rounded-xl border ${tone.tone} p-4 transition-all hover:shadow-lg`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`h-10 w-10 rounded-md bg-gradient-to-br ${tone.gradient} flex items-center justify-center flex-shrink-0`}>
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-zinc-100 truncate">{d.domain}</span>
              <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${tone.tone} ${tone.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot} ${d.status === 'active' ? 'animate-pulse' : ''}`} />
                {d.status}
              </span>
            </div>
            <div className="text-xs text-zinc-400 mt-0.5 truncate">
              {d.display_name || d.church_name || '—'}
              {d.branch?.name && <span className="text-zinc-500"> · {d.branch.name}</span>}
              {d.denomination?.denomination_name && <span className="text-zinc-600"> · {d.denomination.denomination_name}</span>}
            </div>
            {d.created_at && (
              <div className="text-[10px] text-zinc-600 mt-0.5">
                Submitted {format(new Date(d.created_at), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-xs"
            title="Copy domain"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {d.status === 'active' && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 text-xs"
              title="Open live site"
            >
              <ExternalLink className="h-3 w-3" />
              Visit
            </a>
          )}
        </div>
      </div>

      {/* Pipeline progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
          {PIPELINE_STAGES.map((stage, i) => {
            const reached =
              (stage.key === 'submitted') ||
              (stage.key === 'reviewed' && (d.status === 'active' || d.status === 'inactive' || d.status === 'rejected')) ||
              (stage.key === 'live' && d.status === 'active');
            return (
              <span
                key={stage.key}
                className={`uppercase tracking-wider font-semibold ${reached ? tone.text : 'text-zinc-700'}`}
                style={{ flex: i === PIPELINE_STAGES.length - 1 ? 'none' : 1 }}
              >
                {stage.label}
              </span>
            );
          })}
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${tone.gradient} transition-all`}
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        <div className="text-[10px] text-zinc-500 mt-1">{progress.label}</div>
      </div>

      {/* Rejection reason */}
      {d.status === 'rejected' && d.rejection_reason && (
        <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/5 p-2">
          <div className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-0.5">Rejected</div>
          <div className="text-xs text-red-200">{d.rejection_reason}</div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center gap-2 flex-wrap">
        {d.status === 'pending' && (
          <>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={working}
              className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={working}
              className="h-7 border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </>
        )}
        {d.status === 'active' && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDeactivate}
            disabled={working}
            className="h-7 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs"
          >
            <Pause className="h-3 w-3 mr-1" />
            Deactivate
          </Button>
        )}
        {d.status === 'inactive' && (
          <Button
            size="sm"
            onClick={onReactivate}
            disabled={working}
            className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
          >
            <Play className="h-3 w-3 mr-1" />
            Reactivate
          </Button>
        )}
        {working && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}
      </div>
    </div>
  );
};

export default CustomDomainsPanel;
