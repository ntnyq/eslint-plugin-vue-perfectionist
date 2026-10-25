import { createVueSFC } from '../../helpers/create-vue-sfc.ts'
import { runSortScriptSetup } from '../../helpers/sort-script-setup.ts'
import type { SortScriptSetupOptions } from '../../../src/types/index.ts'

await runSortScriptSetup({
  valid: [
    {
      description: 'keeps auto-import recognition opt-in',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = computed(() => 1)
          const a = ref(0)
          </script>
        `,
      }),
      settings: { 'vue-perfectionist': { autoImport: false } },
    },
    {
      description: 'explicit empty globals override shared auto-imports',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = computed(() => 1)
          const a = ref(0)
          </script>
        `,
      }),
      options: { vueGlobals: [] },
      settings: { 'vue-perfectionist': { autoImport: true } },
    },
    {
      description: 'does not override local bindings with auto-imports',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 1
          const ref = () => 0
          const a = ref()
          </script>
        `,
      }),
      options: { groups: ['constant', 'function', 'variable', 'ref'] },
      settings: { 'vue-perfectionist': { autoImport: true } },
    },
    {
      description: 'does not mistake a local ref for Vue ref',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref } from "./helper"
          const a = ref(0)
          function run() {}
          </script>
        `,
      }),
    },
    {
      description: 'does not override a local binding with vueGlobals',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 1
          const ref = () => 0
          const a = ref()
          </script>
        `,
      }),
      options: {
        groups: ['constant', 'function', 'variable', 'ref'],
        vueGlobals: ['ref'],
      },
    },
    {
      description: 'groups reactive declarations in one bucket',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, reactive } from "vue"
          const z = reactive({})
          const a = ref(0)
          </script>
        `,
      }),
    },
    {
      description: 'treats unconfigured statements as partition boundaries',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 1
          doSomething()
          const a = 2
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'allows an empty groups configuration',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function z() {}
          const a = 2
          </script>
        `,
      }),
      options: {
        groups: [],
        newlinesBetween: 2,
      },
    },
    {
      description:
        'does not use subgroup-specific overrides in a merged bucket',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function z() {}
          function a() {}
          </script>
        `,
      }),
      options: {
        groups: [['functions', 'constant']],
        customGroups: [
          {
            groupName: 'functions',
            selector: 'function',
            type: 'natural',
          },
        ],
      },
    },
    {
      description: 'does not recognize type-only imports as runtime APIs',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import type { ref } from "vue"
          const a = ref(0)
          const b = 1
          </script>
        `,
      }),
      options: {
        groups: ['variable', 'constant', 'ref'],
      },
    },
    {
      description: 'does not recognize type-only imports as runtime APIs',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { type ref } from "vue"
          const a = ref(0)
          const b = 1
          </script>
        `,
      }),
      options: {
        groups: ['variable', 'constant', 'ref'],
      },
    },
    {
      description:
        'does not match calls inside function bodies as custom initializers',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function run() { useRouter() }
          const a = 1
          </script>
        `,
      }),
      options: {
        groups: ['function', 'constant', 'router'],
        customGroups: [
          {
            groupName: 'router',
            callNamePattern: '^useRouter$',
          },
        ],
      },
    },
    {
      description: 'does not infer sources for unresolved auto-imports',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const route = useRouter()
          const a = 1
          </script>
        `,
      }),
      options: {
        groups: ['variable', 'constant', 'router'],
        customGroups: [
          {
            groupName: 'router',
            importSourcePattern: '^vue-router$',
          },
        ],
      },
    },
    {
      description: 'leaves dynamic and optional Vue calls unclassified',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import * as Vue from "vue"
          const a = Vue["ref"](0)
          const b = Vue.ref?.(0)
          </script>
        `,
      }),
      options: {
        groups: ['ref', 'variable'],
      },
    },
    {
      description:
        'keeps unknown members stable even with a global name comparator',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          zebra()
          alpha()
          </script>
        `,
      }),
      options: {
        type: 'natural',
        groups: ['unknown'],
      },
    },
  ],
  invalid: [
    {
      description: 'recognizes wrapped Vue calls without allowing unsafe fixes',
      code: createVueSFC({
        script: `<script setup lang="ts">
import * as Vue from 'vue'
const z = (Vue as typeof Vue).computed(() => 1)
const a = (Vue satisfies typeof Vue).ref(0)
</script>`,
      }),
      errors: [
        {
          messageId: 'unsafeReorder',
          data: { name: 'a', before: 'z', group: 'ref / reactive' },
        },
      ],
      output: null,
    },
    ...(['callNamePattern', 'importSourcePattern'] as const).flatMap(key =>
      ['', { pattern: '' }, ['']].flatMap(pattern =>
        [false, true].map(anyOf => ({
          description: `matches only calls with ${key} ${JSON.stringify(pattern)} and anyOf: ${anyOf}`,
          code: createVueSFC({
            script: `
              <script setup lang="ts">
              import { make } from "./factory"
              const z = 1
              make()
              </script>
            `,
          }),
          options: {
            groups: ['matches', 'constant', 'unknown'],
            customGroups: [
              {
                groupName: 'matches',
                ...(anyOf
                  ? { anyOf: [{ [key]: pattern }] }
                  : { [key]: pattern }),
              },
            ],
          },
          errors: [
            {
              messageId: 'unsafeReorder' as const,
              data: { name: 'make', before: 'z', group: 'matches' },
            },
          ],
          output: null,
        })),
      ),
    ),
    ...[false, true].map(withGlobals => ({
      description: `classifies auto-imports without unsafe fixes, globals: ${withGlobals}`,
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = computed(() => 1)
          const a = ref(0)
          </script>
        `,
      }),
      settings: { 'vue-perfectionist': { autoImport: true } },
      languageOptions: withGlobals
        ? {
            globals: {
              computed: 'readonly' as const,
              ref: 'readonly' as const,
            },
          }
        : {},
      errors: [
        {
          messageId: 'unsafeReorder' as const,
          data: { name: 'a', before: 'z', group: 'ref / reactive' },
        },
      ],
      output: null,
    })),
    {
      description: 'enforces grouping with unsorted',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function run() {}
          interface Props {}
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          data: {
            name: 'Props',
            before: 'run',
            group: 'interface / type',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          interface Props {}
          function run() {}
          </script>
        `,
      }),
    },
    {
      description:
        'recognizes macro declarations and withDefaults without moving them',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const emit = defineEmits(["update"])
          const { title } = withDefaults(defineProps<{ title?: string }>(), { title: "" })
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'title',
            before: 'emit',
            group: 'define-props',
          },
        },
      ],
      output: null,
    },
    {
      description: 'recognizes imported aliases and namespace members',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref as makeRef } from "vue"
          import * as Vue from "vue"
          const z = Vue.computed(() => 1)
          const a = makeRef(0)
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'ref / reactive',
          },
        },
      ],
      output: null,
    },
    {
      description: 'recognizes explicit Vue globals',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = computed(() => 1)
          const a = ref(0)
          </script>
        `,
      }),
      options: {
        vueGlobals: ['ref', 'computed'],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'ref / reactive',
          },
        },
      ],
      output: null,
    },
    {
      description: 'supports additional exact Vue import sources',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, computed } from "@vue/reactivity"
          const z = computed(() => 1)
          const a = ref(0)
          </script>
        `,
      }),
      options: {
        vueImportSources: ['@vue/reactivity'],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'ref / reactive',
          },
        },
      ],
      output: null,
    },
    {
      description: 'groups reactive declarations in one bucket',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, reactive } from "vue"
          const z = reactive({})
          const a = ref(0)
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'ref / reactive',
          },
        },
      ],
      output: null,
    },
    {
      description: 'matches modifier groups before plain selectors',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          async function run() {}
          function stop() {}
          </script>
        `,
      }),
      options: {
        groups: ['function', 'async-function'],
      },
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          data: {
            name: 'stop',
            before: 'run',
            group: 'function',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function stop() {}
          async function run() {}
          </script>
        `,
      }),
    },
    {
      description: 'does not infer ref(null) to be a template-ref',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, useTemplateRef } from "vue"
          const el = ref(null)
          const input = useTemplateRef("input")
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'input',
            before: 'el',
            group: 'template-ref',
          },
        },
      ],
      output: null,
    },
    {
      description: 'classifies watch handles and lifecycle registrations',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { watchEffect, onMounted } from "vue"
          onMounted(() => {})
          const stop = watchEffect(() => {})
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'stop',
            before: 'onMounted',
            group: 'watch',
          },
        },
      ],
      output: null,
    },
    {
      description: 'allows an explicit unknown group',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          doSomething()
          const a = 2
          </script>
        `,
      }),
      options: {
        groups: ['constant', 'unknown'],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'doSomething',
            group: 'constant',
          },
        },
      ],
      output: null,
    },
    {
      description:
        'matches import sources and original imported function names',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { useRouter as router } from "vue-router"
          import { ref } from "vue"
          const count = ref(0)
          const route = router()
          </script>
        `,
      }),
      options: {
        groups: ['router', 'ref'],
        customGroups: [
          {
            groupName: 'router',
            callNamePattern: '^useRouter$',
            importSourcePattern: '^vue-router$',
          },
        ],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'route',
            before: 'count',
            group: 'router',
          },
        },
      ],
      output: null,
    },
    {
      description: 'uses the first matching custom group and anyOf',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function run() {}
          function handleClick() {}
          </script>
        `,
      }),
      options: {
        groups: ['handlers', 'others'],
        customGroups: [
          {
            groupName: 'handlers',
            anyOf: [
              {
                selector: 'function',
                elementNamePattern: '^handle',
              },
              {
                elementNamePattern: '^on',
              },
            ],
          },
          {
            groupName: 'others',
            selector: 'function',
          },
        ],
      },
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          data: {
            name: 'handleClick',
            before: 'run',
            group: 'handlers',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function handleClick() {}
          function run() {}
          </script>
        `,
      }),
    },
    {
      description: 'lets custom overrides win over a standalone group override',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function a() {}
          function z() {}
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'functions',
            type: 'natural',
            order: 'asc',
          },
        ],
        customGroups: [
          {
            groupName: 'functions',
            selector: 'function',
            order: 'desc',
          },
        ],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'z',
            before: 'a',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function z() {}
          function a() {}
          </script>
        `,
      }),
    },
    ...['g', 'y', 'gy'].map(flags => ({
      description: `handles cached regex flags deterministically: ${flags}`,
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function z() {}
          function a() {}
          </script>
        `,
      }),
      options: {
        groups: ['functions'],
        customGroups: [
          {
            groupName: 'functions',
            elementNamePattern: {
              pattern: '.*',
              flags,
            },
            type: 'natural',
          },
        ],
      } satisfies SortScriptSetupOptions,
      errors: [
        {
          messageId: 'unexpectedOrder' as const,
          data: {
            name: 'a',
            before: 'z',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function a() {}
          function z() {}
          </script>
        `,
      }),
    })),
    {
      description: 'tracks runtime sources for default imported composables',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import useStore from "./store"
          const a = 1
          const store = useStore()
          </script>
        `,
      }),
      options: {
        groups: ['store', 'constant'],
        customGroups: [
          {
            groupName: 'store',
            callNamePattern: '^useStore$',
            importSourcePattern: '^./store$',
          },
        ],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'store',
            before: 'a',
            group: 'store',
          },
        },
      ],
      output: null,
    },
    {
      description: 'can match a secondary destructuring binding',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 1
          const { x, special } = getState()
          </script>
        `,
      }),
      options: {
        groups: ['special', 'constant'],
        customGroups: [
          {
            groupName: 'special',
            elementNamePattern: '^special$',
          },
        ],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'x',
            before: 'a',
            group: 'special',
          },
        },
      ],
      output: null,
    },
    {
      description: 'recognizes calls inside TypeScript expression wrappers',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, computed } from "vue"
          const z = computed(() => 1) as unknown
          const a = ref(0)!
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'ref / reactive',
          },
        },
      ],
      output: null,
    },
    {
      description:
        'allows explicit unknown-group sorting without claiming safe fixes',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          zebra()
          alpha()
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'unknown',
            type: 'natural',
          },
        ],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'alpha',
            before: 'zebra',
            group: 'unknown',
          },
        },
      ],
      output: null,
    },
  ],
})
