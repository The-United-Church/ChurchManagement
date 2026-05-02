import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import FeatureUpdatesSection from '@/components/landing/FeatureUpdatesSection';
import PricingSection from '@/components/landing/PricingSection';
import CTASection from '@/components/landing/CTASection';
import LandingFooter from '@/components/landing/LandingFooter';
import { useWebsiteVisit } from '@/hooks/useWebsiteVisit';

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  useWebsiteVisit('main_landing');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGetStarted = () => navigate('/denominations');
  const handleLogin = () => navigate('/login');
  const handleLearnMore = () => {
    document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader onGetStarted={handleGetStarted} onLogin={handleLogin} />
      <main className="flex-1">
        <HeroSection onGetStarted={handleGetStarted} onLearnMore={handleLearnMore} />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <FeatureUpdatesSection />
        {/* <PricingSection /> */}
        <CTASection onGetStarted={handleGetStarted} />
      </main>
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
