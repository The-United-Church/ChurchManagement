import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import ImageUploadButton from './ImageUploadButton';
import type { LandingMinistry } from '@/lib/api';

interface Props {
  value: LandingMinistry[];
  onChange: (next: LandingMinistry[]) => void;
}

const MinistriesEditor: React.FC<Props> = ({ value, onChange }) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const update = (i: number, patch: Partial<LandingMinistry>) =>
    onChange(value.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const add = () => {
    onChange([...value, { title: '', description: '', icon: '' }]);
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
          <Label className="text-xs">Ministries</Label>
          <p className="text-xs text-muted-foreground">
            Icons (optional):{' '}
            <code className="font-mono">Music2</code>,{' '}
            <code className="font-mono">Users</code>,{' '}
            <code className="font-mono">Heart</code>,{' '}
            <code className="font-mono">Sparkles</code>,{' '}
            <code className="font-mono">Church</code>,{' '}
            <code className="font-mono">Calendar</code>,{' '}
            <code className="font-mono">Globe</code>.
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-7" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add ministry
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No ministries added yet.</p>
      )}

      <div className="space-y-1.5">
        {value.map((m, i) => {
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
                    {m.title || <span className="text-slate-400 italic">Untitled ministry</span>}
                  </span>
                  {m.icon && (
                    <span className="text-xs text-slate-400 shrink-0 font-mono">{m.icon}</span>
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
                      className="col-span-7 h-8 text-xs"
                      placeholder="Ministry title"
                      value={m.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                    />
                    <Input
                      className="col-span-5 h-8 text-xs"
                      placeholder="Icon (e.g. Music2)"
                      value={m.icon ?? ''}
                      onChange={(e) => update(i, { icon: e.target.value })}
                    />
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Short description"
                    value={m.description ?? ''}
                    className="text-xs"
                    onChange={(e) => update(i, { description: e.target.value })}
                  />
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      Background image (optional)
                    </Label>
                    <ImageUploadButton
                      value={m.background_image}
                      onChange={(url) => update(i, { background_image: url })}
                      folder="custom-domains/ministries"
                      thumbClassName="h-12 w-20"
                      errorMessage="Ministry image upload failed"
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

export default MinistriesEditor;
