---
layout: home
description: Keep Vue 3 script setup blocks consistent with configurable grouping, flexible sorting, and safe ESLint fixes.

hero:
  name: Vue Perfectionist
  text: Bring order to script setup.
  tagline: An ESLint plugin for consistent, readable Vue 3 code. Group declarations, choose your sorting style, and preserve execution dependencies.
  image:
    light: /logo-light.svg
    dark: /logo-dark.svg
    alt: Vue Perfectionist logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Explore the Rule
      link: /rules/sort-script-setup
    - theme: alt
      text: View on GitHub
      link: https://github.com/ntnyq/eslint-plugin-vue-perfectionist

features:
  - icon: 🧩
    title: Vue-aware Grouping
    details: Give types, compiler macros, state, computed values, watchers, and lifecycle hooks a predictable place in every script setup block.
    link: /rules/sort-script-setup#groups
    linkText: Explore statement groups
  - icon: 🔤
    title: Your Sorting Style
    details: Preserve order within groups, or choose alphabetical, natural, line-length, or custom-alphabet sorting to match your team's conventions.
    link: /rules/sort-script-setup#options
    linkText: Compare sorting options
  - icon: 🛡️
    title: Conservative Autofixes
    details: Reorder eligible declarations within safe fragments. Initialization dependencies come first; unsafe runtime moves are reported without a fix.
    link: /rules/sort-script-setup#partitions-and-automatic-fixes
    linkText: Understand safe fixes
  - icon: 🎛️
    title: Flexible Conventions
    details: Define custom groups, control blank lines, and use comments or empty lines as sorting boundaries to fit your project's structure.
    link: /rules/sort-script-setup#custom-groups
    linkText: Customize your groups
  - icon: 📦
    title: Compose Your Rules
    details: Register the plugin and choose the rules and options for your project. Supports JavaScript and TypeScript single-file components.
    link: /guide/#choosing-rules
    linkText: Choose your rules
  - icon: ✨
    title: See It in Action
    details: Compare sorting modes in the interactive demo, watch safe fixes reorder declarations, and explore when automatic changes are limited.
    link: /rules/sort-script-setup#interactive-demo
    linkText: Try the demo
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
`plugins` and enable `vue-perfectionist/sort-script-setup` in `rules` to group
statements while preserving the order within each group by default.

Follow the [setup guide](/guide/#basic-usage) for a complete configuration,
including TypeScript support, or [choose your rules](/guide/#choosing-rules)
and sorting options.
