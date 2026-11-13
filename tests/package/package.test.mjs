import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { Linter } from 'eslint'
import plugin, * as packageExports from 'eslint-plugin-vue-perfectionist'
import pkg from 'eslint-plugin-vue-perfectionist/package.json' with { type: 'json' }
import ts from 'typescript'
import * as vueParser from 'vue-eslint-parser'

test('resolves the built runtime through the public export map', () => {
  assert.deepEqual(Object.keys(packageExports).sort(), ['default', 'plugin'])
  assert.equal(packageExports.plugin, plugin)
  assert.deepEqual(plugin.meta, { name: pkg.name, version: pkg.version })
  assert.equal(Object.hasOwn(plugin, 'configs'), false)
  assert.equal(
    import.meta.resolve('eslint-plugin-vue-perfectionist'),
    new URL('../../dist/index.mjs', import.meta.url).href,
  )
  const result = new Linter().verifyAndFix(
    '<script setup>\nconst z = 1\nconst a = 2\n</script>',
    {
      files: ['**/*.vue'],
      languageOptions: { parser: vueParser },
      plugins: { vp: plugin },
      rules: { 'vp/sort-script-setup': ['error', { type: 'natural' }] },
    },
    'Consumer.vue',
  )
  assert.deepEqual(result, {
    fixed: true,
    messages: [],
    output: '<script setup>\nconst a = 2\nconst z = 1\n</script>',
  })
})

for (const resolution of ['NodeNext', 'Bundler']) {
  test(`resolves public declarations with ${resolution}`, () => {
    const program = ts.createProgram(
      [
        fileURLToPath(
          new URL('../fixtures/package/consumer.mts', import.meta.url),
        ),
      ],
      {
        noEmit: true,
        strict: true,
        skipLibCheck: false,
        target: ts.ScriptTarget.ESNext,
        module:
          resolution === 'NodeNext'
            ? ts.ModuleKind.NodeNext
            : ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind[resolution],
        types: [],
      },
    )
    const diagnostics = ts.getPreEmitDiagnostics(program)
    assert.equal(
      diagnostics.length,
      0,
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: filename => filename,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => '\n',
      }),
    )
    assert.ok(
      program
        .getSourceFiles()
        .some(source =>
          source.fileName.replaceAll('\\', '/').endsWith('/dist/index.d.mts'),
        ),
    )
    assert.equal(
      program
        .getSourceFiles()
        .some(source =>
          source.fileName.replaceAll('\\', '/').includes('/src/types/rules/'),
        ),
      false,
    )
  })
}

test('runs composable body sorting through the built public plugin', () => {
  const config = {
    plugins: { vp: plugin },
    rules: { 'vp/sort-composable-body': 'error' },
  }
  const linter = new Linter()
  const result = linter.verifyAndFix(
    'function useCounter() {\n  function reset() {}\n  const step = 1\n}',
    config,
  )
  assert.deepEqual(result, {
    fixed: true,
    messages: [],
    output:
      'function useCounter() {\n  const step = 1\n  function reset() {}\n}',
  })
  assert.deepEqual(linter.verifyAndFix(result.output, config), {
    ...result,
    fixed: false,
  })
})
