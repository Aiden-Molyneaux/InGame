import { LegalScreen } from '../../src/components/LegalScreen';

// OQ-119 — placeholder Privacy Policy target for the AUTH-10 acceptance links. Real copy is a release
// task (road-to-market §10).
export default function Privacy() {
  return (
    <LegalScreen
      title="Privacy Policy"
      paragraphs={[
        'InGame collects the minimum data needed to run your account: your email, username, and the game collection you build. InGame does not collect a birth date.',
        'Your collection visibility is yours to control in your profile settings. Community contributions to the game catalog are attributed to your username.',
        'This is placeholder text. The complete Privacy Policy — covering data storage, retention, third-party services, and your deletion rights — is published on a hosted domain before public launch.',
      ]}
    />
  );
}
