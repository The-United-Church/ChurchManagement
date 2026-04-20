import React from 'react';
import type { Person } from '@/types/person';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, Mail, MapPin, Phone, User } from 'lucide-react';

interface PersonDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person | null;
}

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const fullName = (p: Person) => `${p.first_name} ${p.last_name}`.trim();
const displayGender = (value?: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A');

const initials = (p: Person) => {
  const first = (p.first_name || '').trim().charAt(0);
  const last = (p.last_name || '').trim().charAt(0);
  const combined = `${first}${last}`.toUpperCase();
  return combined || 'NA';
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

const PersonDetailsDialog: React.FC<PersonDetailsDialogProps> = ({ open, onOpenChange, person }) => {
  if (!person) return null;

  const name = fullName(person) || 'Person Details';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80dvh] overflow-hidden bg-white p-0 flex flex-col">
        <div className="shrink-0 border-b border-app-primary-light bg-gradient-to-r from-app-primary-light/70 via-white to-app-primary-light/30 px-6 py-5">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-app-primary-light shadow-sm">
                  <AvatarImage src={person.profile_image || ''} alt={name} />
                  <AvatarFallback className="bg-app-primary-light/60 text-sm font-semibold text-app-selected-text">
                    {initials(person)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-2xl font-semibold leading-tight text-app-selected-text">{name}</DialogTitle>
                  <p className="mt-1 text-sm text-app-selected-text/80">Person profile overview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {person.converted_user_id ? (
                  <Badge className="border-transparent bg-app-primary text-app-primary-foreground hover:bg-app-primary">Member</Badge>
                ) : (
                  <Badge variant="outline" className="border-app-primary-light pr-5 text-app-selected-text">Person</Badge>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 px-6 py-5">
          <Card className="border border-app-primary-light shadow-none">
            <CardContent className="space-y-3 p-4">
              <h3 className="text-sm font-semibold text-app-selected-text">Personal Information</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="First Name" value={person.first_name} icon={<User className="h-4 w-4 text-app-primary" />} />
                <Field label="Last Name" value={person.last_name} icon={<User className="h-4 w-4 text-app-primary" />} />
                <Field label="Middle Name" value={person.middle_name} />
                <Field label="Nickname" value={person.nickname} />
                <Field label="Gender" value={displayGender(person.gender)} />
                <Field label="Birthdate" value={formatDate(person.birthdate)} icon={<CalendarDays className="h-4 w-4 text-app-primary" />} />
                <Field label="Joined Date" value={formatDate(person.created_at)} icon={<CalendarDays className="h-4 w-4 text-app-primary" />} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-app-primary-light shadow-none">
            <CardContent className="space-y-3 p-4">
              <h3 className="text-sm font-semibold text-app-selected-text">Contact and Location</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Email" value={person.email} icon={<Mail className="h-4 w-4 text-app-primary" />} />
                <Field label="Phone" value={person.phone} icon={<Phone className="h-4 w-4 text-app-primary" />} />
                <Field label="Country" value={person.country} icon={<MapPin className="h-4 w-4 text-app-primary" />} />
                <Field label="State / Region" value={person.state} icon={<MapPin className="h-4 w-4 text-app-primary" />} />
                <Field label="City" value={person.city} icon={<MapPin className="h-4 w-4 text-app-primary" />} />
                <div className="sm:col-span-2">
                  <Field label="Address" value={person.address} icon={<MapPin className="h-4 w-4 text-app-primary" />} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonDetailsDialog;
