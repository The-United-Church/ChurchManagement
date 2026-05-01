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
    throw new Error(res.data?.message || res.data?.error || `Request failed: ${res.status}`);
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
export interface FamilyMemberDTO {
  id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  birthdate?: string;
  gender?: string;
  phone?: string;
  marital_status?: string;
  email?: string;
  /** If this family member matches an existing application user. */
  linked_user_id?: string;
}

export interface MemberDTO {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  nick_name?: string;
  username?: string;
  profile_img?: string;
  profile_image?: string;
  phone_number?: string;
  phone_is_whatsapp?: boolean;
  dob?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  date_married?: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  job_title?: string | null;
  employer?: string | null;
  facebook_link?: string | null;
  is_display_email?: boolean;
  is_accept_text?: boolean;
  grade?: string | null;
  baptism_date?: string | null;
  baptism_location?: string | null;
  member_status?: string | null;
  role: string;
  /** Role within the current branch (from BranchMembership.role) */
  branch_role?: string;
  is_active?: boolean;
  /** Active flag scoped to the current branch (from BranchMembership) */
  branch_is_active?: boolean;
  last_access?: string | null;
  is_online?: boolean;
}

export const fetchMembersApi = (params?: { page?: number; limit?: number; search?: string }) => {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.limit) p.set('limit', String(params.limit));
  if (params?.search) p.set('search', params.search);
  const qs = p.toString() ? `?${p.toString()}` : '';
  return request<{ data: MemberDTO[]; total: number; activeCount: number; adminCount: number; page: number; limit: number; status: number; message: string }>(`/user${qs}`);
};

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

export type UpdateMemberPayload = Partial<{
  full_name: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  nick_name: string;
  username: string;
  phone_number: string;
  phone_is_whatsapp: boolean;
  dob: string | null;
  gender: string | null;
  marital_status: string | null;
  date_married: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  job_title: string | null;
  employer: string | null;
  facebook_link: string | null;
  is_display_email: boolean;
  is_accept_text: boolean;
  grade: string | null;
  baptism_date: string | null;
  baptism_location: string | null;
  member_status: string | null;
}>;

