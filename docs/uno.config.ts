import {
  defineConfig,
  presetIcons,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  transformers: [transformerDirectives(), transformerVariantGroup()],

  content: {
    // Extract theme utilities before VitePress serves the initial dev stylesheet.
    filesystem: ['.vitepress/{components,theme}/**/*.vue'],
  },

  presets: [
    presetWind4(),
    presetIcons({
      autoInstall: true,
      extraProperties: {},
      scale: 1.2,
    }),
  ],
})
