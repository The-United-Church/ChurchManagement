import React, { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Images, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LandingHighlight } from '@/lib/api';

interface Props {
  highlights: LandingHighlight[];
}

const formatDate = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Public highlights gallery.
 *
 * - Title filter chips are deduplicated: selecting a title shows all highlights
 *   with that name, so duplicates never appear in the filter bar.
 * - Chips live in a horizontally-scrollable row so a long list never wraps.
 * - Each highlight renders as a card (cover image + meta). Clicking opens a
 *   full-screen modal with prev/next navigation and a thumbnail strip.
 */
const HighlightsGallery: React.FC<Props> = ({ highlights }) => {
  const [activeTitle, setActiveTitle] = useState<string>('all');
  const [expanded, setExpanded] = useState<{
    highlight: LandingHighlight;
    imageIndex: number;
  } | null>(null);

  /** Unique titles in insertion order (no duplicates in filter bar). */
  const uniqueTitles = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    highlights.forEach((h) => {
      if (h.title && !seen.has(h.title)) {
        seen.add(h.title);
        out.push(h.title);
      }
    });
    return out;
  }, [highlights]);

  const [activeDate, setActiveDate] = useState<string>('all');

  /** Whether the data has any dated highlights (shows the date picker). */
  const hasDates = useMemo(() => highlights.some((h) => !!h.date), [highlights]);

  const visible = useMemo(
    () =>
      highlights.filter((h) => {
        if (activeTitle !== 'all' && h.title !== activeTitle) return false;
        if (activeDate !== 'all' && h.date !== activeDate) return false;
        return true;
      }),
    [highlights, activeTitle, activeDate],
  );

  const hasFilter = activeTitle !== 'all' || activeDate !== 'all';

  if (highlights.length === 0) return null;

  return (
    <section className="bg-slate-50/80 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--brand)' }}
          >
            Highlights
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900">
            Moments together
          </h2>
          <p className="mt-3 text-slate-600">
            Browse our recent services, events and outreaches.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-start gap-3 mb-8">
          {/* Title filter — chips when ≤5 titles, dropdown when more */}
          <div className="flex-1 min-w-0">
            {uniqueTitles.length <= 5 ? (
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none' }}
              >
                <Button
                  type="button"
                  size="sm"
                  variant={activeTitle === 'all' ? 'default' : 'outline'}
                  onClick={() => setActiveTitle('all')}
                  className={`shrink-0 ${activeTitle === 'all' ? 'text-white' : ''}`}
                  style={activeTitle === 'all' ? { background: 'var(--brand)' } : undefined}
                >
                  All
                </Button>
                {uniqueTitles.map((title) => (
                  <Button
                    key={title}
                    type="button"
                    size="sm"
                    variant={activeTitle === title ? 'default' : 'outline'}
                    onClick={() => setActiveTitle(activeTitle === title ? 'all' : title)}
                    className={`shrink-0 ${activeTitle === title ? 'text-white' : ''}`}
                    style={activeTitle === title ? { background: 'var(--brand)' } : undefined}
                  >
                    {title}
                  </Button>
                ))}
              </div>
            ) : (
              <select
                value={activeTitle}
                onChange={(e) => setActiveTitle(e.target.value)}
                className="w-full sm:w-auto text-sm rounded-md border border-slate-200 bg-white px-2 py-1.5"
              >
                <option value="all">All categories</option>
                {uniqueTitles.map((title) => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date picker — no min/max so every date is clickable */}
          {hasDates && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={activeDate === 'all' ? '' : activeDate}
                onChange={(e) => setActiveDate(e.target.value || 'all')}
                className="text-sm rounded-md border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-offset-1"
              />
            </div>
          )}

          {hasFilter && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setActiveTitle('all');
                setActiveDate('all');
              }}
              className="shrink-0"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Card grid — one card per highlight */}
        {visible.length === 0 ? (
          <p className="text-center text-slate-500 py-12 text-sm">
            No highlights match your filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((h, i) => (
              <button
                type="button"
                key={h.id || i}
                onClick={() => setExpanded({ highlight: h, imageIndex: 0 })}
                className="group text-left rounded-xl overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ ['--tw-ring-color' as any]: 'var(--brand)' }}
              >
                {/* Cover image */}
                <div className="aspect-video bg-slate-100 overflow-hidden relative">
                  {h.images.length > 0 ? (
                    <img
                      src={h.images[0]}
                      alt={h.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images className="h-10 w-10 text-slate-300" />
                    </div>
                  )}
                  {h.images.length > 1 && (
                    <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
                      {h.images.length} photos
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 truncate">{h.title}</h3>
                  {h.date && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      {formatDate(h.date)}
                    </p>
                  )}
                  {h.description && (
                    <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">
                      {h.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Full-screen modal */}
      {expanded && (
        <HighlightModal
          highlight={expanded.highlight}
          initialIndex={expanded.imageIndex}
          onClose={() => setExpanded(null)}
        />
      )}
    </section>
  );
};

/* ── Full-screen highlight modal ─────────────────────────────────────────── */

interface ModalProps {
  highlight: LandingHighlight;
  initialIndex: number;
  onClose: () => void;
}

const HighlightModal: React.FC<ModalProps> = ({ highlight, initialIndex, onClose }) => {
  const [index, setIndex] = useState(initialIndex);
  const images = highlight.images;
  const step = (d: number) =>
    setIndex((prev) => (prev + d + images.length) % images.length);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div>
          <h3 className="text-white font-semibold">{highlight.title}</h3>
          {highlight.date && (
            <p className="text-white/50 text-xs mt-0.5">{formatDate(highlight.date)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden p-4">
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); step(-1); }}
            className="absolute left-4 z-10 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <img
          src={images[index]}
          alt={`${highlight.title} ${index + 1}`}
          className="max-h-full max-w-full object-contain rounded-lg select-none"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); step(1); }}
            className="absolute right-4 z-10 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {images.length > 1 && (
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/60 bg-black/40 px-3 py-1 rounded-full pointer-events-none">
            {index + 1} / {images.length}
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="h-20 flex gap-2 overflow-x-auto px-4 pb-3 items-end shrink-0">
          {images.map((url, idx) => (
            <button
              type="button"
              key={idx}
              onClick={(e) => { e.stopPropagation(); setIndex(idx); }}
              className={`h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                idx === index
                  ? 'border-white scale-105'
                  : 'border-transparent opacity-50 hover:opacity-90'
              }`}
              aria-label={`Go to photo ${idx + 1}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HighlightsGallery;