export const updateMemberApi = (id: string, data: UpdateMemberPayload) =>
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
  request<{ data: MemberDTO[]; status: number; message: string; uniqueCount: number; duplicateCount: number; duplicateData: any[]; convertedPersons: { email: string; first_name: string; last_name: string }[]; convertedCount: number }>('/user/import', {
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
  image?: string;
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

export const fetchPeople = (params?: { page?: number; limit?: number; search?: string }) => {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.limit) p.set('limit', String(params.limit));
  if (params?.search) p.set('search', params.search);
  const qs = p.toString() ? `?${p.toString()}` : '';
  return request<{ data: Person[]; total: number; page: number; limit: number; status: number; message: string }>(`/people${qs}`);
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
  marital_status?: string;
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
        marital_status: u.marital_status,
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

export const bulkConvertPersonsApi = (ids: string[]) =>
  request<{ status: number; message: string; converted: number; skipped: number; failed: number }>('/people/bulk-convert', {
    method: 'POST',
    body: JSON.stringify({ ids }),
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
  appearance?: {
    theme?: 'light' | 'dark' | 'system';
  };
}

// ─── 2FA ──────────────────────────────────────────────────────────────────
export const verify2FACodeApi = (email: string, code: string) =>
  request<{ data: any; status: number; message: string }>(`/auth/verify-2fa`, {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });

export const resend2FACodeApi = (email: string) =>
  request<{ status: number; message: string }>(`/auth/resend-2fa`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

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
  profile_img?: string;
  state?: string;
  city?: string;
  country?: string;
  phone_number?: string;
  last_access?: string | null;
  is_online?: boolean;
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

// ─── Join: public types ───────────────────────────────────────────────────
export interface JoinRequestDTO {
  id: string;
  user_id: string;
  branch_id: string;
  denomination_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  joined_via: 'request' | 'invite_link';
  invite_id?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  user?: { id: string; email: string; full_name?: string; first_name?: string; last_name?: string };
}

export interface InviteLinkDTO {
  id: string;
  code: string;
  branch_id: string;
  denomination_id: string;
  created_by: string;
  expires_at?: string;
  max_uses?: number;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

export interface InviteInfoDTO {
  code: string;
  branch: { id: string; name: string; city?: string; country?: string };
  denomination: { id: string; denomination_name: string };
  expires_at?: string;
  max_uses?: number;
  uses_count: number;
}

const JOIN_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7777/api';

// ─── Join: public endpoints (no auth) ────────────────────────────────────
export const fetchPublicDenominations = () =>
  fetch(`${JOIN_API_BASE}/join/churches`)
    .then((r) => r.json())
    .then((r) => r.data as Array<{ id: string; denomination_name: string; branches: Array<{ id: string; name: string; city?: string; country?: string }> }>);

export const fetchInviteInfo = (code: string) =>
  fetch(`${JOIN_API_BASE}/join/invite/${encodeURIComponent(code)}`)
    .then((r) => r.json() as Promise<{ status: number; data?: InviteInfoDTO; message?: string }>);

// ─── Join: authenticated user endpoints ──────────────────────────────────
export const submitJoinRequestApi = (branch_id: string, message?: string) =>
  request<{ data: JoinRequestDTO; status: number; message: string }>('/join/request', {
    method: 'POST',
    body: JSON.stringify({ branch_id, message }),
  });

export const useInviteCodeApi = (code: string) =>
  request<{ data: any; status: number; message: string }>(`/join/invite/${encodeURIComponent(code)}/use`, {
    method: 'POST',
  });

// ─── Join: admin endpoints ────────────────────────────────────────────────
export const fetchJoinRequestsApi = (churchId: string, branchId: string, status?: string) => {
  const qs = status ? `?status=${status}` : '';
  return request<{ data: JoinRequestDTO[]; status: number }>(`/churches/${churchId}/branches/${branchId}/join-requests${qs}`);
};

export const reviewJoinRequestApi = (churchId: string, branchId: string, requestId: string, decision: 'approved' | 'rejected') =>
  request<{ data: JoinRequestDTO; status: number; message: string }>(`/churches/${churchId}/branches/${branchId}/join-requests/${requestId}`, {
    method: 'PUT',
    body: JSON.stringify({ decision }),
  });

export interface BulkReviewResult {
  succeeded: string[];
  failed: { id: string; reason: string }[];
}

export const bulkReviewJoinRequestsApi = (
  churchId: string,
  branchId: string,
  ids: string[],
  decision: 'approved' | 'rejected',
) =>
  request<{ data: BulkReviewResult; status: number; message: string }>(
    `/churches/${churchId}/branches/${branchId}/join-requests/bulk-review`,
    { method: 'POST', body: JSON.stringify({ ids, decision }) },
  );

// ─── Custom Domains ───────────────────────────────────────────────────────
export type CustomDomainStatus = 'pending' | 'active' | 'inactive' | 'rejected';

export interface LandingServiceTime {
  label: string;
  day?: string;
  time?: string;
  /** Optional background image URL for this service card. */
  background_image?: string;
}

export interface LandingMinistry {
  title: string;
  description?: string;
  icon?: string;
  /** Optional background image URL for this ministry card. */
  background_image?: string;
}

/** A curated photo collection (e.g. "Easter Sunday — 2026-04-05"). */
export interface LandingHighlight {
  id?: string;
  title: string;
  /** ISO date string (YYYY-MM-DD). */
  date?: string;
  description?: string;
  images: string[];
}

/** Core-value card (icon OR image, plus title & description). */
export interface LandingCoreValue {
  title: string;
  description?: string;
  icon?: string;
  image?: string;
}

export interface LandingSocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  twitter?: string;
  whatsapp?: string;
  website?: string;
}

export interface LandingConfig {
  hero_image_url?: string;
  hero_headline?: string;
  hero_subheadline?: string;
  cta_primary_label?: string;
  about?: string;
  service_times?: LandingServiceTime[];
  ministries?: LandingMinistry[];
  /** Legacy flat list — surfaced as a single highlight when `highlights` is empty. */
  gallery_urls?: string[];
  highlights?: LandingHighlight[];
  core_values?: LandingCoreValue[];
  video_url?: string;
  mission?: string;
  social?: LandingSocialLinks;
  show_join_cta?: boolean;
}

export interface CustomDomainDTO {
  id: string;
  domain: string;
  branch_id: string;
  denomination_id: string;
  display_name: string;
  logo_url: string | null;
  church_name: string;
  address: string | null;
  pastor_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  tagline: string | null;
  primary_color: string | null;
  allow_self_signup: boolean;
  status: CustomDomainStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  landing_config: LandingConfig | null;
  branch?: { id: string; name: string };
  denomination?: { id: string; denomination_name: string };
}

export interface PublicCustomDomainBrandingDTO {
  domain: string;
  display_name: string;
  logo_url: string | null;
  church_name: string;
  address: string | null;
  pastor_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  tagline: string | null;
  primary_color: string | null;
  allow_self_signup: boolean;
  branch_id: string;
  denomination_id: string;
  landing_config: LandingConfig | null;
}

export interface UpsertCustomDomainPayload {
  domain: string;
  display_name?: string;
  logo_url?: string;
  church_name?: string;
  address?: string;
  pastor_name?: string;
  contact_email?: string;
  contact_phone?: string;
  tagline?: string;
  primary_color?: string;
  allow_self_signup?: boolean;
  /** Pass `null` to clear all landing-page customisation. */
  landing_config?: LandingConfig | null;
}

const PUBLIC_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7777/api';

/** Public — fetch active custom-domain branding for a hostname. */
export const fetchPublicCustomDomainBranding = (host: string) =>
  fetch(`${PUBLIC_API_BASE}/custom-domains/resolve/${encodeURIComponent(host)}`)
    .then((r) => r.json() as Promise<{ status: number; data: PublicCustomDomainBrandingDTO | null; deactivated?: boolean }>)
    .catch(() => ({ status: 200, data: null as PublicCustomDomainBrandingDTO | null, deactivated: false }));

/** Branch admin — fetch the configured custom domain for a branch. */
export const fetchBranchCustomDomainApi = (churchId: string, branchId: string) =>
  request<{ data: CustomDomainDTO | null; status: number }>(
    `/churches/${churchId}/branches/${branchId}/custom-domain`,
  );

/** Branch admin — create or update the custom domain for a branch. */
export const upsertBranchCustomDomainApi = (
  churchId: string,
  branchId: string,
  payload: UpsertCustomDomainPayload,
) =>
  request<{ data: CustomDomainDTO; status: number; message: string }>(
    `/churches/${churchId}/branches/${branchId}/custom-domain`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );

/** Branch admin — remove the custom domain for a branch. */
export const deleteBranchCustomDomainApi = (churchId: string, branchId: string) =>
  request<{ status: number; message: string }>(
    `/churches/${churchId}/branches/${branchId}/custom-domain`,
    { method: 'DELETE' },
  );

/** Super admin — list all custom domains. */
export const fetchAllCustomDomainsApi = (status?: CustomDomainStatus) => {
  const qs = status ? `?status=${status}` : '';
  return request<{ data: CustomDomainDTO[]; status: number }>(`/custom-domains${qs}`);
};

export const approveCustomDomainApi = (id: string) =>
  request<{ data: CustomDomainDTO; status: number; message: string }>(
    `/custom-domains/${id}/approve`, { method: 'POST' },
  );

export const rejectCustomDomainApi = (id: string, rejection_reason: string) =>
  request<{ data: CustomDomainDTO; status: number; message: string }>(
    `/custom-domains/${id}/reject`,
    { method: 'POST', body: JSON.stringify({ rejection_reason }) },
  );

export const deactivateCustomDomainApi = (id: string) =>
  request<{ data: CustomDomainDTO; status: number; message: string }>(
    `/custom-domains/${id}/deactivate`, { method: 'POST' },
  );

export const reactivateCustomDomainApi = (id: string) =>
  request<{ data: CustomDomainDTO; status: number; message: string }>(
    `/custom-domains/${id}/reactivate`, { method: 'POST' },
  );

export const fetchInviteLinksApi = (churchId: string, branchId: string) =>
  request<{ data: InviteLinkDTO[]; status: number }>(`/churches/${churchId}/branches/${branchId}/invites`);

export const createInviteLinkApi = (churchId: string, branchId: string, opts?: { expires_at?: string; max_uses?: number }) =>
  request<{ data: InviteLinkDTO; status: number; message: string }>(`/churches/${churchId}/branches/${branchId}/invites`, {
    method: 'POST',
    body: JSON.stringify(opts ?? {}),
  });

export const deactivateInviteLinkApi = (churchId: string, branchId: string, inviteId: string) =>
  request<{ status: number; message: string }>(`/churches/${churchId}/branches/${branchId}/invites/${inviteId}`, {
    method: 'DELETE',
  });

// ─── Denomination Requests ──────────────────────────────────────────────────

export interface DenominationRequestDTO {
  id: string;
  denomination_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

/** Public — submit a denomination request (no auth) */
export const submitDenominationRequestApi = (data: {
  denomination_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  reason?: string;
}) =>
  fetch(`${JOIN_API_BASE}/denomination-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(async (r) => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.message || 'Failed to submit request');
    return json as { status: number; data: DenominationRequestDTO; message: string };
  });

/** Super admin — list denomination requests */
export const fetchDenominationRequests = (status?: string) => {
  const qs = status ? `?status=${status}` : '';
  return request<{ data: DenominationRequestDTO[]; status: number }>(`/denomination-requests${qs}`);
};

/** Super admin — approve a denomination request */
export const approveDenominationRequestApi = (id: string) =>
  request<{ data: any; status: number; message: string }>(`/denomination-requests/${id}/approve`, {
    method: 'POST',
  });

/** Super admin — reject a denomination request */
export const rejectDenominationRequestApi = (id: string, rejection_reason: string) =>
  request<{ data: DenominationRequestDTO; status: number; message: string }>(`/denomination-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejection_reason }),
  });

// ─── Events ─────────────────────────────────────────────────────────────────
import type { EventDTO, CreateEventInput, UpdateEventInput, EventAttendanceDTO, AttendanceSummaryItem } from '@/types/event';

export const fetchEventsApi = (params?: { page?: number; limit?: number; category?: string; from_date?: string; to_date?: string }) => {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  return request<{ data: EventDTO[]; total: number; status: number }>(`/events${qs}`);
};

export const fetchEventByIdApi = (id: string) =>
  request<{ data: EventDTO; status: number }>(`/events/${id}`);

export const createEventApi = (data: CreateEventInput) =>
  request<{ data: EventDTO; status: number; message: string }>('/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateEventApi = (id: string, data: UpdateEventInput) =>
  request<{ data: EventDTO; status: number; message: string }>(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteEventApi = (id: string) =>
  request<{ status: number; message: string }>(`/events/${id}`, { method: 'DELETE' });

// ─── Event Attendance ────────────────────────────────────────────────────────
export const markAttendanceApi = (eventId: string, body: { event_date: string; user_id?: string; check_in_lat?: number; check_in_lng?: number }) =>
  request<{ data: EventAttendanceDTO; status: number; message: string }>(`/events/${eventId}/attendance`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const fetchEventAttendanceApi = (eventId: string, eventDate: string) =>
  request<{ data: EventAttendanceDTO[]; status: number }>(`/events/${eventId}/attendance?event_date=${eventDate}`);

export const fetchAttendanceSummaryApi = (eventId: string) =>
  request<{ data: AttendanceSummaryItem[]; status: number }>(`/events/${eventId}/attendance/summary`);

export const removeAttendanceApi = (eventId: string, userId: string, eventDate: string) =>
  request<{ status: number; message: string }>(`/events/${eventId}/attendance/${userId}?event_date=${eventDate}`, {
    method: 'DELETE',
  });

// ─── Public / Guest (QR code check-in) ──────────────────────────────────────
const API_BASE_PUBLIC = import.meta.env.VITE_API_URL || 'http://localhost:7777/api';

export interface PublicEventInfo {
  id: string;
  title: string;
  date: string;
  time_from: string;
  time_to: string;
  location: string;
  accept_attendance: boolean;
  require_location: boolean;
  attendance_status: string | null;
  attendance_opens_at: string | null;
  attendance_closes_at: string | null;
  guest_checkin_fields: import('@/types/event').GuestCheckInField[] | null;
  allow_multiple_checkins: boolean;
}

export interface GuestCheckInInput {
  event_date: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  country?: string;
  state?: string;
  address?: string;
  comments?: string;
  custom_responses?: Record<string, string>;
  check_in_lat?: number;
  check_in_lng?: number;
}

export async function fetchPublicEventApi(eventId: string): Promise<{ data: PublicEventInfo; status: number }> {
  const res = await fetch(`${API_BASE_PUBLIC}/events/${eventId}/public`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || 'Event not found');
  return json;
}

export async function guestCheckInApi(eventId: string, body: GuestCheckInInput): Promise<{ status: number; message: string }> {
  const res = await fetch(`${API_BASE_PUBLIC}/events/${eventId}/guest-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || 'Check-in failed');
  return json;
}

export interface GuestAttendeeRecord {
  id: string;
  event_id: string;
  event_date: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  state: string | null;
  address: string | null;
  comments: string | null;
  custom_responses: Record<string, string> | null;
  checked_in_at: string;
}

export const fetchGuestAttendanceApi = (eventId: string, eventDate: string) =>
  request<{ data: GuestAttendeeRecord[]; status: number }>(`/events/${eventId}/guest-attendance?event_date=${eventDate}`);

