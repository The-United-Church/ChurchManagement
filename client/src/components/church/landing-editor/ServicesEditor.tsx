import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import ImageUploadButton from './ImageUploadButton';
import type { LandingServiceTime } from '@/lib/api';

interface Props {
  value: LandingServiceTime[];
  onChange: (next: LandingServiceTime[]) => void;
}

const ServicesEditor: React.FC<Props> = ({ value, onChange }) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const update = (i: number, patch: Partial<LandingServiceTime>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const add = () => {
    onChange([...value, { label: '', day: '', time: '' }]);
    setExpandedIdx(value.length);
  };

  const remove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
    if (expandedIdx === i) setExpandedIdx(null);
    else if (expandedIdx !== null && expandedIdx > i) setExpandedIdx(expandedIdx - 1);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Service times</Label>
          <p className="text-xs text-muted-foreground">
            Add your regular gatherings — visitors see these on the public page.
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-7" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add service
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No services added yet.</p>
      )}

      <div className="space-y-1.5">
        {value.map((s, i) => {
          const open = expandedIdx === i;
          return (
            <div key={i} className="rounded-md border bg-white overflow-hidden">
              {/* Collapsed header */}
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                  onClick={() => setExpandedIdx(open ? null : i)}
                >
                  {open ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  )}
                  <span className="text-xs font-medium truncate text-slate-800">
                    {s.label || <span className="text-slate-400 italic">Untitled service</span>}
                  </span>
                  {s.day && (
                    <span className="text-xs text-slate-400 shrink-0">{s.day}</span>
                  )}
                  {s.time && (
                    <span className="text-xs text-slate-400 shrink-0">· {s.time}</span>
                  )}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 shrink-0"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Expanded form */}
              {open && (
                <div className="border-t px-3 pb-3 pt-2 space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-5 h-8 text-xs"
                      placeholder="Sunday Service"
                      value={s.label}
                      onChange={(e) => update(i, { label: e.target.value })}
                    />
                    <Input
                      className="col-span-3 h-8 text-xs"
                      placeholder="Sundays"
                      value={s.day ?? ''}
                      onChange={(e) => update(i, { day: e.target.value })}
                    />
                    <Input
                      className="col-span-4 h-8 text-xs"
                      placeholder="9:00 AM"
                      value={s.time ?? ''}
                      onChange={(e) => update(i, { time: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      Background image (optional)
                    </Label>
                    <ImageUploadButton
                      value={s.background_image}
                      onChange={(url) => update(i, { background_image: url })}
                      folder="custom-domains/services"
                      thumbClassName="h-12 w-20"
                      errorMessage="Service image upload failed"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ServicesEditor;
