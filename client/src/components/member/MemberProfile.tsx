import React, { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User, Mail, Phone, Calendar, MapPin, Heart, Briefcase, Building2,
  Link, MessageCircle, BadgeCheck, Edit, UserPlus, Camera, Trash2, RefreshCw,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useAuthQuery';
import { updateMyProfileApi } from '@/lib/api';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';
import { InfoRow, LoadingSkeleton } from './profile/ProfileSubComponents';
import { EditProfileDialog } from './profile/EditProfileDialog';
import { FamilyMemberDialog } from './profile/FamilyMemberDialog';
import { SecurityTab } from './profile/SecurityTab';
import type { FamilyMember, ProfileForm } from './profile/types';

// ─── Main Component ───────────────────────────────────────────────────────────

const MemberProfile: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError, refetch } = useProfile();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });

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

  const handleSaveProfile = (form: ProfileForm) => {
    updateProfileMutation.mutate({
      ...form,
      date_married: form.marital_status === 'married' ? form.date_married : '',
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) photoMutation.mutate(file);
  };

  const currentFamily: FamilyMember[] = profile?.family_members || [];

  const handleSaveFamily = (form: Omit<FamilyMember, 'id'>) => {
    const updated = editingMember
      ? currentFamily.map((m) =>
          m.id === editingMember.id ? { ...form, id: editingMember.id } : m
        )
      : [...currentFamily, { ...form, id: crypto.randomUUID() }];
    familyMutation.mutate(updated);
  };

  const handleDeleteFamily = (id: string) =>
    familyMutation.mutate(currentFamily.filter((m) => m.id !== id));

  // ── Display helpers ────────────────────────────────────────────────────────
  const fullName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
      profile.full_name ||
      '—'
    : '—';

  const initials =
    fullName !== '—'
      ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
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

  // ── Loading / Error ────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={embedded ? '' : 'space-y-4 md:space-y-6 p-4 md:p-6'}>
      {!embedded && (
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Profile</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage your personal information and family details
          </p>
        </div>
      )}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="h-auto p-0 bg-transparent border-b border-gray-200 rounded-none w-full justify-start gap-0">
          <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm font-medium">Profile</TabsTrigger>
          <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm font-medium">Security</TabsTrigger>
          <TabsTrigger value="family" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm font-medium">Family</TabsTrigger>
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
                <div className="flex-1 grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <InfoRow icon={User} label="Full Name" value={fullName} />
                  <InfoRow icon={User} label="Username" value={profile?.username} />
                  <InfoRow icon={Calendar} label="Birth Date" value={formatDate(profile?.dob)} />
                  <InfoRow icon={User} label="Gender" value={fmt(profile?.gender)} />
                  <InfoRow icon={Heart} label="Marital Status" value={fmt(profile?.marital_status)} />
                  <InfoRow icon={Calendar} label="Date Married" value={profile?.marital_status === 'married' ? formatDate(profile?.date_married) : '—'} />
                  <InfoRow icon={Phone} label="Mobile Phone" value={profile?.phone_number} />
                  <InfoRow icon={MessageCircle} label="WhatsApp" value={profile?.phone_is_whatsapp ? 'Yes' : 'No'} />
                  <InfoRow icon={Mail} label="Email" value={profile?.email} />
                  <InfoRow icon={Mail} label="Display Email" value={profile?.is_display_email === false ? 'No' : 'Yes'} />
                  <InfoRow icon={Phone} label="Accept Texts" value={profile?.is_accept_text ? 'Yes' : 'No'} />
                  <InfoRow icon={Briefcase} label="Job Title" value={profile?.job_title} />
                  <InfoRow icon={Building2} label="Employer" value={profile?.employer} />
                  <InfoRow icon={BadgeCheck} label="Member Status" value={fmt(profile?.member_status)} />
                  <InfoRow icon={User} label="Grade" value={profile?.grade} />
                  <InfoRow icon={Calendar} label="Baptism Date" value={formatDate(profile?.baptism_date)} />
                  <InfoRow icon={MapPin} label="Baptism Location" value={profile?.baptism_location} />
                  <InfoRow icon={Link} label="Facebook" value={profile?.facebook_link} />
                  <InfoRow icon={MapPin} label="Address" value={addressLine} colSpan />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Tab ────────────────────────────────────────────────── */}
        <TabsContent value="security" className="space-y-4">
          <SecurityTab />
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
                  onClick={() => { setEditingMember(null); setFamilyDialogOpen(true); }}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingMember(member); setFamilyDialogOpen(true); }}
                        >
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

      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profile={profile}
        onSave={handleSaveProfile}
        isPending={updateProfileMutation.isPending}
      />

      <FamilyMemberDialog
        open={familyDialogOpen}
        onOpenChange={(open) => { setFamilyDialogOpen(open); if (!open) setEditingMember(null); }}
        editingMember={editingMember}
        onSave={handleSaveFamily}
        isPending={familyMutation.isPending}
      />
    </div>
  );
};

export default MemberProfile;
