import { configs } from './configs'
import { plugin as basePlugin } from './plugin'
import type { VuePerfectionistPlugin } from './types'

export const plugin: VuePerfectionistPlugin = Object.assign(basePlugin, {
  configs,
})

export { configs }
export type {
  CommonSortOptions,
  CustomGroup,
  GroupEntry,
  PluginConfigs,
  PresetName,
  SortScriptSetupOptions,
  VuePerfectionistPlugin,
} from './types'

export default plugin
