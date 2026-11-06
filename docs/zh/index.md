---
layout: home
description: 可配置的 ESLint 规则，涵盖 Vue 3 回调函数、组合式函数、宏、命名、组件使用约定、模板和 setup 语句排序。

hero:
  name: Vue Perfectionist
  text: 为 Vue 代码统一规范。
  tagline: 可配置的 ESLint 规则，帮助你编写易读、易维护的 Vue 3 脚本和模板。
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
    details: 保持回调简洁，统一组合式函数定义与 API 使用约定。
    link: /zh/rules/#callbacks-and-composables
    linkText: 浏览相关规则
  - icon: 📝
    title: 宏声明与组件模型
    details: 统一 props、emits、slots 和 model 的类型与声明布局。
    link: /zh/rules/#macros-and-component-models
    linkText: 浏览相关规则
  - icon: 🏷️
    title: ref 与返回值命名
    details: 统一模板 ref 与函数返回值的命名，利用模板 ref 类型推断。
    link: /zh/rules/#refs-and-result-names
    linkText: 浏览相关规则
  - icon: 📦
    title: 组件使用约定
    details: 根据项目对 prop、插槽和泛型的要求，检查组件使用方式。
    link: /zh/rules/#component-usage-contracts
    linkText: 浏览相关规则
  - icon: 📐
    title: 模板规范
    details: 简化模板表达式，统一 HTML 元素使用、文本插值和空行规范。
    link: /zh/rules/#template-conventions
    linkText: 浏览相关规则
  - icon: 🎛️
    title: 语句排序
    details: 根据语句在 Vue 中的作用组织 setup 代码，自定义分组与排序方式。
    link: /zh/rules/#statement-ordering
    linkText: 浏览相关规则
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

本地环境配置、测试及文档维护请参阅[贡献指南](/zh/guide/contributing)。
