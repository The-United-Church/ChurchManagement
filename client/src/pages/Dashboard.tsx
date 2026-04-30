import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import { useDomain } from '@/components/domain/DomainProvider';
import MainLayout from '@/components/layout/MainLayout';
import MemberLayout from '@/components/layout/MemberLayout';
import JoinBranchDialog from '@/components/auth/JoinBranchDialog';

const DashboardPage: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { effectiveRole, branchRole, myBranches, isMembershipsReady } = useChurch();
  const { isCustomDomain, branding } = useDomain();
  const [joinDismissed, setJoinDismissed] = useState(false);

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

  console.log('[Dashboard] layout decision —', {
    pathname: location.pathname,
    effectiveRole,
    branchRole,
    showAdminLayout,
  });

  // Any /member route should render the member portal — BUT only for non-admin roles.
  // If the user switches to an admin branch while on a /member route, show admin layout.
  if (location.pathname.startsWith('/member') && !showAdminLayout) {
    return <MemberLayout />;
  }

  // Show join prompt for regular members who aren't in any branch yet.
  // On custom domains the server already auto-submitted a join request on
  // sign-up, so we never show the full branch-picker dialog. Instead we
  // show a simple pending-approval screen.
  const isRegularMember = effectiveRole === 'member';
  const hasNoBranch = isMembershipsReady && myBranches.length === 0;

  // On a custom domain, the relevant check is whether the user belongs to
  // *this domain's* branch specifically — they may already be a member of a
  // different branch on another domain.
  const isNotMemberOfThisBranch = isCustomDomain && isMembershipsReady && branding?.branch_id
    ? !myBranches.some(b => b.id === branding.branch_id)
    : hasNoBranch;

  if (isRegularMember && isNotMemberOfThisBranch && isCustomDomain) {
    const churchName = branding?.display_name || branding?.church_name || 'the church';
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: 'linear-gradient(135deg, #f0f4ff 0%, #fff 50%, #f5f0ff 100%)',
        }}
      >
        {branding?.logo_url && (
          <img
            src={branding.logo_url}
            alt={churchName}
            style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', marginBottom: 24, border: '1px solid #e5e7eb', background: '#fff' }}
          />
        )}
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: '#1e293b' }}>
          Request Submitted
        </h2>
        <p style={{ fontSize: 15, color: '#475569', maxWidth: 380, lineHeight: 1.6 }}>
          Your account has been created and your request to join{' '}
          <strong>{churchName}</strong> has been submitted. A church administrator will review
          and approve your request shortly.
        </p>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 16 }}>
          You'll get full access once your membership is approved.
        </p>
      </div>
    );
  }

  const showJoinPrompt = isRegularMember && hasNoBranch && !joinDismissed;

  return (
    <>
      {showAdminLayout ? <MainLayout /> : <MemberLayout />}
      <JoinBranchDialog
        open={showJoinPrompt}
        onOpenChange={(open) => { if (!open) setJoinDismissed(true); }}
      />
    </>
  );
};

export default DashboardPage;