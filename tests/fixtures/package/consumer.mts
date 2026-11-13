import plugin, { plugin as namedPlugin } from 'eslint-plugin-vue-perfectionist'
import type {
  CallbackGroup,
  CallbackStyleOptions,
  CommonSortOptions,
  ComponentPropScalar,
  ComponentPropType,
  ComponentPropTypeConstraint,
  ComponentPropTypeDescriptor,
  ComponentPropTypesOptions,
  ComponentPropTypesTarget,
  ComponentPropValueConstraint,
  ComponentPropValuesOptions,
  ComponentPropValuesTarget,
  ComposableCustomGroup,
  ComposableGroupEntry,
  ComposableGroupOverrides,
  ComposableMemberKind,
  ComposableMemberKindOverride,
  ComposableNewlines,
  ComposableSortType,
  CustomCallback,
  CustomGroup,
  DefineMacrosNewlineMacro,
  DefineMacrosNewlineOptions,
  DefineMacrosTypeStyle,
  DefineMacrosTypeStyleMacro,
  DefineMacrosTypeStyleOptions,
  DefineModelNameCasing,
  DefineModelNameCasingOptions,
  GroupEntry,
  MaxLinesPerCallbackOptions,
  NoComplexTemplateExpressionDirective,
  NoComplexTemplateExpressionOptions,
  NoComplexVForSourceOptions,
  NoRestrictedHtmlElementsOptions,
  PaddingLineBetweenTagsBlankLine,
  PaddingLineBetweenTagsEntry,
  PaddingLineBetweenTagsOptions,
  PreferComposableOptionsOptions,
  PreferDefineModelOptions,
  PreferFunctionDeclarationOptions,
  PreferFunctionDeclarationScope,
  PreferFunctionResultPatternOptions,
  PreferFunctionResultPatternTarget,
  PreferOnScopeDisposeHook,
  PreferOnScopeDisposeOptions,
  PreferRefPatternOptions,
  PreferSimpleEventHandlerOptions,
  PreferTemplateLiteralInInterpolationOptions,
  PreferUseTemplateRefInferenceOptions,
  PreferWatchEffectAliasOptions,
  RefPatternTarget,
  RequireComponentPropsOptions,
  RequireComponentPropsTarget,
  RequireComponentSlotsOptions,
  RequireComponentSlotsTarget,
  RequireComposableReturnBindingsOptions,
  RequireInjectionKeyOptions,
  RequireMacroTypeNameMacro,
  RequireMacroTypeNameOptions,
  RequirePropsPrefixOptions,
  RequireVueGenericIgnoreCondition,
  RequireVueGenericOptions,
  RequireVueGenericTarget,
  RestrictedHtmlElement,
  SortComposableDestructureOptions,
  SortComposableOptions,
  SortComposableReturnOptions,
  SortScriptSetupOptions,
  VuePerfectionistPlugin,
  VuePerfectionistSettings,
} from 'eslint-plugin-vue-perfectionist'
import type { Linter } from 'eslint'

