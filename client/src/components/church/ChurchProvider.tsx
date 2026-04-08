import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Church, Branch } from '@/types/church';
import { fetchChurches, fetchBranches, fetchUserChurches } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/hooks/useAuthQuery';

interface ChurchContextType {
  currentChurch: Church | null;
  currentBranch: Branch | null;
  branches: Branch[];
  myBranches: Branch[]; // all branches the user belongs to (across churches)
  userChurches: Church[];
  effectiveRole: 'super_admin' | 'admin' | 'member';
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
  const { data: profile } = useProfile();
  const [currentChurch, setCurrentChurch] = useState<Church | null>(null);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userChurches, setUserChurches] = useState<Church[]>([]);
  const [myBranches, setMyBranches] = useState<Branch[]>([]);

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
    const memberships = (profile as any)?.branchMemberships as Array<{ branch?: Branch }> | undefined;
    if (Array.isArray(memberships)) {
      const list = memberships
        .map((m) => m?.branch)
        .filter(Boolean) as Branch[];
      setMyBranches(list);
    } else {
      setMyBranches([]);
    }
  }, [profile]);

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
          setCurrentBranch(savedBranch || null);
        }
      })
      .catch(() => setBranches([]));
  }, [userChurches]);

  const selectChurch = (churchId: string) => {
    const church = userChurches.find(c => c.id === churchId);
    if (church) {
      setCurrentChurch(church);
      localStorage.setItem(SELECTED_CHURCH_KEY, churchId);
      setCurrentBranch(null);
      localStorage.removeItem(SELECTED_BRANCH_KEY);
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
    } else {
      setCurrentBranch(null);
      localStorage.removeItem(SELECTED_BRANCH_KEY);
    }
  };

  // Select a branch across churches: switches church, loads its branches, then selects the branch
  const selectBranchGlobal = async (branch: Branch) => {
    const targetChurch = userChurches.find(c => c.id === branch.denomination_id) || null;
    if (!targetChurch) return;
    setCurrentChurch(targetChurch);
    localStorage.setItem(SELECTED_CHURCH_KEY, targetChurch.id);
    // Pre-mark desired branch so selection persists after fetch
    localStorage.setItem(SELECTED_BRANCH_KEY, branch.id);
    setCurrentBranch(null);
    try {
      const res = await fetchBranches(targetChurch.id);
      const churchBranches = (res.data ?? []) as unknown as Branch[];
      setBranches(churchBranches);
      const match = churchBranches.find(b => b.id === branch.id) || null;
      setCurrentBranch(match);
    } catch {
      setBranches([]);
      setCurrentBranch(null);
    }
  };

  const refreshChurches = () => {
    loadUserChurches();
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

  const value: ChurchContextType = {
    currentChurch,
    currentBranch,
    branches,
    myBranches,
    userChurches,
    effectiveRole,
    selectChurch,
    selectBranch,
    selectBranchGlobal,
    refreshChurches,
  };

  return <ChurchContext.Provider value={value}>{children}</ChurchContext.Provider>;
};
