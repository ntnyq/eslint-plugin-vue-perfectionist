---
description: 仓库布局、源码职责、共享分析约定及行为边界。
---

# 源码结构 {#source-structure}

规则入口文件保持扁平，分析按最小适用领域分组。公共配置类型显式导出，内部分析与使用方放在一起。

## 仓库布局 {#repository-layout}

| 位置                               | 职责                                         |
| ---------------------------------- | -------------------------------------------- |
| `src/index.ts`                     | 默认和具名插件导出及公共配置类型。           |
| `src/plugin.ts` 和 `src/meta.ts`   | 规则注册及从 `package.json` 派生的元信息。   |
| `src/`                             | 规则实现、配置类型、常量及分析工具。         |
| `tests/rules/`                     | 规则行为、选项、诊断和修复回归测试。         |
| `tests/integration/`               | 插件约定、规则组合及 Vue 编译器/运行时对照。 |
| `tests/helpers/`                   | 共享规则测试器、SFC 构建器及排序安全断言。   |
| `tests/utils/`                     | 聚焦的算法约定及性能回归检查。               |
| `tests/fixtures/`                  | 版本兼容环境及静态样例。                     |
| `docs/guide/` 和 `docs/rules/`     | 用户安装配置、贡献流程及公共规则参考。       |
| `docs/design/`                     | 源码职责及详细规则设计约定。                 |
| `docs/.vitepress/`                 | 站点配置、导航、主题、诊断渲染及排序演示。   |
| `patches/`                         | 文档依赖补丁及兼容说明。                     |
| `.github/workflows/`               | CI、自动修复及标签触发发布流程。             |
| `dist/` 和 `docs/.vitepress/dist/` | 自动生成的包和文档产物。                     |

