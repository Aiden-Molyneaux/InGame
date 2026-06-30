// DELIBERATELY BAD (rule-03-zod). A controller reads raw req.body with NO zod validation from
// @ingame/shared — an un-validated request body. CONVENTIONS rule 3 fails this in CI (the server
// parse is the security boundary).
import type { Request, Response } from 'express';

export async function patchBioBadly(req: Request, res: Response) {
  // ❌ no validateBody()/shared schema — trusts the wire shape
  const bio = req.body.bio;
  res.json({ bio });
}
