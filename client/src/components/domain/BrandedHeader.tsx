/**
 * BrandedHeader — shared sticky header used on every custom-domain public page.
 *
 * Accepts an optional `activePage` prop so the correct nav link is highlighted.
 * Mirrors BrandedFooter in that it is one canonical component used everywhere.
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Church } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDomain } from '@/components/domain/DomainProvider';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Services', to: '/services' },
] as const;

const BrandedHeader: React.FC = () => {
  const { branding } = useDomain();
  const { pathname } = useLocation();

  const accent = branding?.primary_color || '#4F46E5';
  const churchName = branding?.church_name || branding?.display_name || 'Our Church';
  const logoUrl = branding?.logo_url ?? null;

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-gray-900/85 backdrop-blur border-b border-slate-200/60 dark:border-gray-700/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo / church name */}
        <Link to="/" className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={churchName} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ background: accent }}
            >
              <Church className="h-5 w-5" />
            </div>
          )}
          <span className="font-semibold text-slate-900 dark:text-white truncate">{churchName}</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {NAV_LINKS.map(({ label, to }) => {
            const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={
                  isActive
                    ? 'transition-colors font-semibold'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors'
                }
                style={isActive ? { color: accent } : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Auth buttons */}
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="text-white hover:opacity-90"
            style={{ background: accent }}
          >
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default BrandedHeader;
