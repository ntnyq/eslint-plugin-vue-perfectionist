export type DefineModelNameCasing =
  | 'camelCase'
  | 'kebab-case'
  | 'PascalCase'
  | 'snake_case'

export interface DefineModelNameCasingOptions {
  /**
   * Casing used for explicit defineModel names, as normalized by uncase.
   * @default 'camelCase'
   */
  casing?: DefineModelNameCasing

  /**
   * Automatically rename explicit model names, changing the component's prop,
   * update event, and modifiers contract. Consumers must be reviewed separately.
   * @default false
   */
  fix?: boolean
}

export type DefineModelNameCasingMessageId = 'unexpectedNameCasing'
