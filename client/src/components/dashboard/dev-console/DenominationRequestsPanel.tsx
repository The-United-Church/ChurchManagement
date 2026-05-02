import { useEffect, useMemo, useState } from 'react';
import {
  fetchDenominationRequests,
  approveDenominationRequestApi,
  rejectDenominationRequestApi,
  type DenominationRequestDTO,
} from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  ChevronRight,
} from 'lucide-react';

type Status = 'pending' | 'approved' | 'rejected';

const COLUMNS: { key: Status; label: string; tone: string; dot: string }[] = [
  { key: 'pending',  label: 'Pending Review', tone: 'border-amber-500/30 bg-amber-500/5',   dot: 'bg-amber-400' },
  { key: 'approved', label: 'Approved',       tone: 'border-emerald-500/30 bg-emerald-500/5', dot: 'bg-emerald-400' },
  { key: 'rejected', label: 'Rejected',       tone: 'border-red-500/30 bg-red-500/5',         dot: 'bg-red-400' },
];

const DenominationRequestsPanel: React.FC = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<DenominationRequestDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const [detail, setDetail] = useState<DenominationRequestDTO | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<DenominationRequestDTO | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DenominationRequestDTO | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchDenominationRequests();
      setRequests(res.data || []);
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const g: Record<Status, DenominationRequestDTO[]> = { pending: [], approved: [], rejected: [] };
    requests.forEach((r) => g[r.status]?.push(r));
    Object.values(g).forEach((arr) =>
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    );
    return g;
  }, [requests]);

  const handleApprove = async (req: DenominationRequestDTO) => {
    setWorking(req.id);
    try {
      await approveDenominationRequestApi(req.id);
      toast({ title: 'Approved', description: `${req.denomination_name} approved` });
      setConfirmApprove(null);
      setDetail(null);
      load();
    } catch (e: any) {
      toast({ title: 'Approval failed', description: e?.message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast({ title: 'Reason required', variant: 'destructive' });
      return;
    }
    setWorking(rejectTarget.id);
    try {
      await rejectDenominationRequestApi(rejectTarget.id, rejectReason.trim());
      toast({ title: 'Rejected', description: `${rejectTarget.denomination_name} rejected` });
      setRejectTarget(null);
      setRejectReason('');
      setDetail(null);
      load();
    } catch (e: any) {
      toast({ title: 'Rejection failed', description: e?.message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-400" />
            Denomination Requests
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {requests.length} total · {grouped.pending.length} awaiting review
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs font-medium disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && requests.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className={`rounded-xl border ${col.tone} p-3 min-h-[400px]`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <h3 className="text-sm font-semibold text-zinc-100">{col.label}</h3>
                </div>
                <span className="rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 px-2 py-0.5">
                  {grouped[col.key].length}
                </span>
              </div>

              <div className="space-y-2">
                {grouped[col.key].length === 0 ? (
                  <div className="text-center text-xs text-zinc-600 py-12">No requests</div>
                ) : (
                  grouped[col.key].map((req) => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      working={working === req.id}
                      onView={() => setDetail(req)}
                      onApprove={() => setConfirmApprove(req)}
                      onReject={() => { setRejectTarget(req); setRejectReason(''); }}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-zinc-100">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                  {detail.denomination_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Contact">
                    {detail.first_name} {detail.last_name}
                  </DetailField>
                  <DetailField label="Status">
                    <span className="capitalize">{detail.status}</span>
                  </DetailField>
                </div>
                <DetailField label="Email" icon={Mail}><span className="font-mono text-xs">{detail.email}</span></DetailField>
                {detail.phone && <DetailField label="Phone" icon={Phone}>{detail.phone}</DetailField>}
                {(detail.address || detail.city || detail.state || detail.country) && (
                  <DetailField label="Location" icon={MapPin}>
                    {[detail.address, detail.city, detail.state, detail.country].filter(Boolean).join(', ')}
                  </DetailField>
                )}
                {detail.reason && (
                  <DetailField label="Reason for joining">
                    <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{detail.reason}</p>
                  </DetailField>
                )}
                {detail.rejection_reason && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-1">Rejection reason</div>
                    <p className="text-xs text-red-200">{detail.rejection_reason}</p>
                  </div>
                )}
                <DetailField label="Submitted">
                  {format(new Date(detail.created_at), 'PPpp')}
                </DetailField>
              </div>
              {detail.status === 'pending' && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                    onClick={() => { setRejectTarget(detail); setRejectReason(''); }}
                  >
                    Reject
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    onClick={() => setConfirmApprove(detail)}
                  >
                    Approve
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve confirmation */}
      <ConfirmDialog
        open={!!confirmApprove}
        onOpenChange={(o) => !o && setConfirmApprove(null)}
        title="Approve denomination request?"
        description={confirmApprove ? `This will create a denomination account for "${confirmApprove.denomination_name}" and email ${confirmApprove.email}.` : ''}
        confirmLabel="Approve"
        variant="success"
        loading={working === confirmApprove?.id}
        onConfirm={() => confirmApprove && handleApprove(confirmApprove)}
      />

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Provide a reason for rejecting <strong className="text-zinc-100">{rejectTarget?.denomination_name}</strong>. The applicant will be notified.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Insufficient documentation provided…"
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} className="border-zinc-700 bg-zinc-900 text-zinc-300">
              Cancel
            </Button>
            <Button
              onClick={handleReject}
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

const RequestCard: React.FC<{
  req: DenominationRequestDTO;
  working: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}> = ({ req, working, onView, onApprove, onReject }) => {
  const initials = `${req.first_name?.[0] || ''}${req.last_name?.[0] || ''}`.toUpperCase();
  const isPending = req.status === 'pending';

  return (
    <div
      className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 hover:border-zinc-700 transition-colors cursor-pointer group"
      onClick={onView}
    >
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-zinc-100 truncate">{req.denomination_name}</div>
          <div className="text-[11px] text-zinc-500 truncate">{req.first_name} {req.last_name}</div>
          <div className="font-mono text-[10px] text-zinc-600 truncate">{req.email}</div>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 mt-1" />
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-zinc-800/60">
        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
          <Clock className="h-2.5 w-2.5" />
          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
        </span>
        {isPending && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onApprove}
              disabled={working}
              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50"
              title="Approve"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onReject}
              disabled={working}
              className="p-1 rounded hover:bg-red-500/20 text-red-400 disabled:opacity-50"
              title="Reject"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailField: React.FC<{ label: string; icon?: React.ElementType; children: React.ReactNode }> = ({
  label,
  icon: Icon,
  children,
}) => (
  <div>
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </div>
    <div className="text-sm text-zinc-200">{children}</div>
  </div>
);

export default DenominationRequestsPanel;
