import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import type { Person, PersonUpdateDTO, PersonCreateDTO } from '@/types/person';
import { PersonFormFields } from './AddPersonDialog';
import { Country, State } from 'country-state-city';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Pencil } from 'lucide-react';
import { PhoneField } from './AddPersonDialog';
import { fetchPersonByEmail } from '@/lib/api';
import { format } from 'date-fns';

const normalizeGender = (value?: string): 'male' | 'female' | undefined => {
  const v = (value || '').toLowerCase();
  if (v === 'male' || v === 'female') return v;
  return undefined;
};

interface EditPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person | null;
  onSave: (id: string, data: PersonUpdateDTO) => Promise<boolean>;
  saving?: boolean;
}

const EditPersonDialog: React.FC<EditPersonDialogProps> = ({ open, onOpenChange, person, onSave, saving }) => {
  const [form, setForm] = useState<PersonCreateDTO>({
    first_name: '', last_name: '', middle_name: '', nickname: '',
    birthdate: '', gender: undefined, address: '', state: '',
    city: '', country: '', email: '', phone: '', profile_image: '',
  });
  const [birthdateDate, setBirthdateDate] = useState<Date | undefined>();
  const [countries] = useState(() => Country.getAllCountries());
  const [states, setStates] = useState<{ name: string; isoCode: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<Person | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const phoneOptions = React.useMemo(() => countries.map((c) => ({ isoCode: c.isoCode, name: c.name, code: `+${c.phonecode}`, flag: isoToFlag(c.isoCode) })), [countries]);

  const hydrateFromPerson = (source: Person | null) => {
    if (!source) {
      setForm({
        first_name: '', last_name: '', middle_name: '', nickname: '',
        birthdate: '', gender: undefined, address: '', state: '',
        city: '', country: '', email: '', phone: '', profile_image: '',
      });
      setBirthdateDate(undefined);
      setStates([]);
      return;
    }

    const countryInput = source.country || '';
    const matchedCountry = countries.find((c) =>
      c.name.toLowerCase() === countryInput.toLowerCase() ||
      c.isoCode.toLowerCase() === countryInput.toLowerCase()
    );
    const countryName = matchedCountry?.name || countryInput;
    const mappedStates = matchedCountry
      ? State.getStatesOfCountry(matchedCountry.isoCode).map((s) => ({ name: s.name, isoCode: s.isoCode }))
      : [];

    const parsedBirthdate = source.birthdate ? new Date(source.birthdate) : undefined;
    const validBirthdate = parsedBirthdate && !Number.isNaN(parsedBirthdate.getTime()) ? parsedBirthdate : undefined;

    setStates(mappedStates);
    setBirthdateDate(validBirthdate);
    setForm({
      first_name: source.first_name || '',
      last_name: source.last_name || '',
      middle_name: source.middle_name || '',
      nickname: source.nickname || '',
      birthdate: validBirthdate ? format(validBirthdate, 'yyyy-MM-dd') : '',
      gender: normalizeGender(source.gender),
      address: source.address || '',
      country: countryName || '',
      state: source.state || '',
      city: source.city || '',
      email: source.email || '',
      phone: source.phone || '',
      profile_image: source.profile_image || '',
    });
  };

  useEffect(() => {
    hydrateFromPerson(person);
  }, [person, countries]);

  const set = (field: keyof PersonCreateDTO, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    
    // Trigger email search when email field changes
    if (field === 'email') {
      handleSearchByEmail(value);
    }
  };

  const handleSearchByEmail = async (email: string) => {
    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchError(null);
    setSearchResult(null);

    // Don't search if email is empty or invalid
    if (!email || !email.includes('@')) {
      return;
    }

    // Debounce the search
    const timeout = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const result = await fetchPersonByEmail(email);
        const people = Array.isArray(result.data) ? result.data : [result.data];
        
        // Look for an exact email match (case-insensitive) that isn't the current person
        const exactMatch = people.find(p => p.email?.toLowerCase() === email.toLowerCase() && p.id !== person?.id);
        
        if (exactMatch) {
          setSearchResult(exactMatch);
          // Auto-populate the form with found data (only empty fields)
          populateFormFromPerson(exactMatch);
        } else if (people.length > 0 && people[0].id !== person?.id) {
          // If we have partial matches, show info but don't auto-populate
          setSearchError(`Found similar people but no exact email match. You can update manually if needed.`);
        }
      } catch (error) {
        console.error('Error searching person:', error);
        setSearchError(null); // Silently fail on network errors
      } finally {
        setSearchLoading(false);
      }
    }, 500); // 500ms debounce

    setSearchTimeout(timeout);
  };

  const populateFormFromPerson = (foundPerson: Person) => {
    hydrateFromPerson({
      ...foundPerson,
      email: foundPerson.email || form.email,
    } as Person);
  };

  const handleSave = async () => {
    if (!person) return;
    const nz = (v: any) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
    const payload: PersonUpdateDTO = {
      first_name: form.first_name,
      last_name: form.last_name,
      middle_name: nz(form.middle_name) as any,
      nickname: nz(form.nickname) as any,
      birthdate: nz(form.birthdate) as any,
      gender: form.gender,
      address: nz(form.address) as any,
      state: nz(form.state) as any,
      city: nz(form.city) as any,
      country: nz((form as any).country) as any,
      email: nz(form.email) as any,
      phone: nz(form.phone) as any,
      profile_image: nz((form as any).profile_image) as any,
    };
    const ok = await onSave(person.id, payload);
    if (ok) { 
      setSearchResult(null);
      setSearchError(null);
      if (searchTimeout) clearTimeout(searchTimeout);
      onOpenChange(false); 
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Cleanup when dialog closes
      if (searchTimeout) clearTimeout(searchTimeout);
      hydrateFromPerson(person);
      setSearchResult(null);
      setSearchError(null);
      setSearchLoading(false);
    }
    onOpenChange(newOpen);
  };

  const onCountryChange = (code: string) => {
    const country = countries.find((c) => c.isoCode === code);
    set('country', country?.name || '');
    const st = State.getStatesOfCountry(code).map((s) => ({ name: s.name, isoCode: s.isoCode }));
    setStates(st);
    set('state', '');
  };

  const handleImagePick = async (file: File) => {
    try {
      setUploading(true);
      const url = await uploadToCloudinary(file, 'people');
      set('profile_image', url as any);
    } finally {
      setUploading(false);
    }
  };

  function isoToFlag(isoCode: string): string {
    try { return String.fromCodePoint(...isoCode.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0))); } catch { return '🏳️'; }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Person</DialogTitle>
        </DialogHeader>
        {searchResult && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Person Found</p>
              <p className="text-xs text-blue-700">Details for {searchResult.first_name} {searchResult.last_name} have been merged. Empty fields were populated with their data.</p>
            </div>
          </div>
        )}
        {searchError && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Note</p>
              <p className="text-xs text-amber-700">{searchError}</p>
            </div>
          </div>
        )}
        {/* Avatar override to enable editing image in edit modal */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4">
          <div className="md:col-span-7 space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-white shadow-sm">
                  <AvatarImage src={(form as any).profile_image || ''} />
                  <AvatarFallback className="bg-gray-200 text-gray-400">{form.first_name?.[0]}{form.last_name?.[0]}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground border-2 border-white grid place-items-center cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImagePick(f); }} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <PersonFormFields
          form={form}
          set={set}
          birthdateDate={birthdateDate}
          setBirthdateDate={setBirthdateDate}
          showAvatar={false}
          showContactLocation={false}
          emailSearchLoading={searchLoading}
        />

        {/* Country / State controls in edit context */}
        <div className="px-6 -mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700">Country</Label>
              <Select value={countries.find((c) => c.name === (form as any).country)?.isoCode || ''} onValueChange={onCountryChange}>
                <SelectTrigger className="border-0 border-b border-gray-300 rounded-none px-0 focus:ring-0 shadow-none bg-transparent"><SelectValue placeholder="Select Country" /></SelectTrigger>
                <SelectContent className="bg-white max-h-72 overflow-auto">
                  {countries.map((c) => (<SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700">State / Region</Label>
              <Select value={form.state || ''} onValueChange={(v) => set('state', v)}>
                <SelectTrigger className="border-0 border-b border-gray-300 rounded-none px-0 focus:ring-0 shadow-none bg-transparent"><SelectValue placeholder="Select State/Region" /></SelectTrigger>
                <SelectContent className="bg-white max-h-72 overflow-auto">
                  {states.length > 0 ? states.map((s) => (<SelectItem key={s.isoCode} value={s.name}>{s.name}</SelectItem>)) : <div className="px-3 py-2 text-xs text-gray-500">Select a country first</div>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <PhoneField value={form.phone || ''} onChange={(v) => set('phone', v)} options={phoneOptions} countryName={(form as any).country || ''} />
        </div>
        <DialogFooter className="bg-white p-4 -mx-6 -mb-6 border-t border-gray-100 mt-6">
          <Button onClick={handleSave} disabled={saving || !form.first_name || !form.last_name} className="bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground font-medium px-8">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPersonDialog;
