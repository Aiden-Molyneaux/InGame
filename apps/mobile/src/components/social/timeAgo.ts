// timeAgo — the SOC-06/08 relative-time grammar shared by FeedRow / RequestRow ("2H AGO" · "YESTERDAY"
// · "SENT 3D AGO"). Board voice = UPPERCASE, compact. Returns a stable label for a given `iso` + `now`
// (now is injectable so tests are deterministic). An unparseable/absent stamp → '' (the row omits time
// rather than showing a bogus one).
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  if (sec < 60) return 'JUST NOW';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}M AGO`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}H AGO`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'YESTERDAY';
  if (day < 7) return `${day}D AGO`;
  // Older than a week → an absolute month/day (e.g. "MAR 5"), uppercased for the board voice.
  return new Date(then)
    .toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    .toUpperCase();
}

// "TRY AGAIN IN 26 D" / "TRY AGAIN MAR 5" — the SOC-08 re-request cooldown microcopy off a future
// `cooldownUntil`. Days-remaining while it's near, an absolute date once it's far (or already lapsed →
// '' so the caller can just re-enable ADD).
export function cooldownRemaining(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  const until = new Date(iso).getTime();
  if (Number.isNaN(until) || until <= now) return '';
  const days = Math.ceil((until - now) / (1000 * 60 * 60 * 24));
  if (days <= 45) return `TRY AGAIN IN ${days} D`;
  return `TRY AGAIN ${new Date(until).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}`;
}
