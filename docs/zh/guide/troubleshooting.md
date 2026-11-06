---
description: 排查规则未生效、缺少自动修复、解析器报错及工具冲突。
---

# 问题排查 {#troubleshooting}

先查看 ESLint 实际应用到目标文件的配置：

```shell
pnpm exec eslint --print-config src/App.vue
pnpm exec eslint src/App.vue
```

将路径替换为项目中的真实文件。检查规则是否启用、选项是否符合预期，以及文件是否使用正确的解析器。

## 为什么启用规则后没有报告？ {#why-does-an-enabled-rule-report-nothing}

按以下顺序检查：

1. **文件匹配**：配置中的 `files` 匹配该文件，且文件未被忽略。`**/*.vue` 配置不会启用组合式函数 `.ts` 文件的检查。
2. **解析器**：`.vue` 文件以 `vue-eslint-parser` 为外层解析器；TypeScript 脚本通过 `parserOptions.parser` 使用 `@typescript-eslint/parser`。
3. **必需选项**：组件约定规则需要 `targets`，`no-restricted-html-elements` 需要 `elements`。默认空列表不执行检查。
4. **API 识别**：显式导入 Vue API，或启用 `settings['vue-perfectionist'].autoImport`。仅声明 ESLint 全局变量不够。局部遮蔽和不支持的导入形式也可能阻止匹配。
5. **规则范围**：仅检查 setup 的规则需要 `<script setup>`，模板规则需要 Vue 模板。其他限制见各规则的速览和范围章节。

插件没有内置预设，安装或注册不会自动启用规则。后面的扁平化配置条目也可能覆盖前面的规则设置。详见[配置](/zh/guide/configuration)和[规则概览](/zh/rules/)。

## 为什么 `--fix` 后仍有诊断？ {#why-does-fix-leave-a-diagnostic}

自动修复只覆盖特定情况，不代表该规则的所有报告都能修复。

- 命名和组件约定规则通常需要有意识地手动修改。
- `sort-script-setup` 会报告无法确定安全性的运行时重排，但不移动代码。
- 两条 `sort-composable-*` 规则只修复空白，不调整成员顺序。
- `define-model-name-casing` 需要 `fix: true`；重命名会改变公共模型约定，也需检查使用组件的代码。
- 排序规则的 `fix: 'none'` 禁用包括空白在内的全部修复。

通过规则的修复章节或[自动修复汇总](/zh/guide/rule-composition#automatic-fixes)确认预期行为。只报告、不修复可能是规则有意设置的边界。

## 为什么自动导入的 API 被跳过？ {#why-are-auto-imported-apis-skipped}

共享 `autoImport` 设置用于声明支持的未绑定 API 的来源，不会读取生成的声明文件，也不会配置 ESLint 的 `no-undef`。对支持 `vueGlobals` 的规则，显式设置 `vueGlobals: []` 会禁用内置 API 的全局识别，即使共享设置已经启用。

各规则覆盖方式、自定义回调、别名及生成的全局变量见[自动导入配置](/zh/guide/configuration#auto-imported-vue-apis)。

## 什么时候需要 TypeScript 类型信息？ {#when-do-i-need-typescript-type-information}

大部分规则使用语法和作用域分析，TypeScript 解析器足以支持它们所需的 TS 语法；无需仅为使用本插件而启用 `projectService`。

`require-injection-key` 的 `strict: true` 模式，以及组合式函数排序规则的 `typeInformation: true` 模式需要完整的解析器类型服务。请将被检查文件纳入选定的 TS 项目，并按对应规则页面配置解析器。缺少服务会产生配置错误，不会静默退回语法检查。

`prefer-use-template-ref-inference` 则依赖 Vue 语言工具在移除显式泛型后推断类型。完成修改后，请运行项目的类型检查。

## 为什么自动修复与格式化反复覆盖？ {#why-do-fixes-and-formatting-keep-undoing-each-other}

检查是否有其他规则或格式化工具控制相同布局。重叠的排序和空行规则见[规则组合](/zh/guide/rule-composition)。空行偏好需与格式化工具一致，例如 Oxfmt 会将组合式函数成员列表中大于一个的空行数量折叠。

针对受影响文件依次运行检查、格式化、再次检查。如果报告重新出现，应调整冲突配置，避免反复执行互相覆盖的修复。

## 仍与预期不符？ {#still-unexpected}

提交 [GitHub issue](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/issues) 时，请附上最小复现的 `.vue` 或脚本文件、实际生效的规则选项、插件/解析器/ESLint 版本，以及预期和实际诊断。
