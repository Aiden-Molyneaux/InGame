import { logger } from './logger';

// F18 / product-spec §7 — the thin analytics FUNNEL on the ACH-08 event spine. `track()` records one
// funnel event; for M2 the sink is the structured log stream (the "dash" until a real analytics
// backend lands). `onFunnelEvent` lets the G-E round-trip test assert a funnel event reached the sink.

export interface FunnelEvent {
  name: string;
  userId?: string;
  props?: Record<string, unknown>;
}

const listeners = new Set<(e: FunnelEvent) => void>();

export function track(event: FunnelEvent): void {
  logger.info({ funnel: event.name, userId: event.userId, ...event.props }, 'funnel');
  for (const listener of listeners) listener(event);
}

/** Subscribe to funnel events (the observability round-trip check). Returns an unsubscribe fn. */
export function onFunnelEvent(listener: (e: FunnelEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
