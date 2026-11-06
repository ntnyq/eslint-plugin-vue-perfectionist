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

`dist/` 和 `docs/.vitepress/dist/` 为生成产物，请修改其源文件。提交前钩子会通过 nano-staged 运行代码检查及格式修复。

## 修改规则 {#rule-changes}

新增规则时，请遵循仓库的 [add-eslint-rule 技能](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/.agents/skills/add-eslint-rule/SKILL.md)，其中涵盖规则元信息、选项、注册、公共类型、测试及文档。

以下内容需要保持同步：

- `src/rules/` 中的实现和 `src/types/rules/` 中的配置类型。
- `src/plugin.ts` 中的注册及 `src/index.ts` 中的公共导出。
- `tests/rules/` 中的规则行为测试和插件约定测试。
- 中英文 README 的规则列表、[规则概览](/zh/rules/)及规则侧栏。
- 中英文规则页面、示例及受影响的规则组合或设计文档。

规则行为测试通过 `tests/helpers/rule-tester.ts` 的 `run` 使用 `eslint-vitest-rule-tester`。断言报告的问题和期望输出；对于不提供修复的问题，使用 `output: null`。共享测试运行器会验证重复修复的稳定性和修复后的代码。无效选项使用 `createRuleTester<unknown>` 测试，ESLint 的 `Linter` 仅用于插件集成测试。

按需覆盖规则的实际文件范围、解析器变体、选项组合、导入身份和局部遮蔽。自动修复必须保持程序行为；修复安全边界发生变化时，需补充回归测试。

## 修改文档 {#documentation-changes}

英文文档位于 `docs/`，简体中文文档位于 `docs/zh/`，两者应保持同步。安装和共享配置与各规则选项分开说明；实现约定和取舍记录在[设计文档](/zh/design/)中。

规则页面用 `::: correct` 展示正确代码，用 `::: incorrect` 展示会报告问题的代码，包括不提供自动修复的情况。正反例分开展示，配置示例使用普通代码块。保留用于触发诊断的代码格式。

`docs/.vitepress/config.ts` 注册了这些容器及每条规则的 ESLint 示例。渲染的诊断使用已配置的示例选项，不会从正文推断选项。修改容器或诊断示例时，请对照测试并检查页面渲染结果。仅构建成功不足以证明示例报告了预期问题。

排序演示在构建时读取源码规则，配套测试位于 `docs/.vitepress/components/demos/sort-script-setup/` 的数据加载器旁。文档依赖补丁及覆盖配置见 [patches/README.md](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/patches/README.md)；升级相关渲染依赖时请查阅该文件。

## 提交 Pull Request 前 {#before-opening-a-pull-request}

运行仓库检查和文档构建：

```shell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm docs:build
```

描述行为变化、关联相关 issue，并说明验证结果。选项或行为变化时，同步更新规则文档。使用简洁的 Conventional Commit 前缀，例如 `fix:` 或 `docs:`。

CI 在 Linux、Windows 和 macOS 上，使用 Node 22、24 和 26 检查格式、代码及类型，并构建和测试包。文档构建是单独的本地检查，目前不在 CI 流程中。
