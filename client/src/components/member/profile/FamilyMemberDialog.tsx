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
import { BadgeCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchPersonByEmail } from '@/lib/api';
import { FormInput } from '@/components/dashboard/people/AddPersonDialog';
import { FormSelect } from '@/components/ui/form-select';
import type { FamilyMember } from './types';
import {
  EMPTY_FAMILY,
  RELATIONSHIP_OPTIONS,
  MARITAL_OPTIONS,
  GENDER_OPTIONS,
} from './types';

interface FamilyMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMember: FamilyMember | null;
  onSave: (form: Omit<FamilyMember, 'id'>) => void;
  isPending: boolean;
}

export function FamilyMemberDialog({
  open,
  onOpenChange,
  editingMember,
  onSave,
  isPending,
}: FamilyMemberDialogProps) {
  const [form, setForm] = useState<Omit<FamilyMember, 'id'>>(EMPTY_FAMILY);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingMember) {
      const { id: _id, ...rest } = editingMember;
      setForm(rest);
    } else {
      setForm(EMPTY_FAMILY);
    }
  }, [open, editingMember]);

  const handleLookup = async () => {
    const email = (form.email || '').trim();
    if (!email) {
      toast.error('Enter an email to lookup');
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetchPersonByEmail(email);
      const found = res.data?.[0];
      if (found?.id) {
        setForm((f) => ({
          ...f,
          first_name: found.first_name || f.first_name,
          last_name: found.last_name || f.last_name,
          phone: found.phone || f.phone,
          gender: found.gender || f.gender,
          birthdate: (found.birthdate as any) || f.birthdate,
          marital_status: found.marital_status || f.marital_status,
          email,
          linked_user_id: found.id,
        }));
        toast.success('Existing member found — fields prefilled');
      } else {
        setForm((f) => ({ ...f, email, linked_user_id: '' }));
        toast.message('No existing member with that email — fill in details below');
      }
    } catch {
      toast.error('Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSave = () => {
    if (!form.first_name || !form.last_name || !form.relationship) {
      toast.error('First name, last name and relationship are required');
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-gray-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingMember ? 'Edit Family Member' : 'Add Family Member'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 space-y-6">
              {!editingMember && (
                <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                  <Label className="text-xs font-bold text-gray-700">
                    Existing member? Lookup by email
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="member@example.com"
                      value={form.email || ''}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value, linked_user_id: '' }))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleLookup}
                      disabled={lookupLoading}
                    >
                      {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                    </Button>
                  </div>
                  {form.linked_user_id && (
                    <p className="text-xs text-green-700 flex items-center gap-1">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Linked to existing app member
                    </p>
                  )}
                </div>
              )}

              <FormSelect
                label="Relationship"
                required
                options={RELATIONSHIP_OPTIONS}
                value={form.relationship}
                onValueChange={(v) => setForm((f) => ({ ...f, relationship: v }))}
                placeholder="Select relationship"
              />

              <div className="grid grid-cols-2 gap-6">
                <FormInput label="First Name" required value={form.first_name} onChange={(v) => setForm((f) => ({ ...f, first_name: v }))} />
                <FormInput label="Last Name" required value={form.last_name} onChange={(v) => setForm((f) => ({ ...f, last_name: v }))} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-700">Birth Date</Label>
                  <Input
                    type="date"
                    value={form.birthdate || ''}
                    onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
                    className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-app-primary bg-transparent"
                  />
                </div>
                <FormSelect label="Gender" options={GENDER_OPTIONS} value={form.gender || ''} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))} placeholder="Select gender" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <FormInput label="Mobile Phone" placeholder="Optional" value={form.phone || ''} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
                <FormSelect label="Marital Status" options={MARITAL_OPTIONS} value={form.marital_status || ''} onValueChange={(v) => setForm((f) => ({ ...f, marital_status: v }))} placeholder="Select status" />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="bg-white p-4 -mx-6 -mb-6 border-t border-gray-100">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
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
  );
}
