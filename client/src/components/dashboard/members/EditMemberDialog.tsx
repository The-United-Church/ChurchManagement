import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Loader2, Plus, Trash2, UserRound } from 'lucide-react';
import type { MemberDTO } from '@/hooks/useMemberCrud';
import type { FamilyMemberDTO, UpdateMemberPayload } from '@/lib/api';
import { FamilyMemberDialog } from '@/components/member/profile/FamilyMemberDialog';
import type { FamilyMember } from '@/components/member/profile/types';
import { RELATIONSHIP_OPTIONS } from '@/components/member/profile/types';

type ProfilePayload = UpdateMemberPayload & { role?: string };

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberDTO | null;
  onSave: (id: string, data: ProfilePayload) => Promise<boolean>;
  onToggleBranchActive: (id: string, is_active: boolean) => Promise<boolean>;
  saving?: boolean;
  /** When false, role and active toggle are hidden (used when church/branch context is unavailable). */
  canManageBranchRole?: boolean;
}

interface FormState {
  first_name: string;
  last_name: string;
  middle_name: string;
  nick_name: string;
  username: string;
  phone_number: string;
  phone_is_whatsapp: boolean;
  dob: string;
  gender: string;
  marital_status: string;
  date_married: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  job_title: string;
  employer: string;
  facebook_link: string;
  is_display_email: boolean;
  is_accept_text: boolean;
  grade: string;
  baptism_date: string;
  baptism_location: string;
  member_status: string;
  role: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  first_name: '',
  last_name: '',
  middle_name: '',
  nick_name: '',
  username: '',
  phone_number: '',
  phone_is_whatsapp: false,
  dob: '',
  gender: '',
  marital_status: '',
  date_married: '',
  address_line: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  job_title: '',
  employer: '',
  facebook_link: '',
  is_display_email: false,
  is_accept_text: false,
  grade: '',
  baptism_date: '',
  baptism_location: '',
  member_status: '',
  role: 'member',
  is_active: true,
};

/** Trim & normalize an empty string to undefined for diffing purposes. */
const norm = (v: string | null | undefined): string => (typeof v === 'string' ? v : '') ?? '';

/** Build a FormState from a member DTO so the dialog can be edited in place. */
function memberToForm(member: MemberDTO): FormState {
  return {
    first_name: norm(member.first_name),
    last_name: norm(member.last_name),
    middle_name: norm(member.middle_name),
    nick_name: norm(member.nick_name),
    username: norm(member.username),
    phone_number: norm(member.phone_number),
    phone_is_whatsapp: member.phone_is_whatsapp ?? false,
    // The API returns ISO timestamps for dob; the <input type="date"> needs YYYY-MM-DD.
    dob: member.dob ? String(member.dob).slice(0, 10) : '',
    gender: norm(member.gender).toLowerCase(),
    marital_status: norm(member.marital_status),
    date_married: member.date_married ? String(member.date_married).slice(0, 10) : '',
    address_line: norm(member.address_line),
    city: norm(member.city),
    state: norm(member.state),
    country: norm(member.country),
    postal_code: norm(member.postal_code),
    job_title: norm(member.job_title),
    employer: norm(member.employer),
    facebook_link: norm(member.facebook_link),
    is_display_email: member.is_display_email ?? false,
    is_accept_text: member.is_accept_text ?? false,
    grade: norm(member.grade),
    baptism_date: member.baptism_date ? String(member.baptism_date).slice(0, 10) : '',
    baptism_location: norm(member.baptism_location),
    member_status: norm(member.member_status),
    role: member.branch_role || member.role || 'member',
    is_active: member.branch_is_active !== false,
  };
}

/**
 * Compute the minimal diff between the original member and the current form
 * state so we only send fields the admin actually changed.
 *
 * Sending only diffs keeps the audit log clean and avoids accidentally
 * overwriting another admin's concurrent change.
 */
