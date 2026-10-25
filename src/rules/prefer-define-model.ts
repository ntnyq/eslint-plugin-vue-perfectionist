import { createRule } from '../utils/create-rule.ts'
import { getModelContractMembers } from '../utils/vue/model-contracts.ts'
import { getSetupMacroCalls } from '../utils/vue/setup-macros.ts'
import type { PreferDefineModelMessageId } from '../types/index.ts'

export const preferDefineModel = createRule<[], PreferDefineModelMessageId>({
  name: 'prefer-define-model',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'require defineModel instead of matching prop and update event declarations.',
    },
    schema: [],
    messages: {
      preferDefineModel:
        'Use defineModel for the "{{name}}" prop and its "update:{{name}}" event.',
    },
  },
  defaultOptions: [],
  create(context) {
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
        const reported = new Set<string>()
        for (const member of getModelContractMembers(
          propCall,
          context.sourceCode,
          'props',
        )) {
          if (
            !member.name ||
            reported.has(member.name) ||
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
