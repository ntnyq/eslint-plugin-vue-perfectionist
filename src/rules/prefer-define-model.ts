import { createRule } from '../utils/create-rule.ts'
import { resolveVueGlobals, resolveVueUse } from '../utils/vue/globals.ts'
import { getModelContractMembers } from '../utils/vue/model-contracts.ts'
import { getPassiveModelNames } from '../utils/vue/passive-models.ts'
import { getSetupMacroCalls } from '../utils/vue/setup-macros.ts'
import type {
  PreferDefineModelMessageId,
  PreferDefineModelOptions,
} from '../types/index.ts'

export const preferDefineModel = createRule<
  [PreferDefineModelOptions],
  PreferDefineModelMessageId
>({
  name: 'prefer-define-model',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'require defineModel instead of matching prop and update event declarations.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          vueuse: {
            type: 'boolean',
            description: 'Override shared VueUse integration recognition.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      preferDefineModel:
        'Use defineModel for the "{{name}}" prop and its "update:{{name}}" event.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const supportsVueUse = resolveVueUse(context.settings, options.vueuse)
    const autoImport = supportsVueUse
      ? resolveVueGlobals(context.settings, ['useVModel']).includes('useVModel')
      : false
    return {
      Program(program) {
        const calls = getSetupMacroCalls(
          program,
          context.sourceCode,
          context.filename,
        )
        const props = calls.filter(
          call =>
            call.callee.type === 'Identifier' &&
            call.callee.name === 'defineProps',
        )
        const emits = calls.filter(
          call =>
            call.callee.type === 'Identifier' &&
            call.callee.name === 'defineEmits',
        )
        const propCall = props[0]
        const emitCall = emits[0]
        if (
          props.length !== 1 ||
          emits.length !== 1 ||
          !propCall ||
          !emitCall
        ) {
          return
        }
        const events = new Set(
          getModelContractMembers(emitCall, context.sourceCode, 'emits').map(
            member => member.name,
          ),
        )
        const passiveModels = supportsVueUse
          ? getPassiveModelNames(
              program,
              context.sourceCode,
              propCall,
              emitCall,
              autoImport,
            )
          : new Set<string>()
        const reported = new Set<string>()
        for (const member of getModelContractMembers(
          propCall,
          context.sourceCode,
          'props',
        )) {
          if (
            !member.name ||
            reported.has(member.name) ||
            passiveModels.has(member.name) ||
            !events.has(`update:${member.name}`)
          ) {
            continue
          }
          reported.add(member.name)
          context.report({
            node: member.node,
            messageId: 'preferDefineModel',
            data: { name: member.name },
          })
        }
      },
    }
  },
})
