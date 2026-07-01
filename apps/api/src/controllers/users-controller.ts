import type { Request, Response } from 'express';
import { AuthFailedError } from '../errors/AppError';
import * as usersService from '../services/users-service';

// GET /users/:id controller. The VIEWER is the authenticated principal (SYS-01); the target is the
// path id. The F06 serializer + the non-disclosure collapse live in the service.
export async function getUser(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  const shape = await usersService.getUserProfile(principal.userId, req.params.id ?? '');
  res.json(shape);
}
