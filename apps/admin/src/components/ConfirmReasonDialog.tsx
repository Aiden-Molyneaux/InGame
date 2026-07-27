import { useState } from 'react';

interface ConfirmReasonDialogProps {
  title: string;
  /** What is being acted on — shown verbatim so the operator can check they picked the right row. */
  target: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

// The MOD-08 confirm. The REASON IS REQUIRED and the console enforces it client-side too — not because
// the server won't (takedownCardRequestSchema refuses a blank/whitespace reason, 422) but because the
// reason is the only thing the MOD-10 audit row will carry about WHY a card was pulled, and finding
// out it was blank via a round trip is worse than a disabled button.

export function ConfirmReasonDialog({
  title,
  target,
  body,
  confirmLabel,
  danger,
  pending,
  error,
  onConfirm,
  onCancel,
}: ConfirmReasonDialogProps) {
  const [reason, setReason] = useState('');
  const ready = reason.trim().length > 0;

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog">
        <h2>{title}</h2>
        <p style={{ margin: 0 }}>{body}</p>
        <p className="mono" style={{ margin: 0, color: 'var(--dim)' }}>
          {target}
        </p>
        <div>
          <label htmlFor="confirm-reason">Reason (required — written to the audit log)</label>
          <textarea
            id="confirm-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. DMCA takedown request from the rights holder"
          />
        </div>
        {!ready && <p className="note">A reason is required before this action can run.</p>}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="actions">
          <button type="button" className="btn" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? 'btn danger' : 'btn primary'}
            onClick={() => onConfirm(reason.trim())}
            disabled={!ready || pending}
          >
            {pending ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