根包发布到 npm，`docs/` 为私有 pnpm 工作区。命令见[贡献指南](/zh/guide/contributing)，支持入口见[包约定](/zh/design/#package-contract)。

## 职责划分 {#ownership}

| 位置                                  | 职责                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/rules/`                          | 规则元信息、schema、访问器组合、诊断选择及报告                                                |
| `src/utils/ast/`                      | 表达式解包、值形状证据、函数绑定名、遍历及精确作用域引用查找                                  |
| `src/utils/vue/`                      | 解析器服务守卫、脚本范围、合并 SFC 作用域、运行时导入、组件身份、名称转换、回调、ref 和宏类型 |
| `src/utils/component-props/`          | prop 绑定、配置、具体标量分析、布尔转换及值约束                                               |
| `src/utils/sort-script-setup/`        | 语句排序常量、schema、分类、分组、比较、依赖、分区、报告及内部模型                            |
| `src/utils/sort-composable/`          | 组合式函数返回值和解构规则共享的 schema、配置编译、成员分类缓存、AST 分析及报告               |
| `src/utils/injection-key.ts`          | 注入键识别及严格模式下的 TypeScript 符号来源分析                                              |
| `src/utils/vue-generic.ts`            | 泛型指令匹配及配置的组件豁免条件                                                              |
| `src/utils/composable-options.ts`     | 组合式函数参数结构分析                                                                        |
| `src/utils/template-interpolation.ts` | 保守的模板插值转换                                                                            |
| `src/types/eslint.ts`                 | 共享只读 ESLint 源码访问，不依赖规则上下文泛型                                                |
| `src/types/rules/`                    | 规则配置及诊断类型；公共配置仍在 `src/index.ts` 显式导出                                      |
| `src/constants/`                      | 其余有限值和 schema；已有排序领域在自身目录中维护常量和 schema                                |

按明确文件路径导入内部工具，不提供根工具或常量聚合入口。排序的 `Statement`、`Group`、`ResolvedOptions` 模型放在使用方旁的 `utils/sort-script-setup/types.ts`。排序常量和默认值位于该目录的 `constants.ts`；两个排序领域各自在 `schema.ts` 中维护选项 schema。公共配置类型仍位于 `src/types/rules/`，两套排序逻辑保留各自的语义。

语句排序内部，`options.ts` 解析默认值及选项交互，`groups.ts` 验证和解析分组并准备匹配器，`validation.ts` 每个规则实例仅编译一次正则。ESLint 通过公共 schema 验证选项结构，包括空行数安全整数边界。内部保留分组冲突、区域、模式、选项交互及 schema 视为缺失的显式 `undefined` 属性等语义约束。编译正则每次匹配前重置 `lastIndex`，确保全局和粘连标志确定性。

组件身份识别位于 `utils/vue/component.ts`，名称转换位于 `utils/vue/names.ts`。prop、slot、generic 和 model 规则共享这些 Vue 边界。回调 API 参数位置位于 `constants/callback-apis.ts`，与 `constants/callback-schema.ts` 中的配置结构分开维护。

组合式函数排序在自己的 `options.ts` 中编译分组和成员模式。分类器在每个规则实例内缓存局部函数解析、返回成员索引及属性分类。直接调用和 awaited 调用保留独立的 async 与 thenable 安全策略，不支持的返回分支仍保持未知。

语句依赖分析在每个文件内只索引一次词法引用和变量，再映射各分区中的声明。注释归属及受保护行检查通过有序索引向前推进，避免为每条语句重新扫描整个文档。性能测试统计操作次数，不依赖机器执行时间。

共享值形状证据位于 `utils/ast/value-analysis.ts`，`ExpressionValueVariant` 联合类型将具体标量绑定到对应的运行时类别。prop 约束在 `component-props/static-value.ts` 中增加有界标量算术分析；布尔转换和 prop 合并继续由组件领域负责。插值只使用共享形状证据，保留自己的保守转换策略。

`utils/vue/setup-macros.ts` 共享直接 setup 调用的发现过程。宏类型规则保留原有宽松的 `withDefaults` 参数数量策略，model 契约使用方要求恰好两个参数，均保留原始 AST 节点身份。`getFunctionBindingName()` 读取声明或包装初始化表达式的绑定名；执行边界和组合式函数筛选策略仍由使用方负责。

`utils/watch-effect-alias.ts` 规划调用名称、导入及 flush 移除的文本修改，或返回不提供修复的内部原因。规则负责匹配和诊断，仅应用完整的安全修改方案。

## 测试归属 {#test-ownership}

语句排序测试在 `tests/rules/sort-script-setup/` 按职责拆分。组合式函数排序测试集中在 `tests/rules/sort-composable/`：`return.test.ts`、`destructure.test.ts` 和 `types.test.ts` 分别验证对应规则行为，`policy-cases.ts` 提供由返回值和解构测试调用的共享行为用例。运行器、构建器和可复用断言放在 `tests/helpers/`，共享行为用例与规则测试放在一起。语句排序运行器还验证仅报告用例没有修复或建议。

`tests/rules/require-injection-key/` 将 `syntax.test.ts` 与使用类型信息的 `strict.test.ts` 分开。共享宏类型源码样例位于 `tests/fixtures/macro-types.ts`。

集成测试按验证的约定组织：

| 测试文件                                            | 职责                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `eslint-plugin.test.ts`                             | 包导出、规则清单及用户组合配置                                   |
| `rule-registration.test.ts`                         | 通过公共插件别名调用单条规则                                     |
| `rule-composition.test.ts`                          | 多条规则共同产生的诊断                                           |
| `sort-composable.test.ts`                           | 返回值与解构规则组合、求值顺序及格式化稳定性                     |
| `model-composition.test.ts`                         | 通过公共插件验证 model 规则交互                                  |
| `model-name-casing.test.ts`                         | 使用 Vue 编译器、运行时及 TypeScript 语义验证 model 命名修复输出 |
| `model-compilation.test.ts`                         | 编译后的 model props 及 defineModel 转换兼容性                   |
| `template-refs.test.ts` 和 `vue-api-scopes.test.ts` | ref 规则组合、作用域识别及共享自动导入设置                       |

详细诊断和修复预期留在规则测试中。若用例同时断言编译结果、运行时行为或 TypeScript 语义，则将完整用例及断言放在相应集成测试中；这些用例可以继续使用共享规则测试器，保留修复稳定性检查。

`tests/package/package.test.mjs` 在 `pnpm build` 后通过 `pnpm test:package` 使用 Node 测试运行器单独执行。它通过公共导出映射加载包，从构建产物执行规则，并在 NodeNext 和 Bundler 解析模式下检查全部公共类型。源码测试和文档开发不需要预先构建；CI 同时执行源码及构建产物检查。

## 文档实现 {#documentation-implementation}

用户内容保留在 `guide/`、`rules/` 和 `design/`，并在 `zh/` 下保持对应路径。站点配置由 `docs/.vitepress/config.ts` 组合：`config/example-rules.ts` 保存默认示例规则选项，`config/examples.ts` 负责示例配置变体、Markdown 容器校验和诊断渲染。`pnpm docs:typecheck` 使用 `docs/tsconfig.json` 检查 TypeScript 及 Vue 组件，与包的 TypeScript 检查分开运行。排序演示实现及测试继续放在 `docs/.vitepress/components/demos/sort-script-setup/`。

规则元信息和生成的 README 链接共享 `src/constants/documentation.ts` 中的规范站点地址。`src/plugin.ts` 保留精确推断的内部规则注册表，供规则目录约束名称；公共插件继续保留原有 ESLint 宿主类型及导出。

## 共享约定 {#shared-contracts}

- `unwrapExpression()` 接受脚本及模板 AST 节点，为脚本调用方保留脚本 AST 返回类型。仅移除现有 TypeScript 包装，不解包可选链或求值。
- `isFunctionNode()` 收窄三种运行时函数节点，不负责判断绑定名称是否符合组合式函数约定。
- `resolveComponentName()` 返回归一化的组件身份，排除原生标签、slot outlet 及 v-pre 内容。
- `ExpressionValueAnalysis.hasUnknownVariants` 独立记录尚未解析的可能值，可与已知分支同时存在。
- `isRuntimeNode()` 排除擦除的类型分支，保留 TypeScript 包装内的值表达式，供模板复杂度检查使用。
- `utils/vue/global-writes.ts` 中的 `hasGlobalWrite()` 检测直接写入及通过未被遮蔽的全局对象进行的属性目标写入。watch-effect 别名修复与被动 model 识别共享此分析，各自保留独立的 `eval` 策略。
- `getStaticStringValue()` 读取字符串和无表达式模板字面量，不解析绑定或求值拼接。
- `hasTemplateVisitor()` 收窄 Vue 解析器服务，推断模板进入、退出和通配访问器节点类型。脚本访问器可选。
- `findScopeReference()` 通过外层作用域查找精确节点引用，类型和声明过滤仍由使用方负责。
- `getCallIdentity()` 提供调用处 `localName`、导入 `exportedName` 及排序分类名 `classificationName`。排序保留默认导入的本地分类名，基于导出的目标使用 `exportedName ?? classificationName`。
- `getRuntimeImportBinding()` 处理运行时导入元信息。调用身份及 ref 识别共享导入分析，但语法策略独立：调用身份排除可选/计算调用，ref 保留静态计算成员支持。外围访问器仍决定可选链表达式是否符合条件。
- `analyzePropTypes()` 应用配置的布尔转换，返回实际和不允许类型。规则结合这些结果及原值不确定性选择诊断。

## 行为边界 {#behavior-boundaries}

运行时 `getScriptVariableDefinitions()` 保留 setup 局部遮蔽、两脚本的提升导入及仅类型绑定。组合式函数分析使用的 `filterScriptDefinitions()` 策略保持独立；共享范围包含判断不代表定义过滤器可互换。

事件处理器分类、简单表达式选项及布尔返回推断保留在当前规则内。不要将保守 prop/插值分析扩大为通用静态求值器。只有其他规则确实需要相同约定时，才将排序代码提升为共享模块。

规则测试及 `tests/integration/vue-api-scopes.test.ts` 覆盖双脚本、遮蔽、默认/仅类型导入、组合匹配及修复稳定性。`tests/integration/macro-types-integration.test.ts` 保护宏组合。跨职责边界变更后，运行格式、lint、类型检查、测试、包构建及文档构建。
