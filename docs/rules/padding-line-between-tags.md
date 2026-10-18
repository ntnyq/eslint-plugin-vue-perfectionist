---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/padding-line-between-tags
description: Enforce blank-line counts between consecutive Vue template tags.
---

# vue-perfectionist/padding-line-between-tags

> Enforce blank-line counts between consecutive Vue template tags.

:wrench: Tags already on separate lines can be fixed automatically. Inline
siblings are reported without a fix when additional blank lines are required.

The official
[`vue/padding-line-between-tags`](https://eslint.vuejs.org/rules/padding-line-between-tags.html#options)
supports `always`, `never`, and `consistent`, but does not accept an exact
blank-line count. In particular, `always` accepts **one or more** blank lines,
so it cannot enforce exactly one or exactly two blank lines.

This rule adds nonnegative integer policies: `1` requires exactly one blank
line, while `2` requires exactly two. It also provides a `tag` shorthand for
same-component pairs and `ignore` for exceptions. It is an independent rule;
the official rule's `consistent` policy and layout pseudo-classes such as
`:single-line` and `:multi-line` are not interpreted here. Disable the official
rule for tag pairs controlled by this rule to avoid conflicting fixes.

## Usage

Register the plugin and configure `vue-eslint-parser` in your flat configuration:

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue/padding-line-between-tags': 'off',
      'vue-perfectionist/padding-line-between-tags': [
        'error',
        { targets: [{ tag: 'ElFormItem' }] },
      ],
    },
  },
]
```

This configuration checks only consecutive `ElFormItem` tags, requiring exactly
one blank line. For TypeScript scripts, configure a TypeScript parser through
`parserOptions.parser`; see the [setup guide](../guide/index.md#basic-usage).

## :book: Rule Details

With no options, every consecutive sibling tag pair requires exactly one blank
line. A blank line is an empty or whitespace-only line between the tags; a single
line break places tags on different lines but leaves **zero** blank lines.

::: correct

```vue
<template>
  <ElFormItem />

  <ElFormItem />
</template>
```

:::

::: incorrect

```vue
<template>
  <ElFormItem />
  <ElFormItem />
</template>
```

:::

Multiple blank lines also violate the default exact count:

::: incorrect

<!-- prettier-ignore -->
```vue eslint-check=vue-perfectionist/padding-line-between-tags
<template>
  <ElFormItem />


  <ElFormItem />
</template>
```

:::

## :wrench: Options

The single rule option is an object with an optional `targets` array. The
effective default is:

```js
;({
  targets: [{ prev: '*', next: '*', blankLine: 1 }],
})
```

Omitting the option, passing `{}`, or omitting `targets` keeps the default.
An explicit `targets` array replaces the default; `{ targets: [] }` disables all
checks. Unmatched pairs are ignored. When several entries match, the **last
matching entry wins**, regardless of whether it uses shorthand or the full form.
Unknown option properties are rejected.

The former direct-array option is no longer accepted. To migrate, change
`['error', entries]` to `['error', { targets: entries }]`.

### targets

Use either `tag` or both `prev` and `next` in each `targets` entry:

```js
;({
  targets: [
    { tag: 'ElFormItem' },
    { tag: 'ElButton', blankLine: 'never' },
    { prev: 'PageHeader', next: 'PageContent', blankLine: 2 },
  ],
})
```

- `tag: 'ElFormItem'` is shorthand for
  `prev: 'ElFormItem', next: 'ElFormItem'`.
- `tag` accepts a nonempty concrete tag name; `tag: '*'` is rejected.
- `prev` and `next` each accept a nonempty source tag name or `'*'` for any tag.
  Pairs are directional: `Header` followed by `Content` differs from the reverse.
- Matching uses exact, case-sensitive source spelling. `ElFormItem` and
  `el-form-item` are distinct. Imports, aliases, and dynamic `:is` values are not
  resolved. HTML elements, components, and nested `<template>` tags can match.
- Mixing `tag` with `prev` or `next`, omitting one half of a full pair, and unknown
  properties are configuration errors. Glob patterns and regular expressions
  are not supported.

### targets[].blankLine

| Value               | Meaning                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| Nonnegative integer | Exactly that many blank lines. Defaults to `1`.                        |
| `'always'`          | At least one blank line; extra blank lines are accepted.               |
| `0` or `'never'`    | No blank lines; inline tags and a single line break are both accepted. |
| `'ignore'`          | Do not check this matching pair.                                       |

Numeric policies must be finite safe integers between `0` and
`Number.MAX_SAFE_INTEGER`. Negative numbers, fractions, non-finite numbers,
unsafe integers, and other strings are rejected. The policy is optional in each
entry and defaults to `1`.

Use a later exception to override a general policy:

```js
;({
  targets: [
    { prev: '*', next: '*', blankLine: 1 },
    { tag: 'ElFormItem', blankLine: 'ignore' },
  ],
})
```

## Scope

Only consecutive direct sibling elements in Vue SFC templates are checked.
The gap must contain only literal spaces, tabs, or line breaks. Comments, text,
interpolations, and whitespace entities interrupt a pair. Other elements also
interrupt same-tag runs: `<Item /><div /><Item />` does not form an `Item` pair.
Each adjacent pair in a longer run is checked independently.

Script blocks, standalone JavaScript/TypeScript files, and style blocks are not
checked. Descendants of `<pre>`, `<textarea>`, `<script>`, `<style>`, `<xmp>`,
`<listing>`, `<plaintext>`, or an element with `v-pre` are skipped. Non-HTML
namespaces such as SVG and MathML are also skipped.

Native tag exclusions use exact lowercase spelling. Components such as `<Pre>`
and `<Textarea>` are still checked, including their descendants.

The following interrupted pairs are accepted with default options:

::: correct

```vue
<template>
  <ElFormItem />
  <!-- section boundary -->
  <ElFormItem />
  {{ label }}
  <ElFormItem />
</template>
```

:::

## Automatic fixes and formatting

For tags already on different lines, fixes adjust only the intervening whitespace.
They preserve tag order, attributes, comments, leading indentation before the
next tag, trailing spaces after the previous tag, and the gap's first line-ending
style (LF, CRLF, or CR). Removing blank lines retains one line break. This also
preserves the order of `v-if`, `v-else-if`, and `v-else` branches.

To keep linting responsive, each replacement gap is limited to 65,536 UTF-16 code
units, including line endings and preserved whitespace. Larger replacements are
reported without a fix or suggestion. The diagnostic still uses the configured
count; no partial padding is inserted.

Inline sibling tags that need padding are reported without fixes or suggestions,
because adding the first line break can change rendered whitespace:

::: incorrect

<!-- prettier-ignore -->
```vue eslint-check=vue-perfectionist/padding-line-between-tags
<template><span>First</span> <span>Second</span></template>
```

:::

Choose the intended layout manually for those reports. A `0` or `never` policy
already accepts inline siblings and never forces tags onto one line.

Formatters may collapse multiple blank lines. When requiring `2` or more, align
your formatter settings or run this rule's fixes after formatting. The default
single blank line works with this repository's formatter.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/padding-line-between-tags.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/padding-line-between-tags.test.ts)
