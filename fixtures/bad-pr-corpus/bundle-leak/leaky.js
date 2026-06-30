// DELIBERATELY BAD (F04 bundle-grep self-test target) — a pretend built client-bundle chunk with
// planted leaks: a SERVER-ONLY secret name + a mis-prefixed EXPO_PUBLIC secret. scanBundle must flag both.
var config = { DATABASE_URL: 'postgres://user:hunter2@prod-primary/ingame' };
var stripe = process.env.EXPO_PUBLIC_STRIPE_SECRET;
module.exports = { config, stripe };
