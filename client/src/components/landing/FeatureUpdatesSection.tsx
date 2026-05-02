import React, { useState } from 'react';
import { CheckCircle2, Clock, ChevronDown, ChevronUp, Sparkles, CalendarDays, QrCode, MapPin, Repeat, Image, Users, Eye, Copy, Globe, Palette, LayoutTemplate, Map, Navigation, Pin, Shield } from 'lucide-react';

interface Release {
  period: string;
  tag: 'Released' | 'Coming Soon';
  title: string;
  description: string;
  features: { icon: React.ReactNode; text: string }[];
}

const releases: Release[] = [
  {
    period: 'February – March 2026',
    tag: 'Released',
    title: 'People & Branch Management',
    description:
      'A set of foundational updates that strengthen how you organise your congregation and structure your branches.',
    features: [
      {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />,
        text: 'Register a branch under a denomination — link branches to their parent denomination for clear organisational hierarchy.',
      },
      {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />,
        text: 'Add visitors — record first-time and recurring visitors separately from your main membership list.',
      },
      {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />,
        text: 'Add members — onboard new members directly with their full profile details.',
      },
      {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />,
        text: 'Convert visitors to members — promote a visitor record to full membership with a single action.',
      },
    ],
  },
  {
    period: 'April 2026',
    tag: 'Released',
    title: 'Event Management',
    description:
      'A full-featured event system built for churches — from Sunday services to large-scale revivals.',
    features: [
      {
        icon: <CalendarDays className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
        text: 'Create & manage events across categories: Church Service, Midweek, Youth, Women, Men, Children, Revival, and General.',
      },
      {
        icon: <Repeat className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
        text: 'Recurring events — set schedules as daily, weekly, bi-weekly, monthly, quarterly, or yearly so regular services are never missed.',
      },
      {
        icon: <Users className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
        text: 'Attendance tracking — members can check in themselves, or admins can mark presence and absence from a live roster.',
      },
      {
        icon: <QrCode className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
        text: 'QR code check-in — generate a shareable QR code for each event so attendees can check in instantly.',
      },
      {
        icon: <MapPin className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
        text: 'Location-verified attendance — optionally require GPS confirmation to prevent remote check-ins.',
      },
      {
        icon: <Users className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
        text: 'Guest check-in with custom fields — collect names, phone numbers, addresses, and more from first-time visitors at the door.',
      },
      {
        icon: <Clock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
        text: 'Scheduled publishing — draft events privately, then set them to auto-publish at a chosen date and time.',
      },
      {
        icon: <Eye className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
        text: 'Visibility control — publish events publicly or restrict them to members only.',
      },
      {
        icon: <Image className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
        text: 'Event image uploads — add a banner or flyer to make event cards visually distinct.',
      },
      {
        icon: <Copy className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
        text: 'Duplicate events — clone any existing event as a starting point to save time when creating similar ones.',
      },
    ],
  },
  {
    period: 'April – May 2026',
    tag: 'Released',
    title: 'Custom Domains & Branded Public Pages',
    description:
      'Give your branch its own corner of the internet. Register a custom domain, configure your branding, and launch a public-facing site — all without writing a single line of code.',
    features: [
      {
        icon: <Globe className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />,
        text: 'Register a custom domain — map your own hostname (e.g. grace.yourchurch.com) to your branch and make it publicly accessible.',
      },
      {
        icon: <Palette className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />,
        text: 'Full branding control — set your church logo, accent colour, tagline, pastor name, and contact details that appear across all public pages.',
      },
      {
        icon: <LayoutTemplate className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />,
        text: 'Customisable landing page — configure a hero section, service times, ministry cards, an about section, video embed, core values, and social links.',
      },
      {
        icon: <Image className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />,
        text: 'Highlights gallery — curate photo collections grouped by event or activity so visitors can browse your church life at a glance.',
      },
      {
        icon: <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />,
        text: 'Approval workflow — domain requests go through super admin review before going live, with email notifications at every step.',
      },
      {
        icon: <Users className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />,
        text: 'Self-signup toggle — choose whether visitors who arrive via your custom domain can request to join the branch or are redirected away.',
      },
    ],
  },
  {
    period: 'May 2026',
    tag: 'Released',
    title: 'Member Location Map',
    description:
      'A visual map that shows where your branch members are located. Admins upload a custom map marker icon for the branch, and members self-report their location by dropping a pin — giving leadership a clear geographic picture of the congregation.',
    features: [
      {
        icon: <Map className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />,
        text: 'Dedicated Member Map page — a full-screen interactive Mapbox map accessible from the admin sidebar showing every member who has set a location pin.',
      },
      {
        icon: <Pin className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />,
        text: 'Self-reported member pins — members drop their own location pin (or tap "Use my current location") from their profile settings, keeping location data opt-in and accurate.',
      },
      {
        icon: <Image className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />,
        text: 'Custom branch marker icon — branch admins upload a dedicated map marker image (e.g. the church logo) that replaces the default pin, so every member location is branded.',
      },
      {
        icon: <Navigation className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />,
        text: 'Click-to-reveal member cards — clicking any marker on the map opens a popup showing the member\'s photo, full name, and coordinates.',
      },
      {
        icon: <Shield className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />,
        text: 'Privacy-first — members who have not set a pin do not appear on the map at all. Location data is stored only when the member explicitly saves it.',
      },
      {
        icon: <Users className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />,
        text: 'Branch-scoped — the map only shows members of the currently active branch, consistent with the existing branch-context model.',
      },
    ],
  },
  // {
  //   tag: 'Coming Soon',
  //   title: 'Event Management',
  //   description:
  //     'A full-featured event system built for churches — from Sunday services to large-scale revivals.',
  //   features: [
  //     {
  //       icon: <CalendarDays className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  //       text: 'Create & manage events across categories: Church Service, Midweek, Youth, Women, Men, Children, Revival, and General.',
  //     },
  //     {
  //       icon: <Repeat className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  //       text: 'Recurring events — set schedules as daily, weekly, bi-weekly, monthly, quarterly, or yearly so regular services are never missed.',
  //     },
  //     {
  //       icon: <Users className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  //       text: 'Attendance tracking — members can check in themselves, or admins can mark presence and absence from a live roster.',
  //     },
  //     {
  //       icon: <QrCode className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  //       text: 'QR code check-in — generate a shareable QR code for each event so attendees can check in instantly.',
  //     },
  //     {
  //       icon: <MapPin className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  //       text: 'Location-verified attendance — optionally require GPS confirmation to prevent remote check-ins.',
  //     },
  //     {
  //       icon: <Users className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  //       text: 'Guest check-in with custom fields — collect names, phone numbers, addresses, and more from first-time visitors at the door.',
  //     },
  //     {
  //       icon: <Clock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  //       text: 'Scheduled publishing — draft events privately, then set them to auto-publish at a chosen date and time.',
  //     },
  //     {
  //       icon: <Eye className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  //       text: 'Visibility control — publish events publicly or restrict them to members only.',
  //     },
  //     {
  //       icon: <Image className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  //       text: 'Event image uploads — add a banner or flyer to make event cards visually distinct.',
  //     },
  //     {
  //       icon: <Copy className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  //       text: 'Duplicate events — clone any existing event as a starting point to save time when creating similar ones.',
  //     },
  //   ],
  // },
];

