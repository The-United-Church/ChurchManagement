import React from 'react';
import {
  ExternalLink, Phone, Mail, MapPin, Calendar, Heart, Briefcase, Building2,
  BadgeCheck, Link as LinkIcon, Users, MessageCircle, User, Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ChatParticipant } from '@/lib/chat';
import type { DirectoryUserDTO } from '@/lib/api';

export type ChatProfileState = {
  participant: ChatParticipant;
  profile: DirectoryUserDTO | null;
  loading: boolean;
} | null;

const nameForDirectoryUser = (person?: DirectoryUserDTO | null, fallback?: ChatParticipant) => {
  const fullName = person?.full_name || [person?.first_name, person?.last_name].filter(Boolean).join(' ');
  return fullName || fallback?.full_name || person?.email || fallback?.email || 'Member';
};

const formatProfileValue = (value?: string | number | boolean | null) => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value).replace(/_/g, ' ');
};

const hasProfileValue = (...values: Array<string | number | boolean | null | undefined>) => (
  values.some((value) => Boolean(formatProfileValue(value)))
);

const formatBirthday = (dob?: string | null) => {
  if (!dob) return '';
  const yearMasked = dob.startsWith('0000-');
  const dateStr = yearMasked ? '2000' + dob.slice(4) : dob;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return yearMasked
    ? date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
    : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

const readableDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

const externalUrl = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

const ProfileField: React.FC<{
  icon: React.ElementType;
  label: string;
  value?: string | number | boolean | null;
  href?: string | null;
}> = ({ icon: Icon, label, value, href }) => {
  const display = formatProfileValue(value);
  if (!display) return null;
  return (
    <div className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase text-gray-500">{label}</p>
        {href ? (
          <a href={externalUrl(href)} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-blue-600 hover:text-blue-700">
            <span className="truncate">{display}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <p className="break-words text-sm font-medium capitalize text-gray-900">{display}</p>
        )}
      </div>
    </div>
  );
};

interface ProfileDialogProps {
  profileState: ChatProfileState;
  onClose: () => void;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({ profileState, onClose }) => (
  <Dialog open={Boolean(profileState)} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto p-0">
      <DialogHeader className="border-b border-gray-100 px-5 py-4 pr-12">
        <DialogTitle>Member Profile</DialogTitle>
      </DialogHeader>
      <div className="px-5 pb-5">
        {profileState && (
          <>
            <div className="flex items-center gap-4 py-4">
              <Avatar className="h-16 w-16">
                {(profileState.profile?.profile_img || profileState.participant.profile_img) && (
                  <AvatarImage src={profileState.profile?.profile_img || profileState.participant.profile_img} />
                )}
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {nameForDirectoryUser(profileState.profile, profileState.participant).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold text-gray-900">
                  {nameForDirectoryUser(profileState.profile, profileState.participant)}
                </h3>
                <p className="text-sm capitalize text-gray-500">{profileState.profile?.role || 'Member'}</p>
              </div>
              {profileState.loading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
            </div>

            {!profileState.loading && !profileState.profile && (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">
                This member has not shared profile details in the directory.
              </div>
            )}

            {profileState.profile && (
              <div className="space-y-5">
                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Contact</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ProfileField icon={Mail} label="Email" value={profileState.profile.email} />
                    <ProfileField icon={Phone} label="Phone" value={profileState.profile.phone_number} />
                    <ProfileField icon={MessageCircle} label="WhatsApp" value={profileState.profile.phone_is_whatsapp ? 'Yes' : ''} />
                    <ProfileField icon={BadgeCheck} label="Status" value={profileState.profile.is_active === false ? 'Inactive' : 'Active'} />
                  </div>
                </section>

                {hasProfileValue(
                  profileState.profile.username,
                  profileState.profile.gender,
                  profileState.profile.dob,
                  profileState.profile.marital_status,
                  profileState.profile.date_married,
                ) && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Personal</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ProfileField icon={User} label="Username" value={profileState.profile.username} />
                      <ProfileField icon={User} label="Gender" value={profileState.profile.gender} />
                      <ProfileField icon={Calendar} label="Birthday" value={formatBirthday(profileState.profile.dob)} />
                      <ProfileField icon={Heart} label="Marital Status" value={profileState.profile.marital_status} />
                      <ProfileField icon={Calendar} label="Date Married" value={readableDate(profileState.profile.date_married)} />
                      <ProfileField icon={Phone} label="Accepts Texts" value={profileState.profile.is_accept_text === true ? 'Yes' : ''} />
                    </div>
                  </section>
                )}

                {hasProfileValue(
                  profileState.profile.job_title,
                  profileState.profile.employer,
                ) && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Work</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ProfileField icon={Briefcase} label="Job Title" value={profileState.profile.job_title} />
                      <ProfileField icon={Building2} label="Employer" value={profileState.profile.employer} />
                    </div>
                  </section>
                )}

                {hasProfileValue(
                  profileState.profile.member_status,
                  profileState.profile.grade,
                  profileState.profile.baptism_date,
                  profileState.profile.baptism_location,
                ) && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Membership</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ProfileField icon={BadgeCheck} label="Member Status" value={profileState.profile.member_status} />
                      <ProfileField icon={User} label="Grade" value={profileState.profile.grade} />
                      <ProfileField icon={Calendar} label="Baptism Date" value={readableDate(profileState.profile.baptism_date)} />
                      <ProfileField icon={MapPin} label="Baptism Location" value={profileState.profile.baptism_location} />
                    </div>
                  </section>
                )}

                {hasProfileValue(
                  profileState.profile.address_line,
                  profileState.profile.city,
                  profileState.profile.state,
                  profileState.profile.country,
                  profileState.profile.postal_code,
                ) && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Location</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ProfileField icon={MapPin} label="Address" value={profileState.profile.address_line} />
                      <ProfileField icon={MapPin} label="City" value={profileState.profile.city} />
                      <ProfileField icon={MapPin} label="State" value={profileState.profile.state} />
                      <ProfileField icon={MapPin} label="Country" value={profileState.profile.country} />
                      <ProfileField icon={MapPin} label="Postal Code" value={profileState.profile.postal_code} />
                    </div>
                  </section>
                )}

                {hasProfileValue(
                  profileState.profile.facebook_link,
                  profileState.profile.instagram_link,
                  profileState.profile.linkedin_link,
                  profileState.profile.twitter_link,
                  profileState.profile.whatsapp_link,
                  profileState.profile.website_link,
                ) && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Social</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ProfileField icon={LinkIcon} label="Facebook" value={profileState.profile.facebook_link} href={profileState.profile.facebook_link} />
                      <ProfileField icon={LinkIcon} label="Instagram" value={profileState.profile.instagram_link} href={profileState.profile.instagram_link} />
                      <ProfileField icon={LinkIcon} label="LinkedIn" value={profileState.profile.linkedin_link} href={profileState.profile.linkedin_link} />
                      <ProfileField icon={LinkIcon} label="X / Twitter" value={profileState.profile.twitter_link} href={profileState.profile.twitter_link} />
                      <ProfileField icon={LinkIcon} label="WhatsApp" value={profileState.profile.whatsapp_link} href={profileState.profile.whatsapp_link} />
                      <ProfileField icon={LinkIcon} label="Website" value={profileState.profile.website_link} href={profileState.profile.website_link} />
                    </div>
                  </section>
                )}

                {profileState.profile.family_members && profileState.profile.family_members.length > 0 && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Family Members</h4>
                    <div className="grid gap-2">
                      {profileState.profile.family_members.map((familyMember) => (
                        <div key={familyMember.id} className="flex items-center gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                          <Users className="h-4 w-4 shrink-0 text-gray-500" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {[familyMember.first_name, familyMember.last_name].filter(Boolean).join(' ')}
                            </p>
                            <p className="text-xs capitalize text-gray-500">{familyMember.relationship}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default ProfileDialog;
