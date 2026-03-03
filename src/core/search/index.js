import { tokenize } from './tokenize'
import { parseAndWithOrPriority } from './parse'
import { normalize } from './normalize'
import { astToPokemon } from './serialize'
import { simplify } from './simplify'
import { absorb } from './simplify/absorb'

export function transform(input) {
  const tokens = tokenize(input)
  const ast = parseAndWithOrPriority(tokens)
  const simplified = simplify(ast)
  const absorbed = absorb(simplified)
  const normalized = normalize(absorbed)
  const normalizedSimplified = simplify(normalized)
  const normalizedAbsorbed = absorb(normalizedSimplified)
  return astToPokemon(normalizedAbsorbed)
}
