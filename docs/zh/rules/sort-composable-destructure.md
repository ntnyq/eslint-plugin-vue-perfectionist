---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/sort-composable-destructure
description: 按状态和方法对组合式函数调用的解构成员分组。
---

# vue-perfectionist/sort-composable-destructure

> 按状态和方法对组合式函数调用的解构成员分组。

默认状态在前、方法在后，组间恰好一个空行，组内保留原顺序。
两条规则可以共享分组配置，但不要求消费端逐项复制返回端的顺序。

:wrench: 自动修复仅调整空行；分组和组内排序问题只报告，不移动任何成员。

## 用法 {#usage}

按文件范围配置解析器并注册规则：

```js
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.{js,ts,vue}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/sort-composable-destructure': 'error' },
  },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
  },
])
```

默认仅使用语法和本地作用域信息，不要求 TypeScript 项目。跨文件消费建议开启下文的 `typeInformation`。

## :book: 规则详情 {#book-rule-details}

::: correct

```ts
function usePage() {
  return { z: 1, a: [], submit() {}, reset() {} }
}

const {
  z,
  a: localItems,

  submit: save,
  reset,
} = usePage()
```

:::

下面的顺序问题需要手动调整：

::: incorrect

```ts
function usePage() {
  return { state: 1, submit() {} }
}

const { submit, state } = usePage()
```

:::

顺序正确时，缺少的组间空行可以自动修复：

::: incorrect

```ts
function usePage() {
  return { state: 1, submit() {} }
}

const { state, submit } = usePage()
```

:::

### 成员分类

`state` 表示已确认的非函数值，包含普通数据、配置、实例和响应式状态；
`method` 表示成员本身可以直接调用。`Ref<() => void>` 是状态，
`() => Ref<string>` 是方法。名称前缀不用于猜测类别。

分类按以下顺序补充：本地语法和可靠绑定 → 显式开启的类型信息 → `memberKinds`。
已确认的分类不会被 `memberKinds` 覆盖。

- 直接函数、函数声明（包括重载）和对象方法属于方法。字面量、数组、对象和模板字符串属于状态。
- 跟踪未再次写入的 `const` 标识符别名，不追踪可变绑定的赋值过程。
- 识别来自 `vue` 的 `ref`、`shallowRef`、`computed`、`customRef`、`toRef`、`useTemplateRef`，包括导入别名和命名空间导入。
- `reactive`、`shallowReactive`、`readonly`、`shallowReadonly` 保留已确认参数的外层类别；参数未知时需要类型信息。
- Vue 自动导入 API 需要共享设置 `settings: { 'vue-perfectionist': { autoImport: true } }`。局部遮蔽和仅类型导入不会被识别为 Vue API。
- 开启类型信息后，跨文件函数和调用结果可按实际类型分类。内置 `Function` / `CallableFunction` 属于方法，纯 `null | undefined` 联合属于状态；可选函数忽略 `null` / `undefined` 后属于方法；函数与数据的混合联合、`any`、`unknown`、`never`、未解决的泛型保持未知。宽泛的 `object` 和 `{}` 也无法确认。
- getter / setter 在返回端保持未知，不把访问器函数本身当成公开方法。

两端均按公开属性名分组和比较。例如返回 `{ values: formValues }` 或解构
`{ values: localValues }` 都使用 `values`。解构默认值不证明源属性的类别。

## :wrench: 选项 {#wrench-options}

默认配置：

```json
{
  "functionPattern": "^use[A-Z]",
  "ignoreNames": [],
  "typeInformation": false,
  "memberKinds": [],
  "unknownMembers": "ignore",
  "groups": ["state", "method"],
  "customGroups": [],
  "type": "unsorted",
  "order": "asc",
  "newlinesBetween": 1,
  "newlinesInside": 0,
  "fix": "safe"
}
```

