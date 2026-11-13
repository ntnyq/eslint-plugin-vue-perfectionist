import type { rules } from '../../src/plugin.ts'

export interface LocalizedText {
  en: string
  zh: string
}

export interface RuleGroup extends LocalizedText {
  id: string
}

export interface RuleDocumentation {
  name: keyof typeof rules
  group: string
  description: LocalizedText
  scope:
    | 'Scripts'
    | 'Setup'
    | 'TS setup'
    | 'Template'
    | 'Template + scripts'
    | 'TS setup + template'
  fix: 'Supported cases' | 'Whitespace only' | 'Opt-in' | '—'
  defaults: LocalizedText
  requiresOptions: boolean
  typeInformation: boolean
}

export const RULE_GROUPS: RuleGroup[] = [
  {
    id: 'callbacks-and-composables',
    en: 'Callbacks and Composables',
    zh: '回调函数与组合式函数',
  },
  {
    id: 'macros-and-component-models',
    en: 'Macros and Component Models',
    zh: '宏声明与组件模型',
  },
  {
    id: 'refs-and-result-names',
    en: 'Refs and Result Names',
    zh: 'ref 与返回值命名',
  },
  {
    id: 'component-usage-contracts',
    en: 'Component Usage Contracts',
    zh: '组件使用约定',
  },
  {
    id: 'template-conventions',
    en: 'Template Conventions',
    zh: '模板规范',
  },
  {
    id: 'statement-ordering',
    en: 'Statement Ordering',
    zh: '语句排序',
  },
]

