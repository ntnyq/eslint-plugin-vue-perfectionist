---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/consistent-template-element-layout
description: Enforce consistent Vue template element layouts while preserving inline text flow.
---

# vue-perfectionist/consistent-template-element-layout

> Enforce consistent Vue template element layouts while preserving inline text flow.

<!-- summary:start -->

::: info At a glance

| Concern          | Behavior                                          |
| ---------------- | ------------------------------------------------- |
| Scope            | Template                                          |
| Defaults         | Formatter-compatible layout checks; reports only. |
| Required options | None; enabling the rule uses its defaults.        |
| Automatic fixes  | Opt-in                                            |
| Type information | No TypeScript type services required.             |

:::

<!-- summary:end -->

:wrench: Reports only by default. Set `fix: 'safe'` to remove formatting
whitespace inside split closing tags. Content and sibling spacing are never fixed.

## Usage

Register the plugin and configure `vue-eslint-parser`:

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/consistent-template-element-layout': 'error',
    },
  },
])
```

For TypeScript scripts, configure a TypeScript parser through
`parserOptions.parser`; see the [setup guide](../guide/index.md#basic-usage).

## :book: Rule Details

Block elements accept fully inline content or content separated from both tags
by line breaks. A multiline content region may contain several lines, child
elements, comments, or interpolations. Attribute wrapping and indentation are
left to the formatter.

::: correct

```vue
<template>
  <p>Hello</p>
  <p>Hello world</p>
</template>
```

:::

Partial expansion is reported without a content fix:

::: incorrect

<!-- prettier-ignore -->
```vue
<template>
  <p>Hello
  </p>
</template>
```

:::

::: incorrect

<!-- prettier-ignore -->
```vue
<template>
  <p>
    Hello</p>
</template>
```

:::

Consecutive siblings whose roles are both `block` need a line break. Literal
horizontal whitespace is allowed in the gap, but does not satisfy the check.
Comments, text, interpolations, entities, or another element interrupt the pair.
No blank line is required; configure `padding-line-between-tags` separately for
blank-line counts.

::: incorrect

<!-- prettier-ignore -->
```vue
<template>
  <section>Introduction</section><section>Details</section>
</template>
```

:::

Inline text flow is accepted, including adjacent inline siblings. Inline elements
do not receive the block content-boundary checks in either mode:

::: correct

```vue
<template>
  <p>Read <a href="/guide">the guide</a>.</p>
  <p><strong>Warning:</strong><span>Be careful.</span></p>
</template>
```

:::

## :wrench: Options

```json
{
  "mode": "compatible",
  "fix": "never",
  "groups": []
}
```

Omitting the option or passing `{}` uses these defaults. Unknown properties and
invalid enum values are rejected.

### mode

- Type: `'compatible' | 'strict'`
- Default: `'compatible'`

`compatible` checks split closing tags for native block elements. It accepts
split inline and unknown component closing tags, which formatters use to preserve
whitespace. For grouped block components, it also accepts a borrowed opening
bracket on the content line or a split closing tag instead of reporting partial
expansion. Ordinary partially expanded grouped components are still reported.
It also keeps adjacent grouped block siblings when the preceding component's
closing tag (or self-closing start tag) contains a formatter line break.

`strict` also reports split inline and unknown component closing tags and checks
grouped block content without those formatter exceptions. It still preserves
inline text flow and does not require inline siblings to be on separate lines.

With `mode: 'strict'`, this closing tag is reported:

::: incorrect element-layout-strict

<!-- prettier-ignore -->
```vue
<template>
  <span>Hello</span
  >
