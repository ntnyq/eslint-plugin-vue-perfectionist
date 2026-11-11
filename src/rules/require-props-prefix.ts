import { isRuntimeNode, unwrapExpression } from '../utils/ast/expressions.ts'
import { normalizePropName } from '../utils/component-props/config.ts'
import { createRule } from '../utils/create-rule.ts'
import { getRuntimeImportBinding } from '../utils/vue/call-identity.ts'
import { getModelContractMembers } from '../utils/vue/model-contracts.ts'
import { hasTemplateVisitor } from '../utils/vue/parser-services.ts'
import { getSetupRange, isInScriptRange } from '../utils/vue/script-scope.ts'
import { getSetupMacroCalls } from '../utils/vue/setup-macros.ts'
import { getTemplateExpressionScope } from '../utils/vue/template-expression-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type {
  RequirePropsPrefixMessageId,
  RequirePropsPrefixOptions,
} from '../types/index.ts'

/**
 * Keep writes and receiver-sensitive calls report-only, including writes through
 * members and transparent TypeScript expressions.
 */
function isUnsafeReference(identifier: AST.ESLintIdentifier) {
  let node: AST.Node | TSESTree.Node = identifier
  while (node.parent && node.parent.type !== 'VExpressionContainer') {
    const parent: AST.Node | TSESTree.Node = node.parent
    if (
      (parent.type === 'AssignmentExpression' && parent.left === node) ||
      parent.type === 'UpdateExpression' ||
      (parent.type === 'UnaryExpression' && parent.operator === 'delete') ||
      ((parent.type === 'ForInStatement' || parent.type === 'ForOfStatement') &&
        parent.left === node) ||
      (parent.type === 'CallExpression' &&
        parent.callee === node &&
        unwrapExpression(node).type !== 'MemberExpression') ||
      parent.type === 'TaggedTemplateExpression'
    ) {
      return true
    }
    if (
      (parent.type === 'MemberExpression' && parent.object === node) ||
      unwrapExpression(parent) === node ||
      parent.type === 'ChainExpression' ||
      parent.type === 'ArrayPattern' ||
      parent.type === 'ObjectPattern' ||
      parent.type === 'RestElement' ||
      (parent.type === 'Property' &&
        parent.value === node &&
        parent.parent?.type === 'ObjectPattern') ||
      (parent.type === 'AssignmentPattern' && parent.left === node)
    ) {
      node = parent
      continue
    }
    break
  }
  return false
}

export const requirePropsPrefix = createRule<
  [RequirePropsPrefixOptions],
  RequirePropsPrefixMessageId
