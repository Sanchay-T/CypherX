export type AuthUserResponse = {
  id: string;
  supabase_user_id: string;
  email: string;
  full_name: string | null;
  team_size: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthTokensResponse = {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_in: number | null;
};

export type AuthResponse = AuthTokensResponse & {
  user: AuthUserResponse;
};

export type SessionResponse = {
  user: AuthUserResponse;
};

export type SignupPayload = {
  email: string;
  password: string;
  full_name: string;
  team_size: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresIn: number | null;
};

export type AuthUser = {
  id: string;
  supabaseId: string;
  email: string;
  fullName: string | null;
  teamSize: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoredSession = {
  user: AuthUser;
  tokens: AuthTokens;
};