function buildDiff(member: MemberDTO, form: FormState): UpdateMemberPayload {
  const original = memberToForm(member);
  const payload: UpdateMemberPayload = {};

  const stringFields = [
    'first_name',
    'last_name',
    'middle_name',
    'nick_name',
    'username',
    'phone_number',
    'address_line',
    'city',
    'state',
    'country',
    'postal_code',
    'job_title',
    'employer',
    'facebook_link',
    'baptism_location',
    'grade',
  ] as const;
  for (const f of stringFields) {
    if (form[f].trim() !== original[f].trim()) {
      (payload as any)[f] = form[f].trim() || null;
    }
  }

  if (form.dob !== original.dob) {
    payload.dob = form.dob ? form.dob : null;
  }
  if (form.gender !== original.gender) {
    payload.gender = form.gender || null;
  }
  if (form.phone_is_whatsapp !== original.phone_is_whatsapp) {
    payload.phone_is_whatsapp = form.phone_is_whatsapp;
  }
  if (form.marital_status !== original.marital_status) {
    payload.marital_status = form.marital_status || null;
  }
  if (form.date_married !== original.date_married) {
    payload.date_married = form.date_married ? form.date_married : null;
  }
  if (form.is_display_email !== original.is_display_email) {
    payload.is_display_email = form.is_display_email;
  }
  if (form.is_accept_text !== original.is_accept_text) {
    payload.is_accept_text = form.is_accept_text;
  }
  if (form.baptism_date !== original.baptism_date) {
    payload.baptism_date = form.baptism_date ? form.baptism_date : null;
  }
  if (form.member_status !== original.member_status) {
    payload.member_status = form.member_status || null;
  }
  return payload;
}

