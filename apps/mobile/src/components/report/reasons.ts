import type { ReportReason, ReportTargetType } from '../../store/reportApi';

// The per-target reason menus (MOD-01 · report-states.html A1/A2/A3/C1). Each reason carries its board
// label, an optional selected-state sub-line, and whether it REQUIRES the moderator-facing details note
// (MOD-01 — `incorrect_info` and `impersonation` demand specifics; everything else is self-evident).
export interface ReasonOption {
  reason: ReportReason;
  label: string;
  /** Shown appended to the label when this reason is the SELECTED one (the board's "— ALREADY IN THE CATALOG"). */
  selectedSuffix?: string;
  /** MOD-01 — a details note is required before SUBMIT arms. */
  requiresDetails: boolean;
  /** The `TextField` label for the disclosed note (board `.flabel`). Only meaningful when requiresDetails. */
  detailsLabel?: string;
  /** A hint line under the reason list explaining the current arm/dormant state. */
  hint: string;
}

const CARD_REASONS: ReasonOption[] = [
  { reason: 'offensive', label: 'Offensive or NSFW', requiresDetails: false, hint: 'Pick a reason to continue — submit unlocks once a reason is chosen.' },
  { reason: 'wrong_game', label: 'Wrong game', requiresDetails: false, hint: 'Pick a reason to continue — submit unlocks once a reason is chosen.' },
  { reason: 'spam', label: 'Spam or low-effort', requiresDetails: false, hint: 'Pick a reason to continue — submit unlocks once a reason is chosen.' },
  // M6 W-6 A2 (MOD-01 amendment) — wrong details ON a card; feeds the same wrongness signal as the
  // game reason (the M7 console correlates both with the game's edit history, CAT-14/MOD-16).
  {
    reason: 'incorrect_info',
    label: 'Incorrect info',
    requiresDetails: true,
    detailsLabel: "What's incorrect? — required for this reason",
    hint: 'Moderators need specifics for this one — submit unlocks when a note is added.',
  },
];

const GAME_REASONS: ReasonOption[] = [
  {
    reason: 'duplicate',
    label: 'Duplicate',
    selectedSuffix: '— already in the catalog',
    requiresDetails: false,
    hint: 'Duplicate needs no note — moderators merge it into the original entry.',
  },
  {
    reason: 'incorrect_info',
    label: 'Incorrect info',
    requiresDetails: true,
    detailsLabel: "What's incorrect? — required for this reason",
    hint: 'Moderators need specifics for this one — submit unlocks when a note is added.',
  },
];

const USER_REASONS: ReasonOption[] = [
  { reason: 'abusive_profile', label: 'Abusive profile', requiresDetails: false, hint: 'Pick a reason to continue — submit unlocks once a reason is chosen.' },
  {
    reason: 'impersonation',
    label: 'Impersonation',
    requiresDetails: true,
    detailsLabel: 'Who are they impersonating? — required for this reason',
    hint: 'Moderators need specifics for this one — submit unlocks when a note is added.',
  },
  { reason: 'spam', label: 'Spam', requiresDetails: false, hint: 'Pick a reason to continue — submit unlocks once a reason is chosen.' },
];

export function reasonsFor(type: ReportTargetType): ReasonOption[] {
  return type === 'card' ? CARD_REASONS : type === 'game' ? GAME_REASONS : USER_REASONS;
}

// The drawer header ("REPORT THIS CARD — PICK A REASON") + the return-link label, per target.
export function reportHeader(type: ReportTargetType): string {
  return type === 'card' ? 'Report this card' : type === 'game' ? 'Report this entry' : 'Report this user';
}
