import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Church,
  Clock,
  Heart,
  MapPin,
  Music2,
  Phone,
  PlayCircle,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDomain } from '@/components/domain/DomainProvider';
import BrandedFooter from '@/components/domain/BrandedFooter';
import BrandedHeader from '@/components/domain/BrandedHeader';
import HighlightsGallery from '@/components/domain/HighlightsGallery';
import type { LandingHighlight, LandingMinistry, LandingServiceTime } from '@/lib/api';
import { useWebsiteVisit } from '@/hooks/useWebsiteVisit';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const DEFAULT_MINISTRIES: LandingMinistry[] = [
  { title: 'Worship', description: 'Join us in spirit-filled worship every week.', icon: 'Music2' },
  { title: 'Community', description: 'Small groups, fellowship & friendship that grows your faith.', icon: 'Users' },
  { title: 'Outreach', description: 'Serving our city with the love of Christ.', icon: 'Heart' },
];

const MINISTRY_ICON: Record<string, React.ElementType> = {
  Music2, Users, Heart, Sparkles, Church, Calendar,
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Page                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

const CustomDomainLanding: React.FC = () => {
  const { branding } = useDomain();
  useWebsiteVisit('custom_domain_landing');

  const accent = branding?.primary_color || '#4F46E5';
  const churchName = branding?.church_name || branding?.display_name || 'Our Church';
  const tagline = branding?.tagline || 'A place to belong, believe and become.';
  const cfg = branding?.landing_config ?? null;

  const heroHeadline =
    cfg?.hero_headline || `Welcome to ${branding?.display_name || churchName}`;
  const heroSub =
    cfg?.hero_subheadline ||
    tagline ||
    'Discover faith, find community, and grow with us each week.';
  const ctaLabel = cfg?.cta_primary_label || 'Join Us';
  const showJoin = cfg?.show_join_cta !== false; // default true

  const ministries =
    cfg?.ministries && cfg.ministries.length > 0 ? cfg.ministries : DEFAULT_MINISTRIES;

  // Inline CSS variables to brand the page without leaking globally.
  const themeStyle = useMemo<React.CSSProperties>(
    () => ({
      ['--brand' as any]: accent,
      ['--brand-soft' as any]: `${accent}15`, // 15 ≈ 8% alpha hex
    }),
    [accent],
  );

  return (
    <div style={themeStyle} className="min-h-screen bg-white dark:bg-gray-900 text-slate-900 dark:text-white antialiased">
      <BrandedHeader />

      <Hero
        headline={heroHeadline}
        subheadline={heroSub}
        ctaLabel={ctaLabel}
        showJoin={showJoin}
        heroImage={cfg?.hero_image_url ?? null}
        accent={accent}
      />

      {(branding?.address || branding?.pastor_name || branding?.contact_phone) && (
        <QuickFacts
          address={branding?.address ?? null}
          pastor={branding?.pastor_name ?? null}
          phone={branding?.contact_phone ?? null}
        />
      )}

      {cfg?.about && <About text={cfg.about} mission={cfg.mission} />}

      {cfg?.video_url && <VideoBlock url={cfg.video_url} />}

      {cfg?.service_times && cfg.service_times.length > 0 && (
        <ServiceTimes items={cfg.service_times} />
      )}

      <Ministries items={ministries} />

      {/*
        Backward-compat: surface the legacy flat gallery_urls list as a single
        ungrouped highlight so older configs still display.
      */}
      <HighlightsGallery highlights={normalizeHighlights(cfg)} />

      <CallToAction churchName={churchName} ctaLabel={ctaLabel} accent={accent} />

      <BrandedFooter
        churchName={churchName}
        address={branding?.address ?? null}
        email={branding?.contact_email ?? null}
        phone={branding?.contact_phone ?? null}
        social={cfg?.social ?? null}
      />
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Sections                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */



const Hero: React.FC<{
  headline: string;
  subheadline: string;
  ctaLabel: string;
  showJoin: boolean;
  heroImage: string | null;
  accent: string;
}> = ({ headline, subheadline, ctaLabel, showJoin, heroImage }) => (
  <section className="relative overflow-hidden">
    {heroImage && (
      <>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-900/70 to-slate-900/40" />
      </>
    )}
    {!heroImage && (
      <div
        className="absolute inset-0"
        style={{
          background:
          'radial-gradient(circle at 20% 20%, var(--brand-soft), transparent 55%), radial-gradient(circle at 80% 60%, var(--brand-soft), transparent 50%)',
        }}
      />
    )}
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
      <div className="max-w-3xl">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            heroImage ? 'bg-white/15 text-white border border-white/20' : 'border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-200'
          }`}
          style={!heroImage ? { color: 'var(--brand)' } : undefined}
        >
          <Sparkles className="h-3.5 w-3.5" /> Welcome home
        </span>
        <h1
          className={`mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight ${
            heroImage ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}
        >
          {headline}
        </h1>
        <p
          className={`mt-6 text-lg sm:text-xl max-w-2xl leading-relaxed ${
            heroImage ? 'text-white/90' : 'text-slate-600 dark:text-gray-400'
          }`}
        >
          {subheadline}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {showJoin && (
            <Button asChild size="lg" style={{ background: 'var(--brand)' }} className="text-white hover:opacity-90">
              <Link to="/register">
                {ctaLabel} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
          <Button
            asChild
            size="lg"
            variant={heroImage ? 'outline' : 'ghost'}
            className={heroImage ? 'border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white' : ''}
          >
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

const QuickFacts: React.FC<{
  address: string | null;
  pastor: string | null;
  phone: string | null;
}> = ({ address, pastor, phone }) => (
  <section className="border-y border-slate-200 dark:border-gray-700 bg-slate-50/60 dark:bg-gray-800/60">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-700 dark:text-gray-300">
      {address && (
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--brand)' }} />
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-gray-400">Find us</p>
            <p className="font-medium text-slate-900 dark:text-white">{address}</p>
          </div>
        </div>
      )}
      {pastor && (
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--brand)' }} />
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-gray-400">Led by</p>
            <p className="font-medium text-slate-900 dark:text-white">{pastor}</p>
          </div>
        </div>
      )}
      {phone && (
        <div className="flex items-start gap-3">
          <Phone className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--brand)' }} />
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-gray-400">Call us</p>
            <a href={`tel:${phone}`} className="font-medium text-slate-900 dark:text-white hover:underline">{phone}</a>
          </div>
        </div>
      )}
    </div>
  </section>
);

const About: React.FC<{ text: string; mission?: string }> = ({ text, mission }) => (
  <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--brand)' }}>
          About Us
        </p>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Who we are</h2>
      </div>
      <div className="lg:col-span-2 space-y-6 text-lg leading-relaxed text-slate-600 dark:text-gray-400 whitespace-pre-line">
        <p>{text}</p>
        {mission && (
          <Card className="border-0 shadow-none" style={{ background: 'var(--brand-soft)' }}>
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--brand)' }}>
                Our mission
              </p>
              <p className="text-slate-800 dark:text-gray-200 italic leading-relaxed">"{mission}"</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  </section>
);

const VideoBlock: React.FC<{ url: string }> = ({ url }) => {
  const embedUrl = useMemo(() => toEmbed(url), [url]);
  return (
    <section className="bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {embedUrl ? (
          <div className="aspect-video rounded-xl overflow-hidden shadow-2xl">
            <iframe
              src={embedUrl}
              title="Church video"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-3 text-white py-20 text-lg hover:opacity-80 transition-opacity"
          >
            <PlayCircle className="h-12 w-12" /> Watch our welcome video
          </a>
        )}
      </div>
    </section>
  );
};

