import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { SelfProfile, GenresResponse, Platform, PatchMeRequest, CreateGamertagRequest, AvatarConfig } from '@ingame/shared';
import { BIO_MAX } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { Avatar } from '../Avatar';
import { MonogramForge } from './MonogramForge';
import { TextField } from '../TextField';
import { ScreenButton } from '../ScreenButton';

// EditableIdentity (W-C4 · profile-states Edit-mode artboard) — the IN-PLACE identity editor (OQ-034:
// per-field commit, no giant save). Store-free + callback-driven (the AdoptCardSheet/ReportSheet
// pattern) so it unit-tests without a store. Editable: avatar (the W-4 Monogram Forge — bg/ink/glyph/
// frame, D-2: the beta avatar; the full DESIGNER stays product-spec PROF-08 §10) · username (PROF-06
// cooldown + MOD-07 screening 422) · bio (140 counter) · genres (controlled list) · gamertags
// (add/remove, PROF-02). Privacy rides Settings (D-3), not here.
//
// walk-4 P3-a — with the forge open THIS avatar is the forge's live preview (the forge draws no head
// of its own any more): it wears the in-progress config until the forge closes, then falls back to
// server truth. walk-4 P3-c — the USERNAME is the ONE field that opts OUT of the per-field autosave:
// it takes a deliberate SAVE (owner ruling — an accidental blur used to burn the PROF-06 30-day
// rename cooldown). Every other field keeps the OQ-034 commit-as-you-go grammar.

// A field commit resolves ok, or fails with per-field messages (the VALIDATION_ERROR `details` map by
// path) and/or a generic message.
export type SaveOutcome =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string>; message?: string };

const PLATFORMS: { platform: Platform; label: string }[] = [
  { platform: 'pc', label: 'PC' },
  { platform: 'playstation', label: 'PSN' },
  { platform: 'xbox', label: 'XBOX' },
  { platform: 'nintendo', label: 'SWITCH' },
];

