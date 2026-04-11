import axios from 'axios';
import { authFetch, getAccessToken, setTokens, clearTokens } from '@/services/auth.service';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7777/api';

// Legacy key support for SuperAdmin page
export const BACKEND_TOKEN_KEY = 'access_token';

export function getBackendToken(): string | null {
  return getAccessToken();
}

export function setBackendToken(token: string | null) {
  if (token) setTokens(token, '');
  else clearTokens();
}

// Backend login — returns a JWT token on success
export async function backendLogin(
  email: string,
  password: string
): Promise<string> {
  const res = await axios.post(`${API_BASE}/auth/login`, { email, password }, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(res.data?.message || 'Login failed');
  }
  const token = (res.headers['x-access-token'] as string) ||
    (() => {
      const auth = res.headers['authorization'] as string | undefined;
      return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    })();
  if (!token) throw new Error('Server did not return a token');
  const refreshToken = (res.headers['x-refresh-token'] as string) || '';
  setTokens(token, refreshToken);
  return token;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  console.log(`API Request: ${endpoint}`, options);
  const res = await authFetch(endpoint, options);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(res.data?.message || `Request failed: ${res.status}`);
  }
  return res.data;
}

// Users
export const fetchUsers = () =>
  request<{ data: any[]; status: number; message: string }>('/user');

export const fetchUserStatistics = () =>
  request<{ data: any; status: number; message: string }>('/user/statistics');

// Activity Logs
export const fetchActivities = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ data: any[]; total: number; status: boolean; message: string }>(
    `/activities${qs}`
  );
};

export const fetchRecentActivities = (limit = 20) =>
  request<{ data: any[]; status: boolean; message: string }>(
    `/activities/recent?limit=${limit}`
  );

export const fetchActivityStats = (days = 30) =>
  request<{ data: { byAction: any[]; byEntity: any[]; daily: any[] }; status: boolean }>( 
    `/activities/stats?days=${days}`
  );

// Roles & Permissions
export const fetchRoles = () =>
  request<{ data: any[]; status: number; message: string }>('/roles-permissions/role');

export const fetchPermissions = () =>
  request<{ data: any[]; status: number; message: string }>('/roles-permissions/permission');

// Health
export const fetchHealth = () =>
  axios.get(
    `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:7777'}/health`
  ).then((r) => r.data);

// Delete user
export const deleteUserById = (id: string) =>
  request<{ status: number; message: string }>(`/user/${id}`, { method: 'DELETE' });

// ─── Members (users scoped to branch/church) ──────────────────────────────
export interface MemberDTO {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  profile_img?: string;
  profile_image?: string;
  phone_number?: string;
  role: string;
  /** Role within the current branch (from BranchMembership.role) */
  branch_role?: string;
  is_active?: boolean;
  /** Active flag scoped to the current branch (from BranchMembership) */
  branch_is_active?: boolean;
}

export const fetchMembersApi = () =>
  request<{ data: MemberDTO[]; status: number; message: string }>('/user');

export const createMemberApi = (data: {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone_number?: string;
  branch_name?: string;
  church_name?: string;
}) =>
  request<{ data: MemberDTO; status: number; message: string }>('/user', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateMemberApi = (id: string, data: Partial<{
  full_name: string;
}>) =>
  request<{ data: MemberDTO; status: number; message: string }>(`/user/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const updateMemberBranchRoleApi = (churchId: string, branchId: string, userId: string, role: string) =>
  request<{ data: any; status: number; message: string }>(`/churches/${churchId}/branches/${branchId}/members/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });

