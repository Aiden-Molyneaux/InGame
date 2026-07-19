import { describe, it, expect } from 'vitest';
import { feedResponseSchema } from './feed';
import { recommendationItemSchema } from './recommendations';

// C1 regression (M6 P4 fix round — parvati walk): the server emits RELATIVE /media/… asset paths (the
// local-disk StorageProvider; R2/CDN may absolutize later). The feed/rec card + avatar fields were
// typed z.string().url() — the codebase outlier vs galleryCardSchema's plain strings — so every
// published_card feed row failed the client seam parse and the Friends-tab landing rendered SIGNAL LOST
// off a 200. These tests pin the fix: RELATIVE paths must parse.
// Tags: SOC-05, SOC-06, F06.

describe('SOC-06 (C1): feed schema accepts RELATIVE media paths', () => {
  it('a published_card feed item whose card carries /media/… relative paths parses', () => {
    const parsed = feedResponseSchema.safeParse({
      items: [
        {
          feedItemId: 'published_card:3c30c359-d7fb-4810-b62f-0e2b46b40dda:1784246400000',
          actor: {
            userId: '3c30c359-d7fb-4810-b62f-0e2b46b40dda',
            username: 'smoke_friend',
            avatarUrl: '/media/avatars/3c30c359/full.png', // relative — must parse (C1)
            avatarConfig: null, // PROF-08 (W-4) — rides beside avatarUrl on the feed actor
          },
          type: 'published_card',
          aggregateCount: 1,
          objects: [
            {
              gameId: '7556183c-fe79-4a17-8b67-257d39efeec9',
              title: 'Smoke Odyssey Delta',
              card: {
                id: '4a9d9f60-323e-481a-b1ab-c6faaea24923',
                imageUrl: '/media/cards/x/full.png', // relative — must parse (C1)
                thumbUrl: '/media/cards/x/thumb.png',
              },
            },
          ],
          occurredAt: '2026-07-17T05:57:53.985Z',
          windowStart: '2026-07-17T00:00:00.000Z',
          windowEnd: '2026-07-17T06:00:00.000Z',
        },
      ],
      nextCursor: null,
    });
    expect(parsed.success).toBe(true);
  });
});

describe('SOC-05 (C1): recommendation item schema accepts RELATIVE media paths', () => {
  it('a rec item whose game.card carries /media/… relative paths parses', () => {
    const parsed = recommendationItemSchema.safeParse({
      recId: 'f5f0c2fc-e20b-4a97-a1d6-6847778417f8',
      game: {
        id: '7556183c-fe79-4a17-8b67-257d39efeec9',
        title: 'Smoke Odyssey Delta',
        card: {
          id: '4a9d9f60-323e-481a-b1ab-c6faaea24923',
          imageUrl: '/media/cards/x/full.png', // relative — must parse (C1)
          thumbUrl: '/media/cards/x/thumb.png',
          isCustom: true,
        },
      },
      fromUser: { userId: '1b59793c-d9dc-450c-82a6-f0bebea0aa91', username: 'smoke_sender' },
      note: 'play this',
      createdAt: '2026-07-17T05:57:54.239Z',
    });
    expect(parsed.success).toBe(true);
  });
});
