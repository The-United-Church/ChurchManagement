import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Globe, Loader2, Trash2, Copy, ExternalLink } from 'lucide-react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  fetchBranchCustomDomainApi,
  upsertBranchCustomDomainApi,
  deleteBranchCustomDomainApi,
  type BranchDTO,
  type CustomDomainDTO,
  type LandingConfig,
  type UpsertCustomDomainPayload,
} from '@/lib/api';
import { uploadToCloudinary } from '@/lib/cloudinary';
import LandingPageEditor from './LandingPageEditor';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The active denomination — required to scope the API call. */
  churchId: string;
  branch: BranchDTO | null;
}

interface FormState {
  domain: string;
  display_name: string;
  logo_url: string;
  church_name: string;
  address: string;
  pastor_name: string;
  contact_email: string;
  contact_phone: string;
  tagline: string;
  primary_color: string;
  allow_self_signup: boolean;
  landing_config: LandingConfig | null;
}

const EMPTY: FormState = {
  domain: '',
  display_name: '',
  logo_url: '',
  church_name: '',
  address: '',
  pastor_name: '',
  contact_email: '',
  contact_phone: '',
  tagline: '',
  primary_color: '',
  allow_self_signup: true,
  landing_config: null,
};

/**
 * The platform base domain. Set VITE_BASE_DOMAIN in your .env to override.
 * Strips any accidental protocol/port so the value is always a bare hostname.
 * Example: "churchflow.app"  →  user types "grace", gets "grace.churchflow.app"
 */
const BASE_DOMAIN = (
  (import.meta.env.VITE_BASE_DOMAIN as string | undefined) || 'churchflow.app'
)
  .replace(/^https?:\/\//, '')
  .replace(/:\/.*$/, '')
  .replace(/:\/\/.*$/, '')
  .replace(/\/.*$/, '')
  .replace(/:\d+$/, '')
  .toLowerCase()
  .trim() || 'churchflow.app';

/** Lowercase alphanumeric + hyphens, no leading/trailing hyphen, 1-63 chars. */
const isValidSubdomain = (s: string) =>
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(s.trim());

/** Build the full hostname from user input: if it already looks like a full
 * domain (contains a dot) leave it untouched; otherwise append BASE_DOMAIN. */
const toFullDomain = (raw: string): string => {
  const s = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return s.includes('.') ? s : `${s}.${BASE_DOMAIN}`;
};

const StatusBadge: React.FC<{ status: CustomDomainDTO['status'] }> = ({ status }) => {
  const map: Record<CustomDomainDTO['status'], string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
    active: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30',
    inactive: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30',
    rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
  };
  return (
    <Badge variant="outline" className={`text-xs uppercase tracking-wide ${map[status]}`}>
      {status}
    </Badge>
  );
};

