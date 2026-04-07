import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import MainLayout from '@/components/layout/MainLayout';
import MemberLayout from '@/components/layout/MemberLayout';

const DashboardPage: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { effectiveRole } = useChurch();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Show admin/owner layout for super_admin and admin roles
  const isAdminOrOwner = effectiveRole === 'super_admin' || effectiveRole === 'admin';

  return isAdminOrOwner ? <MainLayout /> : <MemberLayout />;
};

export default DashboardPage;