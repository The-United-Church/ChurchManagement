import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { SocketProvider } from '@/components/auth/SocketProvider';
import { ChurchProvider } from '@/components/church/ChurchProvider';
import Index from './pages/Index';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import SuperAdmin from './pages/SuperAdmin';
import NotFound from './pages/NotFound';
import ProtectedRoute from '@/components/auth/RouteGuard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <SocketProvider isAuthenticated={isAuthenticated}>
      <ChurchProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Index />} />
            <Route path="/register" element={<Index />} />
            <Route path="/register-church" element={<Index />} />
            <Route path="/forgot-password" element={<Index />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/people" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/followups" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/accounting" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/users-roles" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/share-app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/churches" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/branches" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/church-members" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Dashboard /></ProtectedRoute>} />
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
            <Route path="/member/settings/password" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/settings/currency" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/member/settings/directory" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/superadmin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdmin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ChurchProvider>
    </SocketProvider>
  );
}

const App = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

export default App;