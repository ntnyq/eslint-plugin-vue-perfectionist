import { createVueSFC } from '../../helpers/create-vue-sfc.ts'
import { runSortScriptSetup } from '../../helpers/sort-script-setup.ts'
import type { SortScriptSetupOptions } from '../../../src/types/index.ts'

await runSortScriptSetup({
  valid: [],
  invalid: [
    {
      description: 'formats inside and between groups independently',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0

          const b = 0
          function run() {}
          </script>
        `,
      }),
      options: {
        newlinesBetween: 1,
        newlinesInside: 0,
      },
      errors: [
        {
          messageId: 'unexpectedNewlinesInside',
          data: {
            count: 0,
          },
        },
        {
          messageId: 'unexpectedNewlinesBetween',
          data: {
            count: 1,
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const b = 0

          function run() {}
          </script>
        `,
      }),
    },
    ...[2 ** 32, Number.MAX_SAFE_INTEGER].flatMap(count =>
      (
        [
          { newlinesInside: count },
          { groups: [{ group: 'constant', newlinesInside: count }] },
          {
            groups: ['declarations'],
            customGroups: [
              {
                groupName: 'declarations',
                selector: 'constant',
                newlinesInside: count,
              },
            ],
          },
        ] satisfies SortScriptSetupOptions[]
      ).map(options => ({
        description:
          'reports huge inside-group counts without allocating fixes',
        code: '<script setup>\nconst a = 0\nconst b = 0\n</script>',
        options,
        errors: [
          {
            messageId: 'unexpectedNewlinesInside' as const,
            data: { count },
          },
        ],
        output: null,
      })),
    ),
    ...[2 ** 32, Number.MAX_SAFE_INTEGER].flatMap(count =>
      (
        [
          { newlinesBetween: count },
          { groups: ['constant', { newlinesBetween: count }, 'function'] },
        ] satisfies SortScriptSetupOptions[]
      ).map(options => ({
        description:
          'reports huge between-group counts without allocating fixes',
        code: '<script setup>\nconst a = 0\nfunction run() {}\n</script>',
        options,
        errors: [
          {
            messageId: 'unexpectedNewlinesBetween' as const,
            data: { count },
          },
        ],
        output: null,
      })),
    ),
    ...[
      { eol: '\n', indent: '', count: 65_535 },
      { eol: '\r\n', indent: '', count: 32_767 },
      { eol: '\n', indent: '  ', count: 65_533 },
      { eol: '\r\n', indent: '  ', count: 32_766 },
    ].map(({ eol, indent, count }) => ({
      description: 'fixes whitespace at the replacement length limit',
      code: `<script setup>${eol}const a = 0${eol}${indent}const b = 0${eol}</script>`,
      options: { newlinesInside: count },
      errors: [
        {
          messageId: 'unexpectedNewlinesInside' as const,
          data: { count },
        },
      ],
      output: `<script setup>${eol}const a = 0${eol.repeat(count + 1)}${indent}const b = 0${eol}</script>`,
    })),
    ...[
      { eol: '\n', indent: '', count: 65_536 },
      { eol: '\r\n', indent: '', count: 32_768 },
      { eol: '\n', indent: '  ', count: 65_535 },
      { eol: '\r\n', indent: '  ', count: 32_767 },
    ].map(({ eol, indent, count }) => ({
      description:
        'includes line endings and indentation in the whitespace fix limit',
      code: `<script setup>${eol}const a = 0${eol}${indent}const b = 0${eol}</script>`,
      options: { newlinesInside: count },
      errors: [
        {
          messageId: 'unexpectedNewlinesInside' as const,
          data: { count },
        },
      ],
      output: null,
    })),
    {
      description: 'resolves newline separators across absent groups',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          function run() {}
          </script>
        `,
      }),
      options: {
        newlinesBetween: 0,
        groups: [
          'constant',
          {
            newlinesBetween: 2,
          },
          'variable',
          'function',
        ],
      },
      errors: [
        {
          messageId: 'unexpectedNewlinesBetween',
          data: {
            count: 2,
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0


          function run() {}
          </script>
        `,
      }),
    },
    {
      description: 'supports the legacy newlinesInside compatibility value',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0

          const b = 0
          </script>
        `,
      }),
      options: {
        newlinesBetween: 1,
        newlinesInside: 'newlinesBetween',
      },
      errors: [
        {
          messageId: 'unexpectedNewlinesInside',
          data: {
            count: 0,
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const b = 0
          </script>
        `,
      }),
    },
    {
      description: 'preserves CRLF when changing whitespace',
      code: '<script setup>\r\nconst a = 0\r\nfunction run() {}\r\n</script>',
      options: { newlinesBetween: 1 },
      errors: ['unexpectedNewlinesBetween'],
      output:
        '<script setup>\r\nconst a = 0\r\n\r\nfunction run() {}\r\n</script>',
    },
  ],
})
