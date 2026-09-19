import { apiFetch } from "./api";

export interface PublicConfig {
  auth: { emailAndPassword: boolean; google: boolean };
}

export interface EmailCredentials {
  email: string;
  password: string;
}

export interface SignUpInput extends EmailCredentials {
  name: string;
}

// Better Auth is driven over plain HTTP so TanStack Query stays the only
// client-side owner of server state.
export const fetchPublicConfig = () =>
  apiFetch<PublicConfig>("/api/public-config");

export const signInWithEmail = (input: EmailCredentials) =>
  apiFetch<unknown>("/api/auth/sign-in/email", {
    method: "POST",
    json: { ...input, rememberMe: true },
  });

export const signUpWithEmail = (input: SignUpInput) =>
  apiFetch<unknown>("/api/auth/sign-up/email", { method: "POST", json: input });

export async function signInWithGoogle(callbackURL: string) {
  const result = await apiFetch<{ url?: string; redirect?: boolean }>(
    "/api/auth/sign-in/social",
    {
      method: "POST",
      json: {
        provider: "google",
        callbackURL,
        errorCallbackURL: `${callbackURL}sign-in?error=google`,
      },
    },
  );

  if (result.url) {
    window.location.assign(result.url);
  }
}

export const signOut = () =>
  apiFetch<unknown>("/api/auth/sign-out", { method: "POST", json: {} });
