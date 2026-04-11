import React from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Role = 'super_admin' | 'admin' | 'member';
type BranchRole = 'admin' | 'coordinator' | 'member';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[]; // Omit to allow any authenticated user
  allowedBranchRoles?: BranchRole[]; // Optional branch-level access override
  requireAuth?: boolean; // Defaults to true
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  allowedBranchRoles,
  requireAuth = true,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { branchRole } = useChurch();
  const location = useLocation();
  const navigate = useNavigate();

  // Normalize role from either string or object { name: string }
  const roleName: Role | undefined = React.useMemo(() => {
    const r: any = user?.role;
    if (!r) return undefined;

    // Support role as a plain string or common object payloads.
    const raw =
      typeof r === 'string'
        ? r
        : typeof r === 'object'
          ? (r.name ?? r.role ?? r.roleName ?? r.value)
          : undefined;

    if (typeof raw !== 'string') return undefined;
    const normalized = raw.trim().toLowerCase();

    if (normalized === 'super_admin' || normalized === 'admin' || normalized === 'member') {
      return normalized as Role;
    }

    return undefined;
  }, [user?.role]);

  // While auth/profile is loading, don't decide yet
  if (isLoading) return null;

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roleAllowed = (): boolean => {
    const hasRoleConstraint = Boolean(allowedRoles && allowedRoles.length > 0);
    const hasBranchRoleConstraint = Boolean(allowedBranchRoles && allowedBranchRoles.length > 0);

    // If no constraints are supplied, any authenticated user is allowed.
    if (!hasRoleConstraint && !hasBranchRoleConstraint) return true;

    const globalAllowed = hasRoleConstraint && !!roleName && allowedRoles!.includes(roleName);
    const branchAllowed = hasBranchRoleConstraint && !!branchRole && allowedBranchRoles!.includes(branchRole as BranchRole);

    return Boolean(globalAllowed || branchAllowed);
  };

  // If constrained by role(s) and both role sources are not ready yet, wait instead of denying.
  const hasRoleConstraint = Boolean(allowedRoles && allowedRoles.length > 0);
  const hasBranchRoleConstraint = Boolean(allowedBranchRoles && allowedBranchRoles.length > 0);
  if ((hasRoleConstraint || hasBranchRoleConstraint) && !roleName && !branchRole) {
    return null;
  }

  if (!roleAllowed()) {
    return (
      <AlertDialog open onOpenChange={(open) => { if (!open) navigate('/dashboard', { replace: true }); }}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Permission denied</AlertDialogTitle>
            <AlertDialogDescription>
              You don't have permission to access this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate('/dashboard', { replace: true })}>
              Go to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
