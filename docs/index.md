---
layout: home
description: Configurable ESLint rules for Vue 3 callbacks, composables, macros, naming, component contracts, templates, and setup ordering.

hero:
  name: Vue Perfectionist
  text: Consistent conventions for Vue.
  tagline: Configurable ESLint rules for readable, maintainable Vue 3 scripts and templates.
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
    title: Callbacks and Composables
    details: Keep callbacks focused and establish conventions for composable definitions and API usage.
    link: /rules/#callbacks-and-composables
    linkText: Browse related rules
  - icon: 📝
    title: Macros and Component Models
    details: Standardize props, emits, slots, and model declarations with consistent types and layout.
    link: /rules/#macros-and-component-models
    linkText: Browse related rules
  - icon: 🏷️
    title: Refs and Result Names
    details: Give template refs and function results consistent names, and use template ref type inference.
    link: /rules/#refs-and-result-names
    linkText: Browse related rules
  - icon: 📦
    title: Component Usage Contracts
    details: Check component usage against your project's requirements for props, slots, and generics.
    link: /rules/#component-usage-contracts
    linkText: Browse related rules
  - icon: 📐
    title: Template Conventions
    details: Keep template expressions simple and standardize HTML element usage, text interpolation, and spacing.
    link: /rules/#template-conventions
    linkText: Browse related rules
  - icon: 🎛️
    title: Statement Ordering
    details: Organize setup statements by their Vue roles, with configurable grouping and sorting.
    link: /rules/#statement-ordering
    linkText: Browse related rules
---

## Start with your project conventions

Vue Perfectionist provides rules only, with no built-in presets. Register the
plugin in ESLint's flat configuration and enable the checks you need.
Each rule documents its file scope, defaults, options, and fix boundaries.

Follow [Getting Started](/guide/) for installation and a complete Vue SFC
configuration. Then use [Configuration](/guide/configuration) for standalone
JS/TS files, auto-import recognition, and public option types, or browse the
[rules overview](/rules/) to choose checks by purpose.

## Work on the plugin

See [Contributing](/guide/contributing) for local setup, tests, and documentation
maintenance.
