import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CollectionItem, CollectionStatus } from '@ingame/shared';
import { GenreTag } from '../GenreTag';
import { TextField } from '../TextField';
import { OWNED_STATUSES, STATUS_LABEL } from '../../constants/collection';
import { theme } from '../../theme';

// PlayDossier (component-map §9 `PlayStats`) — the "YOUR PLAY" readout that flips to a FORM in EDIT
// (edited in a form, NOT on the card — board M1 readout `:486–491` / M2 form `:557–566`). The
// stats the card back already shows (hours · % · status · since) are edited here; the card back
// reflects the draft live (the screen recomputes it). M4 substrate limits (surfaced, not faked):
// PLATFORMS is EXPECTED(COL-04 · decision 0058 §7 — no platforms table), NOTES is write-only with no
// readback (OQ-134 — the CollectionItem response omits notes), RATING is PENDING (OQ-058).
export interface PlayDraft {
  hours: string;
  percent: string;
  status: CollectionStatus;
  ownedSince: string;
  notes: string;
}

export function draftFromEntry(entry: CollectionItem): PlayDraft {
  return {
    hours: String(entry.hours),
    percent: entry.percentComplete == null ? '' : String(entry.percentComplete),
    status: entry.status,
    ownedSince: entry.ownedSince ?? '',
    notes: '', // OQ-134 — the response carries no notes, so EDIT starts blank (write-only)
  };
}

function PendingRating() {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.stars}>★★★★★</Text>
      <Text style={styles.pending}>PENDING (OQ-058)</Text>
    </View>
  );
}

export function PlayDossier({
  entry,
  editing,
  draft,
  onDraftChange,
}: {
  entry: CollectionItem;
  editing: boolean;
  draft: PlayDraft;
  onDraftChange: (patch: Partial<PlayDraft>) => void;
}) {
  if (!editing) {
    return (
      <View>
        <Text style={styles.sectionHead}>YOUR PLAY</Text>
        <View style={styles.dossier}>
          <Row label="PLATFORMS">
            <Text style={styles.deferVal}>—</Text>
          </Row>
          <Row label="RATING">
            <PendingRating />
          </Row>
          <Row label="NOTES">
            <Text style={styles.deferVal}>—</Text>
          </Row>
        </View>
        <Text style={styles.caption}>
          PLATFORMS (COL-04) &amp; your NOTES (OQ-134) surface once their data ships; RATING is pending
          (OQ-058). Hours · completion · status · owned-since edit in EDIT STATS.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionHead}>EDIT YOUR PLAY — THE FORM</Text>
      <TextField
        label="Hours"
        value={draft.hours}
        onChangeText={(v) => onDraftChange({ hours: v.replace(/[^0-9]/g, '').slice(0, 5) })}
        keyboardType="number-pad"
        placeholder="0"
      />
      <TextField
        label="Completion %"
        value={draft.percent}
        onChangeText={(v) => onDraftChange({ percent: v.replace(/[^0-9]/g, '').slice(0, 3) })}
        keyboardType="number-pad"
        placeholder="0"
      />
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>STATUS</Text>
        <View style={styles.chipRow}>
          {/* OWNED_STATUSES omits WISHLIST — the owned-entry editor never offers it (OQ-070 · 0025). */}
          {OWNED_STATUSES.map((s) => (
            <GenreTag
              key={s}
              label={STATUS_LABEL[s]}
              selected={draft.status === s}
              onPress={() => onDraftChange({ status: s })}
            />
          ))}
        </View>
      </View>
      <TextField
        label="Owned since"
        value={draft.ownedSince}
        onChangeText={(v) => onDraftChange({ ownedSince: v })}
        placeholder="YYYY-MM-DD"
      />
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>RATING</Text>
        <PendingRating />
      </View>
      {/* NOTES — write-only at M4 (OQ-134): PATCH accepts it, the response omits it, so it can't
          pre-fill/read back yet. Included so the write path exists; starts blank. */}
      <TextField
        label="Notes"
        value={draft.notes}
        onChangeText={(v) => onDraftChange({ notes: v })}
        autoCapitalize="sentences"
        placeholder="Add a note (saved; readback lands with OQ-134)"
      />
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro,
    color: theme.scr.dim,
    letterSpacing: 2,
    marginBottom: theme.space.md,
  },
  dossier: { borderWidth: 1, borderColor: theme.scr.hairline, gap: 1, backgroundColor: theme.scr.hairline },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    backgroundColor: theme.scr.panel,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
  },
  rowLabel: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  rowValue: { flexShrink: 1, alignItems: 'flex-end' },
  deferVal: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.faint },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  stars: { fontSize: theme.type.body, color: theme.scr.faint, letterSpacing: 1 },
  pending: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.faint, letterSpacing: 0.5 },
  caption: {
    fontFamily: theme.font.screen,
    fontSize: theme.type.micro,
    color: theme.scr.faint,
    lineHeight: 15,
    marginTop: theme.space.md,
  },
  field: { gap: theme.space.xs, marginBottom: theme.space.md },
  fieldLabel: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
});
