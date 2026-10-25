---
description: Upstream coverage and boundaries for potential Vue-specific rules.
---

# Vue Rule Coverage Research

Reviewed on October 25, 2026. This is a research note, not a rule specification.
The absence of a dedicated rule below is an inference from the current
[official rule catalog](https://eslint.vuejs.org/rules/) and the relevant source.
Upstream coverage should be checked again before implementation.

## Candidates with a clear upstream gap

### Composable member grouping

The catalog has no dedicated rule grouping state before methods with a blank line
in composable returns or destructured results. A Vue-specific implementation needs
an explicit composable matching policy. A function name beginning with `use` alone
does not establish Vue semantics, and a destructured identifier alone does not
establish whether its value is callable. Start with known local declarations or
configured member patterns rather than assuming every `handle*` member is a method.

### Prefer defineModel

Vue recommends `defineModel()` for component two-way bindings starting in Vue 3.4.
Its expansion includes the corresponding prop and update event.
[Component v-model](https://vuejs.org/guide/components/v-model.html).

Upstream `prefer-v-model` handles the consuming template's binding and update
listener pair. Its visitor does not inspect child-side prop and emit declarations.
A separate rule could suggest replacing a simple child-side model bridge with
`defineModel`, preserving required/default options, types, and other emits.
Automatic conversion requires additional analysis when setters transform values,
trigger side effects, or update multiple fields.
[Rule source](https://github.com/vuejs/eslint-plugin-vue/blob/master/lib/rules/prefer-v-model.ts).

### defineModel name casing

`prop-name-casing` registers an `onDefinePropsEnter` visitor and an Options API
props visitor. It does not register `onDefineModelEnter`, so its existing prop
name check does not enforce the string argument of `defineModel`.
[Rule source](https://github.com/vuejs/eslint-plugin-vue/blob/master/lib/rules/prop-name-casing.ts).

A rule could enforce a convention for explicit model names, independently of
template attribute casing. Changing a model name changes the component contract;
an automatic single-file rename cannot assume all consumers are updated.

### Template expression complexity

The catalog does not include a dedicated expression complexity budget.
`vue/no-restricted-syntax` can already ban AST expression shapes in templates;
a new rule should add configurable thresholds and focused diagnostics rather
than duplicate a selector restriction.
[Template syntax restriction documentation](https://eslint.vuejs.org/rules/no-restricted-syntax.html).

Keep this rule scoped to conditions and bindings, leaving `v-for` source
expressions to `no-complex-v-for-source`. Expressions depending on slot or loop
locals cannot always be moved to component-level computed values, so the rule
should not blindly recommend or automatically perform that extraction.

## Overlaps and lower-priority directions

| Direction                          | Coverage and boundary                                                                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ref or computed variable naming    | No dedicated Composition API naming rule appears in the upstream catalog. Check this plugin's existing naming rules before adding another.                                                                                                     |
| Invalid watch source               | `no-watch-after-await` checks registration timing. `no-ref-object-reactivity-loss` already catches same-scope reads of known refs, overlapping the usual `watch(count.value, callback)` mistake. A new rule needs a narrower demonstrated gap. |
| Deep prop mutation through v-model | Already covered by `vue/no-mutating-props` with its default `shallowOnly: false`; its tests include nested `v-model` targets.                                                                                                                  |

The overlap conclusions follow the
[watch timing documentation](https://eslint.vuejs.org/rules/no-watch-after-await.html),
[ref-loss implementation](https://github.com/vuejs/eslint-plugin-vue/blob/master/lib/rules/no-ref-object-reactivity-loss.ts),
[prop mutation documentation](https://eslint.vuejs.org/rules/no-mutating-props.html),
and [prop mutation tests](https://github.com/vuejs/eslint-plugin-vue/blob/master/tests/lib/rules/no-mutating-props.test.ts).

## Further candidates

These are additional opt-in directions, rather than confirmed implementation
requirements. No dedicated counterpart appears in the upstream catalog.

- **Watch source style:** Prefer an array of independent sources over a getter
  returning an array, for example `watch([first, second], callback)` instead of
  `watch(() => [first.value, second.value], callback)`. Report without automatic
  fixes: the getter's array identity and multiple-source value comparisons can
  produce different callback behavior, and the first old value with `immediate`
  differs. See the [watch implementation](https://github.com/vuejs/core/blob/main/packages/reactivity/src/watch.ts).
- **Composable cleanup:** Suggest `onScopeDispose` for reusable, scope-owned
  resource cleanup currently registered with `onUnmounted`. Exclude DOM lifecycle
  work and code intentionally tied to component unmounting; stopping a scope can
  occur before component unmounting. Vue documents this API as a replacement
  that avoids component coupling in composables. See
  [onScopeDispose](https://vuejs.org/api/reactivity-advanced.html#onscopedispose).
- **Template event handler names:** Check local functions actually referenced by
  template events against a configurable pattern such as `handle*`, with
  `allowNames` exceptions such as `fetchData`. Skip unresolved, imported,
  object-member, and slot-provided functions. Upstream checks handler expression
  style, not identifier names. See
  [v-on-handler-style](https://eslint.vuejs.org/rules/v-on-handler-style.html).
- **Typed injection keys:** Require Vue `provide` and `inject` calls to use
  `InjectionKey<T>` symbols, with exceptions for external string-key contracts.
  Confirming the type of imported keys requires type information; rejecting only
  string literals is a narrower syntax policy. Vue supports both forms. See
  [typing provide/inject](https://vuejs.org/guide/typescript/composition-api.html#typing-provide-inject).
- **Watch effect aliases, lower priority:** Prefer `watchPostEffect` or
  `watchSyncEffect` for static `watchEffect` options containing `flush: 'post'`
  or `flush: 'sync'`. Vue defines these APIs as aliases. Preserve other options
  and skip ambiguous spreads or duplicate keys. See
  [watchPostEffect](https://vuejs.org/api/reactivity-core.html#watchposteffect).

Do not add a separate `no-expose-ref-value` rule for the typical
`defineExpose({ count: count.value })` case: the existing ref-loss implementation
already reports same-scope reads of known refs. It distinguishes reads inside
ordinary function bodies through its scope tracking. A new rule needs a proven
recognition gap before it adds value. See the
[ref-loss implementation](https://github.com/vuejs/eslint-plugin-vue/blob/master/lib/rules/no-ref-object-reactivity-loss.ts).