</template>
```

:::

### fix

- Type: `'never' | 'safe'`
- Default: `'never'`

`never` provides diagnostics without fixes or suggestions, even with ESLint
`--fix`. `safe` only joins whitespace between a closing tag's name and `>`:
`</p\n>` becomes `</p>`. There is no unsafe mode.

Changing `<p>Hello</p>` to an expanded layout changes Vue's text from `"Hello"`
to `" Hello "`. Inserting the first newline between sibling elements can also
change text nodes in `condense` mode. Those edits remain report-only, including
for components explicitly grouped as `block`. Grouping expresses layout intent;
it does not prove anything about a component's rendered roots or slot handling.

### groups

- Type: `TemplateElementLayoutGroup[]`
- Default: `[]`

```json
{
  "groups": [
    { "tags": ["AppCard"], "layout": "block" },
    { "tags": ["RouterLink"], "layout": "inline" },
    { "tags": ["CodeEditor"], "layout": "preserve" }
  ]
}
```

Each entry requires a nonempty array of unique, nonempty `tags` and a `layout`
of `block`, `inline`, or `preserve`. Matching is exact and case-sensitive against
the raw template spelling: `AppCard` and `app-card` must be listed separately.
Names are literal, with no glob, regex, prefix, import, or dynamic `:is`
resolution. The last matching group wins. Groups extend or override native
roles; an empty array keeps native defaults. `preserve` skips the entire subtree.
Built-in preserved contexts cannot be overridden.

Under the groups above:

::: correct element-layout-components

```vue
<template>
  <AppCard>
    <p>See <RouterLink to="/">details</RouterLink>.</p>
  </AppCard>
  <CodeEditor><p>Source text</p></CodeEditor>
</template>
```

:::

::: incorrect element-layout-components

<!-- prettier-ignore -->
```vue
<template>
  <AppCard>Content
  </AppCard>
</template>
```

:::

## Scope

Only HTML Vue SFC templates are checked; no script parser services or type
information are required. Scripts, JSX, styles, custom blocks, and non-HTML
template languages are outside the scope.

Native block defaults are `address`, `article`, `aside`, `blockquote`, `body`,
`caption`, `center`, `dd`, `details`, `dialog`, `dir`, `div`, `dl`, `dt`,
`fieldset`, `figcaption`, `figure`, `footer`, `form`, `h1`–`h6`, `header`,
`hgroup`, `hr`, `html`, `legend`, `li`, `main`, `menu`, `nav`, `ol`, `p`,
`search`, `section`, `summary`, `table`, `tbody`, `td`, `tfoot`, `th`, `thead`,
`tr`, and `ul`. Common phrasing and replaced elements such as `span`, `a`,
`strong`, `em`, `img`, `input`, and `button` use the inline role. Unlisted names
and unconfigured components are unknown. Roles express a source layout policy;
CSS and component rendering are not inferred.

`pre`, `textarea`, `script`, `style`, `xmp`, `listing`, `plaintext`, `v-pre`,
configured `preserve` groups, and all descendants are skipped. SVG and MathML
subtrees are skipped, including HTML integration points inside them. Native
names are lowercase and case-sensitive; `<Pre>` remains a component.

Self-closing and void elements have no content checks but can participate in
block sibling checks. Empty paired elements are accepted; self-closing syntax
is not enforced. The SFC root, nested `template`, `slot`, and `component` are
traversal containers only: their own boundaries and closing tags are skipped,
while eligible descendants and direct sibling pairs inside them are checked.

## Automatic fixes and formatting

Safe fixes change only internal closing-tag whitespace. They preserve text,
interpolations, entities, comments, attributes, slot contents, and all surrounding
line endings and indentation. Tests compare compiled output using the minimum
and current supported Vue compilers under both `condense` and `preserve`.

Formatter round trips cover Prettier 3.10.1 and Oxfmt 0.78.0 with
`htmlWhitespaceSensitivity: 'css'` and `'ignore'`. Whitespace-sensitive inline
and unknown component cases are also covered with `'strict'`. Compatibility
does not mean every possible formatter setting is accepted: strict sensitivity
can split even native block closing tags, and custom display comments or CSS can
also conflict with this rule's roles. Strict rule mode intentionally reports more
formatter escapes. Coordinate formatter settings for these cases; `ignore`
itself can change significant whitespace and is not required by this rule.

Other content-newline or closing-tag rules may express different policies.
Coordinate their options for tags controlled here. This rule does not control
opening-bracket placement, line width, indentation, or blank-line counts.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/consistent-template-element-layout.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/consistent-template-element-layout.test.ts)
