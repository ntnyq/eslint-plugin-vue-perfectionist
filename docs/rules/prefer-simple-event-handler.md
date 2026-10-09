---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-simple-event-handler
description: Require simple expressions in named Vue template event handlers.
---

# vue-perfectionist/prefer-simple-event-handler

> Require simple expressions in named Vue template event handlers.

Keep small operations in the template and move complex logic into script
functions. This rule checks syntax, not cyclomatic complexity or runtime side
effects. It reports at most once per handler, without automatic fixes or
suggestions.

## Usage

This complete flat configuration supports JavaScript and TypeScript Vue SFCs:

```js
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/prefer-simple-event-handler': 'error',
    },
  },
]
```

## :book: Rule Details

By default, method references, calls, assignments, updates, and simple inline
functions are accepted. Each function block must contain exactly one expression
statement or one `return` with an expression:

::: correct

```vue
<template>
  <button
    @click="handleClick"
    type="button"
  />
  <button
    @click="actions.save"
    type="button"
  />
  <button
    @click="save(item, $event)"
    type="button"
  />
  <button
    @click="isVisible = !isVisible"
    type="button"
  />
  <button
    @click="count++"
    type="button"
  />
  <button
    @click="formRef?.submit()"
    type="button"
  />
  <button
    @click="() => save(item)"
    type="button"
  />
  <button
    @click="
      () => {
        save(item)
      }
    "
    type="button"
  />
  <button
    @click="
      () => {
        return save(item)
      }
    "
    type="button"
  />
  <button
    @click="
      function () {
        return save(item)
      }
    "
    type="button"
  />
  <button
    @click="async () => await save()"
    type="button"
  />
  <button
    @click="save(normalize(item))"
    type="button"
  />
</template>
```

:::

Multiple statements, comma expressions, control-flow statements, and declarations
are always reported. Wrapping them in a function does not bypass the rule:

::: incorrect

```vue
<template>
  <button
    @click="
      save()
      close()
    "
    type="button"
  />
  <button
    @click="
      () => {
        save()
        close()
      }
    "
    type="button"
  />
  <button
    @click="(save(), close())"
    type="button"
  />
  <button
    @click="if (ok) save()"
    type="button"
  />
  <button
    @click="
      () => {
        if (ok) save()
      }
    "
    type="button"
  />
  <button
    @click="
      () => {
        while (ok) save()
      }
    "
    type="button"
  />
  <button
    @click="
      () => {
        const result = save()
      }
    "
    type="button"
  />
  <button
    @click="() => {}"
    type="button"
  />
  <button
    @click="
      () => {
        return
      }
    "
    type="button"
  />
</template>
```

:::

The default also rejects ternary expressions, logical expressions, and logical
assignments. Checks recurse into call arguments, computed properties, parameter
defaults, object and array values, and nested functions:

::: incorrect

```vue
<template>
  <button
    @click="ok ? save() : close()"
    type="button"
  />
  <button
    @click="ok && save()"
    type="button"
  />
  <button
    @click="save(value ?? fallback)"
    type="button"
  />
  <button
    @click="value ||= next"
    type="button"
  />
  <button
    @click="save(ok ? first : second)"
    type="button"
  />
  <button
    @click="save((prepare(), item))"
    type="button"
  />
  <button
    @click="
      run(() => {
        save()
        close()
      })
    "
    type="button"
  />
</template>
```

:::

## :wrench: Options

The default configuration is:

```js
{
  'vue-perfectionist/prefer-simple-event-handler': [
    'error',
    {
      allowInlineFunctions: true,
      allowConditional: false,
      allowLogical: false,
    },
  ],
}
```

| Option                 | Type      | Default | Meaning                                                                                                            |
| ---------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `allowInlineFunctions` | `boolean` | `true`  | Allow arrow functions and ordinary function expressions, including object methods. Their bodies are still checked. |
| `allowConditional`     | `boolean` | `false` | Allow ternary expressions throughout the handler. Does not allow `if` or `switch`.                                 |
| `allowLogical`         | `boolean` | `false` | Allow `&&`, `\|\|`, `??`, `&&=`, `\|\|=`, and `??=` throughout the handler.                                        |

The options are independent and apply recursively. None permits multiple
statements, comma expressions, declarations, or control-flow statements.

### `allowInlineFunctions`

With `{ allowInlineFunctions: false }`, method references and simple operations
remain accepted:

::: correct

```vue
<template>
  <button
    @click="handleClick"
    type="button"
  />
  <button
    @click="save(item, $event)"
    type="button"
  />
</template>
```

