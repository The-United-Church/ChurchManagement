import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import axios from "axios";
import type { AxiosResponse } from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:7777/api";

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export interface CustomDomainAuthInfo {
  branch_id: string;
  denomination_id: string;
  domain: string;
  membership_status: 'member' | 'pending' | 'rejected' | 'request_created';
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    profile_img?: string;
  };
  role: any;
  permissions: any[];
  isNewUser?: boolean;
  customDomain?: CustomDomainAuthInfo | null;
  /** True when the server requires a 2FA code before issuing tokens. */
  requires2FA?: boolean;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    profile_img?: string;
  };
  church: {
    id: string;
    denomination_name: string;
    description?: string;
    location?: string;
    state?: string;
    country?: string;
    address?: string;
  };
  role: any;
  permissions: any[];
}

/** Store tokens in localStorage after a successful login/register. */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/** Read the current access token from localStorage. */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Read the current refresh token from localStorage. */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Extract JWT tokens from response headers set by the server (Axios). */
function saveTokensFromResponse(res: Pick<AxiosResponse, 'headers'>): void {
  const accessToken = (res.headers["x-access-token"] as string) || undefined;
  const refreshToken = (res.headers["x-refresh-token"] as string) || undefined;
  if (accessToken) setTokens(accessToken, refreshToken || '');
}

let isRefreshing = false;
let refreshSubscribers: (() => void)[] = [];

function onTokenRefreshed() {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<void> {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) {
    clearTokens();
    throw new Error("Session expired");
  }

  const res = await axios.post(`${API_BASE}/auth/refresh-token`, { refreshToken: refreshTokenValue }, {
    headers: { "Content-Type": "application/json" },
  });

  if (res.status !== 200) {
    clearTokens();
    throw new Error("Session expired");
  }
  saveTokensFromResponse(res);
}

export async function authFetch(
  endpoint: string,
  options?: RequestInit
): Promise<AxiosResponse> {
  const hasOptions = Boolean(options);
  const token = getAccessToken();
  const hasToken = Boolean(token);
  const branchId = localStorage.getItem('church_mgmt_selected_branch') || undefined;
  // Always echo the current hostname so the backend can scope the request
  // to a custom domain (auto-join flow, branding lookups, etc.).
  const customDomain = typeof window !== 'undefined' ? window.location.hostname : undefined;
  console.debug(`API Request -> ${endpoint} | method=${options?.method || 'GET'} | hasOptions=${hasOptions} | hasToken=${hasToken}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}`, 'X-Access-Token': token } : {}),
    ...(branchId ? { 'X-Branch-Id': branchId } : {}),
    ...(customDomain ? { 'X-Custom-Domain': customDomain } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };

  const axiosConfig = {
    method: (options?.method || 'GET') as string,
    url: `${API_BASE}${endpoint}`,
    headers,
    data: options?.body,
    validateStatus: () => true, // handle all status codes manually
  };

  let res = await axios(axiosConfig);

  // Only attempt token refresh if we actually sent an Authorization header
  if (res.status === 401 && token) {
    console.warn(`401 Unauthorized on ${endpoint}; attempting token refresh`);
    const refreshed = await handleTokenRefresh();
    if (refreshed) {
      const newToken = getAccessToken();
      const newBranchId = localStorage.getItem('church_mgmt_selected_branch') || undefined;
      const newCustomDomain = typeof window !== 'undefined' ? window.location.hostname : undefined;
      const retryHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(newToken ? { Authorization: `Bearer ${newToken}`, 'X-Access-Token': newToken } : {}),
        ...(newBranchId ? { 'X-Branch-Id': newBranchId } : {}),
        ...(newCustomDomain ? { 'X-Custom-Domain': newCustomDomain } : {}),
        ...(options?.headers as Record<string, string> | undefined),
      };
      res = await axios({ ...axiosConfig, headers: retryHeaders });
    }
  }

  return res;
}

async function handleTokenRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push(() => resolve(true));
    });
  }

  isRefreshing = true;
  try {
    await refreshAccessToken();
    onTokenRefreshed();
    return true;
  } catch {
    clearTokens();
    window.dispatchEvent(new CustomEvent("auth:session-expired"));
    return false;
  } finally {
    isRefreshing = false;
  }
}

function customDomainHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const host = window.location.hostname;
  return host ? { 'X-Custom-Domain': host } : {};
}

function mapFirebaseAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Incorrect email or password. Please try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'Login failed. Please check your credentials and try again.';
  }
}

