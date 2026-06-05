import { apiClient, clearAuthToken, setAuthToken } from '@/lib/api';
import type {
  LoginApiResponse,
  LoginCredentials,
  LoginResult,
} from '@/types/auth.types';

const AUTH_ROUTES = {
  login: '/auth/login',
  logout: '/auth/logout',
} as const;

async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const { data } = await apiClient.post<LoginApiResponse>(
    AUTH_ROUTES.login,
    credentials,
    { skipAuth: true },
  );
  if (data.status !== 'success' || !data.data?.token) {
    throw new Error('Login failed. Please check your credentials.');
  }

  const { token, user } = data.data;
  setAuthToken(token);

  return {
    token,
    user: user ?? null,
  };
}

async function logout(): Promise<void> {
  try {
    await apiClient.post(AUTH_ROUTES.logout);
  } catch {
    // Always clear the local session even when the server call fails.
  } finally {
    clearAuthToken();
  }
}

export const authService = {
  login,
  logout,
};
