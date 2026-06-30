import { Router, type RequestHandler } from 'express';

// F30 — `defineRoute` makes the route inventory a DATA STRUCTURE (not an AST/verb guess). The
// rule-4 authz inventory-diff lint reads these literals; `mutates` is an EXPLICIT flag (a
// state-changing GET still trips it), and `crossPrincipal` flags a read that can return another
// principal's data (F06). For a mutating OR cross-principal route, `authzTest` is REQUIRED — and the
// lint counts coverage ONLY when a test hits the real route as actor-B and asserts a 4xx.

export type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

export interface RouteDef {
  method: HttpMethod;
  path: string;
  /** A state-changing route (the SYS-07 standing-authz-test obligation). */
  mutates: boolean;
  /** A read that can return another principal's data (the F06 relationship-matrix obligation). */
  crossPrincipal?: boolean;
  /** Stable id of the standing authz test that hits this route as actor-B asserting 4xx (SYS-07). */
  authzTest?: string;
  /** Stable spec IDs this route serves (rule-6 traceability). */
  specIds: string[];
  handler: RequestHandler | RequestHandler[];
}

const registry: RouteDef[] = [];

export function defineRoute(def: RouteDef): RouteDef {
  if ((def.mutates || def.crossPrincipal) && !def.authzTest) {
    throw new Error(
      `defineRoute ${def.method.toUpperCase()} ${def.path}: a mutating/cross-principal route ` +
        `requires an authzTest id (SYS-07). The route inventory is the lint's source of truth.`,
    );
  }
  registry.push(def);
  return def;
}

export function getRouteRegistry(): readonly RouteDef[] {
  return registry;
}

/** Test-only: reset the in-memory registry between suites. */
export function clearRouteRegistry(): void {
  registry.length = 0;
}

export function mountRoutes(defs: RouteDef[]): Router {
  const router = Router();
  for (const def of defs) {
    const handlers = Array.isArray(def.handler) ? def.handler : [def.handler];
    router[def.method](def.path, ...handlers);
  }
  return router;
}
