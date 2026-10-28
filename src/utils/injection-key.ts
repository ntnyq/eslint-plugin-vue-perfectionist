import type ts from 'typescript'

/**
 * Collect the canonical Vue key and its marker from installed Vue declarations.
 * Structural assignability is insufficient: plain symbols satisfy Vue's empty
 * InjectionConstraint interface too. Custom API sources must still use Vue keys.
 *
 * @param program - The parser's complete TypeScript program.
 * @param checker - The checker belonging to that program.
 * @returns Full Vue key symbols and markers that additionally require a symbol.
 */
function getInjectionKeySymbols(
  program: ts.Program,
  checker: ts.TypeChecker,
): { keys: Set<ts.Symbol>; markers: Set<ts.Symbol> } {
  const keys = new Set<ts.Symbol>()
  const markers = new Set<ts.Symbol>()
  for (const source of program.getSourceFiles()) {
    const filename = source.fileName.replaceAll('\\', '/')
    if (
      !/\/node_modules\/@vue\/runtime-core\//u.test(filename) ||
      !source.isDeclarationFile
    ) {
      continue
    }
    const module = checker.getSymbolAtLocation(source)
    const exported =
      module &&
      checker
        .getExportsOfModule(module)
        .find(symbol => symbol.name === 'InjectionKey')
    if (!exported) {
      continue
    }
    keys.add(exported)
    const type = checker.getDeclaredTypeOfSymbol(exported)
    for (const part of type.isIntersection() ? type.types : [type]) {
      const symbol = part.getSymbol()
      if (
        symbol?.declarations?.some(
          declaration => declaration.getSourceFile() === source,
        ) &&
        symbol !== exported
      ) {
        markers.add(symbol)
      }
    }
  }
  return {
    keys,
    markers,
  }
}

/**
 * Validate call-site types against Vue's actual InjectionKey declaration graph.
 * All union branches must qualify; intersections may refine a known key.
 *
 * @param program - The parser's complete TypeScript program.
 * @param allowedStrings - Explicit exceptions for third-party string contracts.
 * @returns A predicate accepting Vue keys and allowed string literal types.
 */
export function createInjectionKeyTypeChecker(
  program: ts.Program,
  allowedStrings: ReadonlySet<string>,
): (type: ts.Type) => boolean {
  const checker = program.getTypeChecker()
  const { keys, markers } = getInjectionKeySymbols(program, checker)
  const symbolType = checker.getESSymbolType()

  /**
   * Follow constraints and base types while guarding recursive type graphs.
   *
   * @param type - The key's type at the call site.
   * @param visiting - Types on the active recursion path.
   * @param candidate - The complete intersection whose runtime shape is checked.
   * @returns Whether every possible value has an accepted key type.
   */
  function isKey(
    type: ts.Type,
    visiting = new Set<ts.Type>(),
    candidate = type,
  ): boolean {
    if (visiting.has(type)) {
      return false
    }
    visiting.add(type)
    try {
      if (type.isUnion()) {
        return type.types.every(part => isKey(part, visiting))
      }
      if (type.isIntersection()) {
        return type.types.some(part => isKey(part, visiting, candidate))
      }
      if (type.isStringLiteral()) {
        return allowedStrings.has(type.value)
      }
      const symbol = type.getSymbol()
      if (
        (symbol && keys.has(symbol)) ||
        (type.aliasSymbol && keys.has(type.aliasSymbol))
      ) {
        return true
      }
      // The empty Vue marker can be extracted with conditional inference. It
      // establishes provenance only when the complete candidate is a symbol.
      if (
        symbol &&
        markers.has(symbol) &&
        checker.isTypeAssignableTo(candidate, symbolType)
      ) {
        return true
      }
      if (type.getBaseTypes()?.some(base => isKey(base, visiting, candidate))) {
        return true
      }
      // Indexed access and deferred conditional types have constraints too.
      const constraint = checker.getBaseConstraintOfType(type)
      return (
        constraint !== undefined &&
        constraint !== type &&
        isKey(constraint, visiting, candidate)
      )
    } finally {
      visiting.delete(type)
    }
  }
  return isKey
}
