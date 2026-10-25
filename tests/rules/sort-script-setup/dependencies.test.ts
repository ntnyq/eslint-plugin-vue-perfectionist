import { createVueSFC } from '../../helpers/create-vue-sfc.ts'
import { runSortScriptSetup } from '../../helpers/sort-script-setup.ts'

await runSortScriptSetup({
  valid: [
    ...['watch(() => 0, read, { immediate: true })', 'watchEffect(read)'].map(
      call => ({
        description:
          'preserves immediate dependencies through namespace wrappers',
        code: createVueSFC({
          script: `<script setup lang="ts">
import * as Vue from 'vue'
function read() { return z.value }
const z = Vue.ref(0)
const stop = (Vue as typeof Vue).${call}
</script>`,
        }),
        options: { groups: ['function', 'watch', 'ref'] },
      }),
    ),
    ...['watch(() => 0, read)', 'watchEffect(read, { flush: "post" })'].map(
      call => ({
        description:
          'keeps wrapped deferred callbacks free of immediate dependencies',
        code: createVueSFC({
          script: `<script setup lang="ts">
import * as Vue from 'vue'
function read() { return z.value }
const stop = (Vue as typeof Vue).${call}
const z = Vue.ref(0)
</script>`,
        }),
        options: { groups: ['function', 'watch', 'ref'] },
      }),
    ),
    {
      description: 'preserves eager callback dependencies with auto-imports',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const state = ref(0)
          watchEffect(() => state.value)
          </script>
        `,
      }),
      options: { groups: ['watch', 'ref'] },
      settings: { 'vue-perfectionist': { autoImport: true } },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(() => z.value, () => {})',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch(() => z.value, () => {})
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch([() => z.value], () => {})',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch([() => z.value], () => {})
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(read, () => {})',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch(read, () => {})
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch([read], () => {})',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch([read], () => {})
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(() => 0, read, { immediate: true })',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch(() => 0, read, { immediate: true })
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(() => 0, read, options)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch(() => 0, read, options)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watchEffect(read)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watchEffect(read)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watchSyncEffect(read)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watchSyncEffect(read)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watchEffect((read as () => number))',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watchEffect((read as () => number))
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watch(() => 0, read)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watch(() => 0, read)
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watch(() => 0, read, { immediate: false })',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watch(() => 0, read, { immediate: false })
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchEffect(read, { flush: "post" })',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watchEffect(read, { flush: "post" })
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchEffect(read, { flush: "post" } as const)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watchEffect(read, { flush: "post" } as const)
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchPostEffect(read)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watchPostEffect(read)
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchEffect(() => { onCleanup(read) })',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watchEffect(() => { onCleanup(read) })
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description: 'resolves function-valued variables used as watch callbacks',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watchEffect } from "vue"
          const read = () => z.value
          const z = ref(0)
          const stop = watchEffect(read)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'tracks Vue callbacks nested in immediately called local functions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watchEffect } from "vue"
          function start() { return watchEffect(() => z.value) }
          const z = ref(0)
          const stop = start()
          </script>
        `,
      }),
      options: {
        groups: ['function', 'variable', 'ref'],
      },
    },
    {
      description:
        'resolves imported aliases and explicit globals for synchronous callbacks',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch as observe } from "vue"
          const z = ref(0)
          const stop = observe(() => z.value, () => {})
          </script>
        `,
      }),
      options: {
        groups: ['watch', 'ref'],
      },
    },
    {
      description:
        'resolves imported aliases and explicit globals for synchronous callbacks',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = ref(0)
          const stop = watchEffect(() => z.value)
          </script>
        `,
      }),
      options: {
        groups: ['watch', 'ref'],
        vueGlobals: ['ref', 'watchEffect'],
      },
    },
    {
      description:
        'tracks a named customRef factory without executing returned accessors',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { customRef } from "vue"
          function factory() { record(z); return { get: () => later, set() {} } }
          const z = {}
          const value = customRef(factory)
          const later = {}
          </script>
        `,
      }),
      options: {
        groups: ['function', 'ref', 'variable'],
      },
    },
    {
      description:
        'does not infer Vue callback execution from a foreign customRef name',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { customRef } from "./helpers"
          const a = customRef(() => z)
          const z = {}
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'prioritizes initialization dependencies over group order',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref } from "vue"
          const count = ref(0)
          const snapshot = count.value
          </script>
        `,
      }),
      options: {
        groups: ['variable', 'ref'],
      },
    },
    {
      description: 'keeps initialization dependencies in descending order',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = {}
          const z = a
          </script>
        `,
      }),
      options: {
        type: 'natural',
        order: 'desc',
      },
    },
    {
      description: 'does not treat a deferred capture as an immediate read',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, computed } from "vue"
          const z = computed(() => a.value)
          const a = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['computed', 'ref'],
      },
    },
    {
      description: 'tracks reads through immediately invoked local functions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const dependency = {}
          const first = read()
          function read() { return dependency }
          </script>
        `,
      }),
      options: {
        groups: ['variable', 'function'],
        type: 'natural',
      },
    },
    {
      description: 'tracks reads through an IIFE',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = {}
          const a = (() => z)()
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'retains cycles without an automatic fix',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = a
          const a = z
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description:
        'preserves synchronous callback dependencies in JavaScript setup',
      code: '<script setup>\nimport { ref, watch } from "vue"\nconst z = ref(0)\nwatch(() => z.value, () => {})\n</script>',
      languageOptions: { parserOptions: { parser: null } },
      options: { groups: ['watch', 'ref'] },
    },
  ],
  invalid: [],
})
