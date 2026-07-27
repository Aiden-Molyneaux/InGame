import type { ReactNode } from 'react';
import type { SelfProfile } from '@ingame/shared';
import { tierLabel } from '../api/session';

// The console shell. The rail shows the RULED ARCHITECTURE, not just today's screens: ONE console,
// three tier-gated sections — Ops (live now), Moderation (M7), Operator (later, behind a sudo
// re-auth gate). The two future sections are rendered greyed and inert on purpose: the shape of the
// tool should be legible in the tool, so nobody later mistakes "the console" for "the ops dashboard"
// and builds a second surface.

export type OpsView = 'stats' | 'reports' | 'spotlight';

const OPS_VIEWS: Array<{ id: OpsView; label: string; tier: string }> = [
  { id: 'stats', label: 'Stats', tier: 'III' },
  { id: 'reports', label: 'Reports', tier: 'I' },
  { id: 'spotlight', label: 'Spotlight', tier: 'IV' },
];

interface ShellProps {
  me: SelfProfile;
  view: OpsView;
  onView: (view: OpsView) => void;
  onSignOut: () => void;
  children: ReactNode;
}

export function Shell({ me, view, onView, onSignOut, children }: ShellProps) {
  return (
    <div className="shell">
      <nav className="rail" aria-label="Console sections">
        <div className="brand">
          <b>INGAME</b>
          <span>Admin</span>
        </div>

        <div className="section">
          <div className="section-head">
            <span>Ops</span>
            <span className="tag">live</span>
          </div>
          {OPS_VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="navlink"
              aria-current={view === item.id}
              onClick={() => onView(item.id)}
            >
              {item.label}
              <span className="note"> · {item.tier}</span>
            </button>
          ))}
        </div>

        <div className="section disabled">
          <div className="section-head">
            <span>Moderation</span>
            <span className="tag">M7</span>
          </div>
          <div className="stub">Reports queue verbs</div>
          <div className="stub">Suspend · merge · remediate</div>
        </div>

        <div className="section disabled">
          <div className="section-head">
            <span>Operator</span>
            <span className="tag">later</span>
          </div>
          <div className="stub">Economy adjustments</div>
          <div className="stub">Config · governance</div>
          <div className="stub note">Behind a sudo re-auth gate</div>
        </div>

        <div className="identity">
          <span className="who">{me.username}</span>
          <span className="tier">{tierLabel(me)}</span>
          <button type="button" className="btn mini" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
