import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Heart,
  Edit,
  Shield,
  UserPlus,
  Camera,
  Trash2,
  RefreshCw,
  Loader2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { Country, State } from 'country-state-city';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useAuthQuery';
import { updateMyProfileApi } from '@/lib/api';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';
import { PhoneField, isoToFlag, FormInput } from '@/components/dashboard/AddPersonDialog';
import { FormSelect } from '@/components/ui/form-select';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FamilyMember {
  id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  birthdate?: string;
  gender?: string;
  phone?: string;
  marital_status?: string;
}

interface ProfileForm {
  first_name: string;
  last_name: string;
  middle_name: string;
  nick_name: string;
  dob: string;
  gender: string;
  marital_status: string;
  phone_number: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const EMPTY_FAMILY: Omit<FamilyMember, 'id'> = {
  first_name: '',
  last_name: '',
  relationship: '',
  birthdate: '',
  gender: '',
  phone: '',
  marital_status: '',
};

const RELATIONSHIP_OPTIONS = [
  { value: 'Grandparent', label: 'Grandparent' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Child', label: 'Child' },
  { value: 'Sibling', label: 'Sibling' },
  { value: 'Other', label: 'Other' },
];

const MARITAL_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'separated', label: 'Separated' },
];

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  colSpan,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  colSpan?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3${colSpan ? ' sm:col-span-2' : ''}`}>
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-4 w-72 rounded bg-muted" />
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-6">
            <div className="h-24 w-24 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Gender radio — uses uppercase MALE / FEMALE / OTHER matching the DB enum */
function ProfileGenderRadio({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-gray-700">Gender</Label>
      <div className="flex flex-wrap gap-4 pt-2">
        {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
          <label key={g} className="flex items-center gap-2 cursor-pointer">
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center bg-white ${
                value === g ? 'border-app-primary' : 'border-gray-300'
              }`}
            >
              {value === g && (
                <div className="w-2.5 h-2.5 rounded-full bg-app-primary" />
              )}
            </div>
            <input
              type="radio"
              name="profile-gender"
              className="hidden"
              checked={value === g}
              onChange={() => onChange(g)}
            />
            <span className="text-sm text-app-selected-text">
              {g.charAt(0) + g.slice(1).toLowerCase()}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const MemberProfile: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError, refetch } = useProfile();

  // ── Country / State / Phone helpers ─────────────────────────────────────
  const [allCountries] = useState(() => Country.getAllCountries());
  const [stateOptions, setStateOptions] = useState<{ name: string; isoCode: string }[]>([]);
  // isoCode is local UI state only — drives state dropdown; country NAME is persisted
  const [countryIsoCode, setCountryIsoCode] = useState('');

  const phoneOptions = React.useMemo(
    () =>
      allCountries.map((c) => ({
        isoCode: c.isoCode,
        name: c.name,
        code: `+${c.phonecode}`,
        flag: isoToFlag(c.isoCode),
      })),
    [allCountries]
  );

  const countrySelectOptions = React.useMemo(
    () => allCountries.map((c) => ({ value: c.isoCode, label: c.name })),
    [allCountries]
  );

  // ── Profile edit dialog ──────────────────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [birthdateDate, setBirthdateDate] = useState<Date | undefined>();
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    first_name: '',
    last_name: '',
    middle_name: '',
    nick_name: '',
    dob: '',
    gender: '',
    marital_status: '',
    phone_number: '',
    address_line: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });

  // ── Family dialog ────────────────────────────────────────────────────────
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [familyForm, setFamilyForm] = useState<Omit<FamilyMember, 'id'>>(EMPTY_FAMILY);

  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Populate profile form when dialog opens ──────────────────────────────
  useEffect(() => {
    if (!editDialogOpen || !profile) return;

    setProfileForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      middle_name: profile.middle_name || '',
      nick_name: profile.nick_name || '',
      dob: profile.dob ? String(profile.dob).split('T')[0] : '',
      gender: profile.gender || '',
      marital_status: profile.marital_status || '',
      phone_number: profile.phone_number || '',
      address_line: profile.address_line || '',
      city: profile.city || '',
      state: profile.state || '',
      postal_code: profile.postal_code || '',
      country: profile.country || '',
    });
    setBirthdateDate(profile.dob ? new Date(profile.dob as string) : undefined);

    // Restore state dropdown options for the saved country
    if (profile.country) {
      const c = allCountries.find((x) => x.name === profile.country);
      if (c) {
        setCountryIsoCode(c.isoCode);
        setStateOptions(
          State.getStatesOfCountry(c.isoCode).map((s) => ({
            name: s.name,
            isoCode: s.isoCode,
          }))
        );
      }
    } else {
      setCountryIsoCode('');
      setStateOptions([]);
    }
  }, [editDialogOpen, profile]);

  // ── Populate family form when dialog opens ───────────────────────────────
  useEffect(() => {
    if (!familyDialogOpen) return;
    if (editingMember) {
      const { id: _id, ...rest } = editingMember;
      setFamilyForm(rest);
    } else {
      setFamilyForm(EMPTY_FAMILY);
    }
  }, [familyDialogOpen, editingMember]);

  // ── Country change ───────────────────────────────────────────────────────
  const onCountryChange = (isoCode: string) => {
    const c = allCountries.find((x) => x.isoCode === isoCode);
    setCountryIsoCode(isoCode);
    setProfileForm((f) => ({ ...f, country: c?.name || '', state: '' }));
    setStateOptions(
      State.getStatesOfCountry(isoCode).map((s) => ({ name: s.name, isoCode: s.isoCode }))
    );
  };

  // ── Shared query invalidation ────────────────────────────────────────────
  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });

  // ── Mutations ────────────────────────────────────────────────────────────
  const updateProfileMutation = useMutation({
    mutationFn: updateMyProfileApi,
    onSuccess: () => {
      toast.success('Profile updated');
      invalidateProfile();
      setEditDialogOpen(false);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update profile'),
  });

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadToCloudinary(file, 'profiles');
      return updateMyProfileApi({ profile_img: url });
    },
    onSuccess: () => {
      toast.success('Profile photo updated');
      invalidateProfile();
    },
    onError: (err: any) => toast.error(err?.message || 'Photo upload failed'),
  });

  const familyMutation = useMutation({
    mutationFn: (members: FamilyMember[]) =>
      updateMyProfileApi({ family_members: members }),
    onSuccess: () => {
      toast.success('Family updated');
      invalidateProfile();
      setFamilyDialogOpen(false);
      setEditingMember(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update family'),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveProfile = () => updateProfileMutation.mutate(profileForm);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) photoMutation.mutate(file);
  };

  const currentFamily: FamilyMember[] = profile?.family_members || [];

  const handleSaveFamily = () => {
    if (!familyForm.first_name || !familyForm.last_name || !familyForm.relationship) {
      toast.error('First name, last name and relationship are required');
      return;
    }
    const updated = editingMember
      ? currentFamily.map((m) =>
          m.id === editingMember.id ? { ...familyForm, id: editingMember.id } : m
        )
      : [...currentFamily, { ...familyForm, id: crypto.randomUUID() }];
    familyMutation.mutate(updated);
  };

  const handleDeleteFamily = (id: string) =>
    familyMutation.mutate(currentFamily.filter((m) => m.id !== id));

  const openAddFamily = () => {
    setEditingMember(null);
    setFamilyDialogOpen(true);
  };

  const openEditFamily = (member: FamilyMember) => {
    setEditingMember(member);
    setFamilyDialogOpen(true);
  };

  // ── Display helpers ───────────────────────────────────────────────────────
  const fullName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
      profile.full_name ||
      '—'
    : '—';

  const initials =
    fullName !== '—'
      ? fullName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?';

  const fmt = (g?: string) =>
    g ? g.charAt(0).toUpperCase() + g.slice(1).toLowerCase() : '—';

  const formatDate = (d?: string | Date) => {
    if (!d) return '—';
    const date = new Date(d as string);
    return isNaN(date.getTime()) ? String(d) : date.toLocaleDateString();
  };

  const addressLine =
    [profile?.address_line, profile?.city, profile?.state, profile?.postal_code, profile?.country]
      .filter(Boolean)
      .join(', ') || '—';

  const stateSelectOptions = stateOptions.map((s) => ({ value: s.name, label: s.name }));

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-6">
        <p className="text-muted-foreground">Failed to load profile.</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Profile</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Manage your personal information and family details
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="family">Family</TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your basic profile information</CardDescription>
                </div>
                <Button size="sm" onClick={() => setEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Avatar + photo upload */}
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-20 w-20 md:h-24 md:w-24">
                    <AvatarImage src={profile?.profile_img || ''} />
                    <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs md:text-sm"
                    disabled={photoMutation.isPending}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Camera className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                    {photoMutation.isPending ? 'Uploading…' : 'Change Photo'}
                  </Button>
                </div>

                {/* Info grid */}
                <div className="flex-1 grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <InfoRow icon={User} label="Full Name" value={fullName} />
                  <InfoRow icon={Calendar} label="Birth Date" value={formatDate(profile?.dob)} />
                  <InfoRow icon={User} label="Gender" value={fmt(profile?.gender)} />
                  <InfoRow icon={Heart} label="Marital Status" value={fmt(profile?.marital_status)} />
                  <InfoRow icon={Phone} label="Mobile Phone" value={profile?.phone_number} />
                  <InfoRow icon={Mail} label="Email" value={profile?.email} />
                  <InfoRow icon={MapPin} label="Address" value={addressLine} colSpan />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Tab ────────────────────────────────────────────────── */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Currently disabled</p>
                  </div>
                </div>
                <Button className="w-full sm:w-auto">
                  Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Family Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="family">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Family Members</CardTitle>
                  <CardDescription>Manage your family member information</CardDescription>
                </div>
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={openAddFamily}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Family Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {currentFamily.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No family members added yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {currentFamily.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback>
                            {member.first_name[0]}
                            {member.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary">{member.relationship}</Badge>
                            {member.birthdate && <span>{formatDate(member.birthdate)}</span>}
                            {member.phone && <span>{member.phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditFamily(member)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteFamily(member.id)}
                          disabled={familyMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit Profile Dialog ───────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4">
            {/* Left column — names + bio */}
            <div className="md:col-span-7 space-y-6">
              {/* Names */}
              <Card className="border-none shadow-sm">
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormInput
                      label="First Name"
                      required
                      value={profileForm.first_name}
                      onChange={(v) => setProfileForm((f) => ({ ...f, first_name: v }))}
                    />
                    <FormInput
                      label="Last Name"
                      required
                      value={profileForm.last_name}
                      onChange={(v) => setProfileForm((f) => ({ ...f, last_name: v }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <FormInput
                      label="Middle Name"
                      placeholder="Optional"
                      value={profileForm.middle_name}
                      onChange={(v) => setProfileForm((f) => ({ ...f, middle_name: v }))}
                    />
                    <FormInput
                      label="Nick Name"
                      placeholder="Optional"
                      value={profileForm.nick_name}
                      onChange={(v) => setProfileForm((f) => ({ ...f, nick_name: v }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Bio */}
              <Card className="border-none shadow-sm">
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Birthdate */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-700">Birth Date</Label>
                      <DatePicker
                        selected={birthdateDate}
                        onChange={(date: Date | null) => {
                          setBirthdateDate(date ?? undefined);
                          setProfileForm((f) => ({
                            ...f,
                            dob: date ? format(date, 'yyyy-MM-dd') : '',
                          }));
                        }}
                        showYearDropdown
                        showMonthDropdown
                        dropdownMode="select"
                        customInput={
                          <div className="relative">
                            <Input
                              value={birthdateDate ? format(birthdateDate, 'dd/MM/yyyy') : ''}
                              readOnly
                              placeholder="DD/MM/YYYY"
                              className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-app-primary bg-transparent pr-8"
                            />
                            <CalendarIcon className="absolute right-0 top-2 h-4 w-4 text-gray-400" />
                          </div>
                        }
                      />
                    </div>
                    <ProfileGenderRadio
                      value={profileForm.gender}
                      onChange={(v) => setProfileForm((f) => ({ ...f, gender: v }))}
                    />
                  </div>
                  <FormSelect
                    label="Marital Status"
                    options={MARITAL_OPTIONS}
                    value={profileForm.marital_status}
                    onValueChange={(v) => setProfileForm((f) => ({ ...f, marital_status: v }))}
                    placeholder="Select status"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right column — address + contact */}
            <div className="md:col-span-5">
              <Card className="border-none shadow-sm">
                <CardContent className="p-6 space-y-6">
                  <FormInput
                    label="Address"
                    value={profileForm.address_line}
                    onChange={(v) => setProfileForm((f) => ({ ...f, address_line: v }))}
                  />

                  <div className="grid grid-cols-2 gap-6">
                    <FormSelect
                      label="Country"
                      options={countrySelectOptions}
                      value={countryIsoCode}
                      onValueChange={onCountryChange}
                      placeholder="Select Country"
                    />
                    <FormSelect
                      label="State / Region"
                      options={stateSelectOptions}
                      value={profileForm.state}
                      onValueChange={(v) => setProfileForm((f) => ({ ...f, state: v }))}
                      placeholder="Select State"
                      emptyMessage="Select a country first"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <FormInput
                      label="City"
                      value={profileForm.city}
                      onChange={(v) => setProfileForm((f) => ({ ...f, city: v }))}
                    />
                    <FormInput
                      label="Postal Code"
                      value={profileForm.postal_code}
                      onChange={(v) => setProfileForm((f) => ({ ...f, postal_code: v }))}
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold mb-4 text-gray-900">
                      Contact Information
                    </h4>
                    <PhoneField
                      value={profileForm.phone_number}
                      onChange={(v) => setProfileForm((f) => ({ ...f, phone_number: v }))}
                      options={phoneOptions}
                      countryName={profileForm.country}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="bg-white p-4 -mx-6 -mb-6 border-t border-gray-100 mt-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateProfileMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={
                updateProfileMutation.isPending ||
                !profileForm.first_name ||
                !profileForm.last_name
              }
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Family Member Dialog ──────────────────────────────── */}
      <Dialog
        open={familyDialogOpen}
        onOpenChange={(open) => {
          setFamilyDialogOpen(open);
          if (!open) setEditingMember(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-gray-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingMember ? 'Edit Family Member' : 'Add Family Member'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-6">
                <FormSelect
                  label="Relationship"
                  required
                  options={RELATIONSHIP_OPTIONS}
                  value={familyForm.relationship}
                  onValueChange={(v) => setFamilyForm((f) => ({ ...f, relationship: v }))}
                  placeholder="Select relationship"
                />

                <div className="grid grid-cols-2 gap-6">
                  <FormInput
                    label="First Name"
                    required
                    value={familyForm.first_name}
                    onChange={(v) => setFamilyForm((f) => ({ ...f, first_name: v }))}
                  />
                  <FormInput
                    label="Last Name"
                    required
                    value={familyForm.last_name}
                    onChange={(v) => setFamilyForm((f) => ({ ...f, last_name: v }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Birthdate — plain date input for family members */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-700">Birth Date</Label>
                    <Input
                      type="date"
                      value={familyForm.birthdate || ''}
                      onChange={(e) =>
                        setFamilyForm((f) => ({ ...f, birthdate: e.target.value }))
                      }
                      className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-app-primary bg-transparent"
                    />
                  </div>
                  <FormSelect
                    label="Gender"
                    options={GENDER_OPTIONS}
                    value={familyForm.gender || ''}
                    onValueChange={(v) => setFamilyForm((f) => ({ ...f, gender: v }))}
                    placeholder="Select gender"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <FormInput
                    label="Mobile Phone"
                    placeholder="Optional"
                    value={familyForm.phone || ''}
                    onChange={(v) => setFamilyForm((f) => ({ ...f, phone: v }))}
                  />
                  <FormSelect
                    label="Marital Status"
                    options={MARITAL_OPTIONS}
                    value={familyForm.marital_status || ''}
                    onValueChange={(v) => setFamilyForm((f) => ({ ...f, marital_status: v }))}
                    placeholder="Select status"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="bg-white p-4 -mx-6 -mb-6 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setFamilyDialogOpen(false);
                setEditingMember(null);
              }}
              disabled={familyMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveFamily} disabled={familyMutation.isPending}>
              {familyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                </>
              ) : editingMember ? (
                'Save Changes'
              ) : (
                'Add Family Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberProfile;
