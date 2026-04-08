import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiLogin,
  apiRegister,
  apiGoogleSignIn,
  apiForgotPassword,
  apiVerifyResetOtp,
  apiSetNewPassword,
  apiLogout,
  apiFetchProfile,
  clearTokens,
  type AuthResponse,
  type RegisterResponse,
} from "../services/auth.service";

const AUTH_KEYS = {
  user: ["auth", "user"] as const,
  profile: ["auth", "profile"] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: AUTH_KEYS.profile,
    queryFn: apiFetchProfile,
    enabled: true, // queryFn short-circuits when no token
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

function handleAuthSuccess(
  data: AuthResponse,
  queryClient: ReturnType<typeof useQueryClient>
) {
  // Cancel any in-flight profile fetch before setting data.
  // Without this, a stale 401 response (from before login) can overwrite
  // the auth data we're about to set, flipping isAuthenticated back to false.
  queryClient.cancelQueries({ queryKey: AUTH_KEYS.profile });
  queryClient.setQueryData(AUTH_KEYS.profile, {
    ...data.user,
    role: data.role,
    permissions: data.permissions,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiLogin(email, password),
    onSuccess: (data) => handleAuthSuccess(data, queryClient),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      email: string;
      full_name: string;
      password: string;
      church?: {
        denomination_name: string;
        description?: string;
        location?: string;
        state?: string;
        country?: string;
        address?: string;
      };
    }): Promise<RegisterResponse> =>
      apiRegister(vars.email, vars.full_name, vars.password, vars.church),
    onSuccess: (data) => {
      // Cancel any in-flight profile fetch before setting data.
      queryClient.cancelQueries({ queryKey: AUTH_KEYS.profile });
      queryClient.setQueryData(AUTH_KEYS.profile, {
        ...data.user,
        role: data.role,
        permissions: data.permissions,
      });
    },
  });
}

export function useGoogleSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idToken: string) => apiGoogleSignIn(idToken),
    onSuccess: (data) => handleAuthSuccess(data, queryClient),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiLogout,
    onSettled: () => {
      clearTokens();
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => apiForgotPassword(email),
  });
}

export function useVerifyResetOtp() {
  return useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) =>
      apiVerifyResetOtp(email, otp),
  });
}

export function useSetNewPassword() {
  return useMutation({
    mutationFn: ({ email, newPassword }: { email: string; newPassword: string }) =>
      apiSetNewPassword(email, newPassword),
  });
}
