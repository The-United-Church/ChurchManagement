import type { Church, Branch, ChurchMembership } from '@/types/church';

const CHURCHES_KEY = 'church_mgmt_churches';
const BRANCHES_KEY = 'church_mgmt_branches';

// ─── Church (Denomination) CRUD — localStorage fallback ───────────────────

export const getChurches = (): Church[] => {
  console.log("getChurches called");
  console.log("getChurches called");
  console.log("getChurches called");

  const data = localStorage.getItem(CHURCHES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveChurches = (churches: Church[]) => {
  localStorage.setItem(CHURCHES_KEY, JSON.stringify(churches));
};

export const getChurchById = (id: string): Church | undefined => {
  return getChurches().find(c => c.id === id);
};

export const createChurch = (
  data: Omit<Church, 'id' | 'created_at' | 'updated_at'>
): Church => {
  const churches = getChurches();
  const church: Church = {
    ...data,
    id: `church-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  churches.push(church);
  saveChurches(churches);
  return church;
};

export const updateChurch = (
  id: string,
  data: Partial<Omit<Church, 'id' | 'created_at' | 'updated_at' | 'admin_id'>>
): Church | null => {
  const churches = getChurches();
  const idx = churches.findIndex(c => c.id === id);
  if (idx === -1) return null;
  churches[idx] = { ...churches[idx], ...data, updated_at: new Date().toISOString() };
  saveChurches(churches);
  return churches[idx];
};

export const deleteChurch = (id: string): boolean => {
  const churches = getChurches();
  const filtered = churches.filter(c => c.id !== id);
  if (filtered.length === churches.length) return false;
  saveChurches(filtered);
  // Also remove associated branches
  const branches = getBranches().filter(b => b.denomination_id !== id);
  saveBranches(branches);
  return true;
};

// ─── Branch CRUD — localStorage fallback ──────────────────────────────────

export const getBranches = (): Branch[] => {
  const data = localStorage.getItem(BRANCHES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveBranches = (branches: Branch[]) => {
  localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
};

export const getBranchesByChurch = (denominationId: string): Branch[] => {
  return getBranches().filter(b => b.denomination_id === denominationId);
};

export const getBranchById = (id: string): Branch | undefined => {
  return getBranches().find(b => b.id === id);
};

export const createBranch = (
  data: Omit<Branch, 'id' | 'created_at' | 'updated_at'>
): Branch => {
  const branches = getBranches();
  const branch: Branch = {
    ...data,
    id: `branch-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  branches.push(branch);
  saveBranches(branches);
  return branch;
};

export const updateBranch = (
  id: string,
  data: Partial<Omit<Branch, 'id' | 'created_at' | 'updated_at'>>
): Branch | null => {
  const branches = getBranches();
  const idx = branches.findIndex(b => b.id === id);
  if (idx === -1) return null;
  branches[idx] = { ...branches[idx], ...data, updated_at: new Date().toISOString() };
  saveBranches(branches);
  return branches[idx];
};

export const deleteBranch = (id: string): boolean => {
  const branches = getBranches();
  const filtered = branches.filter(b => b.id !== id);
  if (filtered.length === branches.length) return false;
  saveBranches(filtered);
  return true;
};

// ─── Helpers ──────────────────────────────────────────────────────────────

export const getChurchesForUser = (
  memberships: ChurchMembership[]
): Church[] => {
  console.log("getChurchesForUser called");
  console.log("getChurchesForUser called");
  const churches = getChurches();
  const churchIds = memberships.map(m => m.churchId);
  return churches.filter(c => churchIds.includes(c.id));
};

export const getUserRoleInChurch = (
  memberships: ChurchMembership[],
  churchId: string
): 'admin' | 'member' | null => {
  const membership = memberships.find(m => m.churchId === churchId);
  return membership?.role ?? null;
};
