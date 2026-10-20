---
layout: home
description: Configurable ESLint rules for Vue 3 callbacks, composables, macros, naming, component contracts, templates, and setup ordering.

hero:
  name: Vue Perfectionist
  text: Consistent conventions for Vue.
  tagline: Choose the rules that fit your Vue 3 project, from callbacks and macro types to component contracts, template readability, and setup ordering.
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
    details: Configure callback style and length, composable parameter shape, and function declarations in supported Vue and standalone scripts.
    link: /guide/rule-composition#callbacks-and-composables
    linkText: Organize script conventions
  - icon: 📝
    title: Macro Layout and Types
    details: Choose inline, local, or imported macro types, require call-site type names, and format inline macro declarations.
    link: /guide/rule-composition#macro-types-and-layout
    linkText: Compose macro rules
  - icon: 🏷️
    title: Refs and Result Names
    details: Align template ref variables and keys, enforce naming patterns, and prefer inferred template ref types where supported.
    link: /guide/rule-composition#template-refs
    linkText: Configure ref conventions
  - icon: 📦
    title: Component Usage Contracts
    details: Declare required props and slots, constrain supplied prop types and values, and require generic comments for selected components.
    link: /guide/rule-composition#component-usage-contracts
    linkText: Define component contracts
  - icon: 📐
    title: Template Readability
    details: Keep iteration sources and event handlers simple, combine mixed text interpolation, and configure exact blank-line counts between tags.
    link: /guide/rule-composition#template-readability
    linkText: Refine template conventions
  - icon: 🎛️
    title: Setup Statement Ordering
    details: Group setup statements by their Vue roles and choose a sorting style. Automatic movement is limited to declarations proven safe to reorder.
    link: /rules/sort-script-setup
    linkText: Explore statement ordering
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

See [Contributing](/guide/contributing) for local setup, tests, package builds,
and documentation maintenance. [Architecture and Design](/design/) explains
source ownership and the analysis and fix contracts behind the rules.
