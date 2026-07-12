import { useRef, useState, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { CollectionItem, CollectionStatus, UpdateCollectionEntryRequest } from '@ingame/shared';
import { GenreTag } from '../GenreTag';
import { TextField } from '../TextField';
import { ScreenButton } from '../ScreenButton';
import { OWNED_STATUSES, STATUS_LABEL } from '../../constants/collection';
import { useUpdateEntryMutation } from '../../store/api';
import { themedStyles } from '../../theme';

// PlayDossier (component-map §9 `PlayStats`) — the "YOUR PLAY" readout with PER-STAT INLINE editing
// (owner gate-5 B.8: every stat displays here and edits individually IN PLACE — the whole-form flip
// is retired; opening one stat's editor must not shift the others). Each save PATCHes just that
// field. NOTES reads back + pre-fills (OQ-134, api 0.53). Still surfaced-not-faked: PLATFORMS is
// EXPECTED(COL-04 · decision 0058 §7); RATING stays PENDING (OQ-058).

type EditableField = 'hours' | 'percent' | 'status' | 'ownedSince' | 'notes';

const FIELD_LABEL: Record<EditableField, string> = {
  hours: 'HOURS',
  percent: 'COMPLETION',
  status: 'STATUS',
  ownedSince: 'OWNED SINCE',
  notes: 'NOTES',
};

function PendingRating() {
  const styles = useStyles();
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.stars}>★★★★★</Text>
      <Text style={styles.pending}>PENDING</Text>
    </View>
  );
}

export function PlayDossier({ entry }: { entry: CollectionItem }) {
  const styles = useStyles();
  const [updateEntry, saveState] = useUpdateEntryMutation();
  const [open, setOpen] = useState<EditableField | null>(null);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<CollectionStatus>(entry.status);
  const [error, setError] = useState<string | null>(null);
  // the status chip's save is fire-and-forget — its callbacks must not close/poison whichever
  // editor happens to be open when the request resolves (murr, gate-5 round 2)
  const openRef = useRef<EditableField | null>(null);
  openRef.current = open;

  function beginEdit(f: EditableField) {
    setError(null);
    setOpen(f);
    setStatus(entry.status);
    setValue(
      f === 'hours'
        ? String(entry.hours)
        : f === 'percent'
          ? (entry.percentComplete == null ? '' : String(entry.percentComplete))
          : f === 'ownedSince'
            ? (entry.ownedSince ?? '')
            : f === 'notes'
              ? (entry.notes ?? '')
              : '',
    );
  }
  function close() {
    setOpen(null);
    setError(null);
  }
  async function save(f: EditableField) {
    let body: UpdateCollectionEntryRequest;
    if (f === 'hours') {
      body = { hours: Number.parseInt(value, 10) || 0 };
    } else if (f === 'percent') {
      body = { percentComplete: value === '' ? null : Math.max(0, Math.min(100, Number.parseInt(value, 10) || 0)) };
    } else if (f === 'status') {
      body = { status };
    } else if (f === 'ownedSince') {
      const since = value.trim();
      // client-guard the one field the server rejects hard (isoDateSchema)
      if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
        setError('Must be a date — YYYY-MM-DD (e.g. 2022-02-25).');
        return;
      }
      if (!since) {
        close(); // no clear-to-null path in the contract — an empty edit just closes
        return;
      }
      body = { ownedSince: since };
    } else {
      const notes = value.trim();
      if (!notes) {
        close(); // parity with the old form: notes can't be cleared to empty via PATCH
        return;
      }
      body = { notes };
    }
    try {
      await updateEntry({ entryId: entry.entryId, ...body }).unwrap();
      close();
    } catch (e) {
      const err = (e as { data?: { error?: { message?: string; details?: { message?: string }[] } } })?.data?.error;
      setError(err?.details?.[0]?.message ?? err?.message ?? "Couldn't save — try again.");
    }
  }

  const editor = (f: EditableField, input: ReactNode) => (
    <View style={styles.editor}>
      {input}
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <View style={styles.editorRow}>
        <ScreenButton
          label={saveState.isLoading ? '…' : '✓ Save'}
          variant="primary"
          onPress={() => void save(f)}
          disabled={saveState.isLoading}
          style={styles.editorBtn}
        />
        <ScreenButton label="Cancel" variant="secondary" onPress={close} disabled={saveState.isLoading} style={styles.editorBtn} />
      </View>
    </View>
  );

  return (
    <View>
      <Text style={styles.sectionHead}>YOUR PLAY</Text>
      <View style={styles.dossier}>
        <Row
          label={FIELD_LABEL.hours}
          editing={open === 'hours'}
          onEdit={() => beginEdit('hours')}
          editor={editor(
            'hours',
            <TextField
              label="Hours"
              value={value}
              onChangeText={(v) => setValue(v.replace(/[^0-9]/g, '').slice(0, 5))}
              keyboardType="number-pad"
              placeholder="0"
            />,
          )}
        >
          <Text style={styles.val}>{entry.hours} HRS</Text>
        </Row>
        <Row
          label={FIELD_LABEL.percent}
          editing={open === 'percent'}
          onEdit={() => beginEdit('percent')}
          editor={editor(
            'percent',
            <TextField
              label="Completion %"
              value={value}
              onChangeText={(v) => setValue(v.replace(/[^0-9]/g, '').slice(0, 3))}
              keyboardType="number-pad"
              placeholder="0"
            />,
          )}
        >
          <Text style={styles.val}>{entry.percentComplete == null ? '—' : `${entry.percentComplete}%`}</Text>
        </Row>
        <Row
          label={FIELD_LABEL.status}
          editing={open === 'status'}
          onEdit={() => beginEdit('status')}
          editor={
            <View style={styles.editor}>
              {/* OWNED_STATUSES omits WISHLIST — the owned-entry editor never offers it (OQ-070 · 0025).
                  A status chip SAVES on tap — no confirm step needed for a single pick. */}
              <View style={styles.chipRow}>
                {OWNED_STATUSES.map((s) => (
                  <GenreTag
                    key={s}
                    label={STATUS_LABEL[s]}
                    selected={status === s}
                    onPress={() => {
                      setStatus(s);
                      void updateEntry({ entryId: entry.entryId, status: s })
                        .unwrap()
                        .then(() => {
                          if (openRef.current === 'status') close();
                        })
                        .catch(() => {
                          if (openRef.current === 'status') setError("Couldn't save — try again.");
                        });
                    }}
                  />
                ))}
              </View>
              {error ? <Text style={styles.err}>{error}</Text> : null}
              <View style={styles.editorRow}>
                <ScreenButton label="Cancel" variant="secondary" onPress={close} style={styles.editorBtn} />
              </View>
            </View>
          }
        >
          <Text style={styles.val}>{STATUS_LABEL[entry.status]}</Text>
        </Row>
        <Row
          label={FIELD_LABEL.ownedSince}
          editing={open === 'ownedSince'}
          onEdit={() => beginEdit('ownedSince')}
          editor={editor(
            'ownedSince',
            <TextField label="Owned since" value={value} onChangeText={setValue} placeholder="YYYY-MM-DD" />,
          )}
        >
          <Text style={styles.val}>{entry.ownedSince ?? '—'}</Text>
        </Row>
        <Row label="PLATFORMS">
          <Text style={styles.deferVal}>—</Text>
        </Row>
        <Row label="RATING">
          <PendingRating />
        </Row>
        <Row
          label={FIELD_LABEL.notes}
          editing={open === 'notes'}
          onEdit={() => beginEdit('notes')}
          editor={editor(
            'notes',
            <TextField
              label="Notes"
              value={value}
              onChangeText={setValue}
              autoCapitalize="sentences"
              placeholder="Add a note"
            />,
          )}
        >
          {entry.notes ? (
            <Text style={styles.notesVal}>“{entry.notes}”</Text>
          ) : (
            <Text style={styles.deferVal}>—</Text>
          )}
        </Row>
      </View>
      <Text style={styles.caption}>
        Tap ✎ to edit a stat in place. Platforms surface once their data ships; rating is pending.
      </Text>
    </View>
  );
}

