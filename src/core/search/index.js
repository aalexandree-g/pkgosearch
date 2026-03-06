import { tokenize } from './tokenize'
import { parseAndWithOrPriority } from './parse'
import { normalize } from './normalize'
import { astToPokemon } from './serialize'
import { simplify } from './simplify'

export function transform(input) {
  const tokens = tokenize(input)
  const ast = parseAndWithOrPriority(tokens)
  const simplified = simplify(ast)
  const normalized = normalize(simplified)
  const normalizedSimplified = simplify(normalized)
  return astToPokemon(normalizedSimplified)
}