export const updateMemberBranchStatusApi = (churchId: string, branchId: string, userId: string, is_active: boolean) =>
  request<{ data: any; status: number; message: string }>(`/churches/${churchId}/branches/${branchId}/members/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ is_active }),
  });

export const deleteMembersApi = (churchId: string, branchId: string, ids: string[]) =>
  request<{ data: { removed: number }; status: number; message: string }>(`/churches/${churchId}/branches/${branchId}/members`, {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });

export const importMembersApi = (rows: { first_name: string; last_name: string; email: string; role?: string; phone_number?: string }[]) =>
  request<{ data: MemberDTO[]; status: number; message: string; uniqueCount: number; duplicateCount: number; duplicateData: any[] }>('/user/import', {
    method: 'POST',
    body: JSON.stringify(rows.map((r) => ({ ...r, roleName: r.role || 'member' }))),
  });

// ─── Denominations (top-level church organisations) ───────────────────────
export interface BranchDTO {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pastor_name?: string;
  description?: string;
  is_headquarters: boolean;
  denomination_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChurchDTO {
  id: string;
  denomination_name: string;
  description?: string;
  location?: string;
  state?: string;
  country?: string;
  address?: string;
  admin_id: string;
  admin?: { id: string; email: string; full_name?: string };
  branches?: BranchDTO[];
  created_at: string;
  updated_at: string;
}

export const fetchChurches = () =>
  request<{ data: ChurchDTO[]; status: number; message: string }>('/churches');

/** Returns only the denominations (with branches) the logged-in user belongs to */
export const fetchUserChurches = () =>
  request<{ data: ChurchDTO[]; status: number; message: string }>('/user/churches');

export const fetchChurchById = (id: string) =>
  request<{ data: ChurchDTO; status: number; message: string }>(`/churches/${id}`);

export const createChurchApi = (data: {
  denomination_name: string;
  description?: string;
  location?: string;
  state?: string;
  country?: string;
  address?: string;
}) =>
  request<{ data: ChurchDTO; status: number; message: string }>('/churches', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateChurchApi = (id: string, data: Partial<{
  denomination_name: string;
  description?: string;
  location?: string;
  state?: string;
  country?: string;
  address?: string;
}>) =>
  request<{ data: ChurchDTO; status: number; message: string }>(`/churches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteChurchApi = (id: string) =>
  request<{ status: number; message: string }>(`/churches/${id}`, { method: 'DELETE' });

// ─── Branches ─────────────────────────────────────────────────────────────
export const fetchBranches = (denominationId: string) =>
  request<{ data: BranchDTO[]; status: number; message: string }>(`/churches/${denominationId}/branches`);

export const createBranchApi = (denominationId: string, data: {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pastor_name?: string;
  description?: string;
  is_headquarters?: boolean;
}) =>
  request<{ data: BranchDTO; status: number; message: string }>(`/churches/${denominationId}/branches`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateBranchApi = (denominationId: string, branchId: string, data: Partial<{
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pastor_name: string;
  description: string;
  is_headquarters: boolean;
}>) =>
  request<{ data: BranchDTO; status: number; message: string }>(`/churches/${denominationId}/branches/${branchId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteBranchApi = (denominationId: string, branchId: string) =>
  request<{ status: number; message: string }>(`/churches/${denominationId}/branches/${branchId}`, {
    method: 'DELETE',
  });

// ─── People ───────────────────────────────────────────────────────────────
import type { Person, PersonCreateDTO, PersonUpdateDTO, ImportPeopleResult } from '@/types/person';

export const fetchPeople = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<{ data: Person[]; status: number; message: string }>(`/people${qs}`);
};

interface UserLookupDTO {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  nick_name?: string;
  dob?: string;
  gender?: 'male' | 'female';
  address_line?: string;
  state?: string;
  city?: string;
  country?: string;
  phone_number?: string;
  profile_img?: string;
}

export const fetchPersonByEmail = (email: string) =>
  request<{ data: UserLookupDTO | null; status: number; message: string }>(`/user/lookup/by-email?email=${encodeURIComponent(email)}`)
    .then((res) => {
      const u = res.data;
      if (!u) {
        return { data: [] as Person[], status: res.status, message: res.message };
      }

      const personLike: Person = {
        id: u.id,
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        middle_name: u.middle_name || '',
        nickname: u.nick_name || '',
        birthdate: u.dob,
        gender: u.gender,
        address: u.address_line || '',
        state: u.state || '',
        city: u.city || '',
        country: u.country || '',
        email: u.email,
        phone: u.phone_number || '',
        profile_image: u.profile_img || '',
        created_at: '',
        updated_at: '',
      };

      return { data: [personLike] as Person[], status: res.status, message: res.message };
    })
    .catch(() => ({ data: [] as Person[], status: 200, message: 'No results' }));

export const fetchPersonById = (id: string) =>
  request<{ data: Person; status: number; message: string }>(`/people/${id}`);

export const createPersonApi = (data: PersonCreateDTO) =>
  request<{ data: Person; status: number; message: string }>('/people', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updatePersonApi = (id: string, data: PersonUpdateDTO) =>
  request<{ data: Person; status: number; message: string }>(`/people/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deletePersonApi = (ids: string[]) =>
  request<{ status: number; message: string; data: { deleted: number } }>('/people', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });

export const importPeopleApi = (rows: Partial<PersonCreateDTO>[]) =>
  request<{ data: ImportPeopleResult; status: number; message: string }>('/people/import', {
    method: 'POST',
    body: JSON.stringify(rows),
  });

export const convertPersonApi = (id: string) =>
  request<{ data: any; status: number; message: string }>(`/people/${id}/convert`, {
    method: 'POST',
  });

// ─── My Profile ───────────────────────────────────────────────────────────────
export const updateMyProfileApi = (data: Record<string, any>) =>
  request<{ data: any; status: number; message: string }>('/user/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// ─── Change Password ──────────────────────────────────────────────────────────
export const changePasswordApi = (data: { oldPassword: string; newPassword: string }) =>
  request<{ data: any; status: number; message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── User Settings ────────────────────────────────────────────────────────────
export interface UserPrivacySettings {
  isProfileVisible?: 'public' | 'private';
  showEmail?: boolean;
  showLocation?: boolean;
  showActivityStatus?: boolean;
  allowDirectMessage?: boolean;
  showOnlineStatus?: boolean;
}

export interface UserSettings {
  privacy?: UserPrivacySettings;
  notifications?: {
    email?: boolean;
    push?: boolean;
    communityUpdates?: boolean;
    directMessages?: boolean;
    mentions?: boolean;
    weeklyDIgest?: boolean;
  };
  security?: {
    '2fa'?: boolean;
    loginAlerts?: boolean;
  };
  currency?: string;
}

export const updateSettingsApi = (settings: UserSettings) =>
  request<{ data: UserSettings; status: number; message: string }>('/user/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });

// ─── Directory (global user search for Add-from-Users picker) ─────────────────
export interface DirectoryUserDTO {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active?: boolean;
  state?: string;
  city?: string;
  country?: string;
  phone_number?: string;
}

export const fetchUsersDirectoryApi = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<{ data: DirectoryUserDTO[]; status: number; message: string }>(`/user/directory${qs}`);
};

/** Add an existing user to a specific branch. */
export const addUserToBranchApi = (churchId: string, branchId: string, userId: string, role?: string) =>
  request<{ status: number; message: string }>(`/churches/${churchId}/branches/${branchId}/members/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ role: role ?? 'member' }),
  });