const EditMemberDialog: React.FC<EditMemberDialogProps> = ({
  open,
  onOpenChange,
  member,
  onSave,
  onToggleBranchActive,
  saving,
  canManageBranchRole = true,
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [editingFamilyMember, setEditingFamilyMember] = useState<FamilyMember | null>(null);
  const [familySaving, setFamilySaving] = useState(false);

  useEffect(() => {
    if (member) {
      setForm(memberToForm(member));
      // Normalise FamilyMemberDTO from API to FamilyMember (same shape, just ensure id exists)
      const fam: FamilyMember[] = (member.family_members ?? []).map((m: FamilyMemberDTO) => ({
        id: m.id ?? crypto.randomUUID(),
        first_name: m.first_name,
        last_name: m.last_name,
        relationship: m.relationship,
        birthdate: m.birthdate,
        gender: m.gender,
        phone: m.phone,
        marital_status: m.marital_status,
        email: m.email,
        linked_user_id: m.linked_user_id,
      }));
      setFamilyMembers(fam);
    }
  }, [member]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!member) return;
    const original = memberToForm(member);
    const diff = buildDiff(member, form);
    const payload: ProfilePayload = { ...diff };
    if (canManageBranchRole && form.role !== original.role) payload.role = form.role;

    const tasks: Promise<boolean>[] = [];
    if (Object.keys(payload).length > 0) tasks.push(onSave(member.id, payload));

    // Include family members if they changed
    const originalFamily = JSON.stringify(member.family_members ?? []);
    const currentFamily = JSON.stringify(familyMembers);
    if (originalFamily !== currentFamily) {
      const familyPayload: ProfilePayload = { family_members: familyMembers as unknown as FamilyMemberDTO[] };
      tasks.push(onSave(member.id, familyPayload));
    }

    if (canManageBranchRole && form.is_active !== original.is_active) {
      tasks.push(onToggleBranchActive(member.id, form.is_active));
    }
    if (tasks.length === 0) {
      onOpenChange(false);
      return;
    }
    const results = await Promise.all(tasks);
    if (results.every(Boolean)) onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-4 w-4 text-blue-600" /> Edit Member
          </DialogTitle>
        </DialogHeader>

        {/* Read-only identity */}
        {member?.email && (
          <p className="text-xs text-gray-500 -mt-2">
            {member.email} (email cannot be changed here)
          </p>
        )}

        {/* Personal info */}
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-first">First name</Label>
              <Input
                id="edit-first"
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-last">Last name</Label>
              <Input
                id="edit-last"
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-middle">Middle name</Label>
              <Input
                id="edit-middle"
                value={form.middle_name}
                onChange={(e) => update('middle_name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-nick">Nickname</Label>
              <Input
                id="edit-nick"
                value={form.nick_name}
                onChange={(e) => update('nick_name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-dob">Date of birth</Label>
              <Input
                id="edit-dob"
                type="date"
                value={form.dob}
                onChange={(e) => update('dob', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender || 'unspecified'} onValueChange={(v) => update('gender', v === 'unspecified' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="unspecified">—</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Marital status</Label>
              <Select value={form.marital_status || 'unspecified'} onValueChange={(v) => update('marital_status', v === 'unspecified' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="unspecified">—</SelectItem>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="engaged">Engaged</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="separated">Separated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.marital_status === 'married' && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-date-married">Date married</Label>
                <Input
                  id="edit-date-married"
                  type="date"
                  value={form.date_married}
                  onChange={(e) => update('date_married', e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={form.phone_number}
                onChange={(e) => update('phone_number', e.target.value)}
              />
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="edit-whatsapp"
                  checked={form.phone_is_whatsapp}
                  onCheckedChange={(v) => update('phone_is_whatsapp', Boolean(v))}
                />
                <Label htmlFor="edit-whatsapp" className="cursor-pointer font-normal text-sm text-gray-600">
                  This number is on WhatsApp
                </Label>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={form.address_line}
                onChange={(e) => update('address_line', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-state">State</Label>
              <Input
                id="edit-state"
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-country">Country</Label>
              <Input
                id="edit-country"
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-postal">Postal code</Label>
              <Input
                id="edit-postal"
                value={form.postal_code}
                onChange={(e) => update('postal_code', e.target.value)}
              />
            </div>
          </div>

          {/* Work */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <p className="sm:col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Work</p>
            <div className="space-y-1.5">
              <Label htmlFor="edit-job-title">Job title</Label>
              <Input
                id="edit-job-title"
                value={form.job_title}
                onChange={(e) => update('job_title', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-employer">Employer</Label>
              <Input
                id="edit-employer"
                value={form.employer}
                onChange={(e) => update('employer', e.target.value)}
              />
            </div>
          </div>

          {/* Church membership */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <p className="sm:col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Church membership</p>
            <div className="space-y-1.5">
              <Label>Member status</Label>
              <Select value={form.member_status || 'unspecified'} onValueChange={(v) => update('member_status', v === 'unspecified' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="unspecified">—</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="attender">Attender</SelectItem>
                  <SelectItem value="visitor">Visitor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-grade">Grade / Class</Label>
              <Input
                id="edit-grade"
                value={form.grade}
                onChange={(e) => update('grade', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-baptism-date">Baptism date</Label>
              <Input
                id="edit-baptism-date"
                type="date"
                value={form.baptism_date}
                onChange={(e) => update('baptism_date', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-baptism-location">Baptism location</Label>
              <Input
                id="edit-baptism-location"
                value={form.baptism_location}
                onChange={(e) => update('baptism_location', e.target.value)}
              />
            </div>
          </div>

          {/* Online / Social */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Social</p>
            <div className="space-y-1.5">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-facebook">Facebook link</Label>
              <Input
                id="edit-facebook"
                value={form.facebook_link}
                onChange={(e) => update('facebook_link', e.target.value)}
              />
            </div>
          </div>

          {/* Family Members */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Family Members</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setEditingFamilyMember(null); setFamilyDialogOpen(true); }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {familyMembers.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No family members added yet.</p>
            ) : (
              <div className="space-y-2">
                {familyMembers.map((fm) => (
                  <div key={fm.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserRound className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {fm.first_name} {fm.last_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {RELATIONSHIP_OPTIONS.find((r) => r.value === fm.relationship)?.label ?? fm.relationship}
                          {fm.phone ? ` · ${fm.phone}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { setEditingFamilyMember(fm); setFamilyDialogOpen(true); }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setFamilyMembers((prev) => prev.filter((m) => m.id !== fm.id))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy / Communication */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Privacy &amp; Communication</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-display-email"
                checked={form.is_display_email}
                onCheckedChange={(v) => update('is_display_email', Boolean(v))}
              />
              <Label htmlFor="edit-display-email" className="cursor-pointer font-normal text-sm text-gray-600">
                Display email to other members
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-accept-text"
                checked={form.is_accept_text}
                onCheckedChange={(v) => update('is_accept_text', Boolean(v))}
              />
              <Label htmlFor="edit-accept-text" className="cursor-pointer font-normal text-sm text-gray-600">
                Accept text messages
              </Label>
            </div>
          </div>

          {/* Branch role + active flag (hidden when no church/branch context) */}
          {canManageBranchRole && (
            <>
              <div className="space-y-1.5 pt-2">
                <Label>Branch role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['member', 'coordinator', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => update('role', r)}
                      className={`px-2 py-2 text-sm rounded-md border transition-colors ${
                        form.role === r
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => update('is_active', Boolean(v))}
                />
                <Label htmlFor="edit-active" className="cursor-pointer">
                  Active in this branch
                </Label>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <FamilyMemberDialog
      open={familyDialogOpen}
      onOpenChange={(o) => { setFamilyDialogOpen(o); if (!o) setEditingFamilyMember(null); }}
      editingMember={editingFamilyMember}
      isPending={familySaving}
      onSave={(form) => {
        if (editingFamilyMember) {
          setFamilyMembers((prev) =>
            prev.map((m) => m.id === editingFamilyMember.id ? { ...form, id: editingFamilyMember.id } : m)
          );
        } else {
          setFamilyMembers((prev) => [...prev, { ...form, id: crypto.randomUUID() }]);
        }
        setFamilyDialogOpen(false);
        setEditingFamilyMember(null);
      }}
    />
    </>
  );
};

export default EditMemberDialog;
