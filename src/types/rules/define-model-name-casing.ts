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
}

export type DefineModelNameCasingMessageId = 'unexpectedNameCasing'