const CustomDomainSettingsDialog: React.FC<Props> = ({ open, onOpenChange, churchId, branch }) => {
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [existing, setExisting] = useState<CustomDomainDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  // Hydrate the form whenever the dialog opens for a branch.
  useEffect(() => {
    if (!open || !branch) return;
    setLoading(true);
    fetchBranchCustomDomainApi(churchId, branch.id)
      .then((res) => {
        const record = res?.data ?? null;
        setExisting(record);
        if (record) {
          // If the stored domain ends with our base domain, strip the suffix
          // so the input shows only the short prefix the user typed.
          const storedPrefix = record.domain.endsWith(`.${BASE_DOMAIN}`)
            ? record.domain.slice(0, -(BASE_DOMAIN.length + 1))
            : record.domain;
          setForm({
            domain: storedPrefix,
            display_name: record.display_name ?? '',
            logo_url: record.logo_url ?? '',
            church_name: record.church_name ?? '',
            address: record.address ?? '',
            pastor_name: record.pastor_name ?? '',
            contact_email: record.contact_email ?? '',
            contact_phone: record.contact_phone ?? '',
            tagline: record.tagline ?? '',
            primary_color: record.primary_color ?? '',
            allow_self_signup: record.allow_self_signup,
            landing_config: record.landing_config ?? null,
          });
        } else {
          setForm({
            ...EMPTY,
            display_name: branch.name ?? '',
            church_name: branch.name ?? '',
            address: branch.address ?? '',
            pastor_name: branch.pastor_name ?? '',
          });
        }
      })
      .catch(() => {
        setExisting(null);
        setForm({
          ...EMPTY,
          display_name: branch.name ?? '',
          church_name: branch.name ?? '',
          address: branch.address ?? '',
          pastor_name: branch.pastor_name ?? '',
        });
      })
      .finally(() => setLoading(false));
  }, [open, branch, churchId]);

  const handleLogoPick = async (file: File) => {
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadToCloudinary(file, 'custom-domains');
      set('logo_url', url);
    } catch {
      toast.error('Logo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;

    const prefix = form.domain.trim().toLowerCase();
    if (!prefix) {
      toast.error('Please enter a subdomain name.');
      return;
    }
    // If the user typed a simple label (no dot), validate as subdomain label.
    // If they typed a full hostname (contains dot), accept as-is.
    if (!prefix.includes('.') && !isValidSubdomain(prefix)) {
      toast.error('Use only letters, numbers, and hyphens (no spaces or special characters).');
      return;
    }

    const fullDomain = toFullDomain(prefix);

    const payload: UpsertCustomDomainPayload = {
      domain: fullDomain,
      display_name: form.display_name.trim() || branch.name,
      logo_url: form.logo_url || undefined,
      church_name: form.church_name.trim() || branch.name,
      address: form.address || undefined,
      pastor_name: form.pastor_name || undefined,
      contact_email: form.contact_email || undefined,
      contact_phone: form.contact_phone || undefined,
      tagline: form.tagline || undefined,
      primary_color: form.primary_color || undefined,
      allow_self_signup: form.allow_self_signup,
      landing_config: form.landing_config,
    };

    try {
      setSaving(true);
      const res = await upsertBranchCustomDomainApi(churchId, branch.id, payload);
      setExisting(res.data);
      toast.success(res.message ?? 'Custom domain saved.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save custom domain');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!branch || !existing) return;
    setConfirmRemoveOpen(true);
  };

  const doRemove = async () => {
    if (!branch || !existing) return;
    try {
      setRemoving(true);
      await deleteBranchCustomDomainApi(churchId, branch.id);
      toast.success('Custom domain removed');
      setExisting(null);
      setForm({ ...EMPTY });
      setConfirmRemoveOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to remove custom domain');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Custom Domain
            {existing && <StatusBadge status={existing.status} />}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Allow your members to sign in via your own domain with branded sign-in &amp; sign-up pages.
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            {existing?.status === 'rejected' && existing.rejection_reason && (
              <div className="rounded-md border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-300">
                <strong>Rejected:</strong> {existing.rejection_reason}
                <p className="text-xs mt-1">Make changes below and re-submit for review.</p>
              </div>
            )}
            {existing?.status === 'pending' && (
              <div className="rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                Your custom domain is awaiting super admin approval.
              </div>
            )}
            {existing?.status === 'active' && (
              <div className="rounded-md border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-300 flex items-center justify-between gap-3">
                <div>
                  Your custom domain is <strong>active</strong>. Point your DNS to Church Flow.
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2"
                    onClick={() => { navigator.clipboard.writeText(existing.domain); toast.success('Copied'); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <a href={`https://${existing.domain}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs underline">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
            {existing?.status === 'inactive' && (
              <div className="rounded-md border border-slate-200 dark:border-slate-500/30 bg-slate-50 dark:bg-slate-500/10 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                This domain has been deactivated by an administrator. Save changes below to request re-activation.
              </div>
            )}

            {/* Logo */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
                <AvatarImage src={form.logo_url} className="object-cover rounded-lg" />
                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 text-xs">No logo</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label className="text-xs">Logo</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Shown on the branded sign-in &amp; sign-up pages.
                </p>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white dark:bg-gray-800 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 dark:border-gray-700">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Upload
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoPick(f); }}
                  />
                </label>
              </div>
            </div>

            {/* Domain */}
            <div className="space-y-2">
              <Label htmlFor="cd-domain">Subdomain *</Label>
              <div className="flex items-center rounded-md border ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden">
                <input
                  id="cd-domain"
                  className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="grace"
                  value={form.domain}
                  onChange={(e) => set('domain', e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))}
                  autoComplete="off"
                  required
                />
                <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-l select-none whitespace-nowrap">
                  .{BASE_DOMAIN}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your link will be{' '}
                <code className="font-mono">
                  {form.domain.trim() ? toFullDomain(form.domain) : `yourname.${BASE_DOMAIN}`}
                </code>.
                Advanced: type a full domain (e.g.{' '}<code>members.mychurch.org</code>) to use your own.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cd-display">Display Name</Label>
                <Input id="cd-display" value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cd-church">Church Name</Label>
                <Input id="cd-church" value={form.church_name} onChange={(e) => set('church_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cd-pastor">Pastor</Label>
                <Input id="cd-pastor" value={form.pastor_name} onChange={(e) => set('pastor_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cd-address">Address</Label>
                <Input id="cd-address" value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cd-email">Contact Email</Label>
                <Input id="cd-email" type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cd-phone">Contact Phone</Label>
                <Input id="cd-phone" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cd-tagline">Tagline</Label>
                <Textarea id="cd-tagline" rows={2} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cd-color">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="cd-color"
                    type="color"
                    className="h-10 w-16 p-1"
                    value={form.primary_color || '#6366F1'}
                    onChange={(e) => set('primary_color', e.target.value)}
                  />
                  <Input
                    placeholder="#6366F1"
                    value={form.primary_color}
                    onChange={(e) => set('primary_color', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2 flex items-end">
                <div className="flex items-center justify-between w-full rounded-md border px-3 py-2">
                  <div>
                    <Label className="text-sm">Allow self sign-up</Label>
                    <p className="text-xs text-muted-foreground">
                      Visitors who sign up are auto-routed into your branch's join queue.
                    </p>
                  </div>
                  <Switch
                    checked={form.allow_self_signup}
                    onCheckedChange={(v) => set('allow_self_signup', v)}
                  />
                </div>
              </div>
            </div>

            <LandingPageEditor
              value={form.landing_config}
              onChange={(v) => set('landing_config', v)}
            />

            <DialogFooter className="gap-2 sm:gap-2">
              {existing && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  onClick={handleRemove}
                  disabled={removing || saving}
                >
                  {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                  Remove
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {existing ? 'Save changes' : 'Submit for approval'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmRemoveOpen}
      onOpenChange={setConfirmRemoveOpen}
      title="Remove custom domain?"
      description="This will permanently remove the custom domain configuration for this branch. This cannot be undone."
      confirmLabel="Remove"
      variant="danger"
      loading={removing}
      onConfirm={doRemove}
    />
    </>
  );
};

export default CustomDomainSettingsDialog;