export interface PublicTypes {
  CallbackGroup: CallbackGroup
  CallbackStyleOptions: CallbackStyleOptions
  CommonSortOptions: CommonSortOptions
  ComponentPropScalar: ComponentPropScalar
  ComponentPropType: ComponentPropType
  ComponentPropTypeConstraint: ComponentPropTypeConstraint
  ComponentPropTypeDescriptor: ComponentPropTypeDescriptor
  ComponentPropTypesOptions: ComponentPropTypesOptions
  ComponentPropTypesTarget: ComponentPropTypesTarget
  ComponentPropValueConstraint: ComponentPropValueConstraint
  ComponentPropValuesOptions: ComponentPropValuesOptions
  ComponentPropValuesTarget: ComponentPropValuesTarget
  ComposableCustomGroup: ComposableCustomGroup
  ComposableGroupEntry: ComposableGroupEntry
  ComposableGroupOverrides: ComposableGroupOverrides
  ComposableMemberKind: ComposableMemberKind
  ComposableMemberKindOverride: ComposableMemberKindOverride
  ComposableNewlines: ComposableNewlines
  ComposableSortType: ComposableSortType
  CustomCallback: CustomCallback
  CustomGroup: CustomGroup
  DefineMacrosNewlineMacro: DefineMacrosNewlineMacro
  DefineMacrosNewlineOptions: DefineMacrosNewlineOptions
  DefineMacrosTypeStyle: DefineMacrosTypeStyle
  DefineMacrosTypeStyleMacro: DefineMacrosTypeStyleMacro
  DefineMacrosTypeStyleOptions: DefineMacrosTypeStyleOptions
  DefineModelNameCasing: DefineModelNameCasing
  DefineModelNameCasingOptions: DefineModelNameCasingOptions
  GroupEntry: GroupEntry
  MaxLinesPerCallbackOptions: MaxLinesPerCallbackOptions
  NoComplexTemplateExpressionDirective: NoComplexTemplateExpressionDirective
  NoComplexTemplateExpressionOptions: NoComplexTemplateExpressionOptions
  NoComplexVForSourceOptions: NoComplexVForSourceOptions
  NoRestrictedHtmlElementsOptions: NoRestrictedHtmlElementsOptions
  PaddingLineBetweenTagsBlankLine: PaddingLineBetweenTagsBlankLine
  PaddingLineBetweenTagsEntry: PaddingLineBetweenTagsEntry
  PaddingLineBetweenTagsOptions: PaddingLineBetweenTagsOptions
  PreferComposableOptionsOptions: PreferComposableOptionsOptions
  PreferDefineModelOptions: PreferDefineModelOptions
  PreferFunctionDeclarationOptions: PreferFunctionDeclarationOptions
  PreferFunctionDeclarationScope: PreferFunctionDeclarationScope
  PreferFunctionResultPatternOptions: PreferFunctionResultPatternOptions
  PreferFunctionResultPatternTarget: PreferFunctionResultPatternTarget
  PreferOnScopeDisposeHook: PreferOnScopeDisposeHook
  PreferOnScopeDisposeOptions: PreferOnScopeDisposeOptions
  PreferRefPatternOptions: PreferRefPatternOptions
  PreferSimpleEventHandlerOptions: PreferSimpleEventHandlerOptions
  PreferTemplateLiteralInInterpolationOptions: PreferTemplateLiteralInInterpolationOptions
  PreferUseTemplateRefInferenceOptions: PreferUseTemplateRefInferenceOptions
  PreferWatchEffectAliasOptions: PreferWatchEffectAliasOptions
  RefPatternTarget: RefPatternTarget
  RequireComponentPropsOptions: RequireComponentPropsOptions
  RequireComponentPropsTarget: RequireComponentPropsTarget
  RequireComponentSlotsOptions: RequireComponentSlotsOptions
  RequireComponentSlotsTarget: RequireComponentSlotsTarget
  RequireComposableReturnBindingsOptions: RequireComposableReturnBindingsOptions
  RequireInjectionKeyOptions: RequireInjectionKeyOptions
  RequireMacroTypeNameMacro: RequireMacroTypeNameMacro
  RequireMacroTypeNameOptions: RequireMacroTypeNameOptions
  RequirePropsPrefixOptions: RequirePropsPrefixOptions
  RequireVueGenericIgnoreCondition: RequireVueGenericIgnoreCondition
  RequireVueGenericOptions: RequireVueGenericOptions
  RequireVueGenericTarget: RequireVueGenericTarget
  RestrictedHtmlElement: RestrictedHtmlElement
  SortComposableDestructureOptions: SortComposableDestructureOptions
  SortComposableOptions: SortComposableOptions
  SortComposableReturnOptions: SortComposableReturnOptions
  SortScriptSetupOptions: SortScriptSetupOptions
  VuePerfectionistPlugin: VuePerfectionistPlugin
  VuePerfectionistSettings: VuePerfectionistSettings
}

const sorting = { type: 'natural', fix: 'safe' } satisfies SortScriptSetupOptions
const settings = { autoImport: true, vueuse: false } satisfies VuePerfectionistSettings
export const returnBindings = {
  functionPattern: '^use[A-Z]',
  ignoreNames: [],
  allowAliases: true,
  allowParameters: false,
} satisfies RequireComposableReturnBindingsOptions

export const configuration: Linter.Config = {
  plugins: { vp: plugin },
  settings: { 'vue-perfectionist': settings },
  rules: { 'vp/sort-script-setup': ['error', sorting] },
}
export const hostPlugin: VuePerfectionistPlugin = namedPlugin

// @ts-expect-error Invalid public option values must remain rejected.
export const invalidSorting: SortScriptSetupOptions = { type: 'random' }

// @ts-expect-error Shared settings accept booleans only.
export const invalidSettings: VuePerfectionistSettings = { autoImport: 'yes' }

// @ts-expect-error The return binding parameter policy accepts booleans only.
export const invalidReturnBindings: RequireComposableReturnBindingsOptions = { allowParameters: 'yes' }

// @ts-expect-error Internal registry types are not package exports.
export type { RuleName } from 'eslint-plugin-vue-perfectionist'
