import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Church, Branch } from '@/types/church';
import { fetchChurches, fetchBranches, fetchUserChurches } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/hooks/useAuthQuery';
import { useQueryClient } from '@tanstack/react-query';

interface ChurchContextType {
  currentChurch: Church | null;
  currentBranch: Branch | null;
  branches: Branch[];
  myBranches: Branch[]; // all branches the user belongs to (across churches)
  userChurches: Church[];
  isMembershipsReady: boolean; // profile.branchMemberships has been resolved from server
  effectiveRole: 'super_admin' | 'admin' | 'member';
  branchRole: 'admin' | 'coordinator' | 'member' | null; // role within the current branch
  selectChurch: (churchId: string) => void;
  selectBranch: (branchId: string | null) => void;
  selectBranchGlobal: (branch: Branch) => Promise<void>;
  refreshChurches: () => void;
}

const ChurchContext = createContext<ChurchContextType | undefined>(undefined);

export function useChurch() {
  const context = useContext(ChurchContext);
  if (context === undefined) {
    throw new Error('useChurch must be used within a ChurchProvider');
  }
  return context;
}

const SELECTED_CHURCH_KEY = 'church_mgmt_selected_church';
const SELECTED_BRANCH_KEY = 'church_mgmt_selected_branch';

interface ChurchProviderProps {
  children: ReactNode;
}

