import { createVueSFC } from '../../helpers/create-vue-sfc.ts'
import { runSortScriptSetup } from '../../helpers/sort-script-setup.ts'

await runSortScriptSetup({
  valid: [
    {
      description: 'preserves intra-group order by default',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 1
          const a = 2
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"natural"}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        ignoreCase: true,
      },
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        fallbackSort: {
          type: 'natural',
        },
        ignoreCase: true,
      },
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"groups":[{"group":"constant","type":"natural"}]}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'constant',
            type: 'natural',
          },
        ],
        ignoreCase: true,
      },
    },
    {
      description:
        'compares custom alphabets and name lengths by Unicode code point',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮷 = 0
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'custom',
        alphabet: 'x',
      },
    },
    {
      description: 'supports alphabetical sorting',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item10 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'alphabetical',
      },
    },
    {
      description: 'retains ties and disables fallback for unsorted',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const A = 1
          </script>
        `,
      }),
      options: {
        type: 'alphabetical',
        ignoreCase: true,
      },
    },
    {
      description: 'retains ties and disables fallback for unsorted',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 1
          </script>
        `,
      }),
      options: {
        fallbackSort: {
          type: 'natural',
        },
      },
    },
    {
      description: 'normalizes special characters for comparison',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const _a = 0
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'natural',
        specialCharacters: 'trim',
      },
    },
    {
      description: 'normalizes special characters for comparison',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a_b = 0
          const ab = 1
          </script>
        `,
      }),
      options: {
        type: 'natural',
        specialCharacters: 'remove',
      },
    },
    {
      description: 'ignores sorting preferences in both settings namespaces',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 1
          </script>
        `,
      }),
      settings: {
        perfectionist: {
          type: 'natural',
        },
        'vue-perfectionist': {
          type: 'natural',
        },
      },
    },
    {
      description: 'uses explicit rule options regardless of settings',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'unsorted',
      },
      settings: {
        'vue-perfectionist': {
          type: 'natural',
        },
      },
    },
    {
      description: 'ignores invalid settings when rule options are provided',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'unsorted',
      },
      settings: {
        perfectionist: {
          type: 'usage',
        },
      },
    },
  ],
  invalid: [
    {
      description:
        'negotiates multiple locales for Unicode names: {"type":"natural"}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const ä = 1
          const z = 2
          </script>
        `,
      }),
      options: {
        type: 'natural',
        locales: ['zz-ZZ', 'sv-SE', 'en-US'],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'z',
            before: 'ä',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 2
          const ä = 1
          </script>
        `,
      }),
    },
    {
      description:
        'negotiates multiple locales for Unicode names: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const ä = 1
          const z = 2
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        fallbackSort: {
          type: 'natural',
        },
        locales: ['zz-ZZ', 'sv-SE', 'en-US'],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'z',
            before: 'ä',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 2
          const ä = 1
          </script>
        `,
      }),
    },
    {
      description:
        'negotiates multiple locales for Unicode names: {"groups":[{"group":"constant","type":"natural"}]}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const ä = 1
          const z = 2
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'constant',
            type: 'natural',
          },
        ],
        locales: ['zz-ZZ', 'sv-SE', 'en-US'],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'z',
            before: 'ä',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 2
          const ä = 1
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"natural"}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        ignoreCase: false,
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'item2',
            before: 'Item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"natural"}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        ignoreCase: false,
        order: 'desc',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'Item2',
            before: 'item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        fallbackSort: {
          type: 'natural',
        },
        ignoreCase: false,
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'item2',
            before: 'Item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        fallbackSort: {
          type: 'natural',
        },
        ignoreCase: false,
        order: 'desc',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'Item2',
            before: 'item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"groups":[{"group":"constant","type":"natural"}]}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'constant',
            type: 'natural',
          },
        ],
        ignoreCase: false,
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'item2',
            before: 'Item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"groups":[{"group":"constant","type":"natural"}]}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'constant',
            type: 'natural',
          },
        ],
        ignoreCase: false,
        order: 'desc',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'Item2',
            before: 'item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'keeps numeric precedence when natural sorting is case sensitive',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item10 = 0
          const Item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        ignoreCase: false,
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'Item2',
            before: 'item10',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item10 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'compares custom alphabets and name lengths by Unicode code point',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮷 = 0
          const 𠮶 = 0
          </script>
        `,
      }),
      options: {
        type: 'custom',
        alphabet: '𠮶𠮷',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: '𠮶',
            before: '𠮷',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮶 = 0
          const 𠮷 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'compares custom alphabets and name lengths by Unicode code point',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const 𠮷 = 0
          </script>
        `,
      }),
      options: {
        type: 'custom',
        alphabet: '𠮷a',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: '𠮷',
            before: 'a',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮷 = 0
          const a = 0
          </script>
        `,
      }),
    },
    {
      description:
        'compares custom alphabets and name lengths by Unicode code point',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮶 = 0
          const 𠮷 = 0
          </script>
        `,
      }),
      options: {
        type: 'custom',
        alphabet: '𠮶𠮷',
        order: 'desc',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: '𠮷',
            before: '𠮶',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮷 = 0
          const 𠮶 = 0
          </script>
        `,
      }),
    },
    {
      description: 'supports natural sorting',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item10 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'item2',
            before: 'item10',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const item10 = 0
          </script>
        `,
      }),
    },
    {
      description: 'applies descending order only inside groups',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function alpha() {}
          function zebra() {}
          const b = 2
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'natural',
        order: 'desc',
      },
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          data: {
            name: 'b',
            before: 'alpha',
            group: 'constant',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const b = 2
          const a = 1
          function zebra() {}
          function alpha() {}
          </script>
        `,
      }),
    },
    {
      description: 'uses source length and a fallback for equal lengths',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const zz = 0
          const bb = 0
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        fallbackSort: {
          type: 'natural',
        },
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'a',
            before: 'zz',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const bb = 0
          const zz = 0
          </script>
        `,
      }),
    },
    {
      description: 'supports custom alphabets',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const b = 0
          </script>
        `,
      }),
      options: {
        type: 'custom',
        alphabet: 'ba',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'b',
            before: 'a',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const b = 0
          const a = 0
          </script>
        `,
      }),
    },
    {
      description: 'supports subgroup order as a fallback',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          type T = {}
          interface I {}
          </script>
        `,
      }),
      options: {
        groups: [['interface', 'type']],
        type: 'custom',
        alphabet: 'x',
        fallbackSort: {
          type: 'subgroup-order',
        },
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'I',
            before: 'T',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          interface I {}
          type T = {}
          </script>
        `,
      }),
    },
    {
      description: 'supports locale arrays',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'alphabetical',
        locales: ['en-US'],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'a',
            before: 'z',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const z = 0
          </script>
        `,
      }),
    },
    {
      description: 'sorts using explicit rule options',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'a',
            before: 'z',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 1
          const z = 0
          </script>
        `,
      }),
    },
    {
      description:
        'inherits rule order for fallback sorting and ignores settings',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const aa = 0
          const zz = 0
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        order: 'desc',
        fallbackSort: {
          type: 'natural',
        },
      },
      settings: {
        perfectionist: {
          fallbackSort: {
            type: 'natural',
            order: 'asc',
          },
        },
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'zz',
            before: 'aa',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const zz = 0
          const aa = 0
          </script>
        `,
      }),
    },
    {
      description: 'accepts natural sorting with multiple locales',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item10 = 1
          const item2 = 2
          </script>
        `,
      }),
      options: {
        type: 'natural',
        locales: ['en-US', 'zh-CN'],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'item2',
            before: 'item10',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 2
          const item10 = 1
          </script>
        `,
      }),
    },
  ],
})
