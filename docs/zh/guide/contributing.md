---
description: 开发规则、运行仓库检查并维护文档站点。
---

# 贡献指南 {#contributing}

本仓库包含发布到 npm 的 ESLint 插件和 `docs/` 下的私有 VitePress 工作区。修改实现前，请阅读仓库[指南](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/AGENTS.md)及[源码结构](/zh/design/source-structure)。

## 本地环境 {#local-setup}

使用 `.node-version` 指定的 Node 版本及 `package.json` 的 `packageManager` 字段锁定的 pnpm 版本。在仓库根目录运行：

```shell
git clone https://github.com/ntnyq/eslint-plugin-vue-perfectionist.git
cd eslint-plugin-vue-perfectionist
pnpm install --frozen-lockfile
```

工作区安装时也会安装文档依赖。测试和文档开发服务都直接使用源码，因此运行前不需要构建包。

## 开发命令 {#development-commands}

在仓库根目录运行以下命令：

| 命令                                                      | 用途                                     |
| --------------------------------------------------------- | ---------------------------------------- |
| `pnpm dev`                                                | 源码变更时重新构建插件。                 |
| `pnpm build`                                              | 使用 tsdown 打包并生成 TypeScript 声明。 |
| `pnpm test`                                               | 运行一次 Vitest；配置中已禁用监听模式。  |
| `pnpm exec vitest run tests/rules/callback-style.test.ts` | 运行指定规则的测试。                     |
| `pnpm typecheck`                                          | 检查 TypeScript 类型，不生成文件。       |
| `pnpm lint`                                               | 运行 ESLint。                            |
| `pnpm format`                                             | 应用 Oxfmt 格式化。                      |
| `pnpm format:check`                                       | 检查格式。                               |
| `pnpm docs:dev`                                           | 在本地启动 VitePress 文档站。            |
| `pnpm docs:build`                                         | 构建文档并检查页面链接。                 |
| `pnpm docs:sync`                                          | 更新规则目录与规则页摘要的生成区块。     |
| `pnpm docs:check`                                         | 校验双语页面、目录、示例诊断及渲染。     |

`dist/` 和 `docs/.vitepress/dist/` 为生成产物，请修改其源文件。提交前钩子会通过 nano-staged 运行代码检查及格式修复。

## 修改规则 {#rule-changes}

新增规则时，请遵循仓库的 [add-eslint-rule 技能](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/.agents/skills/add-eslint-rule/SKILL.md)，其中涵盖规则元信息、选项、注册、公共类型、测试及文档。

以下内容需要保持同步：

- `src/rules/` 中的实现和 `src/types/rules/` 中的配置类型。
- `src/plugin.ts` 中的注册及 `src/index.ts` 中的公共导出。
- `tests/rules/` 中的规则行为测试和插件约定测试。
- 中英文 README 的规则列表、[规则概览](/zh/rules/)及规则侧栏。
- 中英文规则页面、示例及受影响的规则组合或设计文档。

README 规则表、规则概览、首页功能卡片及规则侧栏使用相同的用途分组。
每组内的规则名称按字母顺序排列。

规则行为测试通过 `tests/helpers/rule-tester.ts` 的 `run` 使用 `eslint-vitest-rule-tester`。断言报告的问题和期望输出；对于不提供修复的问题，使用 `output: null`。共享测试运行器会验证重复修复的稳定性和修复后的代码。无效选项使用 `createRuleTester<unknown>` 测试，ESLint 的 `Linter` 仅用于插件集成测试。

按需覆盖规则的实际文件范围、解析器变体、选项组合、导入身份和局部遮蔽。共享行为用例与规则测试放在一起，可复用运行器及断言放在 `tests/helpers/`。编译器、运行时及类型语义对照归入职责明确的 `tests/integration/` 测试，保留完整用例及其诊断和修复断言。自动修复必须保持程序行为；修复安全边界发生变化时，需补充回归测试。

## 修改文档 {#documentation-changes}

英文文档位于 `docs/`，简体中文文档位于 `docs/zh/`，两者应保持同步。安装和共享配置与各规则选项分开说明；实现约定和取舍记录在[设计文档](/zh/design/)中。

规则页面用 `::: correct` 展示正确代码，用 `::: incorrect` 展示会报告问题的代码，包括不提供自动修复的情况。正反例分开展示，配置示例使用普通代码块。保留用于触发诊断的代码格式。

`docs/.vitepress/rules.ts` 集中维护双语规则目录、适用范围、默认行为与修复能力。
修改后运行 `pnpm docs:sync`，更新 README、规则概览、独立脚本清单和各规则页摘要中带标记的生成区块，
再格式化变更文件。侧栏直接读取该目录；区块外的说明仍手动维护。

`docs/.vitepress/config/examples.ts` 为渲染与校验提供相同的解析器及规则配置。
所有规则页 `correct` / `incorrect` 容器中的代码块都会检查，包括前面带说明文字或格式化注释的代码块。
正确示例必须无诊断，错误示例必须有该规则的诊断；解析错误会使检查失败。
需要 setup 上下文时应展示完整 SFC，需要识别 API 时应保留导入。

非默认选项使用明确命名的示例配置，例如 `::: incorrect custom-callbacks`。
在 `examples.ts` 中定义配置，并将同一配置用于对应的正反例；正文同时说明其选项。
类型检查示例通过真实的 TypeScript program 运行。未知配置名或不适用于当前规则的配置会报错。
`<!-- prettier-ignore -->` 可保留刻意触发诊断的格式，不会跳过示例校验。

运行 `pnpm docs:check` 和 `pnpm docs:build`。前者检查目录同步、双语页面覆盖、全部规则示例及诊断渲染；
后者也会验证示例并检查页面链接。修改容器展示时仍需检查实际页面。

排序演示在构建时读取源码规则，配套测试位于 `docs/.vitepress/components/demos/sort-script-setup/` 的数据加载器旁。文档依赖补丁及覆盖配置见 [patches/README.md](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/patches/README.md)；升级相关渲染依赖时请查阅该文件。

## 提交 Pull Request 前 {#before-opening-a-pull-request}

运行仓库检查和文档构建：

```shell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm docs:check
pnpm docs:build
```

描述行为变化、关联相关 issue，并说明验证结果。选项或行为变化时，同步更新规则文档。使用简洁的 Conventional Commit 前缀，例如 `fix:` 或 `docs:`。

CI 在 Linux、Windows 和 macOS 上，使用 Node 22、24 和 26 检查格式、代码及类型，并构建和测试包。独立的文档 CI 任务运行 `pnpm docs:check` 和 `pnpm docs:build`。
