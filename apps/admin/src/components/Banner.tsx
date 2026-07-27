import type { ReactNode } from 'react';

interface BannerProps {
  kind: 'error' | 'warn' | 'ok';
  children: ReactNode;
}

/** The console's one message surface. `role="alert"` so a failure is announced, not just coloured. */
export function Banner({ kind, children }: BannerProps) {
  return (
    <div className={kind} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
