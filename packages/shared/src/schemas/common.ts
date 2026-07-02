import { z } from 'zod';

// Shared enum tokens used by BOTH request and response schemas. Kept in one place so the request
// (input) and response (view) halves agree on the vocabulary without one importing the other.

/**
 * PROF-03 privacy state. Pinned in api-contract 0.41 (OQ-112, RESOLVED 2026-06-30):
 * 'friends' (the default, friends-only) | 'public' (limited public profile).
 */
export const privacySchema = z.enum(['friends', 'public']);
export type Privacy = z.infer<typeof privacySchema>;

/** SYS-08 role. `adminTier` is exposed on the self-view only (PROF-09); 1..4 nested. */
export const roleSchema = z.enum(['user', 'admin']);
export type Role = z.infer<typeof roleSchema>;

export const adminTierSchema = z.number().int().min(1).max(4);

/** SOC-01/08 relationship — drives ADD FRIEND / FRIEND-tag chrome on other-principal views. */
export const relationshipSchema = z.enum(['none', 'outgoing', 'incoming', 'friend']);
export type Relationship = z.infer<typeof relationshipSchema>;

/** PROF-02 controlled platform list for gamertags. */
export const platformSchema = z.enum(['pc', 'playstation', 'xbox', 'nintendo']);
export type Platform = z.infer<typeof platformSchema>;
