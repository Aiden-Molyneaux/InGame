import rule01 from './rules/rule-01-layering.mjs';
import rule02 from './rules/rule-02-scoping.mjs';
import rule03 from './rules/rule-03-zod.mjs';
import rule04 from './rules/rule-04-authz.mjs';
import rule05 from './rules/rule-05-events.mjs';
import rule06 from './rules/rule-06-spec-ids.mjs';
import rule08 from './rules/rule-08-deps.mjs';
import ruleF03 from './rules/rule-f03-destructive-guard.mjs';
import ruleThemeTokens from './rules/rule-theme-tokens.mjs';

// The ordered set of custom CONVENTIONS [LINT] mechanisms. Each ships with a deliberately-bad
// fixture under fixtures/bad-pr-corpus/<rule.id>/ and is asserted by the F22 corpus meta-test.
export const rules = [rule01, rule02, rule03, rule04, rule05, rule06, rule08, ruleF03, ruleThemeTokens];
