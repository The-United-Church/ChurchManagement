import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  LandingConfig,
  LandingCoreValue,
  LandingHighlight,
  LandingSocialLinks,
} from '@/lib/api';
import HighlightsEditor from './landing-editor/HighlightsEditor';
import CoreValuesEditor from './landing-editor/CoreValuesEditor';
import ServicesEditor from './landing-editor/ServicesEditor';
import MinistriesEditor from './landing-editor/MinistriesEditor';
import ImageUploadButton from './landing-editor/ImageUploadButton';

interface Props {
  value: LandingConfig | null;
  onChange: (next: LandingConfig | null) => void;
}

/**
 * Compact editor for the public landing page configuration. Renders inside the
 * Custom Domain settings dialog. Designed to be all-optional — every field
 * has a sensible fallback at render time on the public landing page.
 */
const LandingPageEditor: React.FC<Props> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  const cfg: LandingConfig = value ?? {};
  const setField = <K extends keyof LandingConfig>(k: K, v: LandingConfig[K]) => {
    onChange({ ...cfg, [k]: v });
  };

  const highlights = cfg.highlights ?? [];
  const coreValues = cfg.core_values ?? [];
  const social: LandingSocialLinks = cfg.social ?? {};

  const setSocial = (k: keyof LandingSocialLinks, v: string) =>
    setField('social', { ...social, [k]: v });

  return (
    <div className="rounded-md border bg-slate-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-medium text-slate-900">Public landing page</p>
          <p className="text-xs text-muted-foreground">
            Customise the page visitors see at the root of your custom domain.
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5">
          {/* ─── Hero ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Hero headline</Label>
              <Input
                value={cfg.hero_headline ?? ''}
                onChange={(e) => setField('hero_headline', e.target.value)}
                placeholder="Welcome home"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Primary CTA label</Label>
              <Input
                value={cfg.cta_primary_label ?? ''}
                onChange={(e) => setField('cta_primary_label', e.target.value)}
                placeholder="Join Us"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">Hero subheading</Label>
              <Textarea
                rows={2}
                value={cfg.hero_subheadline ?? ''}
                onChange={(e) => setField('hero_subheadline', e.target.value)}
                placeholder="Discover faith, find community, and grow with us each week."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">Hero background image</Label>
              <ImageUploadButton
                value={cfg.hero_image_url}
                onChange={(url) => setField('hero_image_url', url)}
                errorMessage="Hero image upload failed"
              />
            </div>
          </div>

          {/* ─── About + mission + video ─────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs">About us</Label>
            <Textarea
              rows={4}
              value={cfg.about ?? ''}
              onChange={(e) => setField('about', e.target.value)}
              placeholder="We are a vibrant community of believers… (supports line breaks)"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Mission statement</Label>
              <Textarea
                rows={2}
                value={cfg.mission ?? ''}
                onChange={(e) => setField('mission', e.target.value)}
                placeholder="To know Christ and make Him known."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Video URL (YouTube / Vimeo)</Label>
              <Input
                value={cfg.video_url ?? ''}
                onChange={(e) => setField('video_url', e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
              />
            </div>
          </div>

          {/* ─── Service times ───────────────────────────────────── */}
          <ServicesEditor
            value={cfg.service_times ?? []}
            onChange={(next) => setField('service_times', next)}
          />

          {/* ─── Ministries ──────────────────────────────────────── */}
          <MinistriesEditor
            value={cfg.ministries ?? []}
            onChange={(next) => setField('ministries', next)}
          />

          {/* ─── Core values ─────────────────────────────────────── */}
          <CoreValuesEditor
            value={coreValues}
            onChange={(next: LandingCoreValue[]) => setField('core_values', next)}
          />

          {/* ─── Highlights (replaces flat photo gallery) ────────── */}
          <HighlightsEditor
            value={highlights}
            onChange={(next: LandingHighlight[]) => setField('highlights', next)}
          />

          {/* ─── Social ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs">Social links</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Facebook URL"
                value={social.facebook ?? ''}
                onChange={(e) => setSocial('facebook', e.target.value)}
              />
              <Input
                placeholder="Instagram URL"
                value={social.instagram ?? ''}
                onChange={(e) => setSocial('instagram', e.target.value)}
              />
              <Input
                placeholder="YouTube URL"
                value={social.youtube ?? ''}
                onChange={(e) => setSocial('youtube', e.target.value)}
              />
              <Input
                placeholder="X / Twitter URL"
                value={social.twitter ?? ''}
                onChange={(e) => setSocial('twitter', e.target.value)}
              />
              <Input
                placeholder="WhatsApp URL"
                value={social.whatsapp ?? ''}
                onChange={(e) => setSocial('whatsapp', e.target.value)}
              />
              <Input
                placeholder="Website URL"
                value={social.website ?? ''}
                onChange={(e) => setSocial('website', e.target.value)}
              />
            </div>
          </div>

          {/* ─── Toggle ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
            <div>
              <Label className="text-sm">Show "Join Us" call-to-action</Label>
              <p className="text-xs text-muted-foreground">
                Display the primary signup CTA on hero &amp; closing sections.
              </p>
            </div>
            <Switch
              checked={cfg.show_join_cta !== false}
              onCheckedChange={(v) => setField('show_join_cta', v)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPageEditor;
