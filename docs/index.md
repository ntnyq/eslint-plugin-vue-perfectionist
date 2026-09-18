---
layout: home
description: ESLint rules for consistent, readable, and maintainable Vue 3 code, covering callback styles, macro layout, template ref naming, and statement ordering.

hero:
  name: Vue Perfectionist
  text: Consistent conventions for Vue.
  tagline: Make Vue 3 code easier to read and maintain with configurable rules for callback styles, macro layout, template ref naming, and statement ordering.
  image:
    light: /logo-light.svg
    dark: /logo-dark.svg
    alt: Vue Perfectionist logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Explore the Rules
      link: /rules/
    - theme: alt
      text: View on GitHub
      link: https://github.com/ntnyq/eslint-plugin-vue-perfectionist

features:
  - icon: 🧩
    title: Callback Styles
    details: Require inline callbacks for Vue APIs and configure their function and body styles in components and standalone JavaScript or TypeScript files.
    link: /rules/callback-style
    linkText: Configure callbacks
  - icon: 📝
    title: Macro Layout
    details: Keep inline compiler macro declarations readable with line breaks around braces and between members in script setup blocks.
    link: /rules/define-macros-newline
    linkText: Format macro declarations
  - icon: 🏷️
    title: Template Ref Naming
    details: Enforce naming patterns for template ref attributes, useTemplateRef keys, and ref properties in render functions.
    link: /rules/prefer-ref-pattern
    linkText: Define ref naming patterns
  - icon: 🎛️
    title: Statement Ordering
    details: Group top-level script setup statements by their Vue roles, choose a sorting style, and preserve execution dependencies.
    link: /rules/sort-script-setup
    linkText: Configure statement ordering
  - icon: 📦
    title: Compose Your Rules
    details: Enable the rules and options that fit your project. Each rule defines its own scope, and no built-in configuration enables rules for you.
    link: /rules/
    linkText: Choose your rules
  - icon: 🛡️
    title: Documented Fixes
    details: Apply supported fixes with ESLint and review remaining diagnostics. Each rule documents which changes can be made automatically.
    link: /guide/#automatic-fixes
    linkText: Understand automatic fixes
---

## Start with your next component

Install the plugin and its peer dependencies:

::: code-group

```shell [pnpm]
pnpm add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

```shell [npm]
npm i -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

```shell [yarn]
yarn add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

:::

Already have ESLint configured for Vue? Register `vuePerfectionist` under
`plugins` and enable your chosen `vue-perfectionist` rules in `rules`.

Follow the [setup guide](/guide/#basic-usage) for a complete configuration,
including TypeScript support, or [choose your rules](/rules/)
and configure their options.
