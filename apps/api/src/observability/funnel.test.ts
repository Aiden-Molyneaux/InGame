import { describe, it, expect } from 'vitest';
import { track, onFunnelEvent, type FunnelEvent } from './funnel';

// F18 / G-E — the observability funnel round-trip: a funnel event reaches the sink. `onFunnelEvent`
// is the test hook standing in for "the dash" until a real analytics backend lands. (SYS-07 tag: the
// funnel spine is part of the un-retrofittable observability floor.)
describe('SYS-07: observability funnel round-trip (F18)', () => {
  it('a tracked funnel event reaches a subscriber (the round-trip)', () => {
    const received: FunnelEvent[] = [];
    const off = onFunnelEvent((e) => received.push(e));
    track({ name: 'signup', userId: 'u1', props: { method: 'password' } });
    off();
    track({ name: 'signup', userId: 'u2' }); // after unsubscribe — not received

    expect(received).toHaveLength(1);
    expect(received[0]?.name).toBe('signup');
    expect(received[0]?.userId).toBe('u1');
  });
});