const tagStyles: Record<Release['tag'], { badge: string; border: string; dot: string }> = {
  Released: {
    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  'Coming Soon': {
    badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400 animate-pulse',
  },
};

const ReleaseCard: React.FC<{ release: Release; defaultOpen?: boolean }> = ({ release, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const styles = tagStyles[release.tag];

  return (
    <div className={`rounded-2xl border bg-gray-800/60 backdrop-blur-sm overflow-hidden transition-all duration-300 ${styles.border}`}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-6 py-5 flex items-start sm:items-center justify-between gap-4 group"
        aria-expanded={open}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${styles.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
            {release.tag}
          </span>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">{release.period}</p>
            <h3 className="text-base font-semibold text-white leading-snug">{release.title}</h3>
          </div>
        </div>
        <span className="text-gray-500 group-hover:text-gray-300 transition-colors mt-1 sm:mt-0 shrink-0">
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-6 pb-6 border-t border-gray-700/50 pt-5 space-y-4">
          <p className="text-sm text-gray-400 leading-relaxed">{release.description}</p>
          <ul className="space-y-3">
            {release.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-300 leading-relaxed">
                {f.icon}
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const FeatureUpdatesSection: React.FC = () => (
  <section id="feature-updates" className="bg-gray-900 py-20 sm:py-28">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Heading */}
      <div className="text-center mb-14">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-blue-400 mb-3">
          <Sparkles className="h-3.5 w-3.5" /> What's New
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Feature Updates
        </h2>
        <p className="text-gray-400 text-base max-w-xl mx-auto">
          ChurchFlow ships improvements on a rolling basis. Here's a look at what's been released and what's on the way.
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-5">
        {releases.map((r) => (
          <ReleaseCard key={r.title} release={r} defaultOpen={r.tag === 'Released'} />
        ))}
      </div>
    </div>
  </section>
);

export default FeatureUpdatesSection;
