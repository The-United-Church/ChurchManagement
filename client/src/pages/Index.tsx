// import React, { useState } from 'react';
// import { Navigate } from 'react-router-dom';
// import { Church } from 'lucide-react';
// import { useAuth } from '../components/auth/AuthProvider';
// import { LoginForm } from '../components/auth/LoginForm';
// import { RegisterForm } from '../components/auth/RegisterForm';

// export default function IndexPage() {
//   const { isAuthenticated, isLoading } = useAuth();
//   const [isLoginMode, setIsLoginMode] = useState(true);

//   if (isLoading) {
//     return null; // Or a loading spinner
//   }

//   if (isAuthenticated) {
//     return <Navigate to="/dashboard" replace />;
//   }

//   return (
//     <div style={styles.container}>
//       {/* Header */}
//       <div style={styles.header}>
//         <div style={styles.titleContainer}>
//           <Church style={styles.icon} />
//           <h1 style={styles.title}>
//             Church Management
//           </h1>
//         </div>
//         <p style={styles.subtitle}>
//           Connect with your church community and track your spiritual journey
//         </p>
//       </div>

//       {/* Auth Forms */}
//       <div style={styles.formContainer}>
//         {isLoginMode ? (
//           <LoginForm onSwitchToRegister={() => setIsLoginMode(false)} />
//         ) : (
//           <RegisterForm onSwitchToLogin={() => setIsLoginMode(true)} />
//         )}
//       </div>

//       {/* Footer */}
//       <div style={styles.footer}>
//         <p>Built with ❤️ for our church community</p>
//       </div>
//     </div>
//   );
// }

// const styles = {
//   container: {
//     minHeight: '100vh',
//     display: 'flex',
//     flexDirection: 'column' as const,
//     alignItems: 'center',
//     justifyContent: 'center',
//     background: 'linear-gradient(to bottom right, #eff6ff, #ffffff, #faf5ff)',
//     padding: '24px',
//   },
//   header: {
//     textAlign: 'center' as const,
//     marginBottom: '32px',
//     animation: 'fadeIn 0.7s ease-in-out',
//   },
//   titleContainer: {
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: '12px',
//     marginBottom: '16px',
//   },
//   icon: {
//     height: '48px',
//     width: '48px',
//     color: '#2563eb',
//   },
//   title: {
//     fontSize: '36px',
//     fontWeight: 'bold',
//     background: 'linear-gradient(to right, #2563eb, #9333ea)',
//     WebkitBackgroundClip: 'text',
//     WebkitTextFillColor: 'transparent',
//     backgroundClip: 'text',
//     margin: 0,
//   },
//   subtitle: {
//     fontSize: '18px',
//     color: '#64748b',
//     maxWidth: '448px',
//     margin: '0 auto',
//   },
//   formContainer: {
//     width: '100%',
//     maxWidth: '448px',
//     animation: 'fadeInUp 0.7s ease-in-out 0.2s both',
//   },
//   footer: {
//     marginTop: '32px',
//     textAlign: 'center' as const,
//     fontSize: '14px',
//     color: '#64748b',
//     animation: 'fadeIn 0.7s ease-in-out 0.5s both',
//   },
// };

// // Add this to your global CSS file or in a <style> tag
// const globalStyles = `
//   @keyframes fadeIn {
//     from {
//       opacity: 0;
//     }
//     to {
//       opacity: 1;
//     }
//   }

//   @keyframes fadeInUp {
//     from {
//       opacity: 0;
//       transform: translateY(20px);
//     }
//     to {
//       opacity: 1;
//       transform: translateY(0);
//     }
//   }
// `;



import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Church } from 'lucide-react';
import { useAuth } from '../components/auth/AuthProvider';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import { ChurchRegistrationForm } from '../components/church/ChurchRegistrationForm';

type AuthMode = 'login' | 'register' | 'register-church' | 'forgot-password';

export default function IndexPage() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const mode: AuthMode =
    pathname === '/register' ? 'register' :
    pathname === '/register-church' ? 'register-church' :
    pathname === '/forgot-password' ? 'forgot-password' :
    'login';

  const go = (m: AuthMode) => navigate(`/${m}`);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Church className="h-12 w-12 text-blue-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Church Management
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-md">
          Connect with your church community and track your spiritual journey
        </p>
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom duration-700 delay-200">
        {mode === 'login' && (
          <>
            <LoginForm
              onSwitchToRegister={() => go('register')}
              onSwitchToForgotPassword={() => go('forgot-password')}
            />
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Want to register your denomination?{' '}
                <button
                  className="text-blue-600 hover:underline font-medium"
                  onClick={() => go('register-church')}
                >
                  Register Denomination
                </button>
              </p>
            </div>
          </>
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
        <p>Built with love for our church community</p>
      </div>
    </div>
  );
}