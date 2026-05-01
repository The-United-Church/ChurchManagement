import React from 'react';
import type { MemberDTO } from '@/hooks/useMemberCrud';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Activity, CalendarDays, Mail, MapPin, Phone, Shield, User } from 'lucide-react';

interface MemberDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberDTO | null;
}

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const displayName = (m: MemberDTO) => {
  const full = m.full_name?.trim();
  if (full) return full;
  const composed = `${m.first_name || ''} ${m.last_name || ''}`.trim();
  return composed || m.email;
};

const initials = (m: MemberDTO) => {
  const name = displayName(m);
  const parts = name.split(' ').filter(Boolean);
  const first = parts[0]?.charAt(0) || '';
  const second = parts[1]?.charAt(0) || '';
  return `${first}${second}`.toUpperCase() || 'NA';
};

const Field: React.FC<{ label: string; value?: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-lg border border-app-primary-light/70 bg-gradient-to-b from-white to-app-primary-light/20 px-3 py-2">
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-app-selected-text/80">{label}</p>
    <p className="flex items-center gap-2 text-sm text-app-selected-text">
      {icon}
      <span className="break-words">{value && value.trim() ? value : 'N/A'}</span>
    </p>
  </div>
);

const MemberDetailsDialog: React.FC<MemberDetailsDialogProps> = ({ open, onOpenChange, member }) => {
  if (!member) return null;

  const name = displayName(member);
  const roleLabel = member.branch_role || member.role || 'member';
  const joinedDate = ((member as any).created_at || (member as any).createdAt || '') as string;
  const hasSharedPresence = typeof member.is_online === 'boolean';
  const presenceText = !hasSharedPresence
    ? 'Not shared'
    : member.is_online
      ? 'Online now'
      : formatDateTime(member.last_access)
        ? `Last seen ${formatDateTime(member.last_access)}`
        : 'Offline';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80dvh] overflow-hidden bg-white p-0 flex flex-col">
        <div className="shrink-0 border-b border-app-primary-light bg-gradient-to-r from-app-primary-light/70 via-white to-app-primary-light/30 px-6 py-5">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-app-primary-light shadow-sm">
                  <AvatarImage src={member.profile_img || member.profile_image || ''} alt={name} />
                  <AvatarFallback className="bg-app-primary-light/60 text-sm font-semibold text-app-selected-text">
                    {initials(member)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-2xl font-semibold leading-tight text-app-selected-text">{name}</DialogTitle>
                  <p className="mt-1 text-sm text-app-selected-text/80">Member profile overview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="border-transparent bg-app-primary text-app-primary-foreground hover:bg-app-primary">{roleLabel}</Badge>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 px-6 py-5">
          <Card className="border border-app-primary-light shadow-none">
            <CardContent className="space-y-3 p-4">
              <h3 className="text-sm font-semibold text-app-selected-text">Member Information</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="First Name" value={member.first_name || ''} icon={<User className="h-4 w-4 text-app-primary" />} />
                <Field label="Last Name" value={member.last_name || ''} icon={<User className="h-4 w-4 text-app-primary" />} />
                <Field label="Email" value={member.email} icon={<Mail className="h-4 w-4 text-app-primary" />} />
                <Field label="Phone" value={member.phone_number || ''} icon={<Phone className="h-4 w-4 text-app-primary" />} />
                <Field label="Branch Role" value={roleLabel} icon={<Shield className="h-4 w-4 text-app-primary" />} />
                <Field label="Branch Status" value={member.branch_is_active === false ? 'Inactive' : 'Active'} icon={<Shield className="h-4 w-4 text-app-primary" />} />
                <Field label="Presence" value={presenceText} icon={<Activity className={`h-4 w-4 ${member.is_online ? 'text-emerald-500' : 'text-app-primary'}`} />} />
                <Field label="Location" value={[ (member as any).city, (member as any).state, (member as any).country ].filter(Boolean).join(', ')} icon={<MapPin className="h-4 w-4 text-app-primary" />} />
                <Field label="Joined Date" value={formatDate(joinedDate)} icon={<CalendarDays className="h-4 w-4 text-app-primary" />} />
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberDetailsDialog;