function Row({
  label,
  children,
  editing = false,
  onEdit,
  editor,
}: {
  label: string;
  children: ReactNode;
  /** Present on editable rows — renders the ✎ affordance + the inline editor when open. */
  editing?: boolean;
  onEdit?: () => void;
  editor?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.rowWrap}>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowValue}>{children}</View>
        {onEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${label.toLowerCase()}`}
            onPress={editing ? undefined : onEdit}
            hitSlop={8}
          >
            <Text style={[styles.pencil, editing && styles.pencilOn]}>✎</Text>
          </Pressable>
        ) : null}
      </View>
      {editing ? editor : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  sectionHead: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 2,
    marginBottom: t.space.md,
  },
  dossier: { borderWidth: 1, borderColor: t.scr.hairline, gap: 1, backgroundColor: t.scr.hairline },
  rowWrap: { backgroundColor: t.scr.panel },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
  },
  rowLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  rowValue: { flex: 1, alignItems: 'flex-end' },
  val: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink },
  deferVal: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.faint },
  pencil: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim },
  pencilOn: { color: t.scr.accent },
  notesVal: {
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11 (F-06) — the board's notes row reads at body
    color: t.scr.dim,
    lineHeight: 16,
    textAlign: 'right',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  stars: { fontSize: t.type.body, color: t.scr.faint, letterSpacing: 1 },
  pending: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },
  caption: {
    fontFamily: t.font.screen,
    fontSize: t.type.micro,
    color: t.scr.faint,
    lineHeight: 15,
    marginTop: t.space.md,
  },
  editor: { paddingHorizontal: t.space.lg, paddingBottom: t.space.md, gap: t.space.md },
  editorRow: { flexDirection: 'row', gap: t.space.md },
  editorBtn: { flex: 1, paddingVertical: t.space.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  err: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.brand.alert },
}));