export const ChurchProvider: React.FC<ChurchProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { data: profile, isFetching: profileFetching, isStale: profileStale } = useProfile();
  const queryClient = useQueryClient();
  const [currentChurch, setCurrentChurch] = useState<Church | null>(null);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userChurches, setUserChurches] = useState<Church[]>([]);
  const [myBranches, setMyBranches] = useState<Branch[]>([]);
  const [isMembershipsReady, setIsMembershipsReady] = useState(false);

  const loadUserChurches = useCallback(async () => {
    if (!user) {
      setUserChurches([]);
      setCurrentChurch(null);
      setCurrentBranch(null);
      setBranches([]);
      return;
    }

    // Derive role inline to avoid stale closure issues
    const rawRole = user.role;
    const roleName = typeof rawRole === 'string' ? rawRole : (rawRole?.name || '');
    const isSuperAdmin = roleName === 'super_admin';

    try {
      // Super admin sees all denominations; everyone else only sees their own
      const res = isSuperAdmin ? await fetchChurches() : await fetchUserChurches();
      const allChurches = (res.data ?? []) as unknown as Church[];
      setUserChurches(allChurches);
    } catch {
      setUserChurches([]);
    }
  }, [user]);

  // Load user churches when user changes
  useEffect(() => {
    loadUserChurches();
  }, [loadUserChurches]);

  // Derive all branches the user belongs to from profile.branchMemberships
  useEffect(() => {
    // While the profile query is fetching (or stale with no membership data yet),
    // keep memberships as not ready to avoid a flash of "No branch assigned".
    const memberships = (profile as any)?.branchMemberships as Array<{ branch?: Branch }> | undefined;
    const hasMemberships = Array.isArray(memberships) && memberships.length > 0;
    if (profileFetching || (!hasMemberships && profileStale)) {
      setIsMembershipsReady(false);
      return;
    }

    // Query has settled (either with data or null); treat as ready
    const denomBranches = Array.isArray((profile as any)?.denominations)
      ? ((profile as any).denominations as Array<{ branches?: Branch[] }>)
          .flatMap((d) => Array.isArray(d.branches) ? (d.branches as Branch[]) : [])
      : [];
    const userChurchBranches = Array.isArray(userChurches)
      ? (userChurches.flatMap((c) => Array.isArray(c.branches) ? (c.branches as Branch[]) : []))
      : [];

    if (Array.isArray(memberships) && memberships.length > 0) {
      const list = memberships
        .map((m) => {
          if (!m?.branch) return null;
          return {
            ...m.branch,
            membership_is_active: (m as any).is_active !== false,
            membership_role: (m as any).role ?? 'member',
          } as Branch;
        })
        .filter(Boolean) as Branch[];
      setMyBranches(list);
    } else if (denomBranches.length > 0) {
      // Fallback for admins without explicit membership rows: use denomination branches from profile
      setMyBranches(denomBranches);
    } else if (userChurchBranches.length > 0) {
      // Ultimate fallback: use branches from userChurches fetch
      setMyBranches(userChurchBranches);
    } else {
      setMyBranches([]);
    }
    setIsMembershipsReady(true);
  }, [profile, profileFetching, profileStale, userChurches]);

  // Auto-select active branch after login/profile resolve without refreshing:
  // 1) Prefer saved branch if it belongs to the current user
  // 2) Else fall back to the first branch membership
  useEffect(() => {
    if (!user) return;
    if (!isMembershipsReady) return; // wait until memberships have been resolved
    if (myBranches.length === 0) return;
    if (userChurches.length === 0) return; // wait until churches are fetched

    const savedBranchId = localStorage.getItem(SELECTED_BRANCH_KEY);
    const candidate = myBranches.find(b => b.id === savedBranchId) || myBranches[0];
    if (!currentBranch || currentBranch.id !== candidate.id) {
      // Switch church and select the branch globally
      selectBranchGlobal(candidate);
    }
  }, [user?.id, isMembershipsReady, myBranches, userChurches.length]);

  // Auto-select church from localStorage or first available
  useEffect(() => {
    if (userChurches.length === 0) {
      setCurrentChurch(null);
      setCurrentBranch(null);
      setBranches([]);
      return;
    }

    const savedChurchId = localStorage.getItem(SELECTED_CHURCH_KEY);
    const savedChurch = savedChurchId
      ? userChurches.find(c => c.id === savedChurchId)
      : null;

    const targetChurch = savedChurch ?? userChurches[0];
    setCurrentChurch(targetChurch);
    if (!savedChurch) {
      localStorage.setItem(SELECTED_CHURCH_KEY, targetChurch.id);
      setCurrentBranch(null);
    }

    fetchBranches(targetChurch.id)
      .then((res) => {
        const churchBranches = (res.data ?? []) as unknown as Branch[];
        setBranches(churchBranches);
        if (savedChurch) {
          const savedBranchId = localStorage.getItem(SELECTED_BRANCH_KEY);
          const savedBranch = savedBranchId
            ? churchBranches.find(b => b.id === savedBranchId)
            : null;
          // Prefer the branch from myBranches (has membership metadata); fall back to
          // the freshly-fetched one which now also carries membership fields from the server.
          const knownBranch = myBranches.find(b => b.id === savedBranch?.id);
          setCurrentBranch(
            knownBranch
              ? { ...savedBranch, ...knownBranch }
              : savedBranch || null
          );
        }
      })
      .catch(() => setBranches([]));
  }, [userChurches]);

  /** Invalidate every query that is scoped to a branch (i.e. everything except auth/profile). */
  const invalidateBranchQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== 'auth',
    });
  };

  const selectChurch = (churchId: string) => {
    const church = userChurches.find(c => c.id === churchId);
    if (church) {
      setCurrentChurch(church);
      localStorage.setItem(SELECTED_CHURCH_KEY, churchId);
      setCurrentBranch(null);
      localStorage.removeItem(SELECTED_BRANCH_KEY);
      // Flush stale data from old church/branch before new requests go out
      invalidateBranchQueries();
      fetchBranches(churchId)
        .then((res) => setBranches((res.data ?? []) as unknown as Branch[]))
        .catch(() => setBranches([]));
    }
  };

  const selectBranch = (branchId: string | null) => {
    if (branchId) {
      const branch = branches.find(b => b.id === branchId);
      setCurrentBranch(branch || null);
      localStorage.setItem(SELECTED_BRANCH_KEY, branchId);
      // Flush stale data so pages re-fetch with the new X-Branch-Id header
      invalidateBranchQueries();
    } else {
      setCurrentBranch(null);
      localStorage.removeItem(SELECTED_BRANCH_KEY);
    }
  };

  // Select a branch across churches: switches church, loads its branches, then selects the branch
  const selectBranchGlobal = async (branch: Branch) => {
    if (branch.membership_is_active === false) {
      // Caller should guard against this, but block here as a safety net
      return;
    }
    const targetChurch = userChurches.find(c => c.id === branch.denomination_id) || null;
    if (!targetChurch) return;
    setCurrentChurch(targetChurch);
    localStorage.setItem(SELECTED_CHURCH_KEY, targetChurch.id);
    // Pre-mark desired branch so selection persists after fetch
    localStorage.setItem(SELECTED_BRANCH_KEY, branch.id);
    setCurrentBranch(null);
    // Flush stale data — X-Branch-Id in localStorage is now the new branch,
    // so any re-fetches triggered below will automatically use it
    invalidateBranchQueries();
    try {
      const res = await fetchBranches(targetChurch.id);
      const churchBranches = (res.data ?? []) as unknown as Branch[];
      setBranches(churchBranches);
      const match = churchBranches.find(b => b.id === branch.id) || null;
      // Merge membership metadata (role, active flag) from the known branch into the
      // freshly-fetched match, since the raw branch listing doesn't include those fields.
      setCurrentBranch(match
        ? { ...match, membership_role: branch.membership_role, membership_is_active: branch.membership_is_active }
        : branch
      );
    } catch {
      // fetchBranches may 403 for non-admin users; use the known branch so the
      // active-branch indicator still renders correctly.
      setBranches([]);
      setCurrentBranch(branch);
    }
  };

  const refreshChurches = () => {
    loadUserChurches();
    // Invalidate the profile cache so myBranches (derived from branchMemberships) reflects
    // any newly created/deleted branches without requiring a page refresh.
    queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
    // Re-fetch branches for the current church to keep the branch lookup table current.
    // Also eagerly merge any newly returned branches into myBranches so ChurchSelector
    // shows them immediately, without waiting for the async profile re-fetch to complete.
    if (currentChurch) {
      fetchBranches(currentChurch.id)
        .then((res) => {
          const freshBranches = (res.data ?? []) as unknown as Branch[];
          setBranches(freshBranches);
          setMyBranches((prev) => {
            const missing = freshBranches.filter((b) => !prev.some((m) => m.id === b.id));
            if (missing.length === 0) return prev;
            return [...prev, ...missing];
          });
        })
        .catch(() => {});
    }
  };

  // Derive effective role from backend user — role can be a string or { name: string }
  let effectiveRole: 'super_admin' | 'admin' | 'member' = 'member';
  const rawRole = user?.role;
  const roleName = typeof rawRole === 'string' ? rawRole : (rawRole?.name || '');
  if (roleName === 'super_admin') {
    effectiveRole = 'super_admin';
  } else if (roleName === 'admin') {
    effectiveRole = 'admin';
  }

  // Derive branch-level role from the current branch's membership metadata
  const rawBranchRole = currentBranch?.membership_role;
  const branchRole: 'admin' | 'coordinator' | 'member' | null =
    rawBranchRole === 'admin' || rawBranchRole === 'coordinator' || rawBranchRole === 'member'
      ? rawBranchRole
      : null;

  const value: ChurchContextType = {
    currentChurch,
    currentBranch,
    branches,
    myBranches,
    userChurches,
    isMembershipsReady,
    effectiveRole,
    branchRole,
    selectChurch,
    selectBranch,
    selectBranchGlobal,
    refreshChurches,
  };

  return <ChurchContext.Provider value={value}>{children}</ChurchContext.Provider>;
};
