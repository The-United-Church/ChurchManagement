import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import MainLayout from '@/components/layout/MainLayout';
import MemberLayout from '@/components/layout/MemberLayout';

const DashboardPage: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { effectiveRole, branchRole } = useChurch();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Show admin layout for global admins/super_admins AND for branch-level admins/coordinators
  const showAdminLayout =
    effectiveRole === 'super_admin' ||
    effectiveRole === 'admin' ||
    branchRole === 'admin' ||
    branchRole === 'coordinator';

  return showAdminLayout ? <MainLayout /> : <MemberLayout />;
};

export default DashboardPage;