| 选项                  | 类型 / 默认值                                                               | 含义                                                                               |
| --------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `functionPattern`     | 字符串 / `'^use[A-Z]'`                                                      | 匹配规范化函数名的正则源码。                                                       |
| `ignoreNames`         | 字符串数组 / `[]`                                                           | 排除精确匹配的规范化名称；空数组不排除。                                           |
| `typeInformation`     | 布尔值 / `false`                                                            | 开启时要求完整 TypeScript 类型服务；缺少服务抛出配置错误。                         |
| `memberKinds`         | 数组 / `[]`                                                                 | 按顺序补充未知成员的分类。                                                         |
| `unknownMembers`      | `'ignore'` 或 `'report'` / `'ignore'`                                       | 是否报告无法分类的成员。                                                           |
| `groups`              | 分组条目数组 / `['state', 'method']`                                        | 完整替换默认顺序；空数组关闭排序和空行检查。                                       |
| `customGroups`        | 数组 / `[]`                                                                 | 对已知类别细分，第一条匹配生效。                                                   |
| `type`                | `'unsorted'`、`'alphabetical'`、`'natural'`、`'name-length'` / `'unsorted'` | 组内比较方式。                                                                     |
| `order`               | `'asc'` 或 `'desc'` / `'asc'`                                               | 仅影响组内比较，不反转分组顺序。                                                   |
| `newlinesBetween`     | 非负整数或 `'ignore'` / `1`                                                 | 组间空行数。                                                                       |
| `newlinesInside`      | 非负整数或 `'ignore'` / `0`                                                 | 组内空行数；零不要求把成员合并为一行。                                             |
| `fix`                 | `'safe'` 或 `'none'` / `'safe'`                                             | 只修复安全空白，或全部只报告。                                                     |
| `importSourcePattern` | 正则字符串 / 未设置                                                         | 仅匹配已解析且满足正则的导入来源。设置后，本地函数和未绑定的自动导入调用均不匹配。 |

所有正则均为不带分隔符或标记、区分大小写的 JavaScript 正则源码，不会额外添加锚点。
无效正则、重复名称、未知分组和未知选项会产生配置错误。数组替换对应默认值。
`alphabetical` 使用英语区域比较；`natural` 使用英语自然排序（数字片段按数值比较，折叠大小写）。
`name-length` 按公开名称的 Unicode 码点数量比较。比较结果相同时保留原顺序。

### 自定义子分组

`selector` 与 `elementNamePattern` 是 AND 关系；省略名称正则表示匹配该类别的所有成员。
多个自定义组命中时按配置顺序取第一个，自定义组优先于基础组，不能为未知成员猜测类型。
`groupName` 必须唯一，且不能使用内置的 `state` / `method` 名称。

```js
const composableSortOptions = {
  type: 'unsorted',
  newlinesBetween: 0,
  groups: [
    'form-state',
    'state',
    { newlinesBetween: 1 },
    'request',
    { group: 'method', type: 'name-length', order: 'asc' },
  ],
  customGroups: [
    {
      groupName: 'form-state',
      selector: 'state',
      elementNamePattern: '^form(Rules|Values)$',
    },
    {
      groupName: 'request',
      selector: 'method',
      elementNamePattern: '^(fetch|refresh|reload)[A-Z]',
    },
  ],
}
```

上例将状态和方法分别细分，只有两大类别之间空一行；普通方法另外按名称长度检查。

`groups` 条目支持字符串、同优先级合并数组（如 `['request', 'method']`）、
`{ group: string | string[], type?, order?, newlinesInside? }` 覆盖对象，
以及 `{ newlinesBetween }` 分隔项。合并组不要求子组彼此排序，组内使用同一比较器。
分隔项只能出现在两个分组条目之间，不能相邻。未列出的类别或自定义组作为检查边界。
空组不产生空行；跨越空组时保留最大的正数分隔要求，没有正数时依次取 `'ignore'`、`0`。

### 补充未知分类

```js
const memberKinds = [
  {
    functionPattern: '^useLegacyForm$',
    elementNamePattern: '^(formValues|isSubmitting)$',
    kind: 'state',
  },
  {
    functionPattern: '^useLegacyForm$',
    elementNamePattern: '^(submit|reset)$',
    kind: 'method',
  },
]
```

每条同时要求函数和公开成员名称匹配，第一条匹配生效，且只补充未知类别。
`unknownMembers: 'report'` 提示需要类型信息或分类配置；不会将未知成员插入某个默认分组。