const ServiceTimes: React.FC<{ items: LandingServiceTime[] }> = ({ items }) => (
  <section id="services" className="bg-slate-50/80 dark:bg-gray-800/50 border-y border-slate-200 dark:border-gray-700">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--brand)' }}>
          Service Times
        </p>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">When we gather</h2>
        <p className="mt-3 text-slate-600 dark:text-gray-400">Come as you are — there's a seat saved for you.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((s, i) => {
          const hasBg = !!s.background_image;
          return (
            <Card
              key={i}
              className={`relative overflow-hidden border-slate-200 dark:border-gray-700 ${hasBg ? 'text-white' : 'dark:bg-gray-800'}`}
            >
              {hasBg && (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${s.background_image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 to-slate-900/40" />
                </>
              )}
              <CardContent className={`relative p-6 ${hasBg ? 'min-h-[180px]' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={
                      hasBg
                        ? { background: 'rgba(255,255,255,0.15)', color: 'white' }
                        : { background: 'var(--brand-soft)', color: 'var(--brand)' }
                    }
                  >
                    <Calendar className="h-5 w-5" />
                  </div>
                  <h3
                    className={`text-lg font-semibold ${hasBg ? 'text-white' : 'text-slate-900 dark:text-white'}`}
                  >
                    {s.label}
                  </h3>
                </div>
                <div
                  className={`space-y-1 text-sm ${hasBg ? 'text-white/90' : 'text-slate-600 dark:text-gray-400'}`}
                >
                  {s.day && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {s.day}
                    </p>
                  )}
                  {s.time && (
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {s.time}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  </section>
);

const Ministries: React.FC<{ items: LandingMinistry[] }> = ({ items }) => (
  <section id="ministries" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
    <div className="text-center max-w-2xl mx-auto mb-14">
      <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--brand)' }}>
        Ministries
      </p>
      <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Find your place</h2>
      <p className="mt-3 text-slate-600 dark:text-gray-400">
        From kids to seniors, there's a community here for every season of life.
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((m, i) => {
        const Icon = (m.icon && MINISTRY_ICON[m.icon]) || Sparkles;
        if (m.background_image) {
          return (
            <Card
              key={i}
              className="border-0 overflow-hidden hover:shadow-md transition-shadow relative"
              style={{ minHeight: 200 }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${m.background_image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/10" />
              <CardContent className="relative p-6 flex flex-col justify-end h-full" style={{ minHeight: 200 }}>
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">{m.title}</h3>
                {m.description && (
                  <p className="mt-1 text-white/80 leading-relaxed text-sm">{m.description}</p>
                )}
              </CardContent>
            </Card>
          );
        }
        return (
          <Card key={i} className="border-slate-200 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{m.title}</h3>
              {m.description && (
                <p className="mt-2 text-slate-600 dark:text-gray-400 leading-relaxed">{m.description}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  </section>
);

const Gallery: React.FC<{ urls: string[] }> = () => null; // legacy — replaced by <HighlightsGallery />
void Gallery;

/**
 * Build the `highlights[]` we want to render.  Falls back to wrapping the
 * legacy `gallery_urls[]` so older configs keep working.
 */
function normalizeHighlights(
  cfg: { highlights?: LandingHighlight[]; gallery_urls?: string[] } | null,
): LandingHighlight[] {
  if (!cfg) return [];
  if (cfg.highlights && cfg.highlights.length > 0) return cfg.highlights;
  if (cfg.gallery_urls && cfg.gallery_urls.length > 0) {
    return [{ id: 'legacy', title: 'Gallery', images: cfg.gallery_urls }];
  }
  return [];
}

const CallToAction: React.FC<{ churchName: string; ctaLabel: string; accent: string }> = ({
  churchName,
  ctaLabel,
}) => (
  <section className="relative overflow-hidden">
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(135deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 70%, black) 100%)',
      }}
    />
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-white">
      <h2 className="text-3xl sm:text-4xl font-bold">There's a place for you at {churchName}.</h2>
      <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto">
        Create your account in less than a minute, get connected, and stay updated on everything happening in our community.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg" variant="secondary" className="bg-white hover:bg-white/90" style={{ color: 'var(--brand)' }}>
          <Link to="/register">{ctaLabel} <ArrowRight className="h-4 w-4 ml-1" /></Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
          <Link to="/login">I already have an account</Link>
        </Button>
      </div>
    </div>
  </section>
);

/* ────────────────────────────────────────────────────────────────────────── */
/*  Utils                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

/** Convert a YouTube/Vimeo URL into an embeddable iframe src. Returns null if unrecognised. */
function toEmbed(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.hostname.includes('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export default CustomDomainLanding;
