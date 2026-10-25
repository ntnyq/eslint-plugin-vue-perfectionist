import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { requireComponentSlots } from '../../src/rules/require-component-slots.ts'
import { run, vueLanguageOptions } from '../helpers/rule-tester.ts'
import type {
  RequireComponentSlotsMessageId,
  RequireComponentSlotsOptions,
} from '../../src/types/index.ts'

const options: RequireComponentSlotsOptions = {
  targets: [{ components: ['AppDialog'], slots: ['header', 'footer'] }],
}
const defaultOptions: RequireComponentSlotsOptions = {
  targets: [{ components: ['AppButton'], slots: ['default'] }],
}

function sfc(template: string): string {
  return `<template>${template}</template>`
}

const argumentlessSlotCases = ['.', '..', '.header', '.header.'].flatMap(slot =>
  ['#', 'v-slot:'].flatMap(prefix => [
    {
      description: `child slot ${prefix}${slot} without an argument`,
      code: sfc(
        `<AppButton><template ${prefix}${slot}>Content</template></AppButton>`,
      ),
      slot,
    },
    {
      description: `component slot ${prefix}${slot} without an argument`,
      code: sfc(`<AppButton ${prefix}${slot}>Content</AppButton>`),
      slot,
    },
  ]),
)

await run<RequireComponentSlotsOptions, RequireComponentSlotsMessageId>({
  name: 'require-component-slots',
  rule: requireComponentSlots,
  onResult(testcase, result) {
    if (testcase.type !== 'invalid') {
      return
    }
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(testcase.code)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    ...argumentlessSlotCases.map(({ code, description }) => ({
      description: `accepts default from ${description}`,
      code,
      options: defaultOptions,
    })),
    { code: sfc('<AppDialog />') },
    { code: sfc('<AppDialog />'), options: { targets: [] } },
    ...[
      '<Other />',
      '<appdialog />',
      '<Dialog />',
      '<AppDialog><template #header /><template #footer /></AppDialog>',
      '<app-dialog><template v-slot:header /><template v-slot:footer /></app-dialog>',
      "<AppDialog><template #['header'] /><template #[`footer`] /></AppDialog>",
      '<AppDialog><template #header v-if="visible" /><template #footer v-for="item in items" :key="item" /></AppDialog>',
      '<AppDialog><template #header /><template #footer /><template #[name] /></AppDialog>',
      '<AppDialog v-pre />',
      '<div v-pre><AppDialog /></div>',
      '<component is="AppDialog" />',
      '<component :is="\'AppDialog\'" />',
      '<component :is="current" />',
      '<Component is="AppDialog" />',
    ].map(template => ({
      code: sfc(template),
      options,
    })),
    ...[
      '<AppButton>Confirm</AppButton>',
      '<AppButton>&nbsp;</AppButton>',
      '<AppButton>&#x2003;</AppButton>',
      '<AppButton>\u{A0}</AppButton>',
      '<AppButton>\u{2003}</AppButton>',
      '<AppButton><template #header />&nbsp;</AppButton>',
      '<AppButton><template #header />&#x2003;</AppButton>',
      '<AppButton>{{ label }}</AppButton>',
      '<AppButton><span /></AppButton>',
      '<AppButton><slot /></AppButton>',
      '<AppButton><template #default /></AppButton>',
      '<AppButton><template v-slot="scope">{{ scope }}</template></AppButton>',
      '<AppButton v-slot="scope" />',
      '<AppButton #default />',
      '<AppButton v-slot:default />',
      '<AppButton><Other #header /></AppButton>',
      '<AppButton><template #header />Confirm</AppButton>',
    ].map(template => ({
      code: sfc(template),
      options: defaultOptions,
    })),
    {
      description: 'retains uppercase and hyphenated slot names exactly',
      code: sfc(
        '<AppDialog><template #Header /><template #item-name /></AppDialog>',
      ),
      options: {
        targets: [
          { components: ['app-dialog'], slots: ['Header', 'item-name'] },
        ],
      },
    },
    {
      description: 'retains dots in static slot names parsed as modifiers',
      code: sfc(
        '<AppDialog><template #item.name /><template v-slot:item.other /></AppDialog>',
      ),
      options: {
        targets: [
          { components: ['AppDialog'], slots: ['item.name', 'item.other'] },
        ],
      },
    },
    ...['header..footer', 'header...footer', 'header.', 'header..'].flatMap(
      slot =>
        ['#', 'v-slot:'].flatMap(prefix => [
          {
            description: `preserves the exact child slot name ${prefix}${slot}`,
            code: sfc(`<AppDialog><template ${prefix}${slot} /></AppDialog>`),
            options: {
              targets: [{ components: ['AppDialog'], slots: [slot] }],
            },
          },
          {
            description: `preserves the exact component slot name ${prefix}${slot}`,
            code: sfc(`<AppDialog ${prefix}${slot}>Content</AppDialog>`),
            options: {
              targets: [{ components: ['AppDialog'], slots: [slot] }],
            },
          },
        ]),
    ),
    ...['#[`header`].foo', 'v-slot:[`header`].foo.bar'].flatMap(directive => [
      {
        description: `ignores an uncertain child slot suffix in ${directive}`,
        code: sfc(`<AppDialog><template ${directive} /></AppDialog>`),
        options: { ...options, unknownSlots: 'ignore' as const },
      },
      {
        description: `ignores an uncertain component slot suffix in ${directive}`,
        code: sfc(`<AppDialog ${directive}>Content</AppDialog>`),
        options: { ...options, unknownSlots: 'ignore' as const },
      },
    ]),
    {
      description: 'skips slot outlets even when explicitly configured',
      code: sfc('<slot name="header" />'),
      options: { targets: [{ components: ['slot'], slots: ['header'] }] },
    },
    {
      description:
        'accepts a named component-level slot without adding default',
      code: sfc('<AppDialog v-slot:header="scope">{{ scope }}</AppDialog>'),
      options: { targets: [{ components: ['AppDialog'], slots: ['header'] }] },
    },
    {
      description: 'ignores requirements that a dynamic slot might supply',
      code: sfc('<AppDialog><template #[name] /></AppDialog>'),
      options: { ...options, unknownSlots: 'ignore' },
    },
    {
      description: 'ignores uncertain component-level slots',
      code: sfc('<AppButton v-slot:[name] />'),
      options: { ...defaultOptions, unknownSlots: 'ignore' },
    },
    {
      description: 'unwraps TypeScript expressions in static slot arguments',
      code: `<script setup lang="ts"></script>${sfc("<AppDialog><template #[('header'!)] /></AppDialog>")}`,
      options: { targets: [{ components: ['AppDialog'], slots: ['header'] }] },
    },
    {
      description: 'skips native HTML, SVG, and MathML elements',
      code: sfc(
        '<div /><svg><path /><linearGradient /></svg><math><mi /></math>',
      ),
      options: {
        targets: [
          {
            components: ['div', 'svg', 'path', 'linearGradient', 'math', 'mi'],
            slots: ['header'],
          },
        ],
      },
    },
    { code: '<script setup>const value = 1</script>', options },
    { code: 'const value = 1', filename: 'test.js', options },
    { code: 'const value: number = 1', filename: 'test.ts', options },
    { code: 'const value = <AppDialog />', filename: 'test.tsx', options },
  ],
  invalid: [
    ...argumentlessSlotCases.map(({ code, description, slot }) => ({
      description: `does not accept a literal name from ${description}`,
      code,
      options: {
        targets: [{ components: ['AppButton'], slots: [slot] }],
        unknownSlots: 'ignore' as const,
      },
      errors: [
        {
          messageId: 'missingSlot' as const,
          data: { component: 'AppButton', slot },
        },
      ],
      output: null,
    })),
    ...['#', 'v-slot:'].flatMap(prefix => [
      {
        description: `does not collapse consecutive dots in ${prefix}header..footer`,
        code: sfc(
          `<AppDialog><template ${prefix}header..footer /></AppDialog>`,
        ),
        options: {
          targets: [{ components: ['AppDialog'], slots: ['header.footer'] }],
        },
        errors: ['missingSlot' as const],
        output: null,
      },
      {
        description: `does not drop trailing dots in ${prefix}header.`,
        code: sfc(`<AppDialog ${prefix}header.>Content</AppDialog>`),
        options: {
          targets: [
            { components: ['AppDialog'], slots: ['header', 'default'] },
          ],
        },
        errors: ['missingSlot' as const, 'missingSlot' as const],
        output: null,
      },
      {
        description: `does not recognize a raw slot attribute within v-pre (${prefix})`,
        code: sfc(`<AppDialog><template v-pre ${prefix}header. /></AppDialog>`),
        options: {
          targets: [
            { components: ['AppDialog'], slots: ['header.', 'default'] },
          ],
        },
        errors: ['missingSlot' as const],
        output: null,
      },
    ]),
    ...['#[`header`].foo', 'v-slot:[`header`].foo.bar'].flatMap(directive => [
      {
        description: `does not accept a partial child slot expression in ${directive}`,
        code: sfc(`<AppDialog><template ${directive} /></AppDialog>`),
        options: {
          targets: [{ components: ['AppDialog'], slots: ['header'] }],
        },
        errors: ['unverifiableRequiredSlot' as const],
        output: null,
      },
      {
        description: `does not accept a partial component slot expression in ${directive}`,
        code: sfc(`<AppDialog ${directive}>Content</AppDialog>`),
        options: {
          targets: [{ components: ['AppDialog'], slots: ['header'] }],
        },
        errors: ['unverifiableRequiredSlot' as const],
        output: null,
      },
    ]),
    {
      description: 'does not mistake a dynamic suffix for a default slot',
      code: sfc('<AppButton><template #[`default`].foo /></AppButton>'),
      options: defaultOptions,
      errors: ['unverifiableRequiredSlot'],
      output: null,
    },
    {
      description:
        'keeps dynamic suffix uncertainty within its owning component',
      code: sfc(
        '<AppDialog><Other><template #[`header`].foo /></Other></AppDialog>',
      ),
      options: { ...options, unknownSlots: 'ignore' },
      errors: ['missingSlot', 'missingSlot'],
      output: null,
    },
    {
      description: 'does not confuse a dotted slot name with its prefix',
      code: sfc('<AppDialog><template #header.extra /></AppDialog>'),
      options: { targets: [{ components: ['AppDialog'], slots: ['header'] }] },
      errors: ['missingSlot'],
      output: null,
    },
    {
      description: 'reports each missing slot on the opening component name',
      code: '<template>\n  <AppDialog />\n</template>',
      options,
      errors: ['header', 'footer'].map(slot => ({
        messageId: 'missingSlot',
        data: { component: 'AppDialog', slot },
        line: 2,
        column: 4,
        endLine: 2,
        endColumn: 13,
      })),
      output: null,
    },
    ...[
      '<AppDialog><template #header /></AppDialog>',
      '<app-dialog><template #header /></app-dialog>',
      '<AppDialog v-slot:header />',
      '<AppDialog #header />',
      '<AppDialog><template #header /><template #Footer /></AppDialog>',
      "<AppDialog><template #header /><template #['Footer'] /></AppDialog>",
      '<AppDialog><template #header /><Other><template #footer /></Other></AppDialog>',
      '<AppDialog><template #header /><div><template #footer /></div></AppDialog>',
      '<AppDialog><template #header /><Other #footer /></AppDialog>',
      '<AppDialog><template #header /><slot name="footer" /></AppDialog>',
    ].map(template => ({
      code: sfc(template),
      options,
      errors: [
        {
          messageId: 'missingSlot' as const,
          data: {
            component: template.startsWith('<app-dialog')
              ? 'app-dialog'
              : 'AppDialog',
            slot: 'footer',
          },
        },
      ],
      output: null,
    })),
    ...[
      '<AppButton />',
      '<AppButton>  \n\t </AppButton>',
      '<AppButton>\r\n\f </AppButton>',
      '<AppButton>&#x20;&#x9;&#xA;</AppButton>',
      '<AppButton><template #header /> \n\t </AppButton>',
      '<AppButton><!-- comment --></AppButton>',
      '<AppButton> \n<!-- comment -->\n </AppButton>',
      '<AppButton><template #header /></AppButton>',
      '<AppButton v-slot:header>Content</AppButton>',
    ].map(template => ({
      code: sfc(template),
      options: defaultOptions,
      errors: [
        {
          messageId: 'missingSlot' as const,
          data: { component: 'AppButton', slot: 'default' },
        },
      ],
      output: null,
    })),
    {
      description:
        'merges overlapping component targets and deduplicates slots',
      code: sfc('<app-dialog />'),
      options: {
        targets: [
          { components: ['AppDialog', 'Other'], slots: ['header'] },
          { components: ['app-dialog'], slots: ['header', 'footer'] },
        ],
      },
      errors: ['header', 'footer'].map(slot => ({
        messageId: 'missingSlot',
        data: { component: 'app-dialog', slot },
      })),
      output: null,
    },
    {
      description: 'does not normalize case or hyphens in slot requirements',
      code: sfc(
        '<AppDialog><template #header /><template #itemName /></AppDialog>',
      ),
      options: {
        targets: [
          { components: ['AppDialog'], slots: ['Header', 'item-name'] },
        ],
      },
      errors: ['missingSlot', 'missingSlot'],
      output: null,
    },
    {
      description: 'validates nested configured components independently',
      code: sfc(
        '<AppDialog><template #header><AppDialog /></template><template #footer /></AppDialog>',
      ),
      options,
      errors: ['missingSlot', 'missingSlot'],
      output: null,
    },
    ...[
      '<AppDialog><template #[name] /></AppDialog>',
      '<AppDialog v-slot:[name] />',
      `<AppDialog><template #[\`item-\${name}\`] /></AppDialog>`,
    ].map(template => ({
      code: sfc(template),
      options,
      errors: ['header', 'footer'].map(slot => ({
        messageId: 'unverifiableRequiredSlot' as const,
        data: { component: 'AppDialog', slot },
      })),
      output: null,
    })),
    {
      description: 'reports only requirements not satisfied by known names',
      code: sfc(
        '<AppDialog><template #header /><template #[name] /></AppDialog>',
      ),
      options: { ...options, unknownSlots: 'report' },
      errors: [
        {
          messageId: 'unverifiableRequiredSlot',
          data: { component: 'AppDialog', slot: 'footer' },
        },
      ],
      output: null,
    },
    {
      description: 'dynamic child template names can also provide default',
      code: sfc('<AppButton><template #[name] /></AppButton>'),
      options: defaultOptions,
      errors: ['unverifiableRequiredSlot'],
      output: null,
    },
    {
      description: 'ignore still reports a statically missing slot',
      code: sfc('<AppDialog><template #header /></AppDialog>'),
      options: { ...options, unknownSlots: 'ignore' },
      errors: ['missingSlot'],
      output: null,
    },
    {
      description:
        'nested dynamic slots do not make outer requirements uncertain',
      code: sfc('<AppDialog><Other><template #[name] /></Other></AppDialog>'),
      options: { ...options, unknownSlots: 'ignore' },
      errors: ['missingSlot', 'missingSlot'],
      output: null,
    },
    ...[false, true].map(typescript => ({
      description: `checks templates with both script blocks (${typescript ? 'TS' : 'JS'})`,
      code: `<script${typescript ? ' lang="ts"' : ''}>export default {}</script><script setup${typescript ? ' lang="ts"' : ''}>const value = 1</script>${sfc('<AppDialog />')}`,
      languageOptions: typescript
        ? vueLanguageOptions
        : { parserOptions: { parser: null } },
      options,
      errors: ['missingSlot' as const, 'missingSlot' as const],
      output: null,
    })),
  ],
})

