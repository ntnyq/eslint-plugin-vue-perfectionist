import { configs } from './configs.ts'
import { plugin as basePlugin } from './plugin.ts'
import type { VuePerfectionistPlugin } from './types/index.ts'

export const plugin: VuePerfectionistPlugin = Object.assign(basePlugin, {
  configs,
})

export { configs }
export type {
  CallbackGroup,
  CallbackStyleOptions,
  CommonSortOptions,
  CustomCallback,
  CustomGroup,
  DefineMacrosNewlineMacro,
  DefineMacrosNewlineOptions,
  GroupEntry,
  PluginConfigs,
  PreferRefPatternOptions,
  PresetName,
  RefPatternTarget,
  SortScriptSetupOptions,
  VuePerfectionistPlugin,
} from './types/index.ts'

export default plugin
