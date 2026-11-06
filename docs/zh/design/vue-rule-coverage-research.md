---
description: 潜在 Vue 专用规则的上游覆盖情况及边界。
---

# Vue 规则覆盖调研 {#vue-rule-coverage-research}

审查日期：2026 年 10 月 25 日。这是调研记录，不是规则规范。下文“没有专用规则”的结论根据当时的[官方规则目录](https://eslint.vuejs.org/rules/)及相关源码推断，实施前应再次检查上游覆盖。

## 上游存在明确空缺的候选 {#candidates-with-a-clear-upstream-gap}

### 组合式函数成员分组 {#composable-member-grouping}

目录中没有在组合式函数返回值或解构结果中，将状态放在方法前并用空行分隔的专用规则。Vue 实现需显式的组合式函数匹配策略。仅以 `use` 开头不能确定 Vue 语义，仅有解构标识符不能证明值可调用。应从已知本地声明或配置成员模式开始，而非假定全部 `handle*` 都是方法。

### 优先使用 defineModel {#prefer-definemodel}

Vue 从 3.4 起推荐用 `defineModel()` 实现组件双向绑定，其展开包含对应 prop 和更新事件。参阅[组件 v-model](https://vuejs.org/guide/components/v-model.html)。

上游 `prefer-v-model` 处理使用方模板的绑定和更新监听器对，不检查子组件 prop/emits 声明。独立规则可建议以 `defineModel` 替换简单子组件模型桥接，保留 required/default、类型及其他 emits。setter 转换、触发副作用或更新多字段时，自动转换需额外分析。参阅[规则源码](https://github.com/vuejs/eslint-plugin-vue/blob/master/lib/rules/prefer-v-model.ts)。

### defineModel 名称大小写 {#definemodel-name-casing}

`prop-name-casing` 注册 `onDefinePropsEnter` 和选项式 props 访问器，未注册 `onDefineModelEnter`，因此现有 prop 名检查不约束 `defineModel` 字符串参数。参阅[规则源码](https://github.com/vuejs/eslint-plugin-vue/blob/master/lib/rules/prop-name-casing.ts)。

可以独立于模板属性大小写，约束显式模型名称。重命名会改变组件约定，单文件自动修复不能假定全部使用方已更新。

### 模板表达式复杂度 {#template-expression-complexity}

目录中没有专用表达式复杂度限额。`vue/no-restricted-syntax` 已可禁止模板 AST 形式；新规则应增加可配置阈值和针对性诊断，而非重复选择器限制。参阅[模板语法限制文档](https://eslint.vuejs.org/rules/no-restricted-syntax.html)。

范围应限于条件和绑定，`v-for` 数据源交给 `no-complex-v-for-source`。依赖插槽或循环局部值的表达式不能总是移到组件级计算属性，因此不应盲目建议或自动提取。

## 重叠与较低优先级方向 {#overlaps-and-lower-priority-directions}

| 方向                       | 覆盖与边界                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ref 或 computed 变量命名   | 上游目录未见专用组合式 API 命名规则，新增前先检查本插件现有命名规则。                                                                                                          |
| 无效 watch 源              | `no-watch-after-await` 检查注册时机，`no-ref-object-reactivity-loss` 已捕获已知 ref 的同作用域读取，与常见 `watch(count.value, callback)` 错误重叠。新规则需要证明更具体空缺。 |
| 通过 v-model 深层修改 prop | `vue/no-mutating-props` 默认 `shallowOnly: false` 已覆盖，测试包含嵌套 `v-model` 目标。                                                                                        |

重叠结论基于[侦听时机文档](https://eslint.vuejs.org/rules/no-watch-after-await.html)、[ref 丢失实现](https://github.com/vuejs/eslint-plugin-vue/blob/master/lib/rules/no-ref-object-reactivity-loss.ts)、[prop 修改文档](https://eslint.vuejs.org/rules/no-mutating-props.html)及 [prop 修改测试](https://github.com/vuejs/eslint-plugin-vue/blob/master/tests/lib/rules/no-mutating-props.test.ts)。

## 其他候选 {#further-candidates}

以下是额外的可选方向，不是已确认实施需求。上游目录未见专用对应规则。

- **侦听源风格**：优先独立来源数组，如 `watch([first, second], callback)`，而非返回数组的 getter `watch(() => [first.value, second.value], callback)`。仅报告不修复：getter 数组身份与多源值比较可能产生不同回调行为，`immediate` 首次旧值也不同。见[侦听实现](https://github.com/vuejs/core/blob/main/packages/reactivity/src/watch.ts)。
- **组合式函数清理**：对目前使用 `onUnmounted` 的可复用、归属作用域的资源清理，建议 `onScopeDispose`。排除依赖 DOM 生命周期或有意绑定组件卸载的代码，因为作用域停止可能早于组件卸载。Vue 将此 API 描述为避免组合式函数耦合组件的替代方式，见 [onScopeDispose](https://vuejs.org/api/reactivity-advanced.html#onscopedispose)。
- **模板事件处理器名称**：对模板事件实际引用的本地函数按 `handle*` 等可配置模式检查，用 `allowNames` 豁免 `fetchData` 等。跳过未解析、导入、对象成员及插槽提供函数。上游检查处理器表达式风格，不检查标识符名称，见 [v-on-handler-style](https://eslint.vuejs.org/rules/v-on-handler-style.html)。
- **带类型的注入键**：要求 Vue `provide`/`inject` 使用 `InjectionKey<T>` symbol，允许外部字符串约定例外。确认导入键类型需要类型信息；仅禁止字符串字面量是更窄的语法策略，Vue 支持两者。见[带类型的 provide/inject](https://vuejs.org/guide/typescript/composition-api.html#typing-provide-inject)。
- **侦听副作用别名，较低优先级**：静态 `watchEffect` 选项含 `flush: 'post'` 或 `'sync'` 时，优先 `watchPostEffect` / `watchSyncEffect`，Vue 将其定义为别名。保留其他选项，跳过歧义展开或重复键，见 [watchPostEffect](https://vuejs.org/api/reactivity-core.html#watchposteffect)。

不应为典型 `defineExpose({ count: count.value })` 单独增加 `no-expose-ref-value`，现有 ref 丢失实现已报告已知 ref 的同作用域读取，并通过作用域跟踪区分普通函数体内读取。只有证明识别空缺后，新规则才有价值。参阅 [ref 丢失实现](https://github.com/vuejs/eslint-plugin-vue/blob/master/lib/rules/no-ref-object-reactivity-loss.ts)。
