import { tokenize } from './tokenize'
import { parseAndWithOrPriority } from './parse'
import { prepareForCNF, toCNF } from './normalize'
import { astToPokemon } from './serialize'
import { simplify } from './simplify'
import { preOptimizeSearch } from './preOptimizeSearch'
import { assertSupportedNegations } from './searchRules'

export function transform(input) {
  const tokens = tokenize(input)
  const ast = parseAndWithOrPriority(tokens)
  const prepared = prepareForCNF(ast)
  const simplified = simplify(prepared)
  const preOptimized = preOptimizeSearch(simplified)
  assertSupportedNegations(preOptimized)
  const normalized = toCNF(preOptimized)
  const normalizedSimplified = simplify(normalized)
  return astToPokemon(normalizedSimplified)
}
