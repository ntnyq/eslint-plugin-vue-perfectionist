---
layout: home
description: 可配置的 ESLint 规则，涵盖 Vue 3 回调函数、组合式函数、宏、命名、组件使用约定、模板和 setup 语句排序。

hero:
  name: Vue Perfectionist
  text: 为 Vue 代码统一规范。
  tagline: 为你的 Vue 3 项目选择合适的规则，涵盖回调函数、宏类型、组件使用约定、模板可读性和 setup 语句排序。
  image:
    light: /logo-light.svg
    dark: /logo-dark.svg
    alt: Vue Perfectionist 标志
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/
    - theme: alt
      text: 浏览规则
      link: /zh/rules/
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/ntnyq/eslint-plugin-vue-perfectionist

features:
  - icon: 🧩
    title: 回调函数与组合式函数
    details: 配置回调风格与行数、组合式函数参数结构，以及受支持的 Vue 脚本和独立脚本中的函数声明。
    link: /zh/guide/rule-composition#callbacks-and-composables
    linkText: 统一脚本规范
  - icon: 📝
    title: 宏布局与类型
    details: 选择内联、本地声明或导入的宏类型，要求调用处使用指定类型名称，并规范内联宏声明的格式。
    link: /zh/guide/rule-composition#macro-types-and-layout
    linkText: 组合宏规则
  - icon: 🏷️
    title: ref 与返回值命名
    details: 统一模板 ref 的变量名与键名，强制使用指定命名模式，并在支持的情况下优先使用模板 ref 类型推断。
    link: /zh/guide/rule-composition#template-refs
    linkText: 配置 ref 规范
  - icon: 📦
    title: 组件使用约定
    details: 声明必需的 prop 和插槽，约束传入 prop 的类型和值，并要求为指定组件添加泛型注释。
    link: /zh/guide/rule-composition#component-usage-contracts
    linkText: 定义组件约定
  - icon: 📐
    title: 模板可读性
    details: 保持迭代数据源和事件处理器简洁，合并混合文本插值，并精确配置标签之间的空行数。
    link: /zh/guide/rule-composition#template-readability
    linkText: 完善模板规范
  - icon: 🎛️
    title: setup 语句排序
    details: 根据语句在 Vue 中的作用分组，并选择排序方式。自动修复仅移动已确认可安全调整顺序的声明。
    link: /zh/rules/sort-script-setup
    linkText: 了解语句排序
---

## 从项目规范开始 {#start-with-your-project-conventions}

Vue Perfectionist 仅提供规则，不提供内置预设。请在
ESLint 扁平化配置中注册插件，并启用所需检查。
每条规则都会说明其文件范围、默认值、选项和自动修复边界。

请参阅[快速开始](/zh/guide/)，了解安装步骤和完整的 Vue 单文件组件
配置；参阅[配置](/zh/guide/configuration)，了解独立
JS/TS 文件、自动导入识别和公共选项类型；也可以浏览
[规则概览](/zh/rules/)，按用途选择检查项。

## 参与插件开发 {#work-on-the-plugin}

本地环境配置、测试、包构建及文档维护请参阅[贡献指南](/zh/guide/contributing)。
[架构与设计](/zh/design/)介绍了源码职责划分，以及
规则的分析与修复约定。