### TypeScript 类型信息

`typeInformation: false` 即使环境提供类型服务也不会使用它，保证默认行为稳定。
设为 `true` 时，需要给 TypeScript 解析器配置完整项目，例如：

```js
languageOptions: {
  parserOptions: {
    projectService: true,
    tsconfigRootDir: import.meta.dirname,
    extraFileExtensions: ['.vue'],
  },
}
```

Vue 文件仍使用 `vue-eslint-parser` 作为外层解析器，并指定 `parser: tsParser`。
类型分析查询调用结果的源属性，而不是解构目标或默认值，不会自行解析其他文件。
缺少完整服务会报错，不静默降级。详见 [typescript-eslint 类型规则文档](https://typescript-eslint.io/developers/custom-rules/#typed-rules)。

## 检测范围 {#scope}

支持独立 JS/TS 文件及 Vue SFC 的普通 `<script>` 和 `<script setup>`，不检查模板表达式。文件范围交给 ESLint 的 `files` / `ignores`。

检查变量声明中的对象解构，初始化表达式为直接 `useXxx()` 或 `await useXxx()`，
包括 TypeScript 包装。调用可以出现在 SFC、另一个 composable 或普通函数内。
不判断调用位置是否满足 Vue 生命周期约束。

命名导入按原始导出名匹配，支持别名；命名空间导入支持非计算成员调用；
默认导入（包括 `import { default as usePage }`）按本地名匹配。未绑定调用按名称匹配，以支持自动导入。
不支持任意 `obj.usePage()`、可选调用、计算命名空间成员、类型导入、
数组解构、赋值解构、间接变量初始化和 `toRefs(usePage())` 等包装调用。

语法模式可读取同文件、未被重新赋值的函数声明或 `const` 函数的直接返回对象。
不同返回分支必须对同一属性给出一致分类；不支持的返回值、缺失属性、展开、
动态键和重复键会阻止该属性的本地推断。async 函数只有在 `await` 后才能这样推断。带可调用或未知 `then` 的返回对象不能用其外层属性推断 `await` 结果；需要类型信息来查询兑现后的属性。无法解析的 awaited 类型保持未知。
跨文件调用通常需要类型信息或 `memberKinds`。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

未知成员、展开/剩余成员、动态计算键、原型设置器和嵌套解构是分段边界，不跨边界检查或修复。
非计算、非简写、非方法形式的 `__proto__: value` 设置对象原型，不是普通公开属性；消费端不据此对象做本地返回推断。`['__proto__']` 和简写成员仍正常检查。
返回对象存在重复静态键时跳过整个对象，包括经属性键转换后相同的数字、bigint、布尔值、`null` 和字符串键。未知成员两侧的空行保持不变。
逗号前或逗号后的成员间隙包含注释时不检查空行，但注释不会取消已知成员的排序诊断。

某个分段只要有顺序问题，就仅报告该段的排序问题，不再调整空行。
顺序正确的分段只调整分隔逗号两侧的纯空白，将需要的空行放在逗号后，并删除逗号前多余的空行；保留表达式、注释、原有缩进（包括 Unicode 横向空白）和 LF/CRLF。
同一行的不同分组也会按需插入换行；单一分组不要求组间空行。

空行数量必须是非负安全整数，最大为 `Number.MAX_SAFE_INTEGER`。如果逗号后生成的空白（包括换行符和缩进）超过 65,536 个 UTF-16 码元，则只报告空行问题，不修复该逗号两侧的空白。

规则不改变对象键的枚举顺序、getter / Proxy 的读取顺序或解构默认值的执行顺序。
`fix: 'none'` 关闭所有修复；不提供重排建议或 `fix: 'unsafe'`。
格式化器负责缩进。默认 `0/1` 空行策略与 Oxfmt 兼容；大于 `1` 的空行设置会被 Oxfmt 压缩，重新触发诊断。使用此类配置时，可设为 `fix: 'none'` 只报告，或避免让 Oxfmt 同时处理该间隙。
避免同时启用要求相反成员顺序或空行政策的其他排序规则。

## :mag: 实现 {#mag-implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/sort-composable-destructure.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/sort-composable-destructure.test.ts)
