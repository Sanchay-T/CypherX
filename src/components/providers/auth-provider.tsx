"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getSession, login as loginRequest, signup as signupRequest } from "@/lib/auth-client";
import type {
  AuthResponse,
  AuthTokens,
  AuthUser,
  LoginPayload,
  SessionResponse,
  SignupPayload,
  StoredSession,
} from "@/types/auth";

const STORAGE_KEY = "cypherx.session";

type AuthContextValue = {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<StoredSession>;
  signup: (payload: SignupPayload) => Promise<StoredSession>;
  refreshSession: () => Promise<AuthUser | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const initialState = {
  user: null as AuthUser | null,
  tokens: null as AuthTokens | null,
  loading: true,
};

type AuthState = typeof initialState;

function normaliseUser(payload: SessionResponse["user"]): AuthUser {
  return {
    id: payload.id,
    supabaseId: payload.supabase_user_id,
    email: payload.email,
    fullName: payload.full_name,
    teamSize: payload.team_size,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  };
}

function normaliseTokens(payload: AuthResponse): AuthTokens {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type,
    expiresIn: payload.expires_in,
  };
}

function normaliseAuthResponse(payload: AuthResponse): StoredSession {
  return {
    user: normaliseUser(payload.user),
    tokens: normaliseTokens(payload),
  };
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.tokens?.accessToken) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to parse stored auth session", error);
    return null;
  }
}

function persistSession(session: StoredSession | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    setState({ user: null, tokens: stored.tokens, loading: true });

    getSession(stored.tokens.accessToken)
      .then((session) => {
        const user = normaliseUser(session.user);
        const nextSession: StoredSession = { user, tokens: stored.tokens };
        persistSession(nextSession);
        setState({ user, tokens: stored.tokens, loading: false });
      })
      .catch((error) => {
        console.warn("Failed to restore auth session", error);
        persistSession(null);
        setState({ user: null, tokens: null, loading: false });
      });
  }, []);

  const logout = useCallback(() => {
    persistSession(null);
    setState({ user: null, tokens: null, loading: false });
  }, []);

  const applySession = useCallback((response: AuthResponse): StoredSession => {
    const session = normaliseAuthResponse(response);
    persistSession(session);
    setState({ user: session.user, tokens: session.tokens, loading: false });
    return session;
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await loginRequest(payload);
      return applySession(response);
    },
    [applySession],
  );

  const signup = useCallback(
    async (payload: SignupPayload) => {
      const response = await signupRequest(payload);
      return applySession(response);
    },
    [applySession],
  );

  const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
    if (!state.tokens?.accessToken) {
      return null;
    }
    try {
      const session = await getSession(state.tokens.accessToken);
      const user = normaliseUser(session.user);
      const nextSession: StoredSession = { user, tokens: state.tokens };
      persistSession(nextSession);
      setState({ user, tokens: state.tokens, loading: false });
      return user;
    } catch (error) {
      console.warn("Failed to refresh auth session", error);
      logout();
      return null;
    }
  }, [state.tokens, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      tokens: state.tokens,
      loading: state.loading,
      login,
      signup,
      logout,
      refreshSession,
    }),
    [state.user, state.tokens, state.loading, login, signup, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
