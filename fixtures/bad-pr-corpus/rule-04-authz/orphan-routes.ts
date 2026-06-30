// DELIBERATELY BAD (rule-04-authz). A mutating route declares an authzTest id, but there is NO paired
// test that hits the route as actor-B and asserts a 4xx. The inventory-diff lint (F30) fails this:
// the standing SYS-07 cross-user authz test is missing.
import { defineRoute } from '../../../apps/api/src/http/defineRoute';

export const orphanRoutes = [
  defineRoute({
    method: 'post',
    path: '/things',
    mutates: true,
    // ❌ no test anywhere references 'authz:orphan_no_test' with an actor-B 4xx assertion
    authzTest: 'authz:orphan_no_test',
    specIds: ['PROF-01'],
    handler: [],
  }),
];
