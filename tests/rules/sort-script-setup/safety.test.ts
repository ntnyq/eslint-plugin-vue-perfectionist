import { runInNewContext } from 'node:vm'
import { expect } from 'vitest'
import { compileScript, parse } from 'vue/compiler-sfc'
import { createVueSFC } from '../../helpers/create-vue-sfc.ts'
import { runSortScriptSetup } from '../../helpers/sort-script-setup.ts'

await runSortScriptSetup({
  valid: [
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0

          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          // section
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          if (true) {}
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          await run()
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const data = await run()
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const x = 1, y = 2
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          import "side-effects"
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description:
        'does not move protected statements: // eslint-disable-next-line no-unused-vars\nconst z = 0\nconst a = 0',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          // eslint-disable-next-line no-unused-vars
          const z = 0
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description:
        'does not move protected statements: // @ts-expect-error intentional\nconst z = 0\nconst a = 0',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          // @ts-expect-error intentional
          const z = 0
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description:
        'does not move protected statements: // eslint-disable no-unused-vars\nconst z = 0\nconst a = 0\n// eslint-enable no-unused-vars',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          // eslint-disable no-unused-vars
          const z = 0
          const a = 0
          // eslint-enable no-unused-vars
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'does not reorder interface merging or function overloads',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          interface Z { value: string }
          interface Z { other: number }
          interface A {}
          function f(x: string): string
          function f(x: number): number
          function f(x: unknown) { return x }
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'does not move expose across await',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 1
          defineExpose({ a })
          await run()
          const b = 2
          </script>
        `,
      }),
      options: {
        groups: ['constant', 'define-expose'],
      },
    },
    {
      description: 'ignores ordinary script',
      code: '<script lang="ts">const z = 1\nconst a = 2</script>',
      options: { type: 'natural' },
    },
    {
      description: 'ignores plain TypeScript without SFC parser services',
      code: 'const z = 1\nconst a = 2',
      filename: 'Test.ts',
      options: { type: 'natural' },
    },
  ],
  invalid: [
    ...['g', 'y', 'gy'].map(flags => ({
      description: `keeps repeated comment partitions with cached ${flags} patterns`,
      code: '<script setup>\n// region\nconst z = 1\nconst a = 2\n// region\nconst y = 1\nconst b = 2\n</script>',
      options: {
        type: 'natural' as const,
        partitionByComment: { pattern: '\\s*region', flags },
      },
      errors: ['unexpectedOrder' as const, 'unexpectedOrder' as const],
      output:
        '<script setup>\n// region\nconst a = 2\nconst z = 1\n// region\nconst b = 2\nconst y = 1\n</script>',
    })),
    {
      description:
        'moves documentation and trailing comments with declarations',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          /** Z */
          const z = 0 // last
          /** A */
          const a = 0 // first
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
          /** A */
          const a = 0 // first
          /** Z */
          const z = 0 // last
          </script>
        `,
      }),
    },
    {
      description:
        'keeps region markers fixed while sorting their following region',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          // #region next
          const c = 0
          const b = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByComment: {
          line: '^\\s*#region',
          block: false,
        },
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'b',
            before: 'c',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          // #region next
          const b = 0
          const c = 0
          </script>
        `,
      }),
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref } from "vue"
          const z = ref(0)
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
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { useZ, useA } from "./composables"
          const z = useZ()
          const a = useA()
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
            group: 'composable',
          },
        },
      ],
      output: null,
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = state.value
          const a = state.other
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
            group: 'variable',
          },
        },
      ],
      output: null,
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const { z } = getState()
          const { a } = getState()
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
            group: 'variable',
          },
        },
      ],
      output: null,
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          class Z {}
          class A {}
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
            name: 'A',
            before: 'Z',
            group: 'enum / class',
          },
        },
      ],
      output: null,
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          enum Z { Value }
          enum A { Value }
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
            name: 'A',
            before: 'Z',
            group: 'enum / class',
          },
        },
      ],
      output: null,
    },
    {
      description: 'fixes safe islands without moving surrounding calls',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 0
          importedCall()
          const y = 0
          const b = 0
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
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'b',
            before: 'y',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const z = 0
          importedCall()
          const b = 0
          const y = 0
          </script>
        `,
      }),
    },
    {
      description: 'turns off all fixes without changing safe diagnostics',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0

          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        newlinesInside: 0,
        fix: 'none',
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
      output: null,
    },
    {
      description: 'produces code accepted by the Vue compiler',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function zebra() { return 2 }
          function alpha() { return 1 }
          interface Props { title: string }
          const z = 2
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          data: {
            name: 'Props',
            before: 'zebra',
            group: 'interface / type',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          interface Props { title: string }
          const a = 1
          const z = 2
          function alpha() { return 1 }
          function zebra() { return 2 }
          </script>
        `,
      }),
      after({ output }) {
        const parsed = parse(output)
        expect(parsed.errors).toEqual([])
        expect(() =>
          compileScript(parsed.descriptor, { id: 'test' }),
        ).not.toThrow()
      },
    },
    {
      description:
        'does not partition the outer scope on an async function body',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          async function zebra() { await run() }
          function alpha() {}
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
            name: 'alpha',
            before: 'zebra',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function alpha() {}
          async function zebra() { await run() }
          </script>
        `,
      }),
    },
    {
      description: 'does not use nested comments as top-level partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function zebra() { /* section */ }
          function alpha() {}
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByComment: true,
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'alpha',
            before: 'zebra',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function alpha() {}
          function zebra() { /* section */ }
          </script>
        `,
      }),
    },
    {
      description:
        'preserves an ASI-sensitive boundary after a proposed movement',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 1
          function a() {}
          (() => {})()
          </script>
        `,
      }),
      options: {
        groups: ['function', 'constant'],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'function',
          },
        },
      ],
      output: null,
    },
    {
      description: 'does not move statements with ambiguous detached comments',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          // heading

          const z = 1
          const a = 2
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
            group: 'constant',
          },
        },
      ],
      output: null,
    },
    {
      description:
        'retains runtime results when independently initialized constants move',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const zebra = 2
          const alpha = 1
          record([zebra, alpha])
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
            name: 'alpha',
            before: 'zebra',
          },
        },
      ],
      output(output, input) {
        expect(output).toBe(
          createVueSFC({
            script: `
              <script setup lang="ts">
              const alpha = 1
              const zebra = 2
              record([zebra, alpha])
              </script>
            `,
          }),
        )
        const transformed = output.slice(
          output.indexOf('>') + 1,
          output.lastIndexOf('</script>'),
        )
        const original = input.slice(
          input.indexOf('>') + 1,
          input.lastIndexOf('</script>'),
        )
        const before: unknown[] = []
        const after: unknown[] = []
        runInNewContext(original, {
          record: (value: unknown) => before.push(value),
        })
        runInNewContext(transformed, {
          record: (value: unknown) => after.push(value),
        })
        expect(after).toEqual(before)
      },
    },
    {
      description: 'does not cross the two script blocks',
      code: `<script lang="ts">const z = 1\nconst a = 2</script>\n${createVueSFC(
        {
          script: `
          <script setup lang="ts">
          const y = 1
          const b = 2
          </script>
        `,
        },
      )}`,
      options: { type: 'natural' },
      errors: ['unexpectedOrder'],
      output: `<script lang="ts">const z = 1\nconst a = 2</script>\n${createVueSFC(
        {
          script: `
          <script setup lang="ts">
          const b = 2
          const y = 1
          </script>
        `,
        },
      )}`,
    },
    {
      description: 'supports JavaScript setup without a TypeScript parser',
      code: '<script setup>\nconst z = 1\nconst a = 2\n</script>',
      languageOptions: { parserOptions: { parser: null } },
      options: { type: 'natural' },
      errors: ['unexpectedOrder'],
      output: '<script setup>\nconst a = 2\nconst z = 1\n</script>',
    },
  ],
})