:::

The following functions are reported, including the nested callback:

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/prefer-simple-event-handler
<script setup>
/* eslint vue-perfectionist/prefer-simple-event-handler: [error, { allowInlineFunctions: false }] */
</script>

<template>
  <button
    @click="() => save(item)"
    type="button"
  />
  <button
    @click="run(() => save(item))"
    type="button"
  />
</template>
```

:::

### `allowConditional` and `allowLogical`

With `{ allowConditional: true, allowLogical: true }`, these expressions are
accepted, including inside arguments and inline functions:

::: correct

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/prefer-simple-event-handler
<script setup>
/* eslint vue-perfectionist/prefer-simple-event-handler: [error, { allowConditional: true, allowLogical: true }] */
</script>

<template>
  <button
    @click="ok ? save() : close()"
    type="button"
  />
  <button
    @click="ok && save()"
    type="button"
  />
  <button
    @click="save(value ?? fallback)"
    type="button"
  />
  <button
    @click="value ||= next"
    type="button"
  />
  <button
    @click="() => save(ok ? first : (second ?? fallback))"
    type="button"
  />
</template>
```

:::

An `if` statement and a comma expression still produce diagnostics with these
options enabled:

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/prefer-simple-event-handler
<script setup>
/* eslint vue-perfectionist/prefer-simple-event-handler: [error, { allowConditional: true, allowLogical: true }] */
</script>

<template>
  <button
    @click="
      () => {
        if (ok) save()
      }
    "
    type="button"
  />
  <button
    @click="() => (save(), close())"
    type="button"
  />
</template>
```

:::

## Scope

- Checks only **values of template `v-on` directives with an event argument**:
  `@click`, `v-on:click`, modifiers such as `@click.stop`, dynamic arguments such
  as `@[eventName]`, and component events such as `@update:model-value`.
  Native elements and components use the same checks.
- Checks the entire handler expression recursively, including nested callbacks,
  object methods, computed keys, and parameter defaults. Each handler receives
  at most one diagnostic, on the first forbidden node in AST traversal order.
  A block with multiple statements is reported as a whole.
- Works in templates with no script, ordinary `<script>`, `<script setup>`, or
  both script blocks, using either JavaScript or TypeScript. It does not depend
  on Vue imports, auto-import settings, or Composition API usage.
- **Does not inspect the dynamic event name itself**, object-form
  `v-on="listeners"` / `v-on="{ click: ... }"`, `:onClick`, plain `onclick`, other
  directives, or interpolations. Their expressions are outside this rule's scope.
- **Does not inspect script implementations**, resolve referenced functions,
  follow variables or imports, or check render-function / JSX / TSX handlers.
  Standalone JavaScript and TypeScript files are unaffected. The Vue parser's
  template visitor service is required; other parsers are skipped safely.
- Missing or empty directive values and expressions the parser cannot parse are
  skipped. Use Vue correctness rules for those cases.

The complex script function and event map below are outside the checked scope;
only the `@click` value is checked, and its reference is accepted:

::: correct

```vue
<script setup>
function handleClick() {
  if (ok) {
    save()
  }
  close()
}
</script>

<template>
  <button
    @click="handleClick"
    type="button"
  />
  <button
    v-on="{
      click: () => {
        save()
        close()
      },
    }"
    type="button"
  />
  <button
    @[ok?first:second]="save()"
    type="button"
  />
</template>
```

:::

### What counts as simple?

This is a structural restriction, not an expression whitelist or a limit on call
count. For example, `save(normalize(item))` is allowed despite containing two
calls. Literals, arithmetic, bitwise operations, optional chaining, and `await`
are not rejected by themselves. The rule does not prove that an expression is
callable, useful, or free of side effects.

A trailing semicolon, comments, line breaks, parentheses, and TypeScript
assertions or non-null assertions do not change the checks. Extra empty
statements still count as statements. Empty function blocks and bare `return`
are reported because they contain no expression operation. Loops, `switch`,
`try`, `throw`, labels, nested statement blocks, declarations, class expressions,
and `yield` are rejected; a single such statement is still complex.

This rule does not enforce method-reference versus inline-handler style.
`allowInlineFunctions: false` still permits `save(item)` and `count++`.

## Automatic fixes

There are no automatic fixes or suggestions. Extracting a function requires
choosing its location and parameters while preserving template-local variables
(such as `v-for` bindings), `$event`, `this`, and return values. Move the complex
logic into a script function and pass any required local values explicitly.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-simple-event-handler.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-simple-event-handler.test.ts)
