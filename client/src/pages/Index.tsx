import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Church } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function IndexPage() {
  const { isAuthenticated } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      {/* Header */}
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

      {/* Auth Forms */}
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom duration-700 delay-200">
        {isLoginMode ? (
          <LoginForm onSwitchToRegister={() => setIsLoginMode(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setIsLoginMode(true)} />
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground animate-in fade-in delay-500 duration-700">
        <p>Built with ❤️ for our church community</p>
      </div>
    </div>
  );
}