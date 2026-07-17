import type { CosmeticType, LedgerEntry } from '@ingame/shared';

// COSM-01 type → the human display noun for the Store aisle sheets (mirrors the server's
// COSMETIC_TYPE_LABELS in config/cosmetics.ts — the wire vocabulary is shared, the copy is the client's).
export const COSMETIC_TYPE_LABEL: Record<CosmeticType, string> = {
  frame: 'FRAME',
  effect: 'EFFECT',
  finish: 'FINISH',
  nameplate: 'NAMEPLATE',
  font: 'FONT',
  device_shell: 'DEVICE SHELL',
  screen_theme: 'SCREEN THEME',
  shell_sticker_pack: 'STICKER PACK',
};

// Copy helpers for the Store/Wallet surface (OQ-110 — no spec-ID strings in rendered copy). The ledger
// `type` is the pinned `currency_ledger.reason` enum (decision 0073); we render a plain human label per
// reason. We only have `refType`/`refId` (ids, not joined names) on the wire, so the labels are generic
// — "ADOPTED A CARD", not "ADOPTED 'DESTINY' BY RIKO" (the board's illustrative copy needs a name join
// the wallet ledger doesn't carry; recorded as a manifest note, not invented here). The operator
// `admin_adjustment` reason is NEVER serialized (ECON-11) — it shows as a plain adjustment.
const LEDGER_LABELS: Record<LedgerEntry['type'], string> = {
  starting_grant: 'STARTING GRANT',
  daily_claim: 'DAILY BONUS · CLAIMED IN STORE',
  pack_purchase: 'PIXEL PACK',
  adoption: 'ADOPTED A CARD',
  acquire: 'ACQUIRED A COSMETIC',
  milestone: 'MILESTONE REWARD',
  refund_reversal: 'REFUND REVERSAL',
  admin_adjustment: 'OPERATOR ADJUSTMENT',
};

export function ledgerLabel(entry: LedgerEntry): string {
  return LEDGER_LABELS[entry.type] ?? 'ADJUSTMENT';
}

/** The ledger row's visual class from its reason + delta (drives colour/sign). */
export type LedgerTone = 'earn' | 'spend' | 'reversal';
export function ledgerTone(entry: LedgerEntry): LedgerTone {
  if (entry.type === 'refund_reversal') return 'reversal';
  return entry.delta >= 0 ? 'earn' : 'spend';
}

/** The signed badge glyph for a row (+ / − / ⊘). */
export function ledgerSign(entry: LedgerEntry): string {
  if (entry.type === 'refund_reversal') return '⊘';
  return entry.delta >= 0 ? '+' : '−';
}

/** A compact when-stamp: "TODAY HH:MM" for today, else "MMM DD" (uppercased). */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export function ledgerWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `TODAY ${hh}:${mm}`;
  }
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
}
