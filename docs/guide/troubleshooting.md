---
description: Diagnose inactive rules, missing automatic fixes, parser errors, and conflicts with other tools.
---

# Troubleshooting

Start with the configuration ESLint actually applies to the affected file:

```shell
pnpm exec eslint --print-config src/App.vue
pnpm exec eslint src/App.vue
```

Replace the path with a real file in your project. Check that the rule is enabled,
the intended options are present, and the file uses the expected parser.

## Why does an enabled rule report nothing?

Check these conditions in order:

1. **File selection:** the config's `files` pattern matches the file and no ignore
   excludes it. A config for `**/*.vue` does not enable checks in composable `.ts` files.
2. **Parser:** `.vue` files use `vue-eslint-parser` as the outer parser. TypeScript
   scripts use `@typescript-eslint/parser` through `parserOptions.parser`.
3. **Required options:** component contract rules need `targets`, and
   `no-restricted-html-elements` needs `elements`. Their empty defaults check nothing.
4. **API recognition:** import Vue APIs explicitly, or opt into
   `settings['vue-perfectionist'].autoImport`. Declaring ESLint globals alone is
   insufficient. Local shadowing and unsupported import forms can prevent a match.
5. **Scope:** setup-only rules need `<script setup>`; template rules need a Vue
   template. Each rule's summary and scope section explain further restrictions.

The plugin has no built-in preset. Installing or registering it does not enable
any rules. Later flat-config entries can also override earlier rule settings.
See [Configuration](/guide/configuration) and the [rules overview](/rules/).

## Why does `--fix` leave a diagnostic?

Fix support applies to specific cases, not every report from a rule.

- Naming and component-contract rules generally need a deliberate manual change.
- `sort-script-setup` reports uncertain runtime reordering without moving code.
- The two `sort-composable-*` rules fix whitespace only, never member order.
- `define-model-name-casing` requires `fix: true`; renaming changes the public
  model contract, so review consuming components too.
- `fix: 'none'` disables all fixes in the sorting rules, including whitespace.

Use the rule's fix section or the [fix summary](/guide/rule-composition#automatic-fixes)
to determine the expected behavior. A report without a fix can be intentional.

## Why are auto-imported APIs skipped?

The shared `autoImport` setting declares the identity of unbound supported APIs;
it does not read generated declaration files or configure ESLint's `no-undef`.
Explicit `vueGlobals: []` disables built-in global recognition for rules that
support that option, even when the shared setting is enabled.

See [auto-import configuration](/guide/configuration#auto-imported-vue-apis) for
per-rule overrides, custom callbacks, aliases, and generated globals.

## When do I need TypeScript type information?

Most rules use syntax and scope analysis. A TypeScript parser is enough for their
TS syntax; enabling `projectService` is not necessary just to use this plugin.

`require-injection-key` with `strict: true` and the composable sorting rules with
`typeInformation: true` require full parser services. Include the linted file in
the selected TS project and configure the parser as shown on those rule pages.
Missing services are configuration errors rather than silent syntax-only fallbacks.

`prefer-use-template-ref-inference` instead relies on your Vue language tooling
to infer types after you remove an explicit generic. Run your project's type
check after making that change.

## Why do fixes and formatting keep undoing each other?

Check whether another rule or formatter owns the same layout. Follow
[Rule Composition](/guide/rule-composition) for overlapping sorting and padding
rules. Align newline preferences with your formatter; for example, Oxfmt
collapses blank-line counts greater than one in composable member lists.

Run lint, format, then lint again on the affected file. If the report returns,
adjust the conflicting preferences rather than repeatedly applying both fixes.

## Still unexpected?

Include the smallest reproducing `.vue` or script file, the effective rule
options, installed plugin/parser/ESLint versions, and the expected and actual
diagnostics in a [GitHub issue](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/issues).
