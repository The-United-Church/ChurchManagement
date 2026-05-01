import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Church } from 'lucide-react';
import { useAuth } from '../components/auth/AuthProvider';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import { ChurchRegistrationForm } from '../components/church/ChurchRegistrationForm';
import { useDomain } from '@/components/domain/DomainProvider';
import { Link } from 'react-router-dom';

type AuthMode = 'login' | 'register' | 'register-church' | 'forgot-password';

export default function IndexPage() {
  const { isAuthenticated } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { branding, isCustomDomain } = useDomain();

  const searchParams = new URLSearchParams(search);
  const returnTo = searchParams.get('returnTo');

  // On custom domains we lock down to login/register/forgot only — no
  // self-service "register a new church" flow.
  const requestedMode: AuthMode =
    pathname === '/register' ? 'register' :
    pathname === '/register-church' ? 'register-church' :
    pathname === '/forgot-password' ? 'forgot-password' :
    'login';
  const mode: AuthMode =
    isCustomDomain && requestedMode === 'register-church' ? 'register' : requestedMode;

  const go = (m: AuthMode) => navigate(`/${m}`);

  if (isAuthenticated) {
    return <Navigate to={returnTo || '/dashboard'} replace />;
  }

  const title = branding?.display_name || branding?.church_name || 'Church Management';
  const tagline =
    branding?.tagline ||
    'Connect with your church community and track your spiritual journey';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6">
      <div className="w-full max-w-md mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
      <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
        <div className="flex items-center justify-center gap-3 mb-4">
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt={title}
              className="h-14 w-14 rounded-xl object-cover shadow-sm border bg-white"
            />
          ) : (
            <Church className="h-12 w-12 text-blue-600" />
          )}
          <h1
            className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            style={branding?.primary_color ? { backgroundImage: `linear-gradient(to right, ${branding.primary_color}, ${branding.primary_color})` } : undefined}
          >
            {title}
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-md">
          {tagline}
        </p>
        {branding?.address && (
          <p className="text-xs text-muted-foreground mt-1">{branding.address}</p>
        )}
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom duration-700 delay-200">
        {mode === 'login' && (
          <LoginForm
            onSwitchToRegister={() => go('register')}
            onSwitchToForgotPassword={() => go('forgot-password')}
          />
        )}
        {mode === 'register' && (
          <RegisterForm onSwitchToLogin={() => go('login')} />
        )}
        {mode === 'register-church' && (
          <ChurchRegistrationForm onSwitchToLogin={() => go('login')} onSwitchToRegister={() => go('register')} /> 
        )}
        {mode === 'forgot-password' && (
          <ForgotPasswordForm onSwitchToLogin={() => go('login')} />
        )}
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground animate-in fade-in delay-500 duration-700">
        <p>
          {branding?.pastor_name
            ? `Pastor ${branding.pastor_name}`
            : 'Built with love for our church community'}
        </p>
      </div>
    </div>
  );
}