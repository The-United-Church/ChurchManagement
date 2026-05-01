import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { SocketProvider } from '@/components/auth/SocketProvider';
import { ChurchProvider } from '@/components/church/ChurchProvider';
import DomainProvider from '@/components/domain/DomainProvider';
import RealtimeSyncProvider from '@/components/auth/RealtimeSyncProvider';
import { ReloadPrompt } from '@/components/pwa/ReloadPrompt';
import ThemeBootstrap from '@/components/layout/ThemeBootstrap';
import Index from './pages/Index';
import LandingPage from './pages/LandingPage';
import CustomDomainLanding from './components/domain/CustomDomainLanding';
import CustomDomainAbout from './pages/CustomDomainAbout';
import CustomDomainServices from './pages/CustomDomainServices';
import DomainUnavailable from './pages/DomainUnavailable';
import GoogleAuthCallback from './pages/GoogleAuthCallback';
import { useDomain } from '@/components/domain/DomainProvider';
import Dashboard from './pages/Dashboard';
import SuperAdmin from './pages/SuperAdmin';
import NotFound from './pages/NotFound';
import JoinPage from './pages/JoinPage';
import DenominationsPage from './pages/DenominationsPage';
import EventCheckInPage from './pages/EventCheckInPage';
import MessagesPage from './pages/Messages';
import AboutUs from './pages/marketing/AboutUs';
import Blog from './pages/marketing/Blog';
import Careers from './pages/marketing/Careers';
import Contact from './pages/marketing/Contact';
import PrivacyPolicy from './pages/marketing/PrivacyPolicy';
import TermsOfService from './pages/marketing/TermsOfService';
import CookiePolicy from './pages/marketing/CookiePolicy';
import ProtectedRoute from '@/components/auth/RouteGuard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/**
 * Root route picker — when the visitor is on an active branded custom domain
 * (e.g. https://grace.churchflow.app/), show that branch's branded landing
 * page. Otherwise fall back to the default ChurchFlow marketing landing page.
 * Waits for branding resolution to avoid flicker.
 */
function RootLanding() {
  const { isCustomDomain, isDeactivated, isResolving, branding } = useDomain();
  if (isResolving) {
    return <div className="min-h-screen bg-white" />;
  }
  if (isDeactivated) {
    return <DomainUnavailable />;
  }
  if (isCustomDomain && branding) {
    return <CustomDomainLanding />;
  }
  return <LandingPage />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <SocketProvider isAuthenticated={isAuthenticated}>
      <ChurchProvider>
        <RealtimeSyncProvider>
        <ThemeBootstrap />
        <Toaster />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<RootLanding />} />
            {/* Custom-domain sub-pages — only meaningful on branded domains */}
            <Route path="/about" element={<CustomDomainAbout />} />
            <Route path="/services" element={<CustomDomainServices />} />
            {/* Google OAuth landing — backend redirects here with tokens in
                the URL fragment after the user completes Google sign-in.
                Works identically on the main domain and any custom domain. */}
            <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
            <Route path="/login" element={<Index />} />
            <Route path="/register" element={<Index />} />
            <Route path="/register-church" element={<Index />} />
            <Route path="/forgot-password" element={<Index />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/people" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/directory" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/followups" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/accounting" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/users-roles" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/share-app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/churches" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/branches" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/church-members" element={<ProtectedRoute allowedRoles={['admin','super_admin']} allowedBranchRoles={['admin','coordinator','member']}><Dashboard /></ProtectedRoute>} />
            <Route path="/add-contribution" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/all-contributions" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/batches" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/funds" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/pledges" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/organisations" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            {/* Member portal — each section gets its own URL */}
            <Route path="/member" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/profile" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/directory" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/registrations" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/calendar" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/notifications" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/settings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/events" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/settings/password" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/settings/currency" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/settings/directory" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/superadmin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdmin /></ProtectedRoute>} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/denominations" element={<DenominationsPage />} />
            <Route path="/checkin/:eventId" element={<EventCheckInPage />} />
            {/* Marketing / legal pages linked from the landing footer. */}
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </RealtimeSyncProvider>
      </ChurchProvider>
    </SocketProvider>
  );
}

const App = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DomainProvider>
          <AuthProvider>
            <AppRoutes />
            <ReloadPrompt />
          </AuthProvider>
        </DomainProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

export default App;