import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Church, Menu, X, PartyPopper } from 'lucide-react';

interface LandingHeaderProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const LandingHeader: React.FC<LandingHeaderProps> = ({ onGetStarted, onLogin }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const navigate = useNavigate();

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Denominations', href: '/denominations' },
    { label: 'Testimonials', href: '#testimonials' },
    // { label: 'Pricing', href: '#pricing' },
  ];

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith('/')) {
      navigate(href);
      return;
    }
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const tickerMessage = (
    <span className="inline-flex items-center gap-2">
      <PartyPopper className="h-3.5 w-3.5 shrink-0" />
      <span>
        <strong>ChurchFlow is completely free to use right now</strong> — try every feature at no cost.
        Add your church, set up branches, and start adding your members today.
      </span>
      <span className="mx-8 opacity-40">✦</span>
      <PartyPopper className="h-3.5 w-3.5 shrink-0" />
      <span>
        <strong>No subscription needed.</strong> Sign up, explore the platform, and see how it works for your congregation.
      </span>
      <span className="mx-8 opacity-40">✦</span>
    </span>
  );

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800">
      {/* ── Announcement banner ── */}
      {bannerVisible && (
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
          <style>{`
            @keyframes churchflow-ticker {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .churchflow-ticker-track {
              display: inline-flex;
              white-space: nowrap;
              animation: churchflow-ticker 32s linear infinite;
            }
            .churchflow-ticker-track:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="overflow-hidden py-2 pr-8">
            <div className="churchflow-ticker-track text-white text-xs font-medium">
              {tickerMessage}{tickerMessage}
            </div>
          </div>
          {/* Dismiss button */}
          <button
            onClick={() => setBannerVisible(false)}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Church className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ChurchFlow
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onLogin}>
              Sign In
            </Button>
            <Button size="sm" onClick={onGetStarted}>
              Get Started Free
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map(link => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="block w-full text-left text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 py-2"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
              <Button variant="outline" className="w-full" onClick={() => { setMobileOpen(false); onLogin(); }}>
                Sign In
              </Button>
              <Button className="w-full" onClick={() => { setMobileOpen(false); onGetStarted(); }}>
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default LandingHeader;
