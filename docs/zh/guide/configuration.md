---
description: 配置解析器、文件范围、自动导入识别和公共 TypeScript 选项。
---

# 配置 {#configuration}

默认导出和具名导出 `plugin` 指向同一个插件对象。在 ESLint 扁平化配置中注册插件后，需显式启用规则。本插件不提供内置配置或推荐预设。

## Vue 单文件组件解析器 {#vue-sfc-parsers}

对 `.vue` 文件使用 `vue-eslint-parser` 作为外层解析器。对于 TypeScript 脚本，通过 `parserOptions.parser` 指定 `@typescript-eslint/parser`，具体见[快速开始](/zh/guide/#basic-usage)。将外层 Vue 解析器替换为 TypeScript 解析器会导致模板检查无法运行。

如果现有 Vue 配置已设置这些解析器，在该配置之后添加插件和规则即可。启用规则不会自动配置解析器、TypeScript 项目服务或 ESLint 全局变量。

## 独立的 JavaScript 和 TypeScript 文件 {#standalone-javascript-and-typescript}

以下规则也支持独立脚本：

<!-- standalone:start -->

- [`callback-style`](/zh/rules/callback-style)
- [`max-lines-per-callback`](/zh/rules/max-lines-per-callback)
- [`prefer-composable-options`](/zh/rules/prefer-composable-options)
- [`prefer-function-declaration`](/zh/rules/prefer-function-declaration)
- [`prefer-on-scope-dispose`](/zh/rules/prefer-on-scope-dispose)
- [`prefer-watch-effect-alias`](/zh/rules/prefer-watch-effect-alias)
- [`require-injection-key`](/zh/rules/require-injection-key)
- [`consistent-template-ref-name`](/zh/rules/consistent-template-ref-name)
- [`prefer-function-result-pattern`](/zh/rules/prefer-function-result-pattern)
- [`prefer-ref-pattern`](/zh/rules/prefer-ref-pattern)
- [`sort-composable-destructure`](/zh/rules/sort-composable-destructure)
- [`sort-composable-return`](/zh/rules/sort-composable-return)

<!-- standalone:end -->

`prefer-ref-pattern` 的独立脚本检查仅适用于 `useTemplateRef` 和 `render` 目标。

为这些文件单独添加配置。独立脚本可以直接使用 ESLint 默认的 JavaScript 解析器或 TypeScript 解析器：

```js [eslint.config.mjs]
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: {
      'vue-perfectionist': vuePerfectionist,
    },
    rules: {
      'vue-perfectionist/callback-style': 'error',
      'vue-perfectionist/max-lines-per-callback': 'error',
      'vue-perfectionist/prefer-composable-options': 'error',
      'vue-perfectionist/prefer-function-declaration': 'error',
      'vue-perfectionist/prefer-function-result-pattern': 'error',
    },
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    languageOptions: {
      parser: tsParser,
    },
  },
])
```

各规则仍遵循自身的适用范围。例如，`prefer-function-declaration` 在独立文件中检查匹配的组合式函数体；启用它并不意味着所有模块级函数绑定都必须改用函数声明。仅针对模板或 setup 的规则需要相应的 Vue 单文件组件上下文。

当 TypeScript 类型别名或接口与运行时 API 导入在同一作用域内同名时，无论声明顺序如何，API 识别均以运行时导入为准。内层作用域中的类型别名或接口也不会遮蔽外层运行时导入；局部值或参数仍优先。这适用于独立 TypeScript 文件、普通 SFC 脚本及 setup 脚本。仅有类型绑定、没有运行时定义，不足以认定为自动导入的 API。

## 自动导入的 Vue API {#auto-imported-vue-apis}

使用 `unplugin-auto-import` 自动导入 Vue API 时，在 `eslint.config.mjs` 中启用共享设置：

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    settings: {
      'vue-perfectionist': {
        autoImport: true,
      },
    },
  },
])
```

`autoImport` 为布尔值，默认为 `false`。启用后，`sort-script-setup`、`callback-style`、`max-lines-per-callback`、`consistent-template-ref-name`、`prefer-ref-pattern`、`prefer-use-template-ref-inference`、`prefer-watch-effect-alias`、`require-injection-key` 和 `prefer-on-scope-dispose` 会识别它们已支持的、未绑定且名称相同的 Vue API。两条回调规则还会识别 `customCallbacks` 配置的名称。`prefer-function-result-pattern` 会识别所有已配置目标名称，默认包括 `ref`、`shallowRef`、`computed` 和 VueUse 的 `useToggle`。这也包括 ESLint `languageOptions.globals` 声明的未绑定名称，但仅声明全局变量不会启用 API 识别。局部声明、参数、其他模块的导入及仅类型导入仍优先，不会被视为自动导入。

对于 `sort-script-setup`、`callback-style`、`max-lines-per-callback`、`prefer-watch-effect-alias`、`require-injection-key` 和 `prefer-on-scope-dispose`，显式配置 `vueGlobals` 会替换共享设置选中的内置 Vue API；设为 `[]` 可以对单条规则禁用此识别。回调的 `groups` 和 `exclude` 仍决定检查哪些内置 API。两条回调规则中，每个 `customCallbacks` 条目的 `autoImport` 均可独立于 `vueGlobals` 覆盖共享设置。`prefer-function-result-pattern` 中每个目标的 `autoImport` 可以覆盖对应函数组的共享设置。宏规则和组件 prop 规则不需要此设置；字面量模板 ref 的检查也不依赖 API 导入。

此设置表示未绑定名称来自相应的受支持库；它不会读取 Vite 配置、生成的声明文件或自动导入清单，也不会推断自定义别名和其他库的 API。别名请使用显式导入；其他 API 可以通过回调规则的 `customCallbacks` 或 `prefer-function-result-pattern` 的目标配置启用自动导入识别。排序规则仍遵守原有修复安全边界。即使以其他名称注册插件，设置的命名空间仍为 `vue-perfectionist`。

此设置不会配置 ESLint 的 `no-undef` 规则。如果使用该规则，请单独加载 `unplugin-auto-import` 生成的全局变量，参阅其 [ESLint 集成](https://github.com/unplugin/unplugin-auto-import#eslint)。仅生成全局变量并不能将 API 识别为 Vue API。

## 规则选项与共享设置 {#rule-options-and-shared-settings}

规则偏好应放在对应规则的选项对象中。共享的 `settings['vue-perfectionist']` 仅包含 `autoImport`。共享设置中的排序偏好不会生效。

`sort-script-setup` 默认为 `type: 'unsorted'`：对分组排序，保留普通分组内的名称顺序。若还需对名称排序，请设置 `type: 'natural'` 或其他支持的比较方式。与其他排序规则的交互请参阅[规则组合](/zh/guide/rule-composition#statement-ordering)。

数组替换和空数组的行为由各规则自行定义。例如，组件约定规则默认没有 `targets`；`prefer-function-result-pattern` 默认有内置目标，传入 `targets` 数组会替换默认值。覆盖默认配置前请查阅对应规则。

## 公共 TypeScript API {#public-typescript-api}

从包入口导入插件和配置类型：

```ts
import vuePerfectionist, { plugin } from 'eslint-plugin-vue-perfectionist'
import type {
  SortScriptSetupOptions,
  VuePerfectionistSettings,
} from 'eslint-plugin-vue-perfectionist'

const sorting = {
  type: 'natural',
  fix: 'safe',
} satisfies SortScriptSetupOptions

const settings = {
  autoImport: true,
} satisfies VuePerfectionistSettings
```

`vuePerfectionist` 和 `plugin` 指向同一个包含 `meta` 与 `rules` 的对象。包入口还导出规则选项及相关配置类型，包括 `CallbackStyleOptions`、`ComponentPropTypesOptions` 和 `VuePerfectionistPlugin`。完整 API 请参阅[公共导出列表](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/index.ts)。内部规则文件和分析工具不是公共包入口。