export function EditableIdentity({
  me,
  genres,
  onPatchMe,
  onAddGamertag,
  onRemoveGamertag,
}: {
  me: SelfProfile;
  genres: GenresResponse | undefined;
  onPatchMe: (patch: PatchMeRequest) => Promise<SaveOutcome>;
  onAddGamertag: (req: CreateGamertagRequest) => Promise<SaveOutcome>;
  onRemoveGamertag: (id: string) => Promise<void>;
}) {
  const styles = useStyles();
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio ?? '');
  const [usernameErr, setUsernameErr] = useState<string | null>(null);
  const [bioErr, setBioErr] = useState<string | null>(null);
  // P3-c — the deliberate-save state machine for the username alone: `saving` while the PATCH is in
  // flight, `savedName` = the last name we successfully committed (so the confirm row retires the
  // instant the save lands, without waiting on the /me re-read).
  const [savingUsername, setSavingUsername] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);
  // D-2 — the ✎ opens the W-4 Monogram Forge inline (replacing the deferred "designer coming" note).
  const [forgeOpen, setForgeOpen] = useState(false);
  // P3-a — the forge's in-progress config; the identity avatar below wears it while the forge is open.
  const [preview, setPreview] = useState<AvatarConfig | null>(null);

  // gamertag-add draft
  const [gtPlatform, setGtPlatform] = useState<Platform>('pc');
  const [gtHandle, setGtHandle] = useState('');
  const [gtErr, setGtErr] = useState<string | null>(null);

  // PROF-06 — username change cooldown (usernameNextChangeAt is a future ISO date, or null = allowed now).
  const cooldownActive = me.usernameNextChangeAt != null && new Date(me.usernameNextChangeAt) > new Date();

  // P3-c — the username's display states. DIRTY (any unsaved divergence from the served name, an
  // emptied field included — so CANCEL is always reachable) raises the confirm row; a name we just
  // saved is NOT dirty even if the /me cache hasn't caught up yet. SAVEABLE additionally requires a
  // non-empty draft: a blank name gets a greyed SAVE beside a live CANCEL, never a dead end.
  const usernameDraft = username.trim();
  const usernameDirty = usernameDraft !== me.username && usernameDraft !== savedName;
  const usernameSaveable = usernameDirty && usernameDraft.length > 0;
  const usernameJustSaved = savedName != null && usernameDraft === savedName;

  // P3-c — the ONLY path that renames: an explicit SAVE press. Never a blur.
  async function commitUsername() {
    const next = username.trim();
    if (!usernameSaveable || savingUsername) return; // nothing to save / already in flight
    setUsernameErr(null);
    setSavingUsername(true);
    try {
      const r = await onPatchMe({ username: next });
      if (r.ok) setSavedName(next);
      else setUsernameErr(r.fieldErrors?.username ?? r.message ?? 'Couldn’t save your username.');
    } finally {
      setSavingUsername(false);
    }
  }

  // P3-c — discard the edit and put the served name back (the accident's escape hatch).
  function cancelUsername() {
    setUsername(me.username);
    setUsernameErr(null);
  }

  async function commitBio() {
    if (bio === (me.bio ?? '')) return;
    setBioErr(null);
    const r = await onPatchMe({ bio });
    if (!r.ok) setBioErr(r.fieldErrors?.bio ?? r.message ?? 'Couldn’t save your bio.');
  }

  async function toggleGenre(id: string) {
    const has = me.favouriteGenreIds.includes(id);
    const next = has ? me.favouriteGenreIds.filter((g) => g !== id) : [...me.favouriteGenreIds, id];
    await onPatchMe({ favouriteGenreIds: next });
  }

  async function addGamertag() {
    const handle = gtHandle.trim();
    if (handle.length === 0) return;
    setGtErr(null);
    const r = await onAddGamertag({ platform: gtPlatform, handle });
    if (r.ok) setGtHandle('');
    else setGtErr(r.fieldErrors?.handle ?? r.message ?? 'Couldn’t add that gamertag.');
  }

  return (
    <View style={styles.well}>
      {/* avatar — the PROF-08 monogram + the ✎ opens the W-4 Monogram Forge inline (D-2: the beta avatar
          editor; the full flatten-pipeline DESIGNER stays product-spec PROF-08 §10). */}
      <View style={styles.avatarRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit avatar"
          accessibilityState={{ expanded: forgeOpen }}
          onPress={() => {
            // P3-a — closing drops the preview so the avatar snaps back to server truth.
            setForgeOpen((v) => !v);
            setPreview(null);
          }}
          style={styles.avatarPress}
        >
          {/* P3-a — THE preview. While the forge is open this wears its in-progress config (and
              deliberately ignores `avatarUrl`: the forge edits the MONOGRAM, so the monogram is what
              must react). Closed, it's plain server truth. */}
          <Avatar
            username={me.username}
            avatarUrl={forgeOpen ? null : me.avatarUrl}
            avatarConfig={forgeOpen ? (preview ?? me.avatarConfig) : me.avatarConfig}
            size={64}
          />
          <View style={styles.cbadge}>
            <Text style={styles.cbadgeGlyph}>✎</Text>
          </View>
        </Pressable>
        <View style={styles.avatarMeta}>
          <Text style={styles.editHint}>YOUR MONOGRAM</Text>
          <Text style={styles.avatarNote}>{forgeOpen ? 'Your edits preview here — tap the pencil when you’re done.' : 'Tap the pencil to forge your colours, letters and frame.'}</Text>
        </View>
      </View>

      {forgeOpen ? (
        <MonogramForge
          username={me.username}
          config={me.avatarConfig}
          onCommit={(avatarConfig) => onPatchMe({ avatarConfig })}
          onPreview={setPreview}
        />
      ) : null}

      {/* username — PROF-06 cooldown-gated + MOD-07 screening (server 422 → inline). N-A1 — the field +
          its microcopy are ONE section (usernameSection) so the note hugs the field (tight internal gap,
          decoupled from the larger inter-section gap) instead of floating a full section-gap below it. */}
      <View style={styles.usernameSection}>
        <TextField
          label="Username"
          value={username}
          onChangeText={(v) => {
            setUsername(v);
            setUsernameErr(null); // typing retires the last rejection (P3-c)
          }}
          // P3-c — NO onBlur commit. Tapping away is not consent to spend the 30-day cooldown.
          editable={!cooldownActive && !savingUsername}
          autoCapitalize="none"
          error={usernameErr}
        />
        {/* P3-c — the deliberate-save confirm row, raised only by a real unsaved change. It hugs the
            field by reclaiming the TextField's reserved error-slot slack (the N-A4 grammar), so the
            slot still holds a shown error without reflowing the section. */}
        {usernameDirty && !cooldownActive ? (
          <View style={styles.usernameConfirm}>
            <ScreenButton
              label={savingUsername ? 'Saving…' : 'Save username'}
              accessibilityLabel="Save username"
              variant="primary"
              onPress={() => void commitUsername()}
              disabled={savingUsername || !usernameSaveable}
              style={styles.usernameKey}
            />
            <ScreenButton
              label="Cancel"
              accessibilityLabel="Cancel username change"
              variant="secondary"
              onPress={cancelUsername}
              disabled={savingUsername}
              style={styles.usernameKey}
            />
          </View>
        ) : null}
        {cooldownActive ? (
          // N-A1 — the PROF-06 time-gate wears the screen ACCENT (orange) for salience.
          <Text style={[styles.usernameNote, styles.usernameNoteGate]}>
            NEXT CHANGE {formatWhen(me.usernameNextChangeAt)} · ONCE / 30 DAYS
          </Text>
        ) : usernameDirty ? (
          // P3-c — name the STAKE at the moment of the change, not in the abstract. This branch always
          // sits UNDER the confirm row (dirty ⇒ not cooled down), so it drops the note's negative top
          // — that slack belongs to the row now, and re-taking it would ride up into the keys.
          <Text style={[styles.usernameNote, styles.usernameNoteGate, styles.usernameNoteUnderKeys]}>
            TAP SAVE TO CONFIRM · ONCE / 30 DAYS
          </Text>
        ) : usernameJustSaved ? (
          <Text style={[styles.usernameNote, styles.usernameNoteOk]}>✓ USERNAME SAVED</Text>
        ) : (
          <Text style={styles.usernameNote}>A–Z, 0–9, _ · CHANGES NEED A DELIBERATE SAVE</Text>
        )}
      </View>

      {/* bio — 140-char counter, screened */}
      <TextField
        label="Bio"
        value={bio}
        onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
        onBlur={commitBio}
        multiline
        autoCapitalize="sentences"
        error={bioErr}
        labelRight={<Text style={styles.counter}>{bio.length}/{BIO_MAX}</Text>}
      />

      {/* genres — the controlled CAT-04 list; a tap toggles + commits the full array */}
      <View style={styles.field}>
        <Text style={styles.flabel}>FAVOURITE GENRES</Text>
        {genres && genres.items.length > 0 ? (
          <View style={styles.chips}>
            {genres.items.map((g) => {
              const on = me.favouriteGenreIds.includes(g.id);
              return (
                <Pressable
                  key={g.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${g.name}${on ? ' (selected)' : ''}`}
                  onPress={() => void toggleGenre(g.id)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{g.name.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.microcopy}>Genres load from the catalog.</Text>
        )}
      </View>

      {/* gamertags — remove (✕ per chip) + add (platform + handle) */}
      <View style={styles.field}>
        <Text style={styles.flabel}>GAMERTAGS</Text>
        {me.gamertags.length > 0 ? (
          <View style={styles.chips}>
            {me.gamertags.map((gt) => (
              <View key={gt.id} style={styles.gtChip}>
                <Text style={styles.gtPlatform}>{PLATFORMS.find((p) => p.platform === gt.platform)?.label ?? gt.platform.toUpperCase()}</Text>
                <Text style={styles.gtHandle}>{gt.handle}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${gt.handle}`}
                  onPress={() => void onRemoveGamertag(gt.id)}
                  hitSlop={8}
                >
                  <Text style={styles.gtRemove}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.gtAddRow}>
          <View style={styles.platformPicker}>
            {PLATFORMS.map((p) => (
              <Pressable
                key={p.platform}
                accessibilityRole="button"
                accessibilityState={{ selected: gtPlatform === p.platform }}
                accessibilityLabel={p.label}
                onPress={() => setGtPlatform(p.platform)}
                style={[styles.platformKey, gtPlatform === p.platform && styles.platformKeyOn]}
              >
                <Text style={[styles.platformText, gtPlatform === p.platform && styles.platformTextOn]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <TextField
          label="Add a gamertag"
          value={gtHandle}
          onChangeText={setGtHandle}
          placeholder="Your handle"
          autoCapitalize="none"
          error={gtErr}
        />
        {/* N3 (owner) — the add-gamertag key is ORANGE /primary (0069 prominent non-acquisitive: an add
            action, not the cream secondary voice). N-A4 — the key hugs the handle field: pull it up to
            reclaim the TextField's reserved error-slot slack so it reads as belonging to that input. */}
        <ScreenButton
          label="Add gamertag"
          variant="primary"
          onPress={() => void addGamertag()}
          disabled={gtHandle.trim().length === 0}
          block
          style={styles.gtAddButton}
        />
      </View>
    </View>
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return 'NOW';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
}

const useStyles = themedStyles((t) => {
  // N-A3 — ONE inter-section gap, applied uniformly by the `well` between EVERY editor section
  // (avatar · username · bio · genres · gamertags). No per-section drift; the comfortable/larger rung.
  const sectionGap = t.space.xl;
  return {
  well: { backgroundColor: t.scr.panel, padding: t.space.lg, gap: sectionGap },
  // N-A1 — the username field + its microcopy live in one section with a TIGHT internal gap, so the
  // note reads as attached to the field (decoupled from the larger `sectionGap` between sections).
  usernameSection: { gap: t.space.xs },
  // the username microcopy — a negative top pulls it up into the TextField's always-reserved error
  // slot so it hugs the field instead of floating a full slot+gap below it.
  usernameNote: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 0.5,
    lineHeight: 13,
    marginTop: -t.space.sm,
  },
  // N-A1 — the PROF-06 time-gate note recolours to the screen ACCENT (orange) for salience.
  usernameNoteGate: { color: t.scr.accent },
  // P3-c — the settled confirmation (the one green note in the editor; the house success token).
  usernameNoteOk: { color: t.brand.success },
  // P3-c — the SAVE/CANCEL pair. Same negative top as the note (N-A4): reclaim the TextField's
  // reserved error slot so the row reads as belonging to the field it saves.
  usernameConfirm: { flexDirection: 'row', gap: t.space.sm, marginTop: -t.space.sm },
  usernameKey: { flex: 1 },
  usernameNoteUnderKeys: { marginTop: 0 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  avatarPress: { position: 'relative' },
  // the ✎ corner badge (board `.cbadge` — punched-out ring, method A)
  cbadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    backgroundColor: t.scr.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: t.scr.panel,
  },
  cbadgeGlyph: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accentInk },
  avatarMeta: { flex: 1, gap: t.space.xs },
  editHint: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  avatarNote: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, lineHeight: 13 },
  microcopy: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, lineHeight: 13, marginTop: -t.space.sm },
  counter: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  field: { gap: t.space.sm },
  flabel: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  chip: { paddingHorizontal: t.space.md, paddingVertical: t.space.sm, backgroundColor: t.scr.panelHi, borderWidth: 1, borderColor: t.scr.hairline },
  chipOn: { borderColor: t.scr.accent, backgroundColor: t.scr.panelHi },
  chipText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  chipTextOn: { color: t.scr.accent },
  gtChip: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, backgroundColor: t.scr.panelHi, paddingHorizontal: t.space.md, paddingVertical: 4 },
  gtPlatform: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.5 },
  gtHandle: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  gtRemove: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.faint },
  gtAddRow: { marginTop: t.space.xs },
  platformPicker: { flexDirection: 'row', gap: t.space.sm },
  platformKey: { flex: 1, alignItems: 'center', paddingVertical: t.space.sm, backgroundColor: t.scr.panelHi, borderWidth: 1, borderColor: t.scr.hairline },
  platformKeyOn: { borderColor: t.scr.accent },
  platformText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  platformTextOn: { color: t.scr.accent },
  // N-A4 — the add key hugs the handle field: reclaim the TextField's reserved error-slot slack (the
  // slot stays reserved, so a shown error never reflows) so the key reads as part of the input.
  gtAddButton: { marginTop: -t.space.md },
  };
});
