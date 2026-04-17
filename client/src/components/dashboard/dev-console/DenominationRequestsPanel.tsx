import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { toast } from '@/hooks/use-toast';
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Church,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  fetchDenominationRequests,
  approveDenominationRequestApi,
  rejectDenominationRequestApi,
  type DenominationRequestDTO,
} from '@/lib/api';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const DenominationRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<DenominationRequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Approve confirm dialog
  const [approveTarget, setApproveTarget] = useState<DenominationRequestDTO | null>(null);

  // Reject dialog with reason input
  const [rejectTarget, setRejectTarget] = useState<DenominationRequestDTO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDenominationRequests();
      setRequests(res.data || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;
    setActionLoading(approveTarget.id);
    setApproveTarget(null);
    try {
      await approveDenominationRequestApi(approveTarget.id);
      await loadRequests();
    } catch (err: any) {
      toast({ title: 'Failed to approve request', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError('Please provide a reason for rejection.');
      return;
    }
    setActionLoading(rejectTarget.id);
    const target = rejectTarget;
    setRejectTarget(null);
    setRejectReason('');
    setRejectError('');
    try {
      await rejectDenominationRequestApi(target.id, rejectReason.trim());
      await loadRequests();
    } catch (err: any) {
      toast({ title: 'Failed to reject request', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.denomination_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.city?.toLowerCase().includes(q) ||
      r.country?.toLowerCase().includes(q)
    );
  });

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1 text-amber-700 border-amber-200 bg-amber-50">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="gap-1 text-green-700 border-green-200 bg-green-50">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="gap-1 text-red-700 border-red-200 bg-red-50">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Church className="h-5 w-5 text-primary" />
            Denomination Requests
          </h2>
          <p className="text-sm text-muted-foreground">
            Review and approve denomination registration requests
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}{' '}
            <span className="ml-1 opacity-70">({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, denomination…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Denomination</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {search || filterStatus !== 'all'
                      ? 'No matching requests found'
                      : 'No denomination requests yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((req) => {
                  const isExpanded = expandedId === req.id;
                  const isActioning = actionLoading === req.id;
                  return (
                    <>
                      <TableRow
                        key={req.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Church className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            {req.denomination_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {req.first_name} {req.last_name}
                        </TableCell>
                        <TableCell className="text-sm">{req.email}</TableCell>
                        <TableCell>{statusBadge(req.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(req.created_at), 'PP')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {req.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 gap-1 text-xs"
                                  disabled={isActioning}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setApproveTarget(req);
                                  }}
                                >
                                  {isActioning ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 gap-1 text-xs"
                                  disabled={isActioning}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRejectReason('');
                                    setRejectError('');
                                    setRejectTarget(req);
                                  }}
                                >
                                  <XCircle className="h-3 w-3" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <button
                              className="text-muted-foreground ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(isExpanded ? null : req.id);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${req.id}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-start gap-2">
                                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Full Name</p>
                                  <p className="font-medium">
                                    {req.first_name} {req.last_name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Email</p>
                                  <p className="font-medium">{req.email}</p>
                                </div>
                              </div>
                              {req.phone && (
                                <div className="flex items-start gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Phone</p>
                                    <p className="font-medium">{req.phone}</p>
                                  </div>
                                </div>
                              )}
                              {(req.address || req.city || req.state || req.country) && (
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Location</p>
                                    <p className="font-medium">
                                      {[req.address, req.city, req.state, req.country]
                                        .filter(Boolean)
                                        .join(', ')}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {req.reason && (
                                <div className="sm:col-span-2 lg:col-span-3 flex items-start gap-2">
                                  <Church className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Additional Information
                                    </p>
                                    <p className="font-medium whitespace-pre-wrap">{req.reason}</p>
                                  </div>
                                </div>
                              )}
                              {req.rejection_reason && (
                                <div className="sm:col-span-2 lg:col-span-3 flex items-start gap-2">
                                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Rejection Reason</p>
                                    <p className="font-medium text-red-700 whitespace-pre-wrap">
                                      {req.rejection_reason}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {req.reviewed_at && (
                                <div className="flex items-start gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Reviewed</p>
                                    <p className="font-medium">
                                      {format(new Date(req.reviewed_at), 'PPpp')}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Approve confirm dialog ─────────────────────────────────────── */}
      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(o) => { if (!o) setApproveTarget(null); }}
        title="Approve Denomination Request"
        description={`This will create a user account and denomination for ${approveTarget?.first_name} ${approveTarget?.last_name} (${approveTarget?.email}), register "${approveTarget?.denomination_name}", and send their login credentials by email. This action cannot be undone.`}
        onConfirm={handleApproveConfirm}
        confirmLabel="Approve & Send Credentials"
        variant="success"
      />

      {/* ── Reject dialog with reason input ───────────────────────────── */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectReason('');
            setRejectError('');
          }
        }}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-white [&>button]:hidden">
            {/* Red stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-600" />

            {/* Header */}
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full border bg-red-50 border-red-100 mt-0.5">
                  <XCircle className="h-6 w-6 text-red-600" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <h2 className="text-base font-semibold text-gray-900 leading-snug">Reject Denomination Request</h2>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Rejecting <strong>{rejectTarget?.denomination_name}</strong> from{' '}
                    <strong>{rejectTarget?.first_name} {rejectTarget?.last_name}</strong>.
                    The requester will receive an email with your reason.
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-6 my-4 border-t border-gray-200" />

            {/* Reason textarea */}
            <div className="px-6 pb-2 space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Reason for rejection <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="e.g. This denomination is already registered. Please contact support if you believe this is an error."
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (e.target.value.trim()) setRejectError('');
                }}
                rows={4}
                className="resize-none"
              />
              {rejectError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {rejectError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 flex flex-row justify-end gap-2">
              <Button
                variant="outline"
                className="min-w-[90px]"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                  setRejectError('');
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!rejectReason.trim()}
                onClick={handleRejectConfirm}
                className="min-w-[90px] gap-2 bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Reject &amp; Notify
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
};

export default DenominationRequestsPanel;
