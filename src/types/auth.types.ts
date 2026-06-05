export interface LoginCredentials {
  userId: string;
  password: string;
}

export interface AuthUser {
  id?: string;
  userId?: string;
  email?: string;
  name?: string;
}

export interface LoginApiResponse {
  status: string;
  message: string;
  data: {
    token: string;
    user: AuthUser;
  };
}

export interface LoginResult {
  token: string;
  user: AuthUser | null;
}
