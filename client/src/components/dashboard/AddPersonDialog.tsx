import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import { User, Pencil, Calendar as CalendarIcon, Loader2, ChevronDown } from 'lucide-react';
import type { PersonCreateDTO } from '@/types/person';
import { Country, State } from 'country-state-city';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PersonCreateDTO) => Promise<boolean>;
  saving?: boolean;
}

const emptyForm: PersonCreateDTO = {
  first_name: '', last_name: '', middle_name: '', nickname: '',
  birthdate: '', gender: undefined, address: '', state: '',
  city: '', country: '', email: '', phone: '',
};

const AddPersonDialog: React.FC<AddPersonDialogProps> = ({ open, onOpenChange, onSave, saving }) => {
  const [form, setForm] = useState<PersonCreateDTO>({ ...emptyForm });
  const [birthdateDate, setBirthdateDate] = useState<Date>();
  const [countries] = useState(() => Country.getAllCountries());
  const [states, setStates] = useState<{ name: string; isoCode: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const phoneOptions = React.useMemo(() => countries.map((c) => ({ isoCode: c.isoCode, name: c.name, code: `+${c.phonecode}`, flag: isoToFlag(c.isoCode) })), [countries]);

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

  const set = (field: keyof PersonCreateDTO, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    const normalize = (f: PersonCreateDTO): PersonCreateDTO => {
      const nz = (v: any) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
      return {
        first_name: f.first_name,
        last_name: f.last_name,
        middle_name: nz(f.middle_name) as any,
        nickname: nz(f.nickname) as any,
        birthdate: nz(f.birthdate) as any, // expect YYYY-MM-DD or undefined
        gender: f.gender,
        address: nz(f.address) as any,
        state: nz(f.state) as any,
        city: nz(f.city) as any,
        country: nz((f as any).country) as any,
        email: nz(f.email) as any,
        phone: nz(f.phone) as any,
        profile_image: nz((f as any).profile_image) as any,
      };
    };
    const ok = await onSave(normalize(form));
    console.log('Save result:', ok);
    if (ok) { setForm({ ...emptyForm }); setBirthdateDate(undefined); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Person</DialogTitle>
        </DialogHeader>
        <PersonFormFields
          form={form}
          set={set}
          birthdateDate={birthdateDate}
          setBirthdateDate={setBirthdateDate}
          uploading={uploading}
          onPickImage={handleImagePick}
          countries={countries.map((c) => ({ name: c.name, isoCode: c.isoCode }))}
          states={states}
          onCountryChange={onCountryChange}
          phoneOptions={phoneOptions}
          showAvatar
          showContactLocation
        />
        <DialogFooter className="bg-white p-4 -mx-6 -mb-6 border-t border-gray-100 mt-6">
          <Button onClick={handleSave} disabled={saving || !form.first_name || !form.last_name} className="bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground font-medium px-8">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPersonDialog;

/* ─── Shared form fields (reused by Edit dialog) ──────────────────────── */
export function isoToFlag(isoCode: string): string {
  try { return String.fromCodePoint(...isoCode.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0))); } catch { return '🏳️'; }
}

export const PhoneField: React.FC<{ value: string; onChange: (v: string) => void; options: { isoCode: string; name: string; code: string; flag: string }[]; countryName: string }> = ({ value, onChange, options, countryName }) => {
  const findDefault = () => {
    const byPhone = options.find((o) => value.startsWith(o.code));
    if (byPhone) return byPhone;
    const byCountry = options.find((o) => o.name === countryName);
    return byCountry || options.find((o) => o.code === '+234') || options[0];
  };
  const [cc, setCc] = React.useState(findDefault().code);
  const [local, setLocal] = React.useState(value.replace(cc, ''));

  React.useEffect(() => {
    const opt = options.find((o) => value.startsWith(o.code));
    const current = opt ? opt.code : cc;
    setCc(current);
    setLocal(value.replace(current, ''));
  }, [value]);

  const countryCodes = options.map((o) => ({ code: o.code, flag: o.flag }));

  const update = (nextCc: string, nextLocal: string) => {
    const digits = nextLocal.replace(/[^0-9]/g, '');
    onChange(`${nextCc}${digits}`);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-gray-700">Phone</Label>
      <div className="flex gap-2">
        <div className="relative flex-none">
          <select
            value={cc}
            onChange={(e) => { const next = e.target.value; setCc(next); update(next, local); }}
            className="border-0 border-b border-gray-300 rounded-none pl-3 pr-8 py-2.5 text-sm appearance-none min-w-[120px] bg-transparent focus:outline-none focus-visible:border-app-primary"
          >
            {countryCodes.map((item, idx) => (
              <option key={`${item.code}-${idx}`} value={item.code}>
                {item.flag} {item.code}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        <Input
          value={local}
          onChange={(e) => { const v = e.target.value; setLocal(v); update(cc, v); }}
          placeholder="Phone number"
          className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-app-primary bg-transparent"
        />
      </div>
    </div>
  );
};
export const PersonFormFields: React.FC<{
  form: PersonCreateDTO;
  set: (field: keyof PersonCreateDTO, value: any) => void;
  birthdateDate?: Date;
  setBirthdateDate: (d: Date | undefined) => void;
  uploading?: boolean;
  onPickImage?: (file: File) => void;
  countries?: { name: string; isoCode: string }[];
  states?: { name: string; isoCode: string }[];
  onCountryChange?: (code: string) => void;
  phoneOptions?: { isoCode: string; name: string; code: string; flag: string }[];
  showAvatar?: boolean;
  showContactLocation?: boolean;
}> = ({ form, set, birthdateDate, setBirthdateDate, uploading, onPickImage, countries = [], states = [], onCountryChange, phoneOptions = [], showAvatar = true, showContactLocation = true }) => (
  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4">
    {/* Left Column */}
    <div className="md:col-span-7 space-y-6">
      {showAvatar && (
        <div className="flex justify-center">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-white shadow-sm">
              <AvatarImage src={form.profile_image || ''} />
              <AvatarFallback className="bg-gray-200 text-gray-400"><User className="h-16 w-16" /></AvatarFallback>
            </Avatar>
            {onPickImage && (
              <label className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-app-primary hover:bg-app-primary-hover text-app-primary-foreground border-2 border-white grid place-items-center cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); }} />
              </label>
            )}
          </div>
        </div>
      )}
      <Card className="border-none shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormInput label="First Name" required value={form.first_name} onChange={(v) => set('first_name', v)} />
            <FormInput label="Last Name" required value={form.last_name} onChange={(v) => set('last_name', v)} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <FormInput label="Middle Name" value={form.middle_name || ''} onChange={(v) => set('middle_name', v)} />
            <FormInput label="Nickname" value={form.nickname || ''} onChange={(v) => set('nickname', v)} />
          </div>
        </CardContent>
      </Card>
      <Card className="border-none shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700">Birthdate</Label>
              <DatePicker
                selected={birthdateDate}
                onChange={(date: Date) => { setBirthdateDate(date); set('birthdate', date ? format(date, 'yyyy-MM-dd') : ''); }}
                showYearDropdown showMonthDropdown dropdownMode="select"
                customInput={
                  <div className="relative">
                     <Input value={birthdateDate ? format(birthdateDate, 'dd/MM/yyyy') : ''} readOnly placeholder="DD/MM/YYYY" className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-app-primary bg-transparent pr-8" />
                    <CalendarIcon className="absolute right-0 top-2 h-4 w-4 text-gray-400" />
                  </div>
                }
              />
            </div>
            <GenderRadio value={form.gender} onChange={(v) => set('gender', v)} />
          </div>
        </CardContent>
      </Card>
    </div>
    {/* Right Column */}
    <div className="md:col-span-5 space-y-6">
      <Card className="border-none shadow-sm h-fit bg-white overflow-hidden">
        <Tabs defaultValue="address" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-gray-100 rounded-none h-auto p-0">
            <TabsTrigger value="address" className="rounded-none border-b-2 border-transparent data-[state=active]:border-app-primary data-[state=active]:text-app-selected-text data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-semibold text-gray-500">Address</TabsTrigger>
            <TabsTrigger value="map" className="rounded-none border-b-2 border-transparent data-[state=active]:border-app-primary data-[state=active]:text-app-selected-text data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-semibold text-gray-500">Map</TabsTrigger>
          </TabsList>
          <TabsContent value="address" className="p-6 space-y-6 mt-0">
            <FormInput label="Address" value={form.address || ''} onChange={(v) => set('address', v)} />
            {showContactLocation && (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-700">Country</Label>
                  <Select value={countries.find((c) => c.name === form.country)?.isoCode || ''} onValueChange={(code) => onCountryChange && onCountryChange(code)}>
                    <SelectTrigger className="border-0 border-b border-gray-300 rounded-none px-0 focus:ring-0 shadow-none bg-transparent"><SelectValue placeholder="Select Country" /></SelectTrigger>
                    <SelectContent className="bg-white max-h-72 overflow-auto">
                      {countries.map((c) => (
                        <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-700">State / Region</Label>
                  <Select value={form.state || ''} onValueChange={(v) => set('state', v)}>
                    <SelectTrigger className="border-0 border-b border-gray-300 rounded-none px-0 focus:ring-0 shadow-none bg-transparent"><SelectValue placeholder="Select State/Region" /></SelectTrigger>
                    <SelectContent className="bg-white max-h-72 overflow-auto">
                      {states.length > 0 ? states.map((s) => (
                        <SelectItem key={s.isoCode} value={s.name}>{s.name}</SelectItem>
                      )) : <div className="px-3 py-2 text-xs text-gray-500">Select a country first</div>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <FormInput label="City" value={form.city || ''} onChange={(v) => set('city', v)} />
            <div className="pt-4 border-t border-gray-100 mt-4">
              <h4 className="text-sm font-semibold mb-4 text-gray-900">Contact Information</h4>
              <div className="space-y-4">
                <FormInput label="Email" value={form.email || ''} onChange={(v) => set('email', v)} />
                {showContactLocation && (
                  <PhoneField value={form.phone || ''} onChange={(v) => set('phone', v)} options={phoneOptions} countryName={form.country || ''} />
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="map" className="p-6 mt-0 h-64 flex items-center justify-center bg-gray-50">
            <p className="text-gray-500">Map view will be available here</p>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  </div>
);

/* ─── Tiny reusable helpers ───────────────────────────────────────────── */
export const FormInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }> = ({ label, value, onChange, required, placeholder }) => (
  <div className="space-y-2">
    <Label className="text-xs font-bold text-gray-700">{label}{required && <span className="text-red-500"> *</span>}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-app-primary bg-transparent" />
  </div>
);

const GenderRadio: React.FC<{ value?: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="space-y-2">
    <Label className="text-xs font-bold text-gray-700">Gender</Label>
    <div className="flex gap-6 pt-2">
      {(['male', 'female'] as const).map((g) => (
        <label key={g} className="flex items-center gap-2 cursor-pointer">
          <div className={`w-5 h-5 rounded-full border ${value === g ? 'border-app-primary' : 'border-gray-300'} flex items-center justify-center bg-white`}>
            {value === g && <div className="w-2.5 h-2.5 rounded-full bg-app-primary" />}
          </div>
          <input type="radio" name="gender" className="hidden" checked={value === g} onChange={() => onChange(g)} />
          <span className="text-sm text-app-selected-text capitalize">{g}</span>
        </label>
      ))}
    </div>
  </div>
);
