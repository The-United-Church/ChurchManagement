import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import MainLayout from '@/components/layout/MainLayout';
import MemberLayout from '@/components/layout/MemberLayout';

const DashboardPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Show admin/owner layout for admin and owner roles
  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  return isAdminOrOwner ? <MainLayout /> : <MemberLayout />;
};

export default DashboardPage;