>({
  name: 'require-props-prefix',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'require explicit props object prefixes in Vue templates.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          autofix: {
            type: 'boolean',
            description:
              'Allow safe fixes using an existing props object binding.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      requirePropsPrefix:
        'Access prop "{{name}}" through its props object in the template.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const services = sourceCode.parserServices
    const setupRange = getSetupRange(sourceCode)
    if (
      !context.filename.endsWith('.vue') ||
      !setupRange ||
      !hasTemplateVisitor(services)
    ) {
      return {}
    }
    const propNames = new Set<string>()
    const scriptBindings = new Set<string>()
    let prefix: string | undefined
    const containers: AST.VExpressionContainer[] = []
    const scopes = new Map<
      AST.VExpressionContainer,
      ReturnType<typeof getTemplateExpressionScope>
    >()

    function getReferences(
      container: AST.VExpressionContainer,
    ): AST.Reference[] {
      const scope = scopes.get(container)
      if (container.expression?.type !== 'VForExpression' || !scope) {
        return [...container.references]
      }
      const expression = container.expression
      const references = container.references.filter(
        reference =>
          reference.id.range[0] < expression.right.range[0] ||
          reference.id.range[1] > expression.right.range[1],
      )
      const element =
        container.parent.type === 'VAttribute'
          ? container.parent.parent.parent
          : undefined
      // Resolve genuine free references without Vue's synthetic loop aliases.
      for (const { id, reference } of scope.freeReferences) {
        if (
          id.range[0] < expression.right.range[0] ||
          id.range[1] > expression.right.range[1]
        ) {
          continue
        }
        let ancestor: AST.Node | null | undefined = element?.parent
        let variable: AST.Variable | null = null
        while (ancestor) {
          if (ancestor.type === 'VElement') {
            variable =
              ancestor.variables.find(binding => binding.id.name === id.name) ??
              null
            if (variable) {
              break
            }
          }
          ancestor = ancestor.parent
        }
        references.push({
          id,
          mode: reference.isReadOnly()
            ? 'r'
            : reference.isWriteOnly()
              ? 'w'
              : 'rw',
          variable,
          isValueReference: true,
        })
      }
      return references
    }

    function checkContainer(container: AST.VExpressionContainer) {
      const scope = scopes.get(container)
      for (const reference of getReferences(container)) {
        const { id, variable } = reference
        if (
          variable ||
          reference.isValueReference === false ||
          !isRuntimeNode(id) ||
          !propNames.has(id.name) ||
          scriptBindings.has(id.name) ||
          scope?.hasLocalBinding(id, id.name)
        ) {
          continue
        }
        let shadowed = !prefix || !scope || scope.hasLocalBinding(id, prefix)
        let ancestor: AST.Node | null | undefined = container.parent
        while (ancestor) {
          if (
            ancestor.type === 'VElement' &&
            ancestor.variables.some(binding => binding.id.name === prefix)
          ) {
            shadowed = true
          }
          ancestor = ancestor.parent
        }
        const attribute =
          container.parent.type === 'VAttribute' ? container.parent : undefined
        const shorthand =
          attribute?.directive &&
          attribute.key.name.name === 'bind' &&
          attribute.key.argument?.type === 'VIdentifier' &&
          attribute.value === container &&
          attribute.key.argument.range[0] === container.range[0] &&
          attribute.key.argument.range[1] === container.range[1]
        const parent = id.parent
        const objectShorthand =
          parent?.type === 'Property' && parent.shorthand && parent.value === id
        const canFix =
          options.autofix &&
          prefix &&
          !shadowed &&
          reference.mode === 'r' &&
          !isUnsafeReference(id) &&
          (!attribute?.directive || attribute.key.name.name !== 'model') &&
          (!objectShorthand || id.name !== '__proto__')
        context.report({
          loc: id.loc,
          messageId: 'requirePropsPrefix',
          data: { name: id.name },
          fix(fixer) {
            if (!canFix) {
              return null
            }
            const access = `${prefix}.${id.name}`
            if (shorthand && attribute) {
              return fixer.insertTextAfterRange(
                attribute.key.range,
                `="${access}"`,
              )
            }
            return fixer.replaceTextRange(
              id.range,
              objectShorthand
                ? `${sourceCode.text.slice(...id.range)}: ${access}`
                : access,
            )
          },
        })
      }
    }

    return services.defineTemplateBodyVisitor(
      {
        VExpressionContainer(node) {
          if (!propNames.size) {
            return
          }
          containers.push(node)
          if (options.autofix || node.expression?.type === 'VForExpression') {
            scopes.set(node, getTemplateExpressionScope(node, sourceCode))
          }
        },
        'VElement:exit': function (node) {
          if (node.parent.type !== 'VDocumentFragment') {
            return
          }
          // A template can write a binding independently of the reference being
          // fixed. Such a binding no longer has a proven stable identity.
          if (
            containers.some(container =>
              container.references.some(
                reference =>
                  reference.id.name === prefix &&
                  !reference.variable &&
                  reference.mode !== 'r',
              ),
            )
          ) {
            prefix = undefined
          }
          for (const container of containers) {
            checkContainer(container)
          }
        },
      },
      {
        Program(program) {
          for (const scope of sourceCode.scopeManager?.scopes ?? []) {
            if (scope.type !== 'module' && scope.type !== 'global') {
              continue
            }
            for (const variable of scope.variables) {
              if (
                variable.defs.some(
                  definition =>
                    definition.isVariableDefinition !== false &&
                    (definition.type === 'ImportBinding'
                      ? !!getRuntimeImportBinding(definition)
                      : isInScriptRange(definition.node, setupRange)),
                )
              ) {
                scriptBindings.add(variable.name)
              }
            }
          }
          const calls = getSetupMacroCalls(
            program,
            sourceCode,
            context.filename,
          ).filter(
            call =>
              call.callee.type === 'Identifier' &&
              call.callee.name === 'defineProps',
          )
          if (calls.length !== 1 || !calls[0]) {
            return
          }
          const call = calls[0]
          for (const member of getModelContractMembers(
            call,
            sourceCode,
            'props',
          )) {
            propNames.add(normalizePropName(member.name))
          }
          let outer: TSESTree.Node = call
          while (
            outer.parent &&
            outer.parent.type !== 'VariableDeclarator' &&
            outer.parent.type !== 'ExpressionStatement'
          ) {
            outer = outer.parent
          }
          const declaration = outer.parent
          if (
            declaration?.type !== 'VariableDeclarator' ||
            declaration.id.type !== 'Identifier' ||
            declaration.parent.kind !== 'const'
          ) {
            return
          }
          const identifier = declaration.id
          const binding = sourceCode.scopeManager?.scopes
            .flatMap(scope => scope.variables)
            .find(variable => variable.identifiers.includes(identifier))
          if (
            binding &&
            !binding.references.some(
              reference => reference.isWrite() && !reference.init,
            ) &&
            declaration.id.name !== '$event'
          ) {
            prefix = declaration.id.name
          }
        },
      },
    )
  },
})