const tester = createRuleTester<unknown>({
  name: 'require-component-slots',
  rule: requireComponentSlots,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})

describe('require-component-slots configuration', () => {
  it.each([
    { unknownSlots: 'allow' },
    { unknownSlots: null },
    { unknownBindings: 'ignore' },
    { targets: null },
    { targets: {} },
    { targets: [{}] },
    ...[
      { components: [], slots: ['header'] },
      { components: ['AppDialog'], slots: [] },
      { components: [''], slots: ['header'] },
      { components: ['AppDialog'], slots: [''] },
      { components: ['App Dialog'], slots: ['header'] },
      { components: ['AppDialog'], slots: ['header footer'] },
      { components: ['AppDialog', 'AppDialog'], slots: ['header'] },
      { components: ['AppDialog'], slots: ['header', 'header'] },
      { components: ['AppDialog'], slots: [1] },
      { components: 'AppDialog', slots: ['header'] },
      { components: ['AppDialog'], slots: 'header' },
      { components: ['AppDialog'], slots: ['header'], extra: true },
    ].map(target => ({
      targets: [target],
    })),
  ])('rejects invalid options: %j', async invalidOptions => {
    await expect(
      tester.valid({ code: '<template />', options: invalidOptions }),
    ).rejects.toThrow()
  })
})
