import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { SelfProfile, GenresResponse, Platform, PatchMeRequest, CreateGamertagRequest } from '@ingame/shared';
import { BIO_MAX } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { Avatar } from '../Avatar';
import { TextField } from '../TextField';
import { ScreenButton } from '../ScreenButton';

// EditableIdentity (W-C4 · profile-states Edit-mode artboard) — the IN-PLACE identity editor (OQ-034:
// per-field commit, no giant save). Store-free + callback-driven (the AdoptCardSheet/ReportSheet
// pattern) so it unit-tests without a store. Editable: avatar (monogram + deferred designer note,
// D-2) · username (PROF-06 cooldown + MOD-07 screening 422) · bio (140 counter) · genres (controlled
// list) · gamertags (add/remove, PROF-02). Privacy rides Settings (D-3), not here.

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
  onOpenAvatar,
}: {
  me: SelfProfile;
  genres: GenresResponse | undefined;
  onPatchMe: (patch: PatchMeRequest) => Promise<SaveOutcome>;
  onAddGamertag: (req: CreateGamertagRequest) => Promise<SaveOutcome>;
  onRemoveGamertag: (id: string) => Promise<void>;
  /** D-2 — the avatar composition editor is a future packet; the ✎ badge surfaces the note. */
  onOpenAvatar?: () => void;
}) {
  const styles = useStyles();
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio ?? '');
  const [usernameErr, setUsernameErr] = useState<string | null>(null);
  const [bioErr, setBioErr] = useState<string | null>(null);
  const [avatarNote, setAvatarNote] = useState(false);

  // gamertag-add draft
  const [gtPlatform, setGtPlatform] = useState<Platform>('pc');
  const [gtHandle, setGtHandle] = useState('');
  const [gtErr, setGtErr] = useState<string | null>(null);

  // PROF-06 — username change cooldown (usernameNextChangeAt is a future ISO date, or null = allowed now).
  const cooldownActive = me.usernameNextChangeAt != null && new Date(me.usernameNextChangeAt) > new Date();

  async function commitUsername() {
    const next = username.trim();
    if (next === me.username || next.length === 0) return; // nothing to save
    setUsernameErr(null);
    const r = await onPatchMe({ username: next });
    if (!r.ok) setUsernameErr(r.fieldErrors?.username ?? r.message ?? 'Couldn’t save your username.');
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
      {/* avatar — the PROF-08 monogram + the ✎ "designer coming" affordance (D-2, no server call) */}
      <View style={styles.avatarRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit avatar"
          onPress={() => {
            setAvatarNote(true);
            onOpenAvatar?.();
          }}
          style={styles.avatarPress}
        >
          <Avatar username={me.username} avatarUrl={me.avatarUrl} size={64} />
          <View style={styles.cbadge}>
            <Text style={styles.cbadgeGlyph}>✎</Text>
          </View>
        </Pressable>
        <View style={styles.avatarMeta}>
          <Text style={styles.editHint}>YOUR AVATAR IS A DESIGN (PROF-08)</Text>
          {avatarNote ? (
            <Text style={styles.avatarNote}>The avatar designer is coming — for now you wear the monogram.</Text>
          ) : null}
        </View>
      </View>

      {/* username — PROF-06 cooldown-gated + MOD-07 screening (server 422 → inline). N-A1 — the field +
          its microcopy are ONE section (usernameSection) so the note hugs the field (tight internal gap,
          decoupled from the larger inter-section gap) instead of floating a full section-gap below it. */}
      <View style={styles.usernameSection}>
        <TextField
          label="Username"
          value={username}
          onChangeText={setUsername}
          onBlur={commitUsername}
          editable={!cooldownActive}
          autoCapitalize="none"
          error={usernameErr}
        />
        {cooldownActive ? (
          // N-A1 — the PROF-06 time-gate wears the screen ACCENT (orange) for salience.
          <Text style={[styles.usernameNote, styles.usernameNoteGate]}>
            NEXT CHANGE {formatWhen(me.usernameNextChangeAt)} · ONCE / 30 DAYS (PROF-06)
          </Text>
        ) : (
          <Text style={styles.usernameNote}>SCREENED (MOD-07) · A–Z, 0–9, _ · SAVES WHEN YOU TAP AWAY</Text>
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
