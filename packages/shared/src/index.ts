// @ingame/shared — the single executable FE↔BE contract.
//
// Truth-precedence (00-INDEX §2, by concern): product-spec owns behavior/data/rules/economy;
// api-contract owns endpoint/payload shape; design-spec owns screen/flow/visual. This package makes
// the api-contract EXECUTABLE (CONVENTIONS rule 3): one source of zod schemas for both FE and BE.
//
// Request/input schemas (rule-3 field-for-field fidelity to api-contract) are split from
// response/view schemas (owned by the F06 privacy serializer — the sanctioned divergence, decision
// 0051/F23). Import request schemas to validate at the server boundary; response schemas describe
// the shapes the serializer must satisfy.

export * from './errors/error-codes';
export * from './events/registry';
export * from './manifests/global-tables';
export * from './manifests/minimum-m1';
export * from './schemas/sanitize';
export * from './schemas/common';
export * from './schemas/request/profile';
export * from './schemas/request/auth';
export * from './schemas/request/gamertag';
export * from './schemas/request/avatar';
export * from './schemas/request/catalog';
export * from './schemas/request/collection';
export * from './schemas/request/cards';
export * from './schemas/request/device';
export * from './schemas/request/economy';
export * from './schemas/request/social';
export * from './schemas/request/queue';
export * from './schemas/request/lists';
export * from './schemas/response/profile';
export * from './schemas/response/auth';
export * from './schemas/response/gamertag';
export * from './schemas/response/catalog';
export * from './schemas/response/collection';
export * from './schemas/response/cards';
export * from './schemas/response/device';
export * from './schemas/response/economy';
export * from './schemas/response/social';
export * from './schemas/response/recommendations';
export * from './schemas/response/feed';
export * from './schemas/response/invite';
export * from './schemas/response/compare';
export * from './schemas/response/queue';
export * from './schemas/response/lists';
export * from './schemas/composition';
export * from './schemas/device';
export * from './catalog/dedup';