export async function apiLogin(
  email: string,
  password: string
): Promise<AuthResponse> {
  // Authenticate with Firebase first — Firebase owns the password.
  let credential: import('firebase/auth').UserCredential;
  try {
    credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  } catch (err: any) {
    const code: string = err?.code ?? '';
    throw new Error(mapFirebaseAuthError(code));
  }

  const idToken = await credential.user.getIdToken();

  // Exchange the Firebase ID token for JWT tokens.
  const res = await axios.post(`${API_BASE}/auth/firebase-login`, {
    idToken,
  }, {
    headers: { "Content-Type": "application/json", ...customDomainHeader() },
  });

  if (res.status !== 200) {
    throw new Error(res.data?.message || "Login failed");
  }

  // 2FA branch — server has emailed a code, no tokens yet.
  if (res.data?.data?.requires2FA) {
    return {
      ...res.data.data,
      user: { id: '', email: res.data.data.email, full_name: '' },
      role: null,
      permissions: [],
    } as AuthResponse;
  }

  // Clear any stale token before saving fresh ones
  clearTokens();
  saveTokensFromResponse(res);
  return res.data.data;
}

export async function apiVerify2FA(
  email: string,
  code: string
): Promise<AuthResponse> {
  const res = await axios.post(`${API_BASE}/auth/verify-2fa`, { email, code }, {
    headers: { 'Content-Type': 'application/json', ...customDomainHeader() },
  });
  if (res.status !== 200) throw new Error(res.data?.message || '2FA verification failed');
  clearTokens();
  saveTokensFromResponse(res);
  return res.data.data;
}

export async function apiResend2FA(email: string): Promise<void> {
  await axios.post(`${API_BASE}/auth/resend-2fa`, { email }, {
    headers: { 'Content-Type': 'application/json', ...customDomainHeader() },
  });
}

export async function apiGoogleSignIn(
  idToken: string
): Promise<AuthResponse> {
  const res = await axios.post(`${API_BASE}/auth/google`, { idToken }, { headers: { "Content-Type": "application/json", ...customDomainHeader() } });
  clearTokens();
  saveTokensFromResponse(res);
  return res.data.data;
}

export async function apiRegister(
  email: string,
  full_name: string,
  password: string,
  church?: {
    denomination_name: string;
    description?: string;
    location?: string;
    state?: string;
    country?: string;
    address?: string;
  },
  phone_number?: string
): Promise<RegisterResponse> {
  let firebaseUser: import('firebase/auth').User | null = null;
  try {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    firebaseUser = credential.user;
    const idToken = await firebaseUser.getIdToken();
    const res = await axios.post(`${API_BASE}/auth/signup`, { idToken, full_name, phone_number, ...(church ?? {}) }, { headers: { "Content-Type": "application/json", ...customDomainHeader() } });
    saveTokensFromResponse(res);
    return res.data.data;
  } catch (err: any) {
    if (firebaseUser) await firebaseUser.delete();
    const msg = err?.response?.data?.message || "Registration failed";
    throw new Error(msg);
  }
}

export async function apiForgotPassword(email: string): Promise<{ otpSent: boolean }> {
  try {
    const res = await axios.post(`${API_BASE}/auth/forgot-password`, { email }, { headers: { "Content-Type": "application/json" } });
    return res.data.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || "Failed to send reset code");
  }
}

export async function apiVerifyResetOtp(email: string, otp: string): Promise<{ isValid: boolean }> {
  try {
    const res = await axios.post(`${API_BASE}/auth/verify-reset-otp`, { email, otp }, { headers: { "Content-Type": "application/json" } });
    return res.data.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || "Invalid code");
  }
}

export async function apiSetNewPassword(email: string, newPassword: string): Promise<void> {
  try {
    await axios.post(`${API_BASE}/auth/set-new-password`, { email, newPassword }, { headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || "Failed to set password");
  }
}

export async function apiLogout(): Promise<void> {
  const token = getAccessToken();
  try {
    await axios.post(`${API_BASE}/auth/logout`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {}
  clearTokens();
  localStorage.removeItem('church_mgmt_selected_church');
  localStorage.removeItem('church_mgmt_selected_branch');
  localStorage.removeItem('church_mgmt_access_token');
  localStorage.removeItem('church_mgmt_refresh_token');
}

export async function apiFetchProfile(): Promise<any> {
  // If there's no token in localStorage, skip the network call
  if (!getAccessToken()) return null;

  try {
    const res = await authFetch('/user/profile');
    console.log('Profile fetch response:', res);
    if (res.status === 200) return res.data.data;
    if (res.status === 401) return null;
    throw new Error(res.data?.message || 'Failed to fetch profile');
  } catch (err: any) {
    console.log('Profile fetch error:', err);
    if (err?.response?.status === 401) return null;
    throw new Error(err?.response?.data?.message || 'Failed to fetch profile');
  }
}



