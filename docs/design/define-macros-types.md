# Macro Type Rules Design

Status: implemented. This document records the design and behavior contract.
See [define-macros-type-style](../rules/define-macros-type-style.md) and
[require-macro-type-name](../rules/require-macro-type-name.md) for usage,
configuration, and live diagnostic examples.

## Motivation and rule split

Component contracts need two independent controls: where a macro's type
argument is declared, and what that type is called at the call site.

| Rule                                         | Responsibility                                     | Default when enabled                           |
| -------------------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| `vue-perfectionist/define-macros-type-style` | Require inline, local, or imported types           | Local declarations for props, emits, and slots |
| `vue-perfectionist/require-macro-type-name`  | Require a direct type reference with an exact name | `Props`, `Emits`, and `Slots` respectively     |

Each rule can be enabled independently. The style rule does not require a
particular name; the naming rule does not require a particular source. Both
have `meta.type: 'suggestion'` and `recommended: false`. The plugin continues
to provide no built-in configurations.

Existing upstream rules cover adjacent concerns:

- [`vue/define-props-declaration`](https://eslint.vuejs.org/rules/define-props-declaration)
  selects type-based or runtime props declarations.
- [`vue/define-emits-declaration`](https://eslint.vuejs.org/rules/define-emits-declaration.html)
  selects emits declaration syntax.
- [`vue/require-macro-variable-name`](https://eslint.vuejs.org/rules/require-macro-variable-name.html)
  constrains the variable receiving a macro's result.

The rules inspect explicit type arguments. They do not require a
macro to exist, convert runtime declarations, or require a missing generic.
Use upstream declaration rules when type-based props and emits are mandatory.

## Shared scope

Version one supports `defineProps`, `defineEmits`, and `defineSlots` in Vue
SFC `<script setup>` blocks parsed with `vue-eslint-parser` and a
TypeScript-capable inner parser. It needs no TypeScript project or type checker.

Inspect calls in these positions:

- A top-level variable declarator's initializer, including destructuring.
- A top-level expression statement.
- `defineProps` as the first argument of an unshadowed `withDefaults` in
  either of those positions. Report on the inner type argument exactly once.

Parentheses and transparent TypeScript expression wrappers around the call
are accepted. Do not traverse arbitrary outer calls, conditional expressions,
function bodies, nested blocks, or template expressions to find candidates.

Require a direct, non-optional identifier call to the canonical macro name,
with no local definition. Use the existing `getCallIdentity()` boundary;
parser-provided macro globals with no definitions are accepted. Skip imported
macros, import aliases, namespace/member calls, computed calls, and bindings
that shadow a macro. A local function named `defineProps` is not a compiler
macro for these rules.

Require exactly one explicit type argument and no runtime arguments on the
inner macro. Skip malformed combinations and leave validity to Vue/TypeScript.
Check the complete call range against `getSetupRange()`. Ordinary scripts,
standalone JS/TS, runtime-only calls, and missing SFC parser services are skipped.
In dual-script SFCs, only setup calls are checked, but accessible type
declarations and imports in either script block can establish their source.

`defineModel` is deferred: its value type, modifier type, and multiple named
models need a separate option contract. `defineExpose`, `defineOptions`,
runtime composables, and custom macros are also outside the first version.

Vue documents imported macro types and limits on complex type conversion in
its [script setup reference](https://vuejs.org/api/sfc-script-setup.html#type-only-props-emit-declarations).
Passing either rule does not prove that a type is valid for the Vue
compiler; the rules enforce a source convention.

## `define-macros-type-style`

### Options

Accept one options object. The following is the fully expanded default:

```js
'vue-perfectionist/define-macros-type-style': ['error', {
  macros: {
    defineProps: 'local',
    defineEmits: 'local',
    defineSlots: 'local',
  },
}]
```

Each macro accepts `'inline'`, `'local'`, `'imported'`, a nonempty unique array
of those values, or `false`. An array allows any listed style and replaces
that macro's default. `false` disables checking that macro.

Omitted macro keys retain their defaults; `{}` and `{ macros: {} }` therefore
check all three macros. This is an explicit per-key merge performed by the
rule, independent of ESLint's default-option merging. To check only props,
set both `defineEmits` and `defineSlots` to `false`.

Reject unknown fields at both object levels, unknown macro names, `true`,
`null`, empty arrays, duplicate styles, and arrays containing `false`.
There is no global fallback option, recursive provenance mode, or fix option.

### Classification

Classify the outermost type argument after removing syntactic parentheses.
Nested property types and the arguments of a generic reference do not change
the classification.

| Type argument                                                                                                          | Classification           |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `{ title: string }`, including call-signature members                                                                  | `inline`                 |
| `(event: 'save') => void`                                                                                              | `inline`                 |
| `Props` or `Props<T>` bound to a top-level local `interface` or `type`                                                 | `local`                  |
| `Props` or `Props<T>` bound to a named or default ES import                                                            | `imported`               |
| `Contracts.Props` with `Contracts` bound to an ES namespace import                                                     | `imported`               |
| `import('./types').Props`, including generic arguments                                                                 | `imported`               |
| An unresolved/ambient reference, built-in type reference, SFC generic parameter, or ambiguous binding                  | Unknown source: report   |
| A union, intersection, mapped/conditional/indexed-access type, `typeof`, keyword type, or other unsupported outer form | Unsupported form: report |

`inline` means a direct type literal or function type, not every expression
written between angle brackets. This avoids treating `Props & Extra` as
equivalent to an inline contract or arbitrarily assigning it one source.
An inline literal may still contain imported property types.

Both `import type { Props }` and `import { type Props }` count as imported.
An ordinary `import { Props }` also counts; enforcing type-only import syntax
belongs to another rule. For qualified names, only a namespace import root
is supported. Local namespaces and qualified named/default imports are
unsupported forms. A bare namespace import has unknown source as a contract
type. `TSImportType` requires a qualifier and must not be a `typeof` query.

Resolve references through the type namespace of the call's lexical scope.
Do not scan the file for a matching identifier or rely on the first definition.
Local means an accessible, non-ambient `interface` or `type` at script top
level in this SFC, even if declared after the call or in the ordinary script.
Multiple compatible local interface declarations remain local. Mixed,
unsupported, or ambiguous type definitions produce an unknown-source report;
same-named value bindings must not replace the type binding.

Classification stops at the directly referenced binding. For example,
`type Props = ImportedProps` and `interface Props extends ImportedProps {}`
are local. `type Props = Partial<ImportedProps>` is also local. By contrast,
`defineProps<Partial<ImportedProps>>()` has an unresolved/built-in outer
reference unless `Partial` itself has a supported local or imported binding.
No files are loaded and no alias chains are followed. This is a declaration
style policy, not a restriction on dependencies of the type.

### Examples

The default accepts a separate local declaration regardless of its name:

::: correct

```vue
<script setup lang="ts">
interface ButtonProps {
  title: string
}

const props = defineProps<ButtonProps>()
</script>
```

:::

The default reports an inline contract:

::: incorrect

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>
```

:::

To permit separate declarations in either the SFC or another module:

```js
'vue-perfectionist/define-macros-type-style': ['error', {
  macros: {
    defineProps: ['local', 'imported'],
    defineEmits: ['local', 'imported'],
    defineSlots: ['local', 'imported'],
  },
}]
```

Under that configuration, the following is accepted:

::: correct

```vue
<script setup lang="ts">
import type { ButtonProps as Props } from './types'

const props = defineProps<Props>()
</script>
```

:::

## `require-macro-type-name`

### Options

Accept one options object, with the same per-key merge and `false` semantics:

```js
'vue-perfectionist/require-macro-type-name': ['error', {
  macros: {
    defineProps: 'Props',
    defineEmits: 'Emits',
    defineSlots: 'Slots',
  },
}]
```

Each value is an exact, case-sensitive type identifier or `false`. Reject
unknown fields/macros, `true`, `null`, arrays, empty strings, whitespace, dotted
paths, and names that cannot be declared as TypeScript type aliases. Use a
schema string constraint plus identifier validation during rule creation;
do not silently accept an impossible name. Permit valid Unicode identifiers.
There are no regular expressions, filename substitutions, or exported-name
checks in version one.

### Matching contract

Require a `TSTypeReference` whose `typeName` is an identifier matching the
configured name. Compare the decoded identifier, not raw escaped source text.
Generic arguments are allowed: `Props<T>` meets the `Props` naming policy.
Their contents are not checked by this rule.

| Input to `defineProps`                                             | Expected `Props`                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| Local `interface Props` or `type Props` referenced as `Props`      | Accept                                                 |
| `import type { ButtonProps as Props }` referenced as `Props`       | Accept                                                 |
| `import type { Props as ButtonProps }` referenced as `ButtonProps` | Report wrong name                                      |
| `Props<T>`                                                         | Accept                                                 |
| `Contracts.Props` or `import('./types').Props`                     | Report: direct named reference required                |
| `{ title: string }`, `Props & Extra`, or `Partial<Props>`          | Report                                                 |
| An unresolved identifier spelled `Props`                           | Accept the name; the style rule reports unknown source |

The rule enforces a named contract even when enabled alone: it reports inline
types rather than silently ignoring them. It never checks the name of the
variable receiving the macro result or renames an imported export.

With the default naming policy:

::: correct

```vue
<script setup lang="ts">
interface Props {
  title: string
}

type Emits = {
  save: [value: string]
}

type Slots = {
  default(props: { title: string }): unknown
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const slots = defineSlots<Slots>()
</script>

<template>
  <button
    @click="emit('save', props.title)"
    type="button"
  >
    Save
  </button>
</template>
```

:::

The following uses the wrong call-site type name:

::: incorrect

```vue
<script setup lang="ts">
interface ButtonProps {
  title: string
}

const props = defineProps<ButtonProps>()
</script>
```

:::

## Composition and diagnostics

Enabling both rules with defaults requires local named contracts:

```js
rules: {
  'vue-perfectionist/define-macros-type-style': 'error',
  'vue-perfectionist/require-macro-type-name': 'error',
}
```

These fragments assume plugin registration and Vue/TypeScript parser
configuration. Both rules are implemented and exported by the plugin.

To enforce inline types for a macro, disable its naming policy. For example,
use `defineProps: 'inline'` in the style rule and `defineProps: false` in the
naming rule. Enabling both requirements would be unsatisfiable. Neither rule
reads the other's configuration or suppresses its diagnostics; a single type
argument can correctly receive one report from each rule.

Each rule emits at most one diagnostic per eligible macro call:

| Rule / message ID             | Location                  | Message template                                                                                                     |
| ----------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Style / `unexpectedTypeStyle` | Complete type argument    | Expected {{macro}} type argument to use {{expected}} style; found {{actual}}.                                        |
| Style / `unsupportedTypeForm` | Complete type argument    | Expected {{macro}} type argument to use {{expected}} style; this type expression is not supported.                   |
| Style / `unknownTypeSource`   | Complete type argument    | Cannot determine the declaration source of the {{macro}} type argument. Use an explicit local declaration or import. |
| Name / `expectedNamedType`    | Complete type argument    | Expected {{macro}} type argument to be a direct reference named "{{expected}}".                                      |
| Name / `unexpectedTypeName`   | Type-name identifier only | Expected {{macro}} type name "{{expected}}"; found "{{actual}}".                                                     |

For style diagnostics, format allowed styles in fixed `inline`, `local`,
`imported` order, independent of array order. Resolve the outer form first;
use `unsupportedTypeForm` for unsupported syntax, `unknownTypeSource` for
unresolved supported references, and `unexpectedTypeStyle` only for a known
classification excluded by the options. Unknowns never silently pass, even
when all three known styles are allowed.

Neither rule offers autofixes or suggestions. Extracting or moving declarations
needs scope, comment, and file-boundary decisions; renaming can affect other
references and collide with existing types. Manual examples are not promises
of automatic transformations. Omit both `meta.fixable` and `meta.hasSuggestions`.

## Implementation checklist

1. Add a focused shared utility in `src/utils/macro-types.ts` for eligible
   macro calls and structural type-argument analysis. Reuse `getSetupRange()`
   and `getCallIdentity()` without changing their behavior for existing rules.
2. Resolve type bindings only for the style rule, using parser scope references
   and definitions. Probe dual-script scope handling and SFC generic parameters
   against the installed parser; keep unknown results explicit.
3. Implement separate rule and option/message type files. Public options use
   `DefineMacrosTypeStyleOptions` and `RequireMacroTypeNameOptions`; give each
   rule its own message-ID union. Normalize defaults explicitly and validate
   options before visiting nodes.
4. Add shared-runner behavior tests and invalid-option tests before registering
   the rules. Keep no-fix assertions for every invalid case.
5. Register both rules alphabetically, update public type exports and plugin
   contract tests, then update README, rule overview, guide, and Rules sidebar.
6. Add individual English rule pages using `correct` / `incorrect` containers.
   Register each rule in the documentation diagnostic transformer. Examples
   with non-default settings must be verified under those exact settings.

This design page belongs in the Design sidebar. Its containers illustrate
acceptance and rejection without running live diagnostic checks. The individual
rule pages provide live diagnostic examples.

## Acceptance test matrix

| Area                   | Required cases                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basic behavior         | Each macro, each style, default local contracts, correct and wrong names, inline naming reports                                                                               |
| Options                | Partial overrides, empty objects retaining defaults, every allowed-style combination, per-macro `false`, all disabled, custom names, invalid schema and identifier values     |
| Identification         | Unbound/parser globals, local shadowing, unrelated imports, Vue macro imports/aliases, member/computed/optional calls                                                         |
| Scope                  | TS setup, dual scripts in both orders, ordinary script only, JS SFC, plain JS/TS, missing parser services, nested functions/blocks, arbitrary outer expressions               |
| Invocation             | Destructuring, expression statements, wrappers, `withDefaults`, shadowed `withDefaults`, missing/extra type arguments, runtime arguments                                      |
| Bindings               | `interface` and `type`, declarations after use, named/default/namespace imports, both type-only import syntaxes, ordinary imports, alias direction, dual-script imports/types |
| Type namespace         | Same-named value/type bindings, interface merging, ambiguous definitions, ambient/global types, unresolved names, generic SFC parameters                                      |
| Outer forms            | Literals, function types, `Props<T>`, unions/intersections, utilities, indexed/mapped/conditional types, qualified references, import types, `typeof`, parentheses            |
| Non-recursive behavior | Local aliases and interface inheritance from imported types, nested imported property types, generic arguments with different sources                                         |
| Composition            | Style only, name only, both defaults, local/imported with names, conflicting inline/name options giving independent reports                                                   |
| Diagnostic contract    | Counts, message IDs/data, locations, LF/CRLF, unchanged output, `fixed: false`, absent fixes and suggestions                                                                  |
| Integration            | Exact plugin rule list, user-composed flat config, no built-in configs, public options and private message IDs                                                                |

Use `tests/internal.ts` and `run({ valid, invalid })`; invalid cases must set
`output: null` and assert absent fixes/suggestions. Use
`createRuleTester<unknown>` for invalid options and reserve `Linter` for plugin
integration. Check that compiler-supported positive fixtures compile with the
installed Vue compiler where parser/compiler boundaries matter.

Before delivering implementations, run formatting, lint, typecheck, build,
the full test suite, and the documentation build. Verify rendered examples
under their stated options; a successful docs build alone is insufficient.
