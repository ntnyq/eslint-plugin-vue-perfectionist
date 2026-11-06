---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/no-restricted-html-elements
description: Disallow specified native HTML elements in Vue templates.
---

# vue-perfectionist/no-restricted-html-elements

> Disallow specified native HTML elements in Vue templates.

<!-- summary:start -->

::: info At a glance

| Concern          | Behavior                                        |
| ---------------- | ----------------------------------------------- |
| Scope            | Template                                        |
| Defaults         | No checks until an elements list is configured. |
| Required options | `elements`                                      |
| Automatic fixes  | —                                               |
| Type information | No TypeScript type services required.           |

:::

<!-- summary:end -->

Use this rule to require project components in place of selected native HTML
elements. Only exact lowercase tag names are matched. There are no automatic
fixes or suggestions, since replacing an element can change its props, events,
and behavior.

## Usage

This complete flat configuration supports JavaScript and TypeScript Vue SFCs:

```js
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/no-restricted-html-elements': [
        'error',
        {
          elements: [
            'button',
            { name: 'input', message: 'Use <AppInput> instead.' },
          ],
        },
      ],
    },
  },
])
```

For JavaScript-only SFCs, omit the TypeScript parser import and
`parserOptions.parser`. The default restriction list is empty; configure
`elements` to enable diagnostics.

## :book: Rule Details

With `elements: ['button', { name: 'input', message: 'Use <AppInput> instead.' }]`,
direct uses of these native elements are reported:

::: incorrect

```vue
<template>
  <button type="button">Save</button>
  <input />
</template>
```

:::

Each element is reported once, on the name in its opening tag. The diagnostics
are `Native HTML element <button> is not allowed.` and
`Native HTML element <input> is not allowed. Use <AppInput> instead.`

Matching uses the original spelling without case conversion, prefix matching,
regular expressions, or wildcards. Component names and unlisted tags are accepted:

::: correct

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/no-restricted-html-elements
<template>
  <AppButton>Save</AppButton>
  <AppInput />
  <Button />
  <BUTTON />
  <my-button />
  <button-group />
  <button2 />
  <appbutton />
  <div />
</template>
```

:::

## :wrench: Options

The default configuration is:

```json
{
  "vue-perfectionist/no-restricted-html-elements": ["error", { "elements": [] }]
}
```

### `elements`

- Type: `(string | RestrictedHtmlElement)[]`
- Default: `[]`

The array is the complete restriction list; there are no built-in restrictions.
An empty array disables all checks. A string and an object with the same `name`
match identically:

```ts
interface RestrictedHtmlElement {
  name: string
  message?: string
}
```

`name` must be an exact lowercase name from the rule's native HTML list, based on
[Vue's native HTML list](https://github.com/vuejs/core/blob/main/packages/shared/src/domTagConfig.ts)
and the [HTML element index](https://html.spec.whatwg.org/multipage/indices.html#elements-3).
The list includes `search` and `selectedcontent`, and retains Vue's `param`.
Vue's `template`, `slot`, and `component` structure tags are excluded.
Unknown names, SVG/MathML names, uppercase names, regular expressions, wildcard
patterns, and names with surrounding whitespace cause configuration errors.

`message` is an optional hint appended after the standard diagnostic with a
separating space. An omitted or empty message adds no hint. When a name occurs
more than once, its last entry supplies the hint; each matching element still
receives only one diagnostic.

## Scope

- Checks direct elements in Vue SFC templates, with or without ordinary or setup
  scripts, in JavaScript or TypeScript.
- Requires the HTML namespace and an exact original tag name. SVG and MathML
  elements are skipped, including names also used in HTML such as `a` and `title`.
  HTML descendants inside integration points such as SVG `foreignObject` and
  MathML `annotation-xml` with `encoding="text/html"` are checked.
- Checks HTML written directly inside `v-pre`, including on the element carrying
  `v-pre`. Attributes and directives do not change matching of a direct tag.
- Does not resolve `is` on `<component>`, inspect JSX or `h()` calls, or parse
  strings in `v-html`, interpolations, scripts, comments, styles, or custom blocks.
- Parsers without Vue's template visitor service are skipped safely.

For the configuration shown in Usage, indirect and foreign element names remain
accepted:

::: correct

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/no-restricted-html-elements
<template>
  <component is="button" />
  <component :is="'input'" />
  <svg><title>Icon</title></svg>
  <div v-html="'<button></button>'" />
</template>
```

:::

Direct HTML inside `v-pre` remains reported:

::: incorrect

```vue
<template>
  <div v-pre>
    <button type="button" />
  </div>
</template>
```

:::

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/no-restricted-html-elements.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/no-restricted-html-elements.test.ts)
