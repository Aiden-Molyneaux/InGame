import type { Request, Response } from 'express';
import type {
  AppleRequest,
  LoginRequest,
  PasswordResetConfirm,
  PasswordResetRequest,
  PasswordResetVerify,
  RefreshRequest,
  RegisterRequest,
  LogoutRequest,
  VerifyEmailConfirm,
} from '@ingame/shared';
import * as authService from '../services/auth-service';
import { AuthFailedError } from '../errors/AppError';

// AUTH-* controllers. Bodies are the zod-parsed `req.validated` (never raw `req.body`); the actor for
// the authenticated verify-resend is the principal ONLY (SYS-01). Neutral / anti-enumeration
// responses are enforced in the service (AUTH-11); the controller just shapes the HTTP response.

export async function register(req: Request, res: Response): Promise<void> {
  const session = await authService.register(req.validated as RegisterRequest);
  res.status(201).json(session);
}

export async function login(req: Request, res: Response): Promise<void> {
  const session = await authService.login(req.validated as LoginRequest);
  res.json(session);
}

export async function apple(req: Request, res: Response): Promise<void> {
  const session = await authService.appleSignIn(req.validated as AppleRequest);
  res.json(session);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const result = await authService.refresh(req.validated as RefreshRequest);
  res.json(result);
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.validated as LogoutRequest);
  res.json({ ok: true });
}

export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  await authService.requestPasswordReset(req.validated as PasswordResetRequest);
  res.json({ ok: true }); // always neutral (AUTH-04/11)
}

export async function verifyPasswordReset(req: Request, res: Response): Promise<void> {
  // AUTH-04 (P-B) — a matching code returns the short-lived reset proof; every miss is the neutral
  // 422 invalid_code thrown by the service (AUTH-11).
  const result = await authService.verifyPasswordReset(req.validated as PasswordResetVerify);
  res.json(result);
}

export async function confirmPasswordReset(req: Request, res: Response): Promise<void> {
  await authService.confirmPasswordReset(req.validated as PasswordResetConfirm);
  res.json({ ok: true });
}

export async function requestEmailVerification(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  await authService.requestEmailVerification(principal.userId);
  res.json({ ok: true });
}

export async function confirmEmailVerification(req: Request, res: Response): Promise<void> {
  await authService.confirmEmailVerification(req.validated as VerifyEmailConfirm);
  res.json({ ok: true });
}

export async function usernameAvailable(req: Request, res: Response): Promise<void> {
  const u = typeof req.query.u === 'string' ? req.query.u : '';
  const result = await authService.checkUsernameAvailable(u);
  res.json(result);
}
