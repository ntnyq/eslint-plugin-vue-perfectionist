---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-component-slots
description: Require configured slots at Vue component usage sites.
---

# vue-perfectionist/require-component-slots

> Require configured slots at Vue component usage sites.

## Usage

Configure the Vue parser and list the slots each component usage must provide. No components are checked by default.

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-component-slots': [
        'error',
        {
          targets: [
            { components: ['AppDialog'], slots: ['header', 'footer'] },
            { components: ['AppButton'], slots: ['default'] },
          ],
          unknownSlots: 'report',
        },
      ],
    },
  },
]
```

For TypeScript SFCs, also configure `@typescript-eslint/parser` as `languageOptions.parserOptions.parser`, as shown in the [guide](../guide/index.md).

## :book: Rule Details

The examples use the contracts above. All listed slots must be provided. Both `#header` and `v-slot:header` are recognized, and slot names are case-sensitive. Static names retain all dots, including consecutive or trailing dots: `header..footer`, `header.footer`, and `header.` are distinct.

::: correct

```vue
<template>
  <AppDialog>
    <template #header>Title</template>
    <template #footer>
      <AppButton>Confirm</AppButton>
    </template>
  </AppDialog>
</template>
```

:::

::: incorrect

```vue
<template>
  <AppDialog>
    <template #header>Title</template>
  </AppDialog>
</template>
```

:::

The second example reports `Component <AppDialog> requires slot "footer".` on the opening tag name. Each missing slot produces one diagnostic.

### Default slots

Use `default` in the contract for the default slot. Explicit `#default`, argumentless `v-slot`, component-level `v-slot`, and implicit child content satisfy it. Modifier-only forms without a slot argument also refer to `default`; their suffix is not a literal slot name. Text, interpolations, and child elements count as implicit content; whitespace and comments alone do not.

::: correct

```vue
<template>
  <AppButton>Confirm</AppButton>
  <AppButton>{{ label }}</AppButton>
  <AppButton><span /></AppButton>
  <AppButton>
    <template #default />
  </AppButton>
  <AppButton v-slot="scope">{{ scope }}</AppButton>
</template>
```

:::

::: incorrect

```vue
<template>
  <AppButton />
  <AppButton><!-- Add content later. --></AppButton>
  <AppButton>
    <template #header>Title</template>
  </AppButton>
</template>
```

:::

An explicit slot counts even when empty. The rule checks syntactic presence, rather than whether the slot renders visible content. A named component-level `v-slot:header` assigns all children to `header`; those children do not also supply `default`.

### Slot ownership and conditions

Only component-level declarations and direct child `<template v-slot>` declarations supply named slots to a component. Slots inside nested elements or components do not satisfy the outer component's requirements.

::: incorrect

```vue
<template>
  <AppDialog>
    <template #header>Title</template>
    <OtherPanel>
      <template #footer>Nested footer</template>
    </OtherPanel>
  </AppDialog>
</template>
```

:::

Conditional and repeated declarations count as supplied. The rule does not prove runtime availability, evaluate conditions, or require a loop to be nonempty.

::: correct

```vue
<template>
  <AppDialog>
    <template
      v-if="visible"
      #header
    >
      Title
    </template>
    <template #footer />
  </AppDialog>
</template>
```

:::

### Dynamic names

String literals and substitution-free template literals in dynamic arguments are recognized. Other expressions, including variable references, remain unknown. TypeScript expression wrappers around a literal are supported. A suffix after the closing bracket also keeps the name unknown: for example, ``#[`header`].foo`` is not treated as the literal name `header`.

::: correct

```vue
<template>
  <AppDialog>
    <template #[`header`] />
    <template #[`footer`] />
  </AppDialog>
</template>
```

:::

An unknown name might supply any required slot, including `default`. By default, each requirement that has not already been satisfied produces `unverifiableRequiredSlot`.

::: incorrect

```vue
<template>
  <AppDialog>
    <template #header />
    <template #[slotName] />
  </AppDialog>
</template>
```

:::

This reports only the unverifiable `footer` requirement. Set `unknownSlots: 'ignore'` to accept such uncertain requirements. Nested dynamic declarations do not make the outer component's slot names uncertain.

## :wrench: Options

Defaults:

```js
{
  targets: [],
  unknownSlots: 'report',
}
```

### `targets`

Type: `{ components: string[], slots: string[] }[]`. Default: `[]`.

Each entry requires nonempty component and slot lists with unique, nonempty strings containing no whitespace. An empty `targets` array disables checks; there are no built-in contracts to extend. Overlapping targets merge their slot requirements, with at most one report per slot and component usage.

```js
{
  targets: [
    { components: ['AppDialog', 'AppDrawer'], slots: ['header', 'footer'] },
    { components: ['app-dialog'], slots: ['default'] },
  ],
}
```

This configuration requires `header`, `footer`, and `default` on `AppDialog`, and `header` and `footer` on `AppDrawer`.

### `unknownSlots`

Type: `'report' | 'ignore'`. Default: `'report'`.

`ignore` suppresses uncertain requirements only. A component with known slot names that omit a required slot still produces `missingSlot`.

## Scope

- Checks Vue SFC templates through `vue-eslint-parser`, including template-only files and files with ordinary scripts, setup scripts, or both.
- Matches template tag names: `AppDialog` and `app-dialog` are equivalent. `appdialog` and unconfigured import aliases do not match. No import resolution, regular expressions, glob patterns, or cross-file analysis is performed.
- Slot names retain their exact case and spelling: `Header`, `header`, `itemName`, and `item-name` are distinct. Dots in static names, such as `#item.name`, are part of the slot name.
- Skips native HTML, SVG, and MathML tags and `v-pre` subtrees. Explicitly configured custom tags are checked without resolving compiler custom-element settings.
- Skips dynamic components, including `<component is="AppDialog">` and `<component :is="'AppDialog'">`. Standalone JavaScript, TypeScript, JSX, and render functions are outside the rule's scope.
- Skips `<slot>` outlets and does not inspect a component's `defineSlots` or fallback content. Defaults in the component definition do not satisfy a caller-side requirement.
- Duplicate slots, invalid `v-slot` placements, and malformed templates remain the responsibility of Vue syntax rules.

### Diagnostics and fixes

`missingSlot` and `unverifiableRequiredSlot` point to the opening component tag name. Diagnostics retain the template's component spelling and the configured slot spelling.

This rule provides no automatic fixes or suggestions. It cannot choose the missing slot's business content, and inserting an empty slot can change fallback behavior.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-component-slots.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-component-slots.test.ts)
