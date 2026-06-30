import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Adapts an async controller into an Express handler, forwarding rejections to the error middleware
// (so a thrown AppError becomes the mapped envelope rather than an unhandled rejection).
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
