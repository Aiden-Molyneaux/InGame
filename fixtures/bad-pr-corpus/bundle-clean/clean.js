// A CLEAN pretend bundle chunk — only intentional-public keys (allow-listed by name). The
// REVENUECAT_PUBLIC_KEY matches the *_KEY pattern but is on the allow-list, so it must NOT be flagged.
var apiBase = 'EXPO_PUBLIC_API_BASE_URL';
var sentry = process.env.EXPO_PUBLIC_SENTRY_DSN;
var rc = 'EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY';
module.exports = { apiBase, sentry, rc };
