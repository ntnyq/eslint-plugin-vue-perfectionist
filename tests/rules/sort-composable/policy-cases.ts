import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { run } from '../../helpers/rule-tester.ts'
import type { sortComposableReturn } from '../../../src/rules/sort-composable-return.ts'
import type {
  SortComposableMessageId,
  SortComposableOptions,
} from '../../../src/types/index.ts'

/**
 * Exercise the same grouping contract through both public rule interfaces.
 */
export async function runComposablePolicyTests(
  rule: typeof sortComposableReturn,
  name: string,
  wrap: (members: string) => string,
) {
  await run<SortComposableOptions, SortComposableMessageId>({
    name,
    rule,
    defaultFilenames: { js: 'test.ts' },
    onResult(testcase, result) {
      for (const message of result.messages) {
        expect(message.suggestions).toBeUndefined()
      }
      if (testcase.type === 'invalid' && testcase.output === null) {
        expect(result.fixed).toBe(false)
        expect(result.output).toBe(testcase.code)
        for (const message of result.messages) {
          expect(message.fix).toBeUndefined()
        }
      }
      if (result.fixed) {
        const tokens = (code: string) =>
          tsParser.parse(code, { tokens: true, comment: true })
        const before = tokens(testcase.code)
        const after = tokens(result.output)
        expect(after.tokens?.map(token => token.value)).toEqual(
          before.tokens?.map(token => token.value),
        )
        expect(after.comments?.map(comment => comment.value)).toEqual(
          before.comments?.map(comment => comment.value),
        )
      }
    },
    valid: [
      ...['/* Methods */', '// Methods\n'].map(comment => ({
        description: 'preserves comments before the separating comma',
        code: wrap(`z\n${comment},\nsubmit`),
      })),
      {
        description: 'the first matching custom group wins',
        code: wrap('z, a'),
        options: {
          groups: ['first', 'second'],
          customGroups: [
            { groupName: 'first', selector: 'state' },
            {
              groupName: 'second',
              selector: 'state',
              elementNamePattern: '^z$',
            },
          ],
        },
      },
      {
        description:
          'custom group selector and public-name pattern must both match',
        code: wrap('z, a'),
        options: {
          groups: ['priority', 'state', 'method'],
          customGroups: [
            {
              groupName: 'priority',
              selector: 'method',
              elementNamePattern: '^a$',
            },
          ],
        },
      },
      { code: wrap('z, a,\n\nsubmit, reset') },
      { code: wrap('submit, reset') },
      { code: wrap('z, a') },
      { code: wrap('submit, z'), options: { groups: [] } },
      { code: wrap('submit, z'), options: { groups: ['state'] } },
      { code: wrap('submit, z'), options: { groups: [['state', 'method']] } },
      { code: wrap('submit, z'), options: { ignoreNames: ['usePage'] } },
      { code: wrap('submit, z'), options: { functionPattern: '^create' } },
      {
        code: wrap('z,\n\n\na, submit'),
        options: { newlinesInside: 'ignore', newlinesBetween: 'ignore' },
      },
      { code: wrap('submit,\n\nexternal,\n\nz') },
      { code: wrap('z, /* group comment */ submit') },
      { code: wrap('z, // trailing\nsubmit') },
      { code: wrap('z,\n// leading\nsubmit') },
      {
        code: wrap('z,\n\na,\nsubmit'),
        options: { newlinesInside: 1, newlinesBetween: 0 },
      },
      { code: wrap('z, a'), options: { type: 'name-length' } },
      { code: wrap('z, a'), options: { type: 'alphabetical', order: 'desc' } },
      { code: wrap('a, z'), options: { type: 'alphabetical' } },
    ],
    invalid: [
      ...(['safe', 'none'] as const).flatMap(fix =>
        [
          {
            members: 'z, submit',
            options: { newlinesBetween: Number.MAX_SAFE_INTEGER },
            messageId: 'unexpectedNewlinesBetween' as const,
            name: 'submit',
          },
          {
            members: 'z, a',
            options: { newlinesInside: Number.MAX_SAFE_INTEGER },
            messageId: 'unexpectedNewlinesInside' as const,
            name: 'a',
          },
          {
            members: 'z, submit',
            options: {
              groups: [
                'state',
                { newlinesBetween: Number.MAX_SAFE_INTEGER },
                'method',
              ],
            },
            messageId: 'unexpectedNewlinesBetween' as const,
            name: 'submit',
          },
          {
            members: 'z, a',
            options: {
              groups: [
                { group: 'state', newlinesInside: Number.MAX_SAFE_INTEGER },
              ],
            },
            messageId: 'unexpectedNewlinesInside' as const,
            name: 'a',
          },
        ].map(({ members, options, messageId, name }) => ({
          description: `reports huge spacing without allocating a fix: ${JSON.stringify(options)}, fix: ${fix}`,
          code: wrap(members),
          options: { ...options, fix },
          errors: [
            {
              messageId,
              data: { name, count: Number.MAX_SAFE_INTEGER },
            },
          ],
          output: null,
        })),
      ),
      ...[
        { eol: '\n', indent: '', count: 65_535 },
        { eol: '\r\n', indent: '  ', count: 32_766 },
      ].flatMap(({ eol, indent, count }) => [
        {
          description: 'allows whitespace fixes at the output length limit',
          code: wrap(`z,${eol}${indent}submit`),
          options: { newlinesBetween: count },
          errors: ['unexpectedNewlinesBetween' as const],
          output: wrap(`z,${eol.repeat(count + 1)}${indent}submit`),
        },
        {
          description:
            'leaves the entire gap unchanged when a fix exceeds the length limit',
          code: wrap(`z${eol}${eol},${eol}${indent}submit`),
          options: { newlinesBetween: count + 1 },
          errors: ['unexpectedNewlinesBetween' as const],
          output: null,
        },
      ]),
      {
        description: 'removes excess blank lines before a separator',
        code: wrap('z\n\n,\na'),
        errors: ['unexpectedNewlinesInside'],
        output: wrap('z\n,\na'),
      },
      {
        description: 'places required group spacing after the comma',
        code: wrap('z\n\n,\nsubmit'),
        errors: ['unexpectedNewlinesBetween'],
        output: wrap('z\n,\n\nsubmit'),
      },
      ...['\u{A0}', '\u{FEFF}', '\t\u{2003}'].map(indent => ({
        description:
          'preserves all horizontal whitespace in member indentation',
        code: wrap(`z,\n${indent}submit`),
        errors: ['unexpectedNewlinesBetween' as const],
        output: wrap(`z,\n\n${indent}submit`),
      })),
      {
        description: 'custom groups do not classify unknown members',
        code: wrap('external'),
        options: {
          unknownMembers: 'report',
          customGroups: [
            {
              groupName: 'extra',
              selector: 'state',
              elementNamePattern: '^external$',
            },
          ],
        },
        errors: ['unknownMember'],
        output: null,
      },
      {
        code: wrap('submit, z'),
        errors: [
          {
            messageId: 'unexpectedGroupOrder',
            data: { left: 'submit', right: 'z' },
          },
        ],
        output: null,
      },
      {
        description: 'does not fix any spacing in an unordered partition',
        code: wrap('submit, z,\n\na'),
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
      {
        code: wrap('z, a'),
        options: { type: 'alphabetical' },
        errors: ['unexpectedOrder'],
        output: null,
      },
      {
        code: wrap('submit, reset'),
        options: { type: 'name-length' },
        errors: ['unexpectedOrder'],
        output: null,
      },
      {
        code: wrap('reset, submit'),
        options: { type: 'name-length', order: 'desc' },
        errors: ['unexpectedOrder'],
        output: null,
      },
      {
        code: wrap('z, submit'),
        errors: [
          {
            messageId: 'unexpectedNewlinesBetween',
            data: { name: 'submit', count: 1 },
          },
        ],
        output: wrap('z,\n\nsubmit'),
      },
      ...['\n', '\r\n', '\r', '\u{2028}'].map(eol => ({
        description: 'preserves line endings and the next member indentation',
        code: wrap(`z,${eol}  submit`),
        errors: ['unexpectedNewlinesBetween' as const],
        output: wrap(`z,${eol}${eol}  submit`),
      })),
      {
        code: wrap('z,\n\n  a'),
        errors: ['unexpectedNewlinesInside'],
        output: wrap('z,\n  a'),
      },
      {
        code: wrap('z,\n\n\nsubmit'),
        errors: ['unexpectedNewlinesBetween'],
        output: wrap('z,\n\nsubmit'),
      },
      {
        code: wrap('z, submit'),
        options: { fix: 'none' },
        errors: ['unexpectedNewlinesBetween'],
        output: null,
      },
      {
        code: wrap('z, submit'),
        options: { newlinesBetween: 2 },
        errors: ['unexpectedNewlinesBetween'],
        output: wrap('z,\n\n\nsubmit'),
      },
      {
        code: wrap('z,\n\nsubmit'),
        options: { newlinesBetween: 0 },
        errors: ['unexpectedNewlinesBetween'],
        output: wrap('z,\nsubmit'),
      },
      {
        code: wrap('z, a'),
        options: { newlinesInside: 1 },
        errors: ['unexpectedNewlinesInside'],
        output: wrap('z,\n\na'),
      },
      {
        code: wrap('submit,\n\nexternal,\n\nz'),
        options: { unknownMembers: 'report' },
        errors: [
          {
            messageId: 'unknownMember',
            data: { name: 'external', functionName: 'usePage' },
          },
        ],
        output: null,
      },
      {
        description: 'fallback kinds cannot override a confirmed method',
        code: wrap('submit, z'),
        options: {
          memberKinds: [
            {
              functionPattern: '.*',
              elementNamePattern: 'submit',
              kind: 'state',
            },
          ],
        },
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
      {
        description: 'first matching fallback fills only unknown members',
        code: wrap('submit, external'),
        options: {
          memberKinds: [
            {
              functionPattern: '^usePage$',
              elementNamePattern: '^external$',
              kind: 'state',
            },
            { functionPattern: '.*', elementNamePattern: '.*', kind: 'method' },
          ],
        },
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
      {
        description: 'custom groups refine known kinds by public names',
        code: wrap('a, z'),
        options: {
          groups: ['priority', 'state', 'method'],
          customGroups: [
            {
              groupName: 'priority',
              selector: 'state',
              elementNamePattern: '^z$',
            },
          ],
        },
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
      {
        description: 'spacing markers survive empty intermediate groups',
        code: wrap('z, submit'),
        options: {
          newlinesBetween: 0,
          groups: [
            'state',
            'empty-state',
            { newlinesBetween: 1 },
            'empty-method',
            'method',
          ],
          customGroups: [
            {
              groupName: 'empty-state',
              selector: 'state',
              elementNamePattern: '^missing$',
            },
            {
              groupName: 'empty-method',
              selector: 'method',
              elementNamePattern: '^missing$',
            },
          ],
        },
        errors: ['unexpectedNewlinesBetween'],
        output: wrap('z,\n\nsubmit'),
      },
      {
        code: wrap('z, a'),
        options: {
          groups: [
            { group: ['state', 'method'], type: 'alphabetical', order: 'asc' },
          ],
        },
        errors: ['unexpectedOrder'],
        output: null,
      },
      {
        code: wrap('z, a'),
        options: { groups: [{ group: 'state', newlinesInside: 1 }, 'method'] },
        errors: ['unexpectedNewlinesInside'],
        output: wrap('z,\n\na'),
      },
    ],
  })

  const tester = createRuleTester<unknown>({
    name,
    rule,
    languageOptions: { parser: tsParser },
    defaultFilenames: { js: 'test.ts' },
  })
  it.each([
    { extra: true },
    { type: 'line-length' },
    { type: null },
    { order: 'up' },
    { fix: 'unsafe' },
    { typeInformation: 'true' },
    { unknownMembers: 'sort' },
    { functionPattern: '[' },
    { ignoreNames: ['same', 'same'] },
    { newlinesBetween: -1 },
    { newlinesInside: 0.5 },
    { newlinesBetween: Number.MAX_SAFE_INTEGER + 1 },
    { newlinesInside: Number.MAX_SAFE_INTEGER + 1 },
    {
      groups: [
        'state',
        { newlinesBetween: Number.MAX_SAFE_INTEGER + 1 },
        'method',
      ],
    },
    {
      groups: [{ group: 'state', newlinesInside: Number.MAX_SAFE_INTEGER + 1 }],
    },
    { groups: [['state', 'state']] },
    { groups: ['state', 'state'] },
    { groups: ['missing'] },
    { groups: [[]] },
    { groups: [{ newlinesBetween: 1 }, 'state'] },
    { groups: ['state', { newlinesBetween: 1 }] },
    {
      groups: [
        'state',
        { newlinesBetween: 1 },
        { newlinesBetween: 2 },
        'method',
      ],
    },
    { groups: [{ group: 'state', extra: true }] },
    { customGroups: [{ groupName: 'state', selector: 'state' }] },
    {
      customGroups: [
        { groupName: 'x', selector: 'state' },
        { groupName: 'x', selector: 'method' },
      ],
    },
    { customGroups: [{ groupName: 'x', selector: 'unknown' }] },
    {
      customGroups: [
        { groupName: 'x', selector: 'state', elementNamePattern: '[' },
      ],
    },
    { memberKinds: [{ kind: 'state' }] },
    {
      memberKinds: [
        { functionPattern: '[', elementNamePattern: '', kind: 'state' },
      ],
    },
  ])(`${name} rejects invalid options: %j`, async options => {
    await expect(tester.valid({ code: '', options })).rejects.toThrow()
  })
  it(`${name} requires complete parser services when enabled`, async () => {
    await expect(
      tester.valid({ code: '', options: { typeInformation: true } }),
    ).rejects.toThrow(/type information/u)
  })
}
