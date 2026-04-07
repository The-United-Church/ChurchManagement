import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Church, Branch, ChurchMembership } from '@/types/church';
import { getChurchById, getChurches, getBranchesByChurch } from '@/lib/church';
import { useAuth } from '@/components/auth/AuthProvider';

interface ChurchContextType {
  currentChurch: Church | null;
  currentBranch: Branch | null;
  branches: Branch[];
  userChurches: Church[];
  effectiveRole: 'super_admin' | 'admin' | 'member';
  selectChurch: (churchId: string) => void;
  selectBranch: (branchId: string | null) => void;
  refreshChurches: () => void;
}

const ChurchContext = createContext<ChurchContextType | undefined>(undefined);

export const useChurch = () => {
  const context = useContext(ChurchContext);
  if (context === undefined) {
    throw new Error('useChurch must be used within a ChurchProvider');
  }
  return context;
};

const SELECTED_CHURCH_KEY = 'church_mgmt_selected_church';
const SELECTED_BRANCH_KEY = 'church_mgmt_selected_branch';

interface ChurchProviderProps {
  children: ReactNode;
}

export const ChurchProvider: React.FC<ChurchProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentChurch, setCurrentChurch] = useState<Church | null>(null);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userChurches, setUserChurches] = useState<Church[]>([]);

  const loadUserChurches = () => {
    if (!user) {
      setUserChurches([]);
      setCurrentChurch(null);
      setCurrentBranch(null);
      setBranches([]);
      return;
    }

    // Super admin sees all churches
    if (user.systemRole === 'super_admin') {
      const allChurches = getChurches();
      setUserChurches(allChurches);
    } else {
      // Regular users see only churches they belong to
      const memberships = user.churchMemberships || [];
      const churches = memberships
        .map((m: ChurchMembership) => getChurchById(m.churchId))
        .filter((c: Church | undefined): c is Church => c !== undefined);
      setUserChurches(churches);
    }
  };

  // Load user churches when user changes
  useEffect(() => {
    loadUserChurches();
  }, [user]);

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

    if (savedChurch) {
      setCurrentChurch(savedChurch);
      const churchBranches = getBranchesByChurch(savedChurch.id);
      setBranches(churchBranches);

      const savedBranchId = localStorage.getItem(SELECTED_BRANCH_KEY);
      const savedBranch = savedBranchId
        ? churchBranches.find(b => b.id === savedBranchId)
        : null;
      setCurrentBranch(savedBranch || null);
    } else {
      // Select first church
      const first = userChurches[0];
      setCurrentChurch(first);
      localStorage.setItem(SELECTED_CHURCH_KEY, first.id);
      const churchBranches = getBranchesByChurch(first.id);
      setBranches(churchBranches);
      setCurrentBranch(null);
    }
  }, [userChurches]);

  const selectChurch = (churchId: string) => {
    const church = userChurches.find(c => c.id === churchId);
    if (church) {
      setCurrentChurch(church);
      localStorage.setItem(SELECTED_CHURCH_KEY, churchId);
      const churchBranches = getBranchesByChurch(churchId);
      setBranches(churchBranches);
      setCurrentBranch(null);
      localStorage.removeItem(SELECTED_BRANCH_KEY);
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

  const refreshChurches = () => {
    loadUserChurches();
  };

  // Derive effective role
  let effectiveRole: 'super_admin' | 'admin' | 'member' = 'member';
  if (user?.systemRole === 'super_admin') {
    effectiveRole = 'super_admin';
  } else if (user && currentChurch) {
    const membership = (user.churchMemberships || []).find(
      (m: ChurchMembership) => m.churchId === currentChurch.id
    );
    effectiveRole = membership?.role || 'member';
  }

  const value: ChurchContextType = {
    currentChurch,
    currentBranch,
    branches,
    userChurches,
    effectiveRole,
    selectChurch,
    selectBranch,
    refreshChurches,
  };

  return <ChurchContext.Provider value={value}>{children}</ChurchContext.Provider>;
};
