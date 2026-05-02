import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { Country, State } from 'country-state-city';
import { uploadToCloudinary } from '@/lib/cloudinary';
import type { BranchDTO } from '@/lib/api';

interface BranchFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pastor_name: string;
  description: string;
  image: string;
  map_marker: string;
  is_headquarters: boolean;
}

const EMPTY: BranchFormData = {
  name: '',
  address: '',
  city: '',
  state: '',
  country: '',
  pastor_name: '',
  description: '',
  image: '',
  map_marker: '',
  is_headquarters: false,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BranchFormData) => Promise<void>;
  initial?: BranchDTO | null;
  loading?: boolean;
}

const countries = Country.getAllCountries();

const BranchFormDialog: React.FC<Props> = ({ open, onOpenChange, onSubmit, initial, loading }) => {
  const isEdit = !!initial;

  const toForm = (b: BranchDTO): BranchFormData => ({
    name: b.name ?? '',
    address: b.address ?? '',
    city: b.city ?? '',
    state: b.state ?? '',
    country: b.country ?? '',
    pastor_name: b.pastor_name ?? '',
    description: b.description ?? '',
    image: b.image ?? '',
    map_marker: b.map_marker ?? '',
    is_headquarters: b.is_headquarters ?? false,
  });

  const [form, setForm] = useState<BranchFormData>(() => (initial ? toForm(initial) : { ...EMPTY }));
  const [uploading, setUploading] = useState(false);
  const [uploadingMarker, setUploadingMarker] = useState(false);
  const [states, setStates] = useState<{ name: string; isoCode: string }[]>(() => {
    if (initial?.country) {
      const matched = countries.find((c) => c.name === initial.country);
      return matched ? State.getStatesOfCountry(matched.isoCode).map((s) => ({ name: s.name, isoCode: s.isoCode })) : [];
    }
    return [];
  });

  React.useEffect(() => {
    if (open) {
      const base = initial ? toForm(initial) : { ...EMPTY };
      setForm(base);
      if (base.country) {
        const matched = countries.find((c) => c.name === base.country);
        setStates(matched ? State.getStatesOfCountry(matched.isoCode).map((s) => ({ name: s.name, isoCode: s.isoCode })) : []);
      } else {
        setStates([]);
      }
    }
  }, [open, initial]);

  const set = (key: keyof BranchFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onCountryChange = (isoCode: string) => {
    const country = countries.find((c) => c.isoCode === isoCode);
    set('country', country?.name || '');
    setStates(State.getStatesOfCountry(isoCode).map((s) => ({ name: s.name, isoCode: s.isoCode })));
    set('state', '');
  };

  const handleImagePick = async (file: File) => {
    try {
      setUploading(true);
      const url = await uploadToCloudinary(file, 'branches');
      set('image', url);
    } finally {
      setUploading(false);
    }
  };

  const handleMarkerPick = async (file: File) => {
    try {
      setUploadingMarker(true);
      const url = await uploadToCloudinary(file, 'branches');
      set('map_marker', url);
    } finally {
      setUploadingMarker(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Branch image picker */}
          <div className="flex justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <Avatar className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <AvatarImage src={form.image || ''} className="object-cover rounded-lg" />
                  <AvatarFallback className="bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-400 dark:text-gray-500 text-xs">No image</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-app-primary hover:bg-app-primary-hover text-white border-2 border-background grid place-items-center cursor-pointer">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImagePick(f); }} />
                </label>
              </div>
              <span className="text-[11px] text-muted-foreground">Branch Image</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <Avatar className="h-24 w-24 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <AvatarImage src={form.map_marker || ''} className="object-cover" />
                  <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[10px] text-center px-1">Map<br />Marker</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-app-primary hover:bg-app-primary-hover text-white border-2 border-background grid place-items-center cursor-pointer">
                  {uploadingMarker ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMarkerPick(f); }} />
                </label>
              </div>
              <span className="text-[11px] text-muted-foreground">Map Marker Icon</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bf-name">Branch Name *</Label>
            <Input id="bf-name" placeholder="e.g. Lagos Central Branch" value={form.name}
              onChange={(e) => set('name', e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bf-pastor">Branch Pastor</Label>
            <Input id="bf-pastor" placeholder="e.g. Pastor John Doe" value={form.pastor_name}
              onChange={(e) => set('pastor_name', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bf-address">Address</Label>
              <Input id="bf-address" placeholder="123 Main Street" value={form.address}
                onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bf-city">City</Label>
              <Input id="bf-city" placeholder="Lagos" value={form.city}
                onChange={(e) => set('city', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bf-country">Country</Label>
              <Select
                value={countries.find((c) => c.name === form.country)?.isoCode || ''}
                onValueChange={onCountryChange}
              >
                <SelectTrigger id="bf-country">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 max-h-72 overflow-auto">
                  {countries.map((c) => (
                    <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bf-state">State</Label>
              <Select
                value={form.state || ''}
                onValueChange={(v) => set('state', v)}
                disabled={states.length === 0}
              >
                <SelectTrigger id="bf-state">
                  <SelectValue placeholder={states.length === 0 ? 'Select country first' : 'Select State'} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 max-h-72 overflow-auto">
                  {states.map((s) => (
                    <SelectItem key={s.isoCode} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bf-desc">Description</Label>
            <Textarea id="bf-desc" placeholder="Brief description of this branch..." rows={3}
              value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="bf-hq"
              type="checkbox"
              checked={form.is_headquarters}
              onChange={(e) => set('is_headquarters', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:accent-app-primary"
            />
            <Label htmlFor="bf-hq" className="cursor-pointer">Mark as Headquarters</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.name.trim() || loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Branch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BranchFormDialog;
