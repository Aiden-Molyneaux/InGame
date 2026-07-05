import { LegalScreen } from '../../src/components/LegalScreen';

// OQ-119 — placeholder Terms of Service target for the AUTH-10 acceptance links. Real copy is a
// release task (road-to-market §10). The 13+ minimum age lives here (AUTH-10 — not separately collected).
export default function Terms() {
  return (
    <LegalScreen
      title="Terms of Service"
      paragraphs={[
        'You must be 13 years of age or older to create an account and use InGame.',
        'InGame lets you build, customize, and share a personal game collection. You are responsible for the content you contribute to the community catalog and for keeping your account credentials secure.',
        'This is placeholder text. The complete Terms of Service — covering acceptable use, community contributions, the cosmetic economy, and account termination — is published on a hosted domain before public launch.',
      ]}
    />
  );
}