export const RULE_DOCS: RuleDocumentation[] = [
  {
    name: 'callback-style',
    group: 'callbacks-and-composables',
    description: {
      en: 'Enforce callback styles for Vue APIs.',
      zh: '强制 Vue API 的回调函数使用指定风格。',
    },
    scope: 'Scripts',
    fix: 'Supported cases',
    defaults: {
      en: 'Inline arrow callbacks with block bodies for lifecycle and watch APIs.',
      zh: '生命周期与侦听 API 使用内联箭头回调和块级函数体。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'max-lines-per-callback',
    group: 'callbacks-and-composables',
    description: {
      en: 'Limit the length of inline callbacks for Vue APIs.',
      zh: '限制 Vue API 内联回调函数的行数。',
    },
    scope: 'Scripts',
    fix: '—',
    defaults: {
      en: 'At most 20 lines per lifecycle or watch callback.',
      zh: '生命周期或侦听回调最多 20 行。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'prefer-composable-options',
    group: 'callbacks-and-composables',
    description: {
      en: 'Prefer a final options object for composable parameters.',
      zh: '优先使用末尾的选项对象传递组合式函数参数。',
    },
    scope: 'Scripts',
    fix: '—',
    defaults: {
      en: 'No positional parameters; use one options object when inputs are needed.',
      zh: '不允许位置参数；需要输入时使用单个选项对象。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'prefer-function-declaration',
    group: 'callbacks-and-composables',
    description: {
      en: 'Require function declarations in SFCs and composables.',
      zh: '要求在单文件组件和组合式函数中使用函数声明。',
    },
    scope: 'Scripts',
    fix: '—',
    defaults: {
      en: 'Function declarations in selected SFC and composable scopes.',
      zh: '在指定的单文件组件和组合式函数作用域内使用函数声明。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'prefer-on-scope-dispose',
    group: 'callbacks-and-composables',
    description: {
      en: 'Prefer scope-based cleanup in named Vue composables.',
      zh: '优先在具名 Vue 组合式函数中使用基于作用域的清理方式。',
    },
    scope: 'Scripts',
    fix: '—',
    defaults: {
      en: 'Prefer scope cleanup inside named useXxx composables.',
      zh: '在命名的 useXxx 组合式函数内优先使用作用域清理。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'prefer-watch-effect-alias',
    group: 'callbacks-and-composables',
    description: {
      en: 'Prefer dedicated aliases for post and sync watch effects.',
      zh: '优先为 post 和 sync 侦听副作用使用专用别名。',
    },
    scope: 'Scripts',
    fix: 'Supported cases',
    defaults: {
      en: 'Prefer watchPostEffect / watchSyncEffect for static flush options.',
      zh: '对静态 flush 选项优先使用 watchPostEffect / watchSyncEffect。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'require-composable-return-bindings',
    group: 'callbacks-and-composables',
    description: {
      en: 'Require composable return fields to expose local bindings.',
      zh: '要求组合式函数的返回字段暴露本地绑定。',
    },
    scope: 'Scripts',
    fix: '—',
    defaults: {
      en: 'Expose local bindings; allow aliases; disallow parameters and inline expressions.',
      zh: '暴露本地绑定；允许改名；禁止直接暴露参数及内联表达式。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'require-injection-key',
    group: 'callbacks-and-composables',
    description: {
      en: 'Disallow string keys in Vue provide and inject calls.',
      zh: '禁止在 Vue 的 provide 和 inject 调用中使用字符串键。',
    },
    scope: 'Scripts',
    fix: '—',
    defaults: {
      en: 'Reject string keys; strict type checking is opt-in.',
      zh: '禁止字符串键；严格类型检查需显式启用。',
    },
    requiresOptions: false,
    typeInformation: true,
  },
  {
    name: 'define-macros-newline',
    group: 'macros-and-component-models',
    description: {
      en: 'Require multiline inline Vue macro declarations.',
      zh: '要求内联 Vue 宏声明使用多行格式。',
    },
    scope: 'Setup',
    fix: 'Supported cases',
    defaults: {
      en: 'Multiline inline props, emits, slots, and expose declarations.',
      zh: '内联 props、emits、slots 和 expose 声明使用多行布局。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'define-macros-type-style',
    group: 'macros-and-component-models',
    description: {
      en: 'Enforce declaration styles for Vue macro types.',
      zh: '强制 Vue 宏类型使用指定的声明风格。',
    },
    scope: 'TS setup',
    fix: '—',
    defaults: {
      en: 'Local types for defineProps, defineEmits, and defineSlots.',
      zh: 'defineProps、defineEmits 和 defineSlots 使用本地类型。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'define-model-name-casing',
    group: 'macros-and-component-models',
    description: {
      en: 'Enforce casing for explicit defineModel names.',
      zh: '强制显式声明的 defineModel 名称使用指定的大小写风格。',
    },
    scope: 'Setup',
    fix: 'Opt-in',
    defaults: {
      en: 'Explicit model names use camelCase; fixes are disabled.',
      zh: '显式模型名使用 camelCase；默认禁用修复。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'prefer-define-model',
    group: 'macros-and-component-models',
    description: {
      en: 'Prefer defineModel over matching prop and update event declarations.',
      zh: '优先使用 defineModel 替代配套的 prop 和更新事件声明。',
    },
    scope: 'Setup',
    fix: '—',
    defaults: {
      en: 'Report matching model prop and update event declarations.',
      zh: '报告相互匹配的模型 prop 与更新事件声明。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'require-macro-type-name',
    group: 'macros-and-component-models',
    description: {
      en: 'Require exact call-site names for Vue macro types.',
      zh: '要求 Vue 宏调用处的类型使用指定名称。',
    },
    scope: 'TS setup',
    fix: '—',
    defaults: {
      en: 'Use Props, Emits, and Slots at macro call sites.',
      zh: '宏调用处使用 Props、Emits 和 Slots 类型名。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'consistent-template-ref-name',
    group: 'refs-and-result-names',
    description: {
      en: 'Require template ref variable names to match their keys.',
      zh: '要求模板 ref 的变量名与键名一致。',
    },
    scope: 'Scripts',
    fix: '—',
    defaults: {
      en: 'The useTemplateRef binding name matches its key.',
      zh: 'useTemplateRef 绑定名称与其键一致。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'prefer-function-result-pattern',
    group: 'refs-and-result-names',
    description: {
      en: 'Enforce naming patterns for function result bindings.',
      zh: '强制函数返回值绑定使用指定的命名模式。',
    },
    scope: 'Scripts',
    fix: '—',
    defaults: {
      en: 'Boolean Vue refs/computed use is/has/should/can prefixes; VueUse is opt-in.',
      zh: '布尔 Vue ref/computed 使用 is/has/should/can 前缀；VueUse 需显式启用。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'prefer-ref-pattern',
    group: 'refs-and-result-names',
    description: {
      en: 'Enforce naming patterns for template refs.',
      zh: '强制模板 ref 使用指定的命名模式。',
    },
    scope: 'Template + scripts',
    fix: '—',
    defaults: {
      en: 'Template ref names end in Ref.',
      zh: '模板 ref 名称以 Ref 结尾。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'prefer-use-template-ref-inference',
    group: 'refs-and-result-names',
    description: {
      en: 'Prefer inferred types for static Vue template refs.',
      zh: '优先为静态 Vue 模板 ref 使用推断类型。',
    },
    scope: 'TS setup + template',
    fix: '—',
    defaults: {
      en: 'Report explicit generics for eligible static template refs.',
      zh: '对符合条件的静态模板 ref 报告显式泛型。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'component-prop-types',
    group: 'component-usage-contracts',
    description: {
      en: 'Enforce configured component prop value types.',
      zh: '强制组件 prop 的值符合配置的类型。',
    },
    scope: 'Template',
    fix: '—',
    defaults: {
      en: 'No checks until component targets are configured.',
      zh: '配置组件 targets 后才执行检查。',
    },
    requiresOptions: true,
    typeInformation: false,
  },
  {
    name: 'component-prop-values',
    group: 'component-usage-contracts',
    description: {
      en: 'Enforce configured component prop value constraints.',
      zh: '强制组件 prop 的值符合配置的约束。',
    },
    scope: 'Template',
    fix: '—',
    defaults: {
      en: 'No checks until component targets are configured.',
      zh: '配置组件 targets 后才执行检查。',
    },
    requiresOptions: true,
    typeInformation: false,
  },
  {
    name: 'require-component-props',
    group: 'component-usage-contracts',
    description: {
      en: 'Require configured props at component usage sites.',
      zh: '要求使用组件时提供配置的 prop。',
    },
    scope: 'Template',
    fix: '—',
    defaults: {
      en: 'No checks until component targets are configured.',
      zh: '配置组件 targets 后才执行检查。',
    },
    requiresOptions: true,
    typeInformation: false,
  },
  {
    name: 'require-component-slots',
    group: 'component-usage-contracts',
    description: {
      en: 'Require configured slots at component usage sites.',
      zh: '要求使用组件时提供配置的插槽。',
    },
    scope: 'Template',
    fix: '—',
    defaults: {
      en: 'No checks until component targets are configured.',
      zh: '配置组件 targets 后才执行检查。',
    },
    requiresOptions: true,
    typeInformation: false,
  },
  {
    name: 'require-vue-generic',
    group: 'component-usage-contracts',
    description: {
      en: 'Require explicit generic comments on configured components.',
      zh: '要求为配置的组件添加显式泛型注释。',
    },
    scope: 'Template',
    fix: '—',
    defaults: {
      en: 'No checks until component targets are configured.',
      zh: '配置组件 targets 后才执行检查。',
    },
    requiresOptions: true,
    typeInformation: false,
  },
  {
    name: 'no-complex-template-expression',
    group: 'template-conventions',
    description: {
      en: 'Limit logical operators and conditional nesting in Vue templates.',
      zh: '限制 Vue 模板中逻辑运算符的数量和条件表达式的嵌套层数。',
    },
    scope: 'Template',
    fix: '—',
    defaults: {
      en: 'At most two logical operators and one conditional nesting level.',
      zh: '最多两个逻辑运算符和一层条件表达式嵌套。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'no-complex-v-for-source',
    group: 'template-conventions',
    description: {
      en: 'Disallow complex expressions in Vue v-for sources.',
      zh: '禁止在 Vue v-for 数据源中使用复杂表达式。',
    },
    scope: 'Template',
    fix: '—',
    defaults: {
      en: 'Require simple iteration sources; move complex expressions into scripts.',
      zh: '迭代来源使用简单表达式；复杂表达式移至脚本。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'no-restricted-html-elements',
    group: 'template-conventions',
    description: {
      en: 'Disallow specified native HTML elements in Vue templates.',
      zh: '禁止在 Vue 模板中使用指定的原生 HTML 元素。',
    },
    scope: 'Template',
    fix: '—',
    defaults: {
      en: 'No checks until an elements list is configured.',
      zh: '配置 elements 列表后才执行检查。',
    },
    requiresOptions: true,
    typeInformation: false,
  },
  {
    name: 'no-template-type-assertion',
    group: 'template-conventions',
    description: {
      en: 'Disallow as type assertions in Vue templates.',
      zh: '禁止在 Vue 模板中使用 as 类型断言。',
    },
    scope: 'Template',
    fix: '—',
    defaults: {
      en: 'Report every as assertion, including as const; move it into scripts.',
      zh: '报告所有 as 断言（包括 as const），提示移至脚本。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'padding-line-between-tags',
    group: 'template-conventions',
    description: {
      en: 'Enforce blank-line counts between consecutive template tags.',
      zh: '强制相邻模板标签之间使用指定数量的空行。',
    },
    scope: 'Template',
    fix: 'Supported cases',
    defaults: {
      en: 'Exactly one blank line between eligible sibling tags.',
      zh: '符合条件的相邻标签之间恰好保留一个空行。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'prefer-simple-event-handler',
    group: 'template-conventions',
    description: {
      en: 'Require simple expressions in named template event handlers.',
      zh: '要求具名模板事件处理器使用简单表达式。',
    },
    scope: 'Template',
    fix: '—',
    defaults: {
      en: 'Require simple expressions in named event handlers.',
      zh: '具名事件处理器使用简单表达式。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'prefer-template-literal-in-interpolation',
    group: 'template-conventions',
    description: {
      en: 'Prefer a single template literal for mixed text and interpolation.',
      zh: '优先使用单个模板字面量表示混合的文本与插值。',
    },
    scope: 'Template',
    fix: 'Supported cases',
    defaults: {
      en: 'Combine eligible mixed text and interpolations into one template literal.',
      zh: '将符合条件的混合文本与插值合并为单个模板字面量。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'require-props-prefix',
    group: 'template-conventions',
    description: {
      en: 'Require explicit props object prefixes in Vue templates.',
      zh: '要求在 Vue 模板中显式使用 props 对象前缀。',
    },
    scope: 'Template',
    fix: 'Opt-in',
    defaults: {
      en: 'Report bare prop references in setup component templates; fixes are disabled.',
      zh: '报告 setup 组件模板中的裸 prop 引用；默认禁用修复。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'sort-composable-body',
    group: 'statement-ordering',
    description: {
      en: 'Group and order direct statements in named composable functions.',
      zh: '对具名组合式函数体的直接语句进行分组和排序。',
    },
    scope: 'Scripts',
    fix: 'Supported cases',
    defaults: {
      en: 'Select ^use[A-Z] bindings; preserve within-group order; apply proven-safe fixes only.',
      zh: '匹配 ^use[A-Z] 绑定；保留组内顺序；仅应用已证明安全的修复。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
  {
    name: 'sort-composable-destructure',
    group: 'statement-ordering',
    description: {
      en: 'Group destructured composable members by state and method.',
      zh: '按状态和方法对组合式函数的解构成员分组。',
    },
    scope: 'Scripts',
    fix: 'Whitespace only',
    defaults: {
      en: 'State before methods; preserve within-group order; fix whitespace only.',
      zh: '状态在方法之前；保留组内顺序；仅修复空白。',
    },
    requiresOptions: false,
    typeInformation: true,
  },
  {
    name: 'sort-composable-return',
    group: 'statement-ordering',
    description: {
      en: 'Group composable return members by state and method.',
      zh: '按状态和方法对组合式函数的返回成员分组。',
    },
    scope: 'Scripts',
    fix: 'Whitespace only',
    defaults: {
      en: 'State before methods; preserve within-group order; fix whitespace only.',
      zh: '状态在方法之前；保留组内顺序；仅修复空白。',
    },
    requiresOptions: false,
    typeInformation: true,
  },
  {
    name: 'sort-script-setup',
    group: 'statement-ordering',
    description: {
      en: 'Group and order top-level statements in `<script setup>`.',
      zh: '对 `<script setup>` 的顶层语句进行分组和排序。',
    },
    scope: 'Setup',
    fix: 'Supported cases',
    defaults: {
      en: 'Order groups, preserve within-group order, and apply only proven-safe fixes.',
      zh: '按分组排序，保留组内顺序，仅应用已证明安全的修复。',
    },
    requiresOptions: false,
    typeInformation: false,
  },
]
