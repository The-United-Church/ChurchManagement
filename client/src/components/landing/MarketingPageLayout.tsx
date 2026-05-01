import React from 'react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

interface MarketingPageLayoutProps {
  /** Small uppercase label shown above the title (e.g. "Company"). */
  eyebrow?: string;
  /** The main page title. */
  title: string;
  /** Optional short blurb shown beneath the title. */
  subtitle?: string;
  /** Optional last-updated date (rendered for legal pages). */
  lastUpdated?: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for the static marketing pages linked from the landing
 * footer (About, Contact, Privacy Policy, etc.). Keeps the same header /
 * footer / typography as the rest of the landing site.
 */
const MarketingPageLayout: React.FC<MarketingPageLayoutProps> = ({
  eyebrow,
  title,
  subtitle,
  lastUpdated,
  children,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <LandingHeader
        onGetStarted={() => navigate('/denominations')}
        onLogin={() => navigate('/login')}
      />

      <main className="flex-1">
        {/* Hero / page header */}
        <section className="bg-gradient-to-b from-blue-50 via-white to-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 border-b border-slate-100 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 sm:pt-32 sm:pb-20">
            {eyebrow && (
              <p className="text-xs font-semibold tracking-widest uppercase text-blue-600 dark:text-blue-400 mb-3">
                {eyebrow}
              </p>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
            {lastUpdated && (
              <p className="mt-6 text-xs text-slate-500 dark:text-gray-500">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
        </section>

        {/* Body */}
        <section className="py-14 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-slate-600 dark:text-gray-400 leading-relaxed space-y-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a:hover]:text-blue-700 [&_a]:underline [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_strong]:font-semibold">
              {children}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default MarketingPageLayout;
