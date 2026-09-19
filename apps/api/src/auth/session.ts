import { fromNodeHeaders } from "better-auth/node";
import type { RequestHandler, Response } from "express";

import { unauthenticated } from "../lib/http-error.js";
import { auth } from "./auth.js";

export type SessionData = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;
export type SessionUser = SessionData["user"];

const SESSION_LOCAL = "huddleSession";

export async function resolveSession(
  headers: Parameters<typeof fromNodeHeaders>[0],
): Promise<SessionData | null> {
  return auth.api.getSession({ headers: fromNodeHeaders(headers) });
}

export const requireSession: RequestHandler = async (
  request,
  response,
  next,
) => {
  const session = await resolveSession(request.headers);

  if (!session) {
    next(unauthenticated());
    return;
  }

  response.locals[SESSION_LOCAL] = session;
  next();
};

export function getSessionUser(response: Response): SessionUser {
  const session = response.locals[SESSION_LOCAL] as SessionData | undefined;

  if (!session) {
    throw unauthenticated();
  }

  return session.user;
}
