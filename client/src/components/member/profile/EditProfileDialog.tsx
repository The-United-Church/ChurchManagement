import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { Country, State } from 'country-state-city';
import { PhoneField, isoToFlag, FormInput } from '@/components/dashboard/people/AddPersonDialog';
import { FormSelect } from '@/components/ui/form-select';
import { ProfileGenderRadio, ProfileToggle, DateField } from './ProfileSubComponents';
import type { ProfileForm } from './types';
import { MARITAL_OPTIONS, MEMBER_STATUS_OPTIONS } from './types';

const INITIAL_FORM: ProfileForm = {
  first_name: '',
  last_name: '',
  middle_name: '',
  nick_name: '',
  dob: '',
  gender: '',
  marital_status: '',
  date_married: '',
  phone_number: '',
  phone_is_whatsapp: false,
  address_line: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  username: '',
  job_title: '',
  employer: '',
  facebook_link: '',
  is_display_email: true,
  is_accept_text: false,
  grade: '',
  baptism_date: '',
  baptism_location: '',
  member_status: 'member',
};

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  onSave: (form: ProfileForm) => void;
  isPending: boolean;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
  isPending,
}: EditProfileDialogProps) {
  const [allCountries] = useState(() => Country.getAllCountries());
  const [stateOptions, setStateOptions] = useState<{ name: string; isoCode: string }[]>([]);
  const [countryIsoCode, setCountryIsoCode] = useState('');
  const [birthdateDate, setBirthdateDate] = useState<Date | undefined>();
  const [form, setForm] = useState<ProfileForm>(INITIAL_FORM);

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

  const stateSelectOptions = stateOptions.map((s) => ({ value: s.name, label: s.name }));

  useEffect(() => {
    if (!open || !profile) return;

    setForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      middle_name: profile.middle_name || '',
      nick_name: profile.nick_name || '',
      dob: profile.dob ? String(profile.dob).split('T')[0] : '',
      gender: profile.gender || '',
      marital_status: profile.marital_status || '',
      date_married: profile.date_married ? String(profile.date_married).split('T')[0] : '',
      phone_number: profile.phone_number || '',
      phone_is_whatsapp: profile.phone_is_whatsapp ?? false,
      address_line: profile.address_line || '',
      city: profile.city || '',
      state: profile.state || '',
      postal_code: profile.postal_code || '',
      country: profile.country || '',
      username: profile.username || '',
      job_title: profile.job_title || '',
      employer: profile.employer || '',
      facebook_link: profile.facebook_link || '',
      is_display_email: profile.is_display_email ?? true,
      is_accept_text: profile.is_accept_text ?? false,
      grade: profile.grade || '',
      baptism_date: profile.baptism_date ? String(profile.baptism_date).split('T')[0] : '',
      baptism_location: profile.baptism_location || '',
      member_status: profile.member_status || 'member',
    });
    setBirthdateDate(profile.dob ? new Date(profile.dob as string) : undefined);

    if (profile.country) {
      const c = allCountries.find((x) => x.name === profile.country);
      if (c) {
        setCountryIsoCode(c.isoCode);
        setStateOptions(
          State.getStatesOfCountry(c.isoCode).map((s) => ({ name: s.name, isoCode: s.isoCode }))
        );
      }
    } else {
      setCountryIsoCode('');
      setStateOptions([]);
    }
  }, [open, profile]);

  const onCountryChange = (isoCode: string) => {
    const c = allCountries.find((x) => x.isoCode === isoCode);
    setCountryIsoCode(isoCode);
    setForm((f) => ({ ...f, country: c?.name || '', state: '' }));
    setStateOptions(
      State.getStatesOfCountry(isoCode).map((s) => ({ name: s.name, isoCode: s.isoCode }))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4">
          {/* Left column */}
          <div className="md:col-span-7 space-y-6">
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-6">
                <h4 className="text-sm font-semibold text-gray-900">Identity</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormInput label="First Name" required value={form.first_name} onChange={(v) => setForm((f) => ({ ...f, first_name: v }))} />
                  <FormInput label="Last Name" required value={form.last_name} onChange={(v) => setForm((f) => ({ ...f, last_name: v }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormInput label="Middle Name" placeholder="Optional" value={form.middle_name} onChange={(v) => setForm((f) => ({ ...f, middle_name: v }))} />
                  <FormInput label="Nick Name" placeholder="Optional" value={form.nick_name} onChange={(v) => setForm((f) => ({ ...f, nick_name: v }))} />
                </div>
                <FormInput label="Username" placeholder="Optional" value={form.username} onChange={(v) => setForm((f) => ({ ...f, username: v }))} />
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-6">
                <h4 className="text-sm font-semibold text-gray-900">Personal Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-700">Birth Date</Label>
                    <DatePicker
                      selected={birthdateDate}
                      onChange={(date: Date | null) => {
                        setBirthdateDate(date ?? undefined);
                        setForm((f) => ({ ...f, dob: date ? format(date, 'yyyy-MM-dd') : '' }));
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
                  <ProfileGenderRadio value={form.gender} onChange={(v) => setForm((f) => ({ ...f, gender: v }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormSelect
                    label="Marital Status"
                    options={MARITAL_OPTIONS}
                    value={form.marital_status}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        marital_status: v,
                        date_married: v === 'married' ? f.date_married : '',
                      }))
                    }
                    placeholder="Select status"
                  />
                  {form.marital_status === 'married' && (
                    <DateField
                      id="profile-date-married"
                      label="Date Married"
                      value={form.date_married}
                      onChange={(v) => setForm((f) => ({ ...f, date_married: v }))}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-6">
                <h4 className="text-sm font-semibold text-gray-900">Work & Membership</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormInput label="Job Title" placeholder="Optional" value={form.job_title} onChange={(v) => setForm((f) => ({ ...f, job_title: v }))} />
                  <FormInput label="Employer" placeholder="Optional" value={form.employer} onChange={(v) => setForm((f) => ({ ...f, employer: v }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormSelect label="Member Status" options={MEMBER_STATUS_OPTIONS} value={form.member_status} onValueChange={(v) => setForm((f) => ({ ...f, member_status: v }))} placeholder="Select status" />
                  <FormInput label="Grade" placeholder="Optional" value={form.grade} onChange={(v) => setForm((f) => ({ ...f, grade: v }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <DateField id="profile-baptism-date" label="Baptism Date" value={form.baptism_date} onChange={(v) => setForm((f) => ({ ...f, baptism_date: v }))} />
                  <FormInput label="Baptism Location" placeholder="Optional" value={form.baptism_location} onChange={(v) => setForm((f) => ({ ...f, baptism_location: v }))} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="md:col-span-5">
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-6">
                <h4 className="text-sm font-semibold text-gray-900">Address</h4>
                <FormInput label="Address" value={form.address_line} onChange={(v) => setForm((f) => ({ ...f, address_line: v }))} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormSelect label="Country" options={countrySelectOptions} value={countryIsoCode} onValueChange={onCountryChange} placeholder="Select Country" />
                  <FormSelect label="State / Region" options={stateSelectOptions} value={form.state} onValueChange={(v) => setForm((f) => ({ ...f, state: v }))} placeholder="Select State" emptyMessage="Select a country first" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormInput label="City" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
                  <FormInput label="Postal Code" value={form.postal_code} onChange={(v) => setForm((f) => ({ ...f, postal_code: v }))} />
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold mb-4 text-gray-900">Contact Information</h4>
                  <PhoneField
                    value={form.phone_number}
                    onChange={(v) => setForm((f) => ({ ...f, phone_number: v }))}
                    options={phoneOptions}
                    countryName={form.country}
                  />
                  <div className="mt-4 space-y-3">
                    <ProfileToggle id="profile-phone-whatsapp" label="Phone is on WhatsApp" checked={form.phone_is_whatsapp} onCheckedChange={(checked) => setForm((f) => ({ ...f, phone_is_whatsapp: checked }))} />
                    <ProfileToggle id="profile-accept-text" label="Accept text messages" checked={form.is_accept_text} onCheckedChange={(checked) => setForm((f) => ({ ...f, is_accept_text: checked }))} />
                    <ProfileToggle id="profile-display-email" label="Display email in directory" checked={form.is_display_email} onCheckedChange={(checked) => setForm((f) => ({ ...f, is_display_email: checked }))} />
                  </div>
                  <div className="mt-6">
                    <FormInput label="Facebook Link" placeholder="Optional" value={form.facebook_link} onChange={(v) => setForm((f) => ({ ...f, facebook_link: v }))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="bg-white p-4 -mx-6 -mb-6 border-t border-gray-100 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={isPending || !form.first_name || !form.last_name}
          >
            {isPending ? (
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
  );
